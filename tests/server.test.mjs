import test from "node:test";
import assert from "node:assert/strict";
import { readFile, copyFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SEED = join(ROOT, "server/seed.json");

async function startTestServer() {
  const dir = await mkdtemp(join(tmpdir(), "paperhub-"));
  const dbFile = join(dir, "db.json");
  const seedFile = join(dir, "seed.json");
  await copyFile(SEED, dbFile);
  await copyFile(SEED, seedFile);
  process.env.PAPERHUB_DB_FILE = dbFile;
  process.env.PAPERHUB_SEED_FILE = seedFile;

  const { createApp } = await import("../server/index.js");
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base, dbFile };
}

test("API serves the dataset and persists writes to the JSON file", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  const dataset = await (await fetch(`${base}/api/dataset`)).json();
  assert.ok(Array.isArray(dataset.users) && dataset.users.length > 0, "GET returns the dataset");

  dataset.users[0].name = "Server Test User";
  const put = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dataset),
  });
  assert.equal(put.status, 200, "PUT accepted");

  const reread = await (await fetch(`${base}/api/dataset`)).json();
  assert.equal(reread.users[0].name, "Server Test User", "GET reflects the write");

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  assert.equal(onDisk.users[0].name, "Server Test User", "JSON file on disk updated");
});

test("API rejects an invalid dataset payload", async (t) => {
  const { server, base } = await startTestServer();
  t.after(() => server.close());

  const res = await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ not: "a dataset" }),
  });
  assert.equal(res.status, 400, "invalid payload rejected");
});

test("API reset restores the dataset from the seed", async (t) => {
  const { server, base, dbFile } = await startTestServer();
  t.after(() => server.close());

  const dataset = await (await fetch(`${base}/api/dataset`)).json();
  dataset.users[0].name = "Temporarily Changed";
  await fetch(`${base}/api/dataset`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(dataset),
  });

  const reset = await (await fetch(`${base}/api/reset`, { method: "POST" })).json();
  assert.notEqual(reset.users[0].name, "Temporarily Changed", "reset restores seed values");

  const onDisk = JSON.parse(await readFile(dbFile, "utf8"));
  assert.notEqual(onDisk.users[0].name, "Temporarily Changed", "file restored on disk");
});
