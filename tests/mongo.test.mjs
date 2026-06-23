import test, { after } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Exercises the MongoDB storage backend against an in-memory mongod. If that
// can't start (e.g. offline CI that can't fetch the binary), the tests skip
// rather than fail — the JSON-file store still covers server behavior.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

let mem = null;
let db = null;
let closeMongo = null;

try {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  mem = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mem.getUri();
  process.env.MONGODB_DB = "paperhub_test";
  process.env.PAPERHUB_SEED_FILE = join(ROOT, "tests/fixtures/dataset.json");
  db = await import("../server/db.js");
  ({ closeMongo } = await import("../server/stores/mongoStore.js"));
} catch (error) {
  console.warn("Skipping MongoDB tests — in-memory Mongo unavailable:", error.message);
}

test(
  "MongoDB backend is selected and seeds the dataset from collections",
  { skip: !db },
  async () => {
    assert.equal(db.usingMongo(), true, "MONGODB_URI routes to the Mongo store");
    const dataset = await db.readDataset();
    assert.ok(dataset.users.length > 0, "users seeded");
    assert.ok(dataset.files.length > 0 && dataset.reviewQueue.length > 0, "files + reviews seeded");
    assert.equal("_id" in dataset.users[0], false, "Mongo _id does not leak into the dataset");
    assert.ok(dataset.meta && dataset.dashboardStats, "meta + dashboardStats reassembled");
  },
);

test("MongoDB backend persists a write across reads", { skip: !db }, async () => {
  const dataset = await db.readDataset();
  dataset.users[0].name = "Mongo Test User";
  await db.writeDataset(dataset);

  const again = await db.readDataset();
  assert.equal(again.users[0].name, "Mongo Test User");
});

test("MongoDB round-trips the new SaaS collections", { skip: !db }, async () => {
  const dataset = await db.readDataset();
  for (const key of ["folders", "shareLinks", "tags", "auditLog", "teams", "refreshTokens"]) {
    assert.ok(Array.isArray(dataset[key]), `${key} present as an array`);
  }
  dataset.folders.push({ id: "folder-m", name: "Mongo Folder", parentId: null });
  dataset.auditLog.push({ id: "evt-m", action: "test", ts: "2026-01-01T00:00:00.000Z" });
  await db.writeDataset(dataset);

  const again = await db.readDataset();
  assert.equal(again.folders.find((f) => f.id === "folder-m")?.name, "Mongo Folder");
  assert.equal(again.auditLog.find((e) => e.id === "evt-m")?.action, "test");
});

test("MongoDB backend reset restores the seed", { skip: !db }, async () => {
  const dataset = await db.readDataset();
  const id = dataset.users[0].id;
  dataset.users[0].name = "Temporary";
  await db.writeDataset(dataset);

  const reset = await db.resetDataset();
  assert.notEqual(reset.users.find((u) => u.id === id).name, "Temporary");
});

test("MongoDB stores and serves file binaries via GridFS", { skip: !db }, async () => {
  const pdf = Buffer.from("%PDF-1.4\nmongo binary\n%%EOF\n");
  await db.writeFileContent("file-gridfs", pdf);

  const back = await db.readFileContent("file-gridfs");
  assert.ok(back && Buffer.from(back).equals(pdf), "GridFS round-trip unchanged");

  await db.deleteFileContent("file-gridfs");
  assert.equal(await db.readFileContent("file-gridfs"), null, "deleted content is gone");
});

test("MongoDB prunes orphaned GridFS binaries on dataset write", { skip: !db }, async () => {
  await db.writeFileContent("file-orphan-m", Buffer.from("%PDF-1.4\norphan\n%%EOF\n"));
  assert.ok(await db.readFileContent("file-orphan-m"), "stored");

  // The current dataset does not reference file-orphan-m.
  await db.writeDataset(await db.readDataset());

  assert.equal(await db.readFileContent("file-orphan-m"), null, "orphan pruned on write");
});

after(async () => {
  if (closeMongo) await closeMongo();
  if (mem) await mem.stop();
});
