import { Router } from "express";
import { readDataset, writeDataset } from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { recordAudit } from "../auth/audit.js";

// Audit/activity API. Mounted at /api/audit. The log is server-only (stripped
// from dataset reads), so this is the way to read it.
export function auditRouter() {
  const router = Router();

  // List events newest-first. Admins see everything; users see their own.
  router.get("/", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const isAdmin = req.user.role === "admin";
    const all = (dataset.auditLog || [])
      .filter((e) => isAdmin || e.actorId === req.user.id)
      .slice()
      .reverse();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(200, Math.max(1, parseInt(req.query.pageSize, 10) || 50));
    res.json({
      items: all.slice((page - 1) * pageSize, page * pageSize),
      total: all.length,
      page,
      pageSize,
    });
  });

  // Record a client-side action. The server stamps the verified actor — the
  // client cannot forge who did it.
  router.post("/", requireAuth, async (req, res) => {
    const { action, resourceType, resourceId, resourceName, metadata } = req.body || {};
    if (!action) {
      return res.status(400).json({ error: "action is required" });
    }
    const dataset = await readDataset();
    recordAudit(dataset, {
      action: String(action).slice(0, 64),
      actorId: req.user.id,
      actorName: req.user.name,
      actorRole: req.user.role,
      resourceType: resourceType ? String(resourceType).slice(0, 32) : "file",
      resourceId: resourceId ? String(resourceId).slice(0, 64) : null,
      resourceName: resourceName ? String(resourceName).slice(0, 200) : null,
      metadata: metadata && typeof metadata === "object" ? metadata : {},
      ip: req.ip,
    });
    await writeDataset(dataset);
    res.status(201).json({ ok: true });
  });

  return router;
}
