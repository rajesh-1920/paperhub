import { MongoClient } from "mongodb";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// MongoDB storage backend. Active when MONGODB_URI is set. The dataset's
// top-level arrays each map to a collection; the scalar parts (meta,
// dashboardStats, infrastructure) live in a single "meta" document. The
// frontend keeps using GET/PUT /api/dataset — this layer assembles the dataset
// on read and splits it across collections on write.

const HERE = dirname(fileURLToPath(import.meta.url));
const ARRAY_COLLECTIONS = ["authAccounts", "users", "files", "reviewQueue"];
const META_ID = "singleton";

function seedFile() {
  return process.env.PAPERHUB_SEED_FILE || join(HERE, "..", "seed.json");
}

let clientPromise = null;
async function getDb() {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    clientPromise = client.connect().then(() => client);
  }
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DB || "paperhub");
}

// Serialize writes so the multi-collection replace can't interleave.
let writeChain = Promise.resolve();
function withLock(task) {
  const run = writeChain.then(task, task);
  writeChain = run.then(
    () => {},
    () => {},
  );
  return run;
}

async function readSeed() {
  return JSON.parse(await readFile(seedFile(), "utf8"));
}

/** Seed the database the first time it is used (no meta document yet). */
export async function ensureDataset() {
  const db = await getDb();
  const meta = await db.collection("meta").findOne({ _id: META_ID });
  if (!meta) {
    await writeDataset(await readSeed());
  }
}

export async function readDataset() {
  await ensureDataset();
  const db = await getDb();
  const dataset = {};
  for (const name of ARRAY_COLLECTIONS) {
    dataset[name] = await db
      .collection(name)
      .find({}, { projection: { _id: 0 } })
      .toArray();
  }
  const meta = (await db.collection("meta").findOne({ _id: META_ID })) || {};
  dataset.meta = meta.meta || {};
  dataset.dashboardStats = meta.dashboardStats || {};
  dataset.infrastructure = meta.infrastructure || [];
  return dataset;
}

export function writeDataset(data) {
  return withLock(async () => {
    const db = await getDb();
    for (const name of ARRAY_COLLECTIONS) {
      const rows = Array.isArray(data[name]) ? data[name] : [];
      await db.collection(name).deleteMany({});
      if (rows.length) {
        // Insert fresh copies so Mongo assigns _id without mutating the input.
        await db.collection(name).insertMany(rows.map((row) => ({ ...row })));
      }
    }
    await db.collection("meta").replaceOne(
      { _id: META_ID },
      {
        _id: META_ID,
        meta: data.meta || {},
        dashboardStats: data.dashboardStats || {},
        infrastructure: data.infrastructure || [],
      },
      { upsert: true },
    );
    return data;
  });
}

export async function resetDataset() {
  await writeDataset(await readSeed());
  return readDataset();
}

/** Close the connection (used by tests for clean shutdown). */
export async function closeMongo() {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = null;
  }
}
