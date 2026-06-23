import { Router } from "express";
import crypto from "node:crypto";
import { readDataset, writeDataset, readFileContent } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { canAccessResource } from "../auth/ownership.js";
import { hashPassword, verifyPassword } from "../auth/passwords.js";

function findResource(dataset, type, id) {
  if (type === "file") return (dataset.files || []).find((f) => f.id === id) || null;
  if (type === "folder") return (dataset.folders || []).find((f) => f.id === id) || null;
  return null;
}

function publicResource(type, resource) {
  if (!resource) return null;
  if (type === "file") {
    return {
      id: resource.id,
      name: resource.name,
      fileType: resource.fileType,
      size: resource.size,
      hasContent: !!resource.hasContent,
    };
  }
  return { id: resource.id, name: resource.name, path: resource.path };
}

function sanitizeLink(link) {
  const { passwordHash, ...rest } = link;
  return { ...rest, passwordProtected: !!passwordHash };
}

// Validate a link for public access. Returns null if OK, else {status,error}.
async function validateLink(link, req) {
  if (!link || link.revoked) return { status: 404, error: "Not found" };
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) {
    return { status: 410, error: "This link has expired" };
  }
  if (link.passwordHash) {
    const pw = req.get("x-share-password") || req.query.password || "";
    if (!(await verifyPassword(String(pw), link.passwordHash))) {
      return { status: 401, error: "A password is required for this link" };
    }
  }
  return null;
}

// Share-link routes. Mounted at /api/share.
export function shareRouter() {
  const router = Router();

  // Create a link for a resource the caller can access.
  router.post("/", requireAuth, async (req, res) => {
    const {
      resourceType,
      resourceId,
      permission = "view",
      expiresAt = null,
      password = null,
    } = req.body || {};
    if (!["file", "folder"].includes(resourceType) || !resourceId) {
      return res.status(400).json({ error: "resourceType and resourceId are required" });
    }
    const dataset = await readDataset();
    const resource = findResource(dataset, resourceType, resourceId);
    if (!resource || !canAccessResource(req.user, resource)) {
      return res.status(404).json({ error: "Not found" });
    }
    const link = {
      token: crypto.randomBytes(12).toString("hex"),
      resourceType,
      resourceId,
      permission: ["view", "comment", "edit"].includes(permission) ? permission : "view",
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt || null,
      passwordHash: password ? await hashPassword(String(password)) : null,
      revoked: false,
      accessCount: 0,
    };
    dataset.shareLinks = dataset.shareLinks || [];
    dataset.shareLinks.push(link);
    await writeDataset(dataset);
    res.status(201).json({ ok: true, token: link.token, link: sanitizeLink(link) });
  });

  // The caller's own links (admins see all). Must precede GET /:token.
  router.get("/mine", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const mine = (dataset.shareLinks || []).filter(
      (l) => req.user.role === "admin" || l.createdBy === req.user.id,
    );
    res.json({ items: mine.map(sanitizeLink) });
  });

  // Revoke a link (creator or admin).
  router.delete("/:token", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const link = (dataset.shareLinks || []).find((l) => l.token === req.params.token);
    if (!link) return res.status(404).json({ error: "Not found" });
    if (link.createdBy !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    link.revoked = true;
    await writeDataset(dataset);
    res.json({ ok: true });
  });

  // Resolve a link (public).
  router.get("/:token", async (req, res) => {
    const dataset = await readDataset();
    const link = (dataset.shareLinks || []).find((l) => l.token === req.params.token);
    const denied = await validateLink(link, req);
    if (denied) return res.status(denied.status).json({ error: denied.error });

    link.accessCount = (link.accessCount || 0) + 1;
    await writeDataset(dataset);
    const resource = findResource(dataset, link.resourceType, link.resourceId);
    res.json({
      ok: true,
      resourceType: link.resourceType,
      permission: link.permission,
      resource: publicResource(link.resourceType, resource),
    });
  });

  // Serve a shared file's bytes (public; honors the link's password).
  router.get("/:token/content", async (req, res) => {
    const dataset = await readDataset();
    const link = (dataset.shareLinks || []).find((l) => l.token === req.params.token);
    const denied = await validateLink(link, req);
    if (denied) return res.status(denied.status).json({ error: denied.error });
    if (link.resourceType !== "file") {
      return res.status(400).json({ error: "Not a file link" });
    }
    const buffer = await readFileContent(link.resourceId);
    if (!buffer) return res.status(404).json({ error: "File content not found" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  });

  return router;
}
