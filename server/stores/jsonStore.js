import {
  readFile,
  writeFile,
  rename,
  copyFile,
  access,
  mkdir,
  unlink,
  rm,
  readdir,
} from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// JSON-file storage backend. Used by default and as the CI/test fallback when
// no MONGODB_URI is configured. Uploaded file binaries live as individual files
// under an uploads directory (the dataset only stores metadata).

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

// Paths are resolved lazily so tests can point them at a temp copy via env.
function dbFile() {
  return process.env.PAPERHUB_DB_FILE || join(ROOT, "public/assets/data/paperhub-backend.json");
}
function seedFile() {
  return process.env.PAPERHUB_SEED_FILE || join(HERE, "..", "seed.json");
}
function uploadsDir() {
  return process.env.PAPERHUB_UPLOAD_DIR || join(HERE, "..", "uploads");
}

// Keep file ids confined to a safe, flat filename (no path traversal).
function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}
function contentPath(id) {
  return join(uploadsDir(), `${safeId(id)}.pdf`);
}

// Delete any stored binary whose file id is no longer in the dataset.
async function pruneOrphanContent(data) {
  const keep = new Set((data.files || []).map((f) => `${safeId(f.id)}.pdf`));
  let names;
  try {
    names = await readdir(uploadsDir());
  } catch {
    return; // no uploads dir yet
  }
  for (const name of names) {
    if (name.endsWith(".pdf") && !keep.has(name)) {
      await unlink(join(uploadsDir(), name)).catch(() => {});
    }
  }
}

// Serialize writes so two concurrent requests can never interleave or corrupt
// the file. Each write awaits the previous one; failures don't break the chain.
let writeChain = Promise.resolve();
function withLock(task) {
  const run = writeChain.then(task, task);
  writeChain = run.then(
    () => {},
    () => {},
  );
  return run;
}

/** Create the live database file from the seed if it does not exist yet. */
export async function ensureDataset() {
  const file = dbFile();
  try {
    await access(file, constants.F_OK);
  } catch {
    await copyFile(seedFile(), file);
  }
  return file;
}

export async function readDataset() {
  await ensureDataset();
  return JSON.parse(await readFile(dbFile(), "utf8"));
}

/** Atomically overwrite the database file (write temp, then rename). */
export function writeDataset(data) {
  return withLock(async () => {
    const file = dbFile();
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2) + "\n", "utf8");
    await rename(tmp, file);
    await pruneOrphanContent(data);
    return data;
  });
}

/** Restore the database file from the pristine seed (and drop stored binaries). */
export function resetDataset() {
  return withLock(async () => {
    await copyFile(seedFile(), dbFile());
    await rm(uploadsDir(), { recursive: true, force: true });
    return JSON.parse(await readFile(dbFile(), "utf8"));
  });
}

// --- File binaries (the actual uploaded PDF bytes) -------------------------

export function writeFileContent(id, buffer) {
  // Serialized + atomic so concurrent writes to the same id can't corrupt it.
  return withLock(async () => {
    await mkdir(uploadsDir(), { recursive: true });
    const path = contentPath(id);
    const tmp = `${path}.${process.pid}.tmp`;
    await writeFile(tmp, buffer);
    await rename(tmp, path);
  });
}

export async function readFileContent(id) {
  try {
    return await readFile(contentPath(id));
  } catch {
    return null;
  }
}

export async function deleteFileContent(id) {
  try {
    await unlink(contentPath(id));
  } catch {
    /* already gone */
  }
}
