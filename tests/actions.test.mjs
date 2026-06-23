import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

test("officer Quick Approve approves the highest-priority pending review (and syncs the file)", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/officer.html",
    ["utils.js", "main.js"],
    "officer",
  );
  window.confirm = () => true;
  window.applyCurrentUserPageData();

  const next = window.officerNextReview();
  assert.ok(next, "a pending review exists");

  document.querySelector('[data-officer-action="approve"]').click();

  const ds = window.getPaperHubDataset();
  assert.equal(ds.reviewQueue.find((r) => r.id === next.id).status, "completed");
  assert.equal(
    ds.files.find((f) => f.id === next.fileId).status,
    "completed",
    "linked file synced to completed",
  );
});

test("change password updates the account and the new password authenticates", () => {
  const { window } = bootPage(
    "public/pages/profile/profile-edit.html",
    ["utils.js", "main.js", "auth.js"],
    "user",
  );
  const id = "user-mahmud.hasan";
  assert.equal(window.phGetAccountPassword(id), "user01");

  assert.equal(window.phChangePassword(id, "newpass123"), true);
  assert.equal(window.phGetAccountPassword(id), "newpass123");

  const authed = window.findAuthenticatedUser("mahmud.hasan@paperhub.edu.bd", "newpass123");
  assert.ok(authed && authed.id === id, "logs in with the new password");
  assert.equal(
    window.findAuthenticatedUser("mahmud.hasan@paperhub.edu.bd", "user01"),
    null,
    "old password no longer works",
  );
});

test("restore (phTouchFile) bumps updatedAt in every copy of the file", () => {
  const { window } = bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
  const target = window.getPaperHubDataset().users.flatMap((u) => u.files || [])[0];
  const before = target.updatedAt;

  window.phTouchFile(target.id);

  const ds = window.getPaperHubDataset();
  const global = ds.files.find((f) => f.id === target.id);
  const userCopy = ds.users.flatMap((u) => u.files || []).find((f) => f.id === target.id);
  assert.notEqual(global.updatedAt, before, "updatedAt changed");
  assert.equal(global.updatedAt, userCopy.updatedAt, "global and user copy stay in sync");
});

test("admin toolkit 'Manage Users' opens the add-user modal", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/admin.html",
    ["utils.js", "main.js"],
    "admin",
  );
  window.applyCurrentUserPageData();

  const modal = document.getElementById("adminUserModal");
  assert.ok(modal.classList.contains("hidden"), "modal starts hidden");
  document.querySelector('[data-admin-action="add-user"]').click();
  assert.ok(!modal.classList.contains("hidden"), "modal opens");
});
