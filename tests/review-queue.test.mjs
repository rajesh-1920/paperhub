import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () =>
  bootPage(
    "public/pages/review/review-queue.html",
    ["utils.js", "review.js", "main.js"],
    "officer",
  );

// Text of the rendered queue under a given filter.
function bodyFor(window, document, filter) {
  const btn = document.querySelector(`[data-filter="${filter}"]`);
  if (btn) btn.click();
  else window.refreshReviewQueue();
  return document.getElementById("reviewTableBody").textContent;
}

test("review queue: an approved document disappears from every queue view", () => {
  const { window, document } = boot();
  window.initReviewQueuePage();

  const review = window.getPaperHubDataset().reviewQueue.find((r) => r.status === "pending");
  assert.ok(review, "fixture has a pending review");
  assert.ok(
    document.getElementById("reviewTableBody").textContent.includes(review.documentName),
    "pending review is in the queue",
  );

  window.phSetReviewStatus(review.id, "completed"); // officer approves
  window.refreshReviewQueue();

  for (const filter of ["all", "high", "pending", "in-review"]) {
    assert.ok(
      !bodyFor(window, document, filter).includes(review.documentName),
      `approved review is gone from the "${filter}" view`,
    );
  }
  // There is no "decided" tab to surface it.
  assert.equal(document.querySelector('[data-filter="decided"]'), null);
});

test("review details: a decided document offers no approve/reject (can't be re-decided)", () => {
  const shared = {};
  const queue = bootPage(
    "public/pages/review/review-queue.html",
    ["utils.js", "review.js", "main.js"],
    "officer",
    shared,
  );
  const review = queue.window.getPaperHubDataset().reviewQueue.find((r) => r.status === "pending");
  queue.window.phSetReviewStatus(review.id, "completed"); // decide it

  // Open the (now-decided) review's details page directly (deep link).
  const details = bootPage(
    "public/pages/review/review-details.html",
    ["utils.js", "review.js", "main.js"],
    "officer",
    shared,
    `http://localhost/pages/review/review-details.html?id=${review.id}`,
  );
  details.window.initReviewDetailsPage();

  const actionBar = details.document.querySelector("[data-review-action-bar]");
  assert.ok(actionBar, "action bar exists");
  assert.ok(
    actionBar.classList.contains("hidden"),
    "decided document hides approve/reject/forward",
  );
});

test("review queue: a rejected document also disappears from every queue view", () => {
  const { window, document } = boot();
  window.initReviewQueuePage();

  const review = window
    .getPaperHubDataset()
    .reviewQueue.find((r) => r.status === "pending" || r.status === "in-review");
  assert.ok(review, "fixture has an actionable review");

  window.phSetReviewStatus(review.id, "rejected"); // officer rejects
  for (const filter of ["all", "pending", "in-review"]) {
    assert.ok(
      !bodyFor(window, document, filter).includes(review.documentName),
      `rejected review is gone from the "${filter}" view`,
    );
  }
});
