import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () =>
  bootPage(
    "public/pages/review/review-queue.html",
    ["utils.js", "review.js", "main.js"],
    "officer",
  );

test("review queue: approving a document moves it out of the active queue into Decided", () => {
  const { window, document } = boot();
  window.initReviewQueuePage();
  const body = () => document.getElementById("reviewTableBody").textContent;

  const review = window.getPaperHubDataset().reviewQueue.find((r) => r.status === "pending");
  assert.ok(review, "fixture has a pending review");
  assert.ok(body().includes(review.documentName), "pending review is in the active queue");

  window.phSetReviewStatus(review.id, "completed"); // officer approves
  window.refreshReviewQueue();
  assert.ok(!body().includes(review.documentName), "approved review left the active queue");

  document.querySelector('[data-filter="decided"]').click();
  assert.ok(body().includes(review.documentName), "approved review appears under Decided");
});

test("review queue: rejecting a document also removes it from the active queue", () => {
  const { window, document } = boot();
  window.initReviewQueuePage();
  const body = () => document.getElementById("reviewTableBody").textContent;

  const review = window
    .getPaperHubDataset()
    .reviewQueue.find((r) => r.status === "pending" || r.status === "in-review");
  assert.ok(review, "fixture has an actionable review");

  window.phSetReviewStatus(review.id, "rejected"); // officer rejects
  window.refreshReviewQueue();
  assert.ok(!body().includes(review.documentName), "rejected review left the active queue");

  document.querySelector('[data-filter="decided"]').click();
  assert.ok(body().includes(review.documentName), "rejected review appears under Decided");
});
