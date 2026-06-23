import test from "node:test";
import assert from "node:assert/strict";
import { seedDataset } from "./helpers/dom.mjs";

test("seed dataset exposes all required top-level collections", () => {
  const ds = seedDataset();
  for (const key of ["meta", "authAccounts", "users", "files", "reviewQueue", "dashboardStats"]) {
    assert.ok(ds[key] !== undefined, `missing top-level "${key}"`);
  }
  assert.ok(Array.isArray(ds.users) && ds.users.length > 0, "users is a non-empty array");
});

test("seed covers all three roles in users and authAccounts", () => {
  const ds = seedDataset();
  for (const role of ["admin", "officer", "user"]) {
    assert.ok(
      ds.users.some((u) => u.role === role),
      `users missing role "${role}"`,
    );
    assert.ok(
      ds.authAccounts.some((a) => a.role === role),
      `authAccounts missing role "${role}"`,
    );
  }
});

test("every authAccount maps to a user with the same id", () => {
  const ds = seedDataset();
  const userIds = new Set(ds.users.map((u) => u.id));
  const orphans = ds.authAccounts.filter((a) => !userIds.has(a.id)).map((a) => a.id);
  assert.deepEqual(orphans, [], `auth accounts with no matching user: ${orphans.join(", ")}`);
});

test("every reviewQueue.fileId references an existing file", () => {
  const ds = seedDataset();
  const fileIds = new Set(ds.files.map((f) => f.id));
  const orphans = ds.reviewQueue
    .filter((r) => r.fileId && !fileIds.has(r.fileId))
    .map((r) => r.fileId);
  assert.deepEqual(orphans, [], `reviewQueue fileIds not in files: ${orphans.join(", ")}`);
});

test("every embedded user.files entry exists in the global files list", () => {
  const ds = seedDataset();
  const fileIds = new Set(ds.files.map((f) => f.id));
  const missing = [];
  ds.users.forEach((u) =>
    (u.files || []).forEach((f) => {
      if (!fileIds.has(f.id)) missing.push(f.id);
    }),
  );
  assert.deepEqual(missing, [], `user files missing from global files: ${missing.join(", ")}`);
});

test("files carry the content field the UI renders", () => {
  const ds = seedDataset();
  const withoutContent = ds.files.filter(
    (f) => typeof f.content !== "string" || f.content.length === 0,
  );
  assert.equal(withoutContent.length, 0, "all files have non-empty content");
});
