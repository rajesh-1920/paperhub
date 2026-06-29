import express from "express";
import crypto from "node:crypto";
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
import { shareRouter } from "./routes/share.js";
import { auditRouter } from "./routes/audit.js";
import { reviewsRouter } from "./routes/reviews.js";
import { assertAuthConfig } from "./config.js";
import { sanitizeDataset, applyDatasetWritePolicy, projectDatasetForViewer } from "./auth/users.js";
import { requireAuth, authorize, optionalAuth } from "./middleware/auth.js";
import { wouldExceedQuota } from "./quota.js";
import { countPdfPages } from "./pdf.js";

const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const PDF_MAGIC = Buffer.from("%PDF");

// The %PDF header is not always at byte 0: a UTF-8 BOM or leading whitespace can
// precede it, and the PDF spec only requires it within the first 1024 bytes.
// Scan that window instead of demanding an exact prefix, so valid PDFs aren't
// wrongly rejected on upload.
function looksLikePdf(buffer) {
  return Buffer.isBuffer(buffer) && buffer.subarray(0, 1024).indexOf(PDF_MAGIC) !== -1;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(HERE, "..", "public");

/**
 * Build the PaperHub Express app: a small REST API backed by the JSON file,
 * plus static hosting of the frontend in public/.
 */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256mb" }));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  // Authentication (login / refresh / logout).
  app.use("/api/auth", authRouter());

  // File queries (search). Other /api/files/:id/* routes are defined below.
  app.use("/api/files", filesRouter());

  // Shareable links (create / list / revoke / resolve / serve).
  app.use("/api/share", shareRouter());

  // Audit / activity log (read + record).
  app.use("/api/audit", auditRouter());

  // Review side effects (e.g. email the admin when a document is forwarded).
  app.use("/api/reviews", reviewsRouter());

  // Read the whole dataset. Never cache it — the frontend re-fetches after
  // every mutation and must always see the latest counts. Credentials and
  // refresh tokens are stripped: they never leave the server.
  app.get("/api/dataset", optionalAuth, async (req, res) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      // Scope the dataset to the caller: a regular user only sees files/users
      // they're entitled to; staff see everything; a guest sees a bare shell.
      res.json(projectDatasetForViewer(await readDataset(), req.user));
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
      await writeDataset(applyDatasetWritePolicy(req.body, current, req.user));
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
    express.raw({ type: "application/pdf", limit: "2gb" }),
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
      if (!looksLikePdf(body)) {
        return res.status(415).json({ error: "Only PDF files are accepted" });
      }
      try {
        if (wouldExceedQuota(await readDataset(), id, body.length)) {
          return res.status(413).json({ error: "Storage quota exceeded" });
        }
        await writeFileContent(id, body);
        res.json({ ok: true, size: body.length, pages: countPdfPages(body) });
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

  // Add a new version of a file: archive the bytes under a version content ref
  // AND make them the current content. Previous versions stay archived.
  app.post(
    "/api/files/:id/versions",
    requireAuth,
    express.raw({ type: "application/pdf", limit: "2gb" }),
    async (req, res) => {
      const { id } = req.params;
      const body = req.body;
      if (!ID_PATTERN.test(id)) {
        return res.status(400).json({ error: "Invalid file id" });
      }
      if (!Buffer.isBuffer(body) || body.length === 0) {
        return res.status(400).json({ error: "Expected a PDF body" });
      }
      if (!looksLikePdf(body)) {
        return res.status(415).json({ error: "Only PDF files are accepted" });
      }
      try {
        if (wouldExceedQuota(await readDataset(), id, body.length)) {
          return res.status(413).json({ error: "Storage quota exceeded" });
        }
        const versionId = `v${crypto.randomBytes(6).toString("hex")}`;
        const contentRef = `${id}__${versionId}`;
        await writeFileContent(contentRef, body); // archive this version
        await writeFileContent(id, body); // becomes the current content
        res.json({
          ok: true,
          versionId,
          contentRef,
          size: body.length,
          pages: countPdfPages(body),
        });
      } catch {
        res.status(500).json({ error: "Unable to store version" });
      }
    },
  );

  // SECURITY: the JSON-file store keeps the live database under
  // public/assets/data/ so the client can fall back to it read-only. But that
  // file holds credentials and tokens, and public/ is served statically — so a
  // raw GET would hand out the whole DB (including password hashes). Block any
  // request for assets/data/* before the static handler can serve it. The
  // dataset is available only via the access-controlled /api/dataset endpoint.
  app.use("/assets/data", (req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

  return app;
}

export async function start(port = process.env.PORT || 7000) {
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
