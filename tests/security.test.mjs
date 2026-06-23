import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const USER_PAGE = "public/pages/dashboard/user.html";

test("escapeHtml neutralizes HTML control characters", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const out = window.escapeHtml('<img src=x onerror="alert(1)">');
  assert.ok(!out.includes("<img"), "angle brackets escaped");
  assert.match(out, /&lt;img/);
  assert.ok(out.includes("&quot;") || out.includes("&#39;"), "quotes escaped");
});

test("version history escapes a malicious file name (no XSS injection)", () => {
  const { window, document, user } = bootPage(
    "public/pages/file/version-history.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );

  window.phAddFile({
    id: "file-xss",
    name: '<img src=x onerror="alert(1)">.pdf',
    status: "pending",
    ownerId: user.id,
    ownerName: user.name,
    uploadedAt: new Date().toISOString(),
    size: 1024,
    hasContent: true,
  });

  window.loadVersionHistory();
  // The malicious name must never be parsed into a live element.
  assert.equal(document.querySelectorAll("img").length, 0, "no injected <img> element");
  const nameEl = document.querySelector("[data-version-file-name]");
  assert.ok(nameEl && nameEl.textContent.includes("<img"), "name rendered as literal text");
});

test("phSetReviewStatus ignores invalid status values", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const review = window.getPaperHubDataset().reviewQueue[0];
  const before = review.status;
  window.phSetReviewStatus(review.id, "h4cked");
  assert.equal(window.getPaperHubDataset().reviewQueue[0].status, before, "status left unchanged");
});

test("phAddReviewComment rejects empty text and caps long text", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  const id = window.getPaperHubDataset().reviewQueue[0].id;
  const before = window.getPaperHubDataset().reviewQueue[0].comments.length;

  window.phAddReviewComment(id, { text: "   " });
  assert.equal(
    window.getPaperHubDataset().reviewQueue[0].comments.length,
    before,
    "empty comment rejected",
  );

  window.phAddReviewComment(id, { author: "A", text: "x".repeat(5000) });
  const last = window.getPaperHubDataset().reviewQueue[0].comments.at(-1);
  assert.ok(last.text.length <= 2000, "comment length capped");
});

test("phSanitizeName strips control characters and clamps length", () => {
  const { window } = bootPage(USER_PAGE, ["utils.js"], "user");
  assert.equal(window.phSanitizeName("a\u0000b\u001fc"), "abc");
  assert.equal(window.phSanitizeName("x".repeat(500)).length, 255);
});
