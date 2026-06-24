import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => {
  const ctx = bootPage("public/pages/dashboard/admin.html", ["utils.js", "main.js"], "admin");
  ctx.window.confirm = () => true;
  ctx.window.applyCurrentUserPageData();
  return ctx;
};

test("admin: phRemoveUser removes the user and cascades everything they own", () => {
  const { window } = boot();
  const ds = window.getPaperHubDataset();
  const victim =
    ds.users.find((u) => u.role === "user" && ds.files.some((f) => f.ownerId === u.id)) ||
    ds.users.find((u) => u.role === "user");
  assert.ok(victim, "fixture has a regular user");
  const ownedFileIds = new Set(ds.files.filter((f) => f.ownerId === victim.id).map((f) => f.id));
  assert.ok(ownedFileIds.size > 0, "victim owns files in the fixture");

  assert.equal(window.phRemoveUser(victim.id), true);

  const after = window.getPaperHubDataset();
  assert.ok(!after.users.some((u) => u.id === victim.id), "user profile gone");
  assert.ok(!after.authAccounts.some((a) => a.id === victim.id), "auth account gone");
  assert.ok(!after.files.some((f) => f.ownerId === victim.id), "owned files gone");
  assert.ok(!(after.folders || []).some((f) => f.ownerId === victim.id), "owned folders gone");
  assert.ok(
    !(after.reviewQueue || []).some((r) => ownedFileIds.has(r.fileId)),
    "review items gone",
  );
  assert.ok(
    !(after.shareLinks || []).some((s) => ownedFileIds.has(s.fileId) || s.createdBy === victim.id),
    "share links gone",
  );
  assert.ok(
    !after.users.flatMap((u) => u.files || []).some((f) => ownedFileIds.has(f.id)),
    "embedded file copies scrubbed from other users",
  );

  assert.equal(window.phRemoveUser("nope-does-not-exist"), false, "unknown id is a no-op");
});

test("admin dashboard: Remove shows for others, not self, and removes on click", () => {
  const { window, document } = boot();
  const meId = window.getCurrentUserData().id;

  assert.equal(
    document.querySelector(`[data-admin-remove][data-user-id="${meId}"]`),
    null,
    "no Remove button on the signed-in admin's own row",
  );

  const victimBtn = document.querySelector("[data-admin-remove]");
  assert.ok(victimBtn, "another user has a Remove button");
  const victimId = victimBtn.getAttribute("data-user-id");
  assert.notEqual(victimId, meId);

  const before = window.getPaperHubDataset().users.length;
  victimBtn.click();
  const ds = window.getPaperHubDataset();
  assert.equal(ds.users.length, before - 1, "one user removed on click");
  assert.ok(!ds.users.some((u) => u.id === victimId), "the removed user is gone");
});
