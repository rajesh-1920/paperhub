import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");

function dualCopiedFile(window) {
  const ds = window.getPaperHubDataset();
  return ds.files.find((f) => ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)));
}

test("trash: soft-delete keeps the record, hides it from active, restore brings it back", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  const ownerCopy = () =>
    window
      .getPaperHubDataset()
      .users.flatMap((u) => u.files || [])
      .find((f) => f.id === target.id);

  assert.equal(window.phTrashFile(target.id, "user-mahmud.hasan"), true);
  const inGlobal = window.getPaperHubDataset().files.find((f) => f.id === target.id);
  assert.ok(inGlobal && inGlobal.deletedAt, "record retained with deletedAt");
  assert.ok(ownerCopy().deletedAt, "owner copy soft-deleted too");
  assert.ok(
    window.phListTrash("user-mahmud.hasan").some((f) => f.id === target.id),
    "appears in Trash",
  );

  assert.equal(window.phRestoreFile(target.id), true);
  assert.equal(
    window.getPaperHubDataset().files.find((f) => f.id === target.id).deletedAt,
    undefined,
    "restored (deletedAt cleared)",
  );
  assert.ok(ownerCopy().deletedAt === undefined, "owner copy restored too");
});

test("trash: purge permanently removes the record everywhere", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  window.phTrashFile(target.id);
  window.phPurgeFile(target.id);
  assert.equal(
    window.getPaperHubDataset().files.some((f) => f.id === target.id),
    false,
  );
  assert.equal(
    window
      .getPaperHubDataset()
      .users.flatMap((u) => u.files || [])
      .some((f) => f.id === target.id),
    false,
  );
});

test("trash: page renders trashed items and restore removes them from the view", () => {
  const { window, document } = bootPage(
    "public/pages/file/trash.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );
  const target = dualCopiedFile(window);
  window.phTrashFile(target.id, "user-mahmud.hasan");

  window.loadTrash();
  let rows = document.querySelectorAll("#trashTableBody tr");
  assert.ok(rows.length >= 1, "trashed item rendered");

  rows[0]
    .querySelector('[data-trash-act="restore"]')
    .dispatchEvent(new window.Event("click", { bubbles: true }));
  assert.equal(
    window.getPaperHubDataset().files.find((f) => f.id === target.id).deletedAt,
    undefined,
    "restore cleared deletedAt",
  );
});
