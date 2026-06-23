import { MongoClient, GridFSBucket } from "mongodb";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// MongoDB storage backend. Active when MONGODB_URI is set. The dataset's
// top-level arrays each map to a collection; the scalar parts (meta,
// dashboardStats, infrastructure) live in a single "meta" document. Uploaded
// file binaries are stored in GridFS (handles files of any size). The frontend
// keeps using GET/PUT /api/dataset — this layer assembles the dataset on read
// and splits it across collections on write.

const HERE = dirname(fileURLToPath(import.meta.url));
// Every top-level dataset array maps to its own collection. The trailing group
// (folders…refreshTokens) backs the file-management SaaS features and must stay
// in sync with jsonStore's ADDITIVE_ARRAYS so both backends round-trip alike.
const ARRAY_COLLECTIONS = [
  "authAccounts",
  "users",
  "files",
  "reviewQueue",
  "folders",
  "shareLinks",
  "tags",
  "auditLog",
  "teams",
  "refreshTokens",
];
const META_ID = "singleton";
const CONTENT_BUCKET = "fileContents";

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
    await pruneOrphanContent(data);
    return data;
  });
}

export async function resetDataset() {
  // writeDataset(seed) prunes orphaned binaries (the seed has no files).
  await writeDataset(await readSeed());
  return readDataset();
}

// --- File binaries via GridFS ----------------------------------------------

async function getBucket() {
  const db = await getDb();
  return new GridFSBucket(db, { bucketName: CONTENT_BUCKET });
}

// Delete any stored binary whose file id is no longer in the dataset.
async function pruneOrphanContent(data) {
  const keep = new Set((data.files || []).map((f) => String(f.id)));
  const bucket = await getBucket();
  const files = await bucket.find({}).toArray();
  for (const file of files) {
    if (!keep.has(file.filename)) {
      await bucket.delete(file._id);
    }
  }
}

export function writeFileContent(id, buffer) {
  // Serialized so concurrent writes to the same id can't interleave.
  return withLock(async () => {
    const bucket = await getBucket();
    await deleteFileContent(id); // replace any existing version
    await new Promise((resolve, reject) => {
      const stream = bucket.openUploadStream(String(id));
      stream.on("error", reject);
      stream.on("finish", resolve);
      stream.end(buffer);
    });
  });
}

export async function readFileContent(id) {
  const bucket = await getBucket();
  const files = await bucket.find({ filename: String(id) }).toArray();
  if (!files.length) return null;
  return new Promise((resolve, reject) => {
    const chunks = [];
    bucket
      .openDownloadStreamByName(String(id))
      .on("data", (chunk) => chunks.push(chunk))
      .on("error", reject)
      .on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function deleteFileContent(id) {
  const bucket = await getBucket();
  const files = await bucket.find({ filename: String(id) }).toArray();
  for (const file of files) {
    await bucket.delete(file._id);
  }
}

/** Close the connection (used by tests for clean shutdown). */
export async function closeMongo() {
  if (clientPromise) {
    const client = await clientPromise;
    await client.close();
    clientPromise = null;
  }
}
