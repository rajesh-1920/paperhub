import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";
import { quotaLimitFor, usedBytesFor, wouldExceedQuota } from "../server/quota.js";

test("quota (server): limit resolution and usage math", () => {
  const dataset = {
    meta: { quotaDefaults: { limitBytes: 1000 } },
    users: [{ id: "u1", storage: { limitBytes: 50 } }, { id: "u2" }],
    files: [
      { id: "a", ownerId: "u1", size: 20 },
      { id: "d", ownerId: "u1", size: 15 },
      { id: "b", ownerId: "u1", size: 10, deletedAt: "2026-01-01" },
      { id: "c", ownerId: "u2", size: 30 },
    ],
  };
  assert.equal(quotaLimitFor(dataset, "u1"), 50, "per-user limit wins");
  assert.equal(quotaLimitFor(dataset, "u2"), 1000, "falls back to meta default");
  assert.equal(usedBytesFor(dataset, "u1"), 35, "trashed files don't count (20+15)");
  // Replacing "a": used excludes a -> 15 (only d). 15 + addBytes vs limit 50.
  assert.equal(wouldExceedQuota(dataset, "a", 40), true, "15+40 > 50");
  assert.equal(wouldExceedQuota(dataset, "a", 30), false, "15+30 <= 50");
});

test("quota (client): phStorageUsage reports used/limit/percent", () => {
  const { window } = bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
  const ds = window.getPaperHubDataset();
  const owner = ds.users.find((u) => u.role === "user");
  owner.storage = { limitBytes: 1000 };
  ds.files = ds.files.filter((f) => f.ownerId !== owner.id);
  ds.files.push({ id: "s1", ownerId: owner.id, size: 250 });
  ds.files.push({ id: "s2", ownerId: owner.id, size: 250, deletedAt: "2026-01-01" });

  const usage = window.phStorageUsage(owner.id);
  assert.equal(usage.usedBytes, 250, "trashed excluded");
  assert.equal(usage.limitBytes, 1000);
  assert.equal(usage.fileCount, 1);
  assert.equal(usage.percent, 25);
});
