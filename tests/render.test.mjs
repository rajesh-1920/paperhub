import test from "node:test";
import assert from "node:assert/strict";
import { bootPage, seedDataset } from "./helpers/dom.mjs";

test("admin dashboard renders dynamic stats, user table, activity and infrastructure", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/admin.html",
    ["utils.js", "main.js"],
    "admin",
  );
  window.applyCurrentUserPageData();

  assert.equal(document.querySelector('[data-dashboard-stat="totalUsers"]').textContent, "3");
  assert.equal(document.querySelector('[data-dashboard-stat="documents"]').textContent, "30");
  assert.match(document.querySelector("[data-admin-users]").textContent, /Rajesh Biswas/);
  assert.match(document.querySelector("[data-admin-activity]").textContent, /uploaded/);
  assert.match(document.querySelector("[data-admin-infrastructure]").textContent, /API/);
});

test("officer dashboard renders the pending queue and high-priority highlight", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/officer.html",
    ["utils.js", "main.js"],
    "officer",
  );
  window.applyCurrentUserPageData();

  assert.match(document.querySelector("[data-officer-pending]").textContent, /Mahmud Hasan/);
  assert.match(
    document.querySelector("[data-officer-highlight]").textContent,
    /High-priority queue/,
  );
});

test("user dashboard renders submissions and computes submission health", () => {
  const { window, document } = bootPage(
    "public/pages/dashboard/user.html",
    ["utils.js", "main.js"],
    "user",
  );
  window.applyCurrentUserPageData();

  assert.equal(
    document.querySelector('[data-dashboard-stat="totalSubmissions"]').textContent,
    "16",
  );
  assert.match(document.querySelector("[data-user-submissions]").textContent, /\.pdf/);
  assert.match(document.querySelector("[data-user-health-label]").textContent, /%/);
});

test("files page meta panel reflects the selected file (with empty state)", () => {
  const { window, document, user } = bootPage(
    "public/pages/file/files.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );
  const empty = document.querySelector("#metaEmpty");
  const body = document.querySelector("#metaBody");

  // No selection -> placeholder shown, details hidden.
  window.updateMetaPanel(null);
  assert.ok(!empty.classList.contains("hidden"), "placeholder shown when nothing selected");
  assert.ok(body.classList.contains("hidden"), "details hidden when nothing selected");

  // Select a file -> details shown and populated.
  const file = user.files[0];
  window.updateMetaPanel(file);
  assert.ok(empty.classList.contains("hidden"), "placeholder hidden once a file is selected");
  assert.ok(!body.classList.contains("hidden"), "details shown");
  assert.equal(document.querySelector("#metaName").textContent, file.name);
  assert.equal(document.querySelector("#metaType").textContent, file.fileType);
  assert.equal(document.querySelector("#metaPages").textContent, String(file.pageCount));
  assert.ok(document.querySelector("#metaSize").textContent.length > 0, "size shown");

  // Clearing the selection returns to the empty state.
  window.updateMetaPanel(null);
  assert.ok(body.classList.contains("hidden"), "details hidden again after clearing");
});

test("review details surfaces the underlying document content", () => {
  const { window, document } = bootPage(
    "public/pages/review/review-details.html",
    ["utils.js", "main.js", "review.js"],
    "officer",
  );
  window.hasRole = () => true;
  const review = seedDataset().reviewQueue[0];
  window.renderReviewDetails(review);
  const pre = document.querySelector(".review-document-content");
  assert.ok(pre, "content element rendered");
  assert.equal(pre.textContent.trim(), String(review.content).trim());
});
