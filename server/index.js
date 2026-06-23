import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readDataset, writeDataset, resetDataset, ensureDataset, isValidDataset } from "./db.js";

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

  // Read the whole dataset.
  app.get("/api/dataset", async (req, res) => {
    try {
      res.json(await readDataset());
    } catch {
      res.status(500).json({ error: "Unable to read dataset" });
    }
  });

  // Persist the whole dataset (the frontend store posts the mutated dataset).
  app.put("/api/dataset", async (req, res) => {
    if (!isValidDataset(req.body)) {
      return res.status(400).json({ error: "Invalid dataset payload" });
    }
    try {
      await writeDataset(req.body);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Unable to write dataset" });
    }
  });

  // Restore the dataset to the pristine seed.
  app.post("/api/reset", async (req, res) => {
    try {
      res.json(await resetDataset());
    } catch {
      res.status(500).json({ error: "Unable to reset dataset" });
    }
  });

  app.use(express.static(PUBLIC_DIR, { extensions: ["html"] }));

  return app;
}

export async function start(port = process.env.PORT || 8000) {
  await ensureDataset();
  const app = createApp();
  return app.listen(port, () => {
    console.log(`PaperHub running at http://localhost:${port}`);
  });
}

// Start the server only when this file is run directly.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
