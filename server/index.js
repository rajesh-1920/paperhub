import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  readDataset,
  writeDataset,
  resetDataset,
  ensureDataset,
  isValidDataset,
  usingMongo,
  writeFileContent,
  readFileContent,
  deleteFileContent,
} from "./db.js";
import { authRouter } from "./routes/auth.js";
import { filesRouter } from "./routes/files.js";
import { assertAuthConfig } from "./config.js";
import { sanitizeDataset, preserveServerSecrets } from "./auth/users.js";
import { requireAuth, authorize } from "./middleware/auth.js";

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PDF_MAGIC = Buffer.from("%PDF");

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");

/**
 * Build the PaperHub Express app: a small REST API backed by the JSON file,
 * plus static hosting of the frontend in public/.
 */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // Authentication (login / refresh / logout).
  app.use("/api/auth", authRouter());

  // File queries (search). Other /api/files/:id/* routes are defined below.
  app.use("/api/files", filesRouter());

  // Read the whole dataset. Never cache it — the frontend re-fetches after
  // every mutation and must always see the latest counts. Credentials and
  // refresh tokens are stripped: they never leave the server.
  app.get("/api/dataset", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.json(sanitizeDataset(await readDataset()));
    } catch {
      res.status(500).json({ error: "Unable to read dataset" });
    }
  });

  // Persist the whole dataset (the frontend store posts the mutated dataset).
  // The client never holds credentials/refresh tokens, so they are restored
  // from the current dataset to prevent a round-tripped PUT from wiping them.
  app.put("/api/dataset", requireAuth, async (req, res) => {
    if (!isValidDataset(req.body)) {
      return res.status(400).json({ error: "Invalid dataset payload" });
    }
    try {
      const current = await readDataset();
      await writeDataset(preserveServerSecrets(req.body, current));
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Unable to write dataset" });
    }
  });

  // Restore the dataset to the pristine seed (destructive — admins only).
  app.post("/api/reset", requireAuth, authorize("admin"), async (req, res) => {
    try {
      res.json(sanitizeDataset(await resetDataset()));
    } catch {
      res.status(500).json({ error: "Unable to reset dataset" });
    }
  });

  // --- Uploaded file binaries (the actual PDF) -----------------------------

  // Store a file's PDF bytes.
  app.put(
    "/api/files/:id/content",
    requireAuth,
    express.raw({ type: "application/pdf", limit: "55mb" }),
    async (req, res) => {
      const { id } = req.params;
      const body = req.body;
      if (!ID_PATTERN.test(id)) {
        return res.status(400).json({ error: "Invalid file id" });
      }
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res
          .status(400)
          .json({ error: "Expected a PDF body (Content-Type: application/pdf)" });
      }
      if (!body.subarray(0, 4).equals(PDF_MAGIC)) {
        return res.status(415).json({ error: "Only PDF files are accepted" });
      }
      try {
        await writeFileContent(id, body);
        res.json({ ok: true, size: body.length });
      } catch {
        res.status(500).json({ error: "Unable to store file" });
      }
    },
  );

  // Serve a file's PDF bytes (rendered inline by the browser).
  app.get("/api/files/:id/content", async (req, res) => {
    const { id } = req.params;
    if (!ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid file id" });
    }
    try {
      const buffer = await readFileContent(id);
      if (!buffer) {
        return res.status(404).json({ error: "File content not found" });
      }
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.send(buffer);
    } catch {
      res.status(500).json({ error: "Unable to read file" });
    }
  });

  // Remove a file's stored bytes.
  app.delete("/api/files/:id/content", requireAuth, async (req, res) => {
    const { id } = req.params;
    if (!ID_PATTERN.test(id)) {
      return res.status(400).json({ error: "Invalid file id" });
    }
    try {
      await deleteFileContent(id);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Unable to delete file" });
    }
  });

  // Duplicate a file's stored bytes to a new id (backs "copy file").
  app.post("/api/files/:id/copy", requireAuth, async (req, res) => {
    const { id } = req.params;
    const targetId = String((req.body || {}).targetId || "");
    if (!ID_PATTERN.test(id) || !ID_PATTERN.test(targetId)) {
      return res.status(400).json({ error: "Invalid file id" });
    }
    try {
      const buffer = await readFileContent(id);
      if (!buffer) {
        return res.status(404).json({ error: "Source content not found" });
      }
      await writeFileContent(targetId, buffer);
      res.json({ ok: true, id: targetId });
    } catch {
      res.status(500).json({ error: "Unable to copy file" });
    }
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

  return app;
}

export async function start(port = process.env.PORT || 8000) {
  assertAuthConfig();
  await ensureDataset();
  const app = createApp();
  return app.listen(port, () => {
    const backend = usingMongo()
      ? `MongoDB (${process.env.MONGODB_DB || "paperhub"})`
      : "JSON file";
    console.log(`PaperHub running at http://localhost:${port} — database: ${backend}`);
  });
}

// Start the server only when this file is run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Load .env only for a real run, never on import (keeps tests deterministic).
  try {
    process.loadEnvFile();
  } catch {
    /* no .env file — fall back to JSON storage */
  }
  start().catch((error) => {
    console.error("Failed to start PaperHub:", error.message);
    process.exit(1);
  });
}
