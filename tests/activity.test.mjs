import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

test("activity: the view renders audit-log entries", async () => {
  const { window, document, server } = bootPage(
    "public/pages/account/activity.html",
    ["utils.js", "main.js", "activity.js"],
    "user",
  );
  server.dataset.auditLog = [
    {
      id: "evt-1",
      ts: "2026-01-02T00:00:00.000Z",
      action: "file.upload",
      actorName: "Mahmud",
      resourceName: "report.pdf",
    },
    {
      id: "evt-2",
      ts: "2026-01-03T00:00:00.000Z",
      action: "share.create",
      actorName: "Mahmud",
      resourceName: "report.pdf",
    },
  ];

  await window.loadActivityLog();
  const rows = document.querySelectorAll("#activityLogBody tr");
  assert.equal(rows.length, 2, "both events rendered");
  assert.match(document.getElementById("activityLogBody").textContent, /Uploaded a file/);
  assert.match(document.getElementById("activityLogBody").textContent, /Created a share link/);
});

test("activity: logActivityViaApi posts an event to the audit endpoint", async () => {
  const { window, server } = bootPage(
    "public/pages/account/activity.html",
    ["utils.js", "main.js", "activity.js"],
    "user",
  );
  window.logActivityViaApi("file.trash", { resourceName: "old.pdf" });
  await new Promise((r) => setTimeout(r, 5));
  assert.ok(
    (server.dataset.auditLog || []).some((e) => e.action === "file.trash"),
    "event recorded via the API",
  );
});
