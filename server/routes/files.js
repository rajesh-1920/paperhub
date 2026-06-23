import { Router } from "express";
import { readDataset } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

// File query routes. Mounted at /api/files. Owner-scoped (admins see all),
// server-authoritative — the client cannot widen its own visibility.
export function filesRouter() {
  const router = Router();

  // GET /api/files/search?q=&folderId=&status=&tag=&sort=&dir=&page=&pageSize=
  router.get("/search", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const isAdmin = req.user.role === "admin";

    let files = (dataset.files || []).filter(
      (f) => !f.deletedAt && (isAdmin || f.ownerId === req.user.id),
    );

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

  return router;
}
