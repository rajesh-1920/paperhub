import { Router } from "express";
import { readDataset, writeDataset } from "../db.js";
import { requireAuth, authorize } from "../middleware/auth.js";

const PREF_KEYS = ["language", "timezone", "theme", "bio"];
const MAX_PREF_LENGTH = 64;
const MAX_BIO_LENGTH = 500;
const THEMES = ["light", "dark"];

// Scoped user mutations — the long-term replacement for the equivalent slices
// of the deprecated bulk PUT /api/dataset. All routes are self-scoped (or
// admin-scoped where noted) and allowlist every writable field.
export function usersRouter() {
  const router = Router();

  // PATCH /api/users/me/preferences { language?, timezone?, theme?, bio? }
  router.patch("/me/preferences", requireAuth, async (req, res) => {
    const dataset = await readDataset();
    const user = (dataset.users || []).find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Not found" });

    const patch = req.body || {};
    const prefs = { ...(user.preferences || {}) };
    for (const key of PREF_KEYS) {
      if (patch[key] === undefined) continue;
      if (typeof patch[key] !== "string") {
        return res.status(400).json({ error: `${key} must be a string` });
      }
      const limit = key === "bio" ? MAX_BIO_LENGTH : MAX_PREF_LENGTH;
      if (patch[key].length > limit) {
        return res.status(400).json({ error: `${key} must be at most ${limit} characters` });
      }
      if (key === "theme" && patch[key] && !THEMES.includes(patch[key])) {
        return res.status(400).json({ error: `theme must be one of: ${THEMES.join(", ")}` });
      }
      prefs[key] = patch[key];
    }
    user.preferences = prefs;
    // Mirror language/timezone top-level exactly like the client's
    // phSaveUserPreferences so both layers stay consistent.
    if (patch.language !== undefined) user.language = patch.language;
    if (patch.timezone !== undefined) user.timezone = patch.timezone;

    await writeDataset(dataset);
    res.json({ ok: true, preferences: prefs });
  });

  // PATCH /api/users/me/notifications/:id { read: boolean }
  router.patch("/me/notifications/:id", requireAuth, async (req, res) => {
    const { read } = req.body || {};
    if (typeof read !== "boolean") {
      return res.status(400).json({ error: "read must be a boolean" });
    }
    const dataset = await readDataset();
    const user = (dataset.users || []).find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const note = (user.notifications || []).find((n) => String(n.id) === req.params.id);
    if (!note) return res.status(404).json({ error: "Not found" });
    note.read = read;
    await writeDataset(dataset);
    res.json({ ok: true, notification: { id: note.id, read: note.read } });
  });

  // PATCH /api/users/:id/preferences — admin-only (e.g. support flows).
  router.patch("/:id/preferences", requireAuth, authorize("admin"), async (req, res) => {
    const dataset = await readDataset();
    const user = (dataset.users || []).find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Not found" });
    const patch = req.body || {};
    const prefs = { ...(user.preferences || {}) };
    for (const key of PREF_KEYS) {
      if (patch[key] === undefined) continue;
      if (typeof patch[key] !== "string") {
        return res.status(400).json({ error: `${key} must be a string` });
      }
      prefs[key] = patch[key].slice(0, key === "bio" ? MAX_BIO_LENGTH : MAX_PREF_LENGTH);
    }
    user.preferences = prefs;
    await writeDataset(dataset);
    res.json({ ok: true, preferences: prefs });
  });

  return router;
}
