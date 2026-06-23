import test from "node:test";
import assert from "node:assert/strict";
import { bootPage, seedDataset } from "./helpers/dom.mjs";

const USER_PAGE = "public/pages/dashboard/user.html";

test("phAddFile adds to global + owner files and queues a review, then persists", () => {
  const { window, user, store } = bootPage(USER_PAGE, ["utils.js"], "user");
  const before = window.getPaperHubDataset().files.length;

  const file = {
    id: "file-test-1",
    name: "X.pdf",
    status: "pending",
    ownerId: user.id,
    ownerName: user.name,
  };
  const review = {
    id: "file-test-1-review",
    fileId: "file-test-1",
    documentName: "X.pdf",
    status: "pending",
  };
  window.phAddFile(file, review);

  const ds = window.getPaperHubDataset();
  assert.equal(ds.files.length, before + 1);
  assert.ok(ds.users.find((u) => u.id === user.id).files.some((f) => f.id === "file-test-1"));
  assert.ok(ds.reviewQueue.some((r) => r.id === "file-test-1-review"));
  assert.ok(store["paperhub-db"], "dataset persisted to localStorage");
  assert.ok(store["paperhub-db-version"], "version stamped");
});

test("phUpdateUser updates the profile and syncs the auth account", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  window.phUpdateUser("user-mahmud.hasan", {
    name: "Mahmud Updated",
    email: "MAHMUD.NEW@paperhub.edu.bd",
  });

  const ds = window.getPaperHubDataset();
  assert.equal(ds.users.find((u) => u.id === "user-mahmud.hasan").name, "Mahmud Updated");
  const account = ds.authAccounts.find((a) => a.id === "user-mahmud.hasan");
  assert.equal(account.name, "Mahmud Updated");
  assert.equal(account.email, "mahmud.new@paperhub.edu.bd", "email is lowercased");
});

test("phSetReviewStatus updates the review and the underlying file status", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const ds = window.getPaperHubDataset();
  const review = ds.reviewQueue.find((r) => r.status !== "completed" && r.fileId);

  window.phSetReviewStatus(review.id, "completed");

  const after = window.getPaperHubDataset();
  assert.equal(after.reviewQueue.find((r) => r.id === review.id).status, "completed");
  assert.equal(after.files.find((f) => f.id === review.fileId).status, "completed");
});

test("phAddReviewComment appends a comment to the review", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const id = window.getPaperHubDataset().reviewQueue[0].id;
  window.phAddReviewComment(id, {
    author: "Rajdip Roy",
    role: "Review Officer",
    date: "2026-06-09",
    text: "Verified.",
  });
  assert.ok(
    window
      .getPaperHubDataset()
      .reviewQueue.find((r) => r.id === id)
      .comments.some((c) => c.text === "Verified."),
  );
});

test("phMarkAllNotificationsRead marks every notification read", () => {
  const { window, user } = bootPage(USER_PAGE, ["utils.js"], "user");
  window.phMarkAllNotificationsRead(user.id);
  assert.ok(
    window
      .getPaperHubDataset()
      .users.find((u) => u.id === user.id)
      .notifications.every((n) => n.read),
  );
});

test("phSaveUserPreferences stores prefs and mirrors language/timezone", () => {
  const { window, user } = bootPage(USER_PAGE, ["utils.js"], "user");
  window.phSaveUserPreferences(user.id, {
    language: "English",
    timezone: "UTC +00:00",
    emailNotifications: false,
  });
  const u = window.getPaperHubDataset().users.find((x) => x.id === user.id);
  assert.equal(u.preferences.emailNotifications, false);
  assert.equal(u.language, "English");
  assert.equal(u.timezone, "UTC +00:00");
});

test("phSetPaymentStatus updates the payment status", () => {
  const { window, user } = bootPage(USER_PAGE, ["utils.js"], "user");
  window.phSetPaymentStatus(user.id, "Paid");
  assert.equal(
    window.getPaperHubDataset().users.find((u) => u.id === user.id).payment.status,
    "Paid",
  );
});

test("phDeleteFile removes the file everywhere and drops its review", () => {
  const { window, user } = bootPage(USER_PAGE, ["utils.js"], "user");
  const target = window.getPaperHubDataset().users.find((u) => u.id === user.id).files[0];
  window.phDeleteFile(target.id);
  const ds = window.getPaperHubDataset();
  assert.ok(!ds.files.some((f) => f.id === target.id));
  assert.ok(!ds.users.find((u) => u.id === user.id).files.some((f) => f.id === target.id));
  assert.ok(!ds.reviewQueue.some((r) => r.fileId === target.id));
});

test("mutations persist across a reload when the store version matches", () => {
  const store = {};
  const a = bootPage(USER_PAGE, ["utils.js"], "user", store);
  a.window.phUpdateUser("user-mahmud.hasan", { name: "Persisted" });

  const b = bootPage(USER_PAGE, ["utils.js"], "user", store);
  assert.equal(
    b.window.getPaperHubDataset().users.find((u) => u.id === "user-mahmud.hasan").name,
    "Persisted",
  );
});

test("a stale store version is discarded and the seed is reloaded fresh", () => {
  const store = {};
  const a = bootPage(USER_PAGE, ["utils.js"], "user", store);
  a.window.phUpdateUser("user-mahmud.hasan", { name: "Mutated" });
  store["paperhub-db-version"] = "0.0.0-stale";

  const b = bootPage(USER_PAGE, ["utils.js"], "user", store);
  const seedName = seedDataset().users.find((u) => u.id === "user-mahmud.hasan").name;
  assert.equal(
    b.window.getPaperHubDataset().users.find((u) => u.id === "user-mahmud.hasan").name,
    seedName,
  );
});
