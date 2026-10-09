import { Router } from "express";
import { readDataset, writeDataset } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { canAccessResource } from "../auth/ownership.js";

const FILE_STATUSES = ["pending", "reviewing", "completed", "rejected"];
const MAX_NAME_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 2000;

// Strip ASCII control characters (incl. NUL) then clamp — mirrors the
// client's phSanitizeName so both layers enforce the same boundary.
function sanitizeName(name) {
  return (
    String(name || "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f]/g, "")
      .slice(0, MAX_NAME_LENGTH)
  );
}

// Teams the user belongs to (for team-scoped ACL grants).
function teamsForUser(dataset, userId) {
  return (dataset.teams || [])
    .filter((t) => (t.members || []).some((m) => m.userId === userId))
    .map((t) => t.id);
}

// File query routes. Mounted at /api/files. Owner-scoped (admins see all),
// server-authoritative — the client cannot widen its own visibility.
export function filesRouter() {
  const router = Router();

  // GET /api/files/search?q=&folderId=&status=&tag=&sort=&dir=&page=&pageSize=
  router.get("/search", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const teamIds = teamsForUser(dataset, req.user.id);
    const sharedOnly = req.query.shared === "1" || req.query.shared === "true";

    // Owner + admin + anyone the file's ACL (user/role/team) grants access to.
    let files = (dataset.files || []).filter((f) => {
      if (f.deletedAt) return false;
      if (!canAccessResource(req.user, f, teamIds)) return false;
      if (sharedOnly) return f.ownerId !== req.user.id; // "shared with me"
      return true;
    });

    const q = String(req.query.q || "")
      .trim()
      .toLowerCase();
    if (q) {
      const tagLabel = new Map(
        (dataset.tags || []).map((t) => [t.id, String(t.label).toLowerCase()]),
      );
      files = files.filter((f) => {
        const haystack = [
          f.name,
          f.fileType,
          f.description,
          ...(f.tags || []),
          ...(f.tagIds || []).map((id) => tagLabel.get(id) || ""),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (req.query.folderId !== undefined) {
      const raw = req.query.folderId;
      const target = raw === "root" || raw === "" ? null : raw;
      files = files.filter((f) => (f.folderId || null) === target);
    }
    if (req.query.status) {
      files = files.filter((f) => f.status === req.query.status);
    }
    if (req.query.tag) {
      files = files.filter((f) => (f.tagIds || []).includes(req.query.tag));
    }

    const dir = req.query.dir === "asc" ? 1 : -1;
    const comparators = {
      name: (a, b) => String(a.name || "").localeCompare(String(b.name || "")),
      size: (a, b) => (a.size || 0) - (b.size || 0),
      date: (a, b) => new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0),
    };
    const cmp = comparators[String(req.query.sort || "date")] || comparators.date;
    files.sort((a, b) => cmp(a, b) * dir);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const total = files.length;
    const items = files.slice((page - 1) * pageSize, page * pageSize);

    res.json({ items, total, page, pageSize, pages: Math.ceil(total / pageSize) || 1 });
  });

  // PATCH /api/files/:id/status { status } — scoped review decision.
  // Review power belongs to officers/admins only (mirrors the bulk-PUT policy
  // where a regular user's file.status is server-frozen). Owners cannot
  // self-approve; 404 (not 403) for invisible files so existence isn't leaked.
  router.patch("/:id/status", requireAuth, async (req, res) => {
    const { status } = req.body || {};
    if (!FILE_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${FILE_STATUSES.join(", ")}` });
    }
    if (req.user.role !== "admin" && req.user.role !== "officer") {
      return res.status(403).json({ error: "Only reviewers can change file status" });
    }
    const dataset = await readDataset();
    const file = (dataset.files || []).find((f) => f.id === req.params.id);
    if (!file) return res.status(404).json({ error: "Not found" });
    file.status = status;
    file.updatedAt = new Date().toISOString();
    await writeDataset(dataset);
    res.json({ ok: true, file: { id: file.id, status: file.status, updatedAt: file.updatedAt } });
  });

  // PATCH /api/files/:id { name?, description?, folderId? } — scoped metadata
  // edit. Owner, admin, or an ACL grantee may edit; names are sanitized and
  // clamped exactly like the client's phSanitizeName.
  router.patch("/:id", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const teamIds = teamsForUser(dataset, req.user.id);
    const file = (dataset.files || []).find((f) => f.id === req.params.id);
    if (!file || !canAccessResource(req.user, file, teamIds)) {
      return res.status(404).json({ error: "Not found" });
    }
    const { name, description, folderId } = req.body || {};
    if (name !== undefined) {
      const clean = sanitizeName(name);
      if (!clean) return res.status(400).json({ error: "name must not be empty" });
      file.name = clean;
    }
    if (description !== undefined) {
      if (typeof description !== "string" || description.length > MAX_DESCRIPTION_LENGTH) {
        return res
          .status(400)
          .json({ error: `description must be a string up to ${MAX_DESCRIPTION_LENGTH} chars` });
      }
      file.description = description;
    }
    if (folderId !== undefined) {
      if (folderId !== null) {
        const folder = (dataset.folders || []).find((f) => f.id === folderId);
        if (!folder) return res.status(400).json({ error: "Unknown folderId" });
      }
      file.folderId = folderId;
    }
    file.updatedAt = new Date().toISOString();
    await writeDataset(dataset);
    res.json({
      ok: true,
      file: {
        id: file.id,
        name: file.name,
        description: file.description,
        folderId: file.folderId,
        updatedAt: file.updatedAt,
      },
    });
  });

  return router;
}
