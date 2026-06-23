import { readFile, writeFile, rename, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// JSON-file storage backend. Used by default and as the CI/test fallback when
// no MONGODB_URI is configured.

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..");

// Paths are resolved lazily so tests can point them at a temp copy via env.
function dbFile() {
  return process.env.PAPERHUB_DB_FILE || join(ROOT, "public/assets/data/paperhub-backend.json");
}
function seedFile() {
  return process.env.PAPERHUB_SEED_FILE || join(HERE, "..", "seed.json");
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
    return data;
  });
}

/** Restore the database file from the pristine seed. */
export function resetDataset() {
  return withLock(async () => {
    await copyFile(seedFile(), dbFile());
    return JSON.parse(await readFile(dbFile(), "utf8"));
  });
}
