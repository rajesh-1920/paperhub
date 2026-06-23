import test from "node:test";
import assert from "node:assert/strict";
import { bootPage, seedDataset } from "./helpers/dom.mjs";

const QUEUE_PAGE = "public/pages/review/review-queue.html";
const USER_PAGE = "public/pages/dashboard/user.html";

test("getReviewById returns null for a missing or empty id", () => {
  const { window } = bootPage(QUEUE_PAGE, ["utils.js", "review.js", "main.js"], "officer");
  assert.equal(window.getReviewById("does-not-exist"), null);
  assert.equal(window.getReviewById(""), null);
  assert.equal(window.getReviewById(null), null);
});

test("getReviewData reflects deletions (no stale module cache)", () => {
  const { window } = bootPage(QUEUE_PAGE, ["utils.js", "review.js", "main.js"], "officer");
  const review = window.getReviewData().find((r) => r.fileId);
  assert.ok(review, "a review with a fileId exists");

  window.phDeleteFile(review.fileId);

  assert.ok(
    !window.getReviewData().some((r) => r.id === review.id),
    "deleted review is gone on the next fresh read",
  );
});

test("getCurrentUserFiles/Payment/Notifications are null-safe when no user resolves", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  // Force getCurrentUserData() to resolve to null: no signed-in user, no stored
  // selection, and no dataset user to fall back to.
  window.getCurrentUser = () => null;
  window.localStorage.clear();
  window.getPaperHubDataset().users = [];

  assert.equal(window.getCurrentUserData(), null, "no user resolves");
  assert.equal(window.getCurrentUserFiles().length, 0, "files default to empty");
  assert.equal(window.getCurrentUserPayment(), null);
  assert.equal(window.getCurrentUserNotifications().length, 0, "notifications default to empty");
});

test("formatFileSize handles 0, negative, NaN, fractional, and normal inputs", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  assert.equal(window.formatFileSize(0), "0 Bytes");
  assert.equal(window.formatFileSize(-100), "0 Bytes");
  assert.equal(window.formatFileSize(NaN), "0 Bytes");
  assert.match(window.formatFileSize(0.5), /Bytes$/, "fractional bytes never produce 'undefined'");
  assert.match(window.formatFileSize(1536), /1\.5 KB/);
});

test("officer dashboard resolves the 'Latest Review' link to a real review id", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/officer.html",
    ["utils.js", "main.js"],
    "officer",
  );
  window.applyCurrentUserPageData();
  const link = document.querySelector("[data-officer-latest-review]");
  assert.ok(link, "latest-review link exists");
  assert.match(
    link.getAttribute("href"),
    /review-details\.html\?id=.+/,
    "link carries a real ?id=",
  );
});

test("addComment renders the persisted, length-capped comment (DOM matches store)", () => {
  const review = seedDataset().reviewQueue[0];
  const { window, document } = bootPage(
    "public/pages/review/review-details.html",
    ["utils.js", "main.js", "review.js"],
    "officer",
    undefined,
    `http://localhost/pages/review/review-details.html?id=${review.id}`,
  );
  window.hasRole = () => true;
  window.initReviewDetailsPage();

  const textarea = document.getElementById("reviewComment");
  assert.ok(textarea, "comment form rendered");
  textarea.value = "x".repeat(3000);
  window.addComment();

  const cards = document.querySelectorAll(".review-comment-list .review-comment-item");
  const renderedText = cards[cards.length - 1].querySelector("p").textContent;
  const persistedText = window
    .getPaperHubDataset()
    .reviewQueue.find((r) => r.id === review.id)
    .comments.at(-1).text;

  assert.ok(renderedText.length <= 2000, "rendered comment is length-capped");
  assert.equal(renderedText, persistedText, "DOM matches the persisted comment");
});
