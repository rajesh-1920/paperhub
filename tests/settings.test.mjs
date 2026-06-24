import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

test("settings page binds the current user's profile, status and synced stats", () => {
  const { window, document } = bootPage(
    "public/pages/account/settings.html",
    ["utils.js", "main.js"],
    "user",
  );
  window.applyCurrentUserPageData();

  assert.notEqual(document.querySelector("[data-user-name]").textContent, "—", "name bound");
  assert.match(document.querySelector("[data-user-email]").textContent, /@/, "email bound");
  assert.ok(
    document.querySelector("[data-user-account-status]").textContent.trim().length > 0,
    "account status bound (not the placeholder attribute)",
  );

  // The stat grid renders the embedded user.dashboard.stats, which the mutators
  // now keep in sync with the user's active files.
  const user = window.getCurrentUserData();
  const grid = document.querySelector("[data-user-dashboard-stats]");
  assert.match(grid.textContent, new RegExp(`\\b${user.dashboard.stats.totalSubmissions}\\b`));
});

test("settings stats reflect a change made on another page (cross-page sync)", () => {
  const shared = {};
  const up = bootPage("public/pages/dashboard/user.html", ["utils.js"], "user", shared);
  const user = up.window.getPaperHubDataset().users.find((u) => u.role === "user");
  const before = up.window.getPaperHubDataset().users.find((u) => u.id === user.id).dashboard
    .stats.totalSubmissions;

  up.window.phAddFile(
    { id: "file-x", name: "x.pdf", status: "pending", ownerId: user.id, ownerName: user.name },
    { id: "file-x-r", fileId: "file-x", documentName: "x.pdf" },
  );

  // Fresh settings page hitting the same shared "server".
  const settings = bootPage(
    "public/pages/account/settings.html",
    ["utils.js", "main.js"],
    "user",
    shared,
  );
  settings.window.applyCurrentUserPageData();

  const grid = settings.document.querySelector("[data-user-dashboard-stats]");
  assert.match(grid.textContent, new RegExp(`\\b${before + 1}\\b`), "settings shows the new count");
});
