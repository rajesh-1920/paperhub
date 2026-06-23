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
  process.env.PAPERHUB_SEED_FILE = join(ROOT, "server/seed.json");
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

test("MongoDB backend reset restores the seed", { skip: !db }, async () => {
  const dataset = await db.readDataset();
  const id = dataset.users[0].id;
  dataset.users[0].name = "Temporary";
  await db.writeDataset(dataset);

  const reset = await db.resetDataset();
  assert.notEqual(reset.users.find((u) => u.id === id).name, "Temporary");
});

after(async () => {
  if (closeMongo) await closeMongo();
  if (mem) await mem.stop();
});
