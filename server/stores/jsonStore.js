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

// Top-level arrays backing the file-management SaaS features. Kept identical to
// mongoStore's ARRAY_COLLECTIONS tail. Readers default these to [] so a database
// file written before these features existed never crashes a reader.
const ADDITIVE_ARRAYS = ["folders", "shareLinks", "tags", "auditLog", "teams", "refreshTokens"];

function withDefaults(data) {
  for (const key of ADDITIVE_ARRAYS) {
    if (!Array.isArray(data[key])) {
      data[key] = [];
    }
  }
  return data;
}

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
function seedAssetsDir() {
  return process.env.PAPERHUB_SEED_ASSETS || join(HERE, "..", "seed-assets");
}

// Keep file ids confined to a safe, flat filename (no path traversal).
function safeId(id) {
  return String(id).replace(/[^a-zA-Z0-9_-]/g, "");
}
function contentPath(id) {
  return join(uploadsDir(), `${safeId(id)}.pdf`);
}

// The set of binary filenames still referenced by the dataset: each file's
// current binary, plus every version binary it points at. Trashed files keep
// their record in dataset.files (soft delete), so their binaries are retained
// here too — only a hard purge removes the record and frees the bytes.
function referencedContentNames(data) {
  const keep = new Set();
  for (const file of data.files || []) {
    keep.add(`${safeId(file.id)}.pdf`);
    for (const version of file.versions || []) {
      if (version && version.contentRef) {
        keep.add(`${safeId(version.contentRef)}.pdf`);
      }
    }
  }
  return keep;
}

// Delete any stored binary no longer referenced by the dataset.
async function pruneOrphanContent(data) {
  const keep = referencedContentNames(data);
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

// Copy the bundled demo PDFs into the uploads dir so a freshly seeded database
// ships with viewable file binaries. Only assets referenced by the seeded
// dataset are copied, existing binaries are never overwritten, and a custom
// seed (tests set PAPERHUB_SEED_FILE) brings its own content so we skip ours.
async function seedContent() {
  if (process.env.PAPERHUB_SEED_FILE) return;
  let names;
  try {
    names = await readdir(seedAssetsDir());
  } catch {
    return; // no bundled assets
  }
  let data;
  try {
    data = JSON.parse(await readFile(dbFile(), "utf8"));
  } catch {
    return;
  }
  const referenced = referencedContentNames(data);
  await mkdir(uploadsDir(), { recursive: true });
  for (const name of names) {
    if (!name.endsWith(".pdf") || !referenced.has(name)) continue;
    const dest = join(uploadsDir(), name);
    try {
      await access(dest, constants.F_OK);
    } catch {
      await copyFile(join(seedAssetsDir(), name), dest);
    }
  }
}

/** Create the live database file from the seed if it does not exist yet. */
export async function ensureDataset() {
  const file = dbFile();
  try {
    await access(file, constants.F_OK);
  } catch {
    await mkdir(dirname(file), { recursive: true });
    await copyFile(seedFile(), file);
    await seedContent();
  }
  return file;
}

export async function readDataset() {
  await ensureDataset();
  return withDefaults(JSON.parse(await readFile(dbFile(), "utf8")));
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
    await seedContent();
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
