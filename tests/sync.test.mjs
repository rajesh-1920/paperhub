import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const USER_PAGE = "public/pages/dashboard/user.html";

const userFileStatus = (ds, fileId) =>
  ds.users.flatMap((u) => u.files || []).find((f) => f.id === fileId)?.status;

test("review -> file: approving a review syncs the file status in every copy", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const review = window
    .getPaperHubDataset()
    .reviewQueue.find((r) => r.fileId && r.status !== "completed");
  assert.ok(review, "a non-completed review with a fileId exists");

  window.phSetReviewStatus(review.id, "completed");

  const ds = window.getPaperHubDataset();
  // review status updated in the queue and in every user's reviews
  assert.equal(ds.reviewQueue.find((r) => r.id === review.id).status, "completed");
  ds.users.forEach((u) =>
    (u.reviews || []).forEach((r) => {
      if (r.id === review.id) assert.equal(r.status, "completed");
    }),
  );
  // file status updated in the global list and the owner's copy
  assert.equal(ds.files.find((f) => f.id === review.fileId).status, "completed");
  assert.equal(userFileStatus(ds, review.fileId), "completed");
});

test("file -> review: changing a file status syncs its linked review", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const link = window.getPaperHubDataset().reviewQueue.find((r) => r.fileId);

  window.phUpdateFileStatus(link.fileId, "rejected");

  const ds = window.getPaperHubDataset();
  assert.equal(ds.files.find((f) => f.id === link.fileId).status, "rejected");
  assert.equal(userFileStatus(ds, link.fileId), "rejected");
  assert.equal(ds.reviewQueue.find((r) => r.id === link.id).status, "rejected");
});

test("status mutations keep dashboardStats counts in sync", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const review = window
    .getPaperHubDataset()
    .reviewQueue.find((r) => r.fileId && r.status !== "completed");

  window.phSetReviewStatus(review.id, "completed");

  const ds = window.getPaperHubDataset();
  assert.equal(ds.dashboardStats.totalDocuments, ds.files.length);
  assert.equal(
    ds.dashboardStats.processedDocuments,
    ds.files.filter((f) => f.status === "completed").length,
  );
  assert.equal(
    ds.dashboardStats.pendingReview,
    ds.files.filter((f) => f.status === "pending" || f.status === "reviewing").length,
  );
});

test("per-user embedded dashboard.stats stay in sync (settings/profile pages)", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const user = window.getPaperHubDataset().users.find((u) => u.role === "user");
  const activeCount = () =>
    window
      .getPaperHubDataset()
      .users.find((u) => u.id === user.id)
      .files.filter((f) => !f.deletedAt).length;
  const embedded = () =>
    window.getPaperHubDataset().users.find((u) => u.id === user.id).dashboard.stats
      .totalSubmissions;

  const start = activeCount();

  window.phAddFile(
    { id: "file-sync", name: "new.pdf", status: "pending", ownerId: user.id, ownerName: user.name },
    { id: "file-sync-r", fileId: "file-sync", documentName: "new.pdf" },
  );
  assert.equal(embedded(), start + 1, "upload updates the embedded count");

  window.phTrashFile("file-sync");
  assert.equal(embedded(), start, "trashing updates the embedded count");
});

test("paperhub:change fires on every write and triggers the registered refresh", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  let refreshed = 0;
  window.setPaperHubRefresh(() => {
    refreshed += 1;
  });

  window.phUpdateUser("user-mahmud.hasan", { name: "Changed" });
  assert.ok(refreshed >= 1, "refresh callback invoked after a change");
});
