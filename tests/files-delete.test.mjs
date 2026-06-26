import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => {
  const ctx = bootPage("public/pages/file/files.html", ["utils.js", "main.js", "file.js"], "user");
  ctx.window.confirm = () => true; // auto-accept "Move to Trash?" dialogs
  ctx.window.initFileDetailsPage();
  return ctx;
};

const rowCount = (document) => document.querySelectorAll("#fileTableBody tr").length;

test("files: trashing your files removes them from the shared list (no reappear)", () => {
  const { window, document } = boot();
  assert.ok(rowCount(document) > 0, "starts with files");

  // Trash every one of the user's own files, then reload the list.
  const myIds = window
    .getCurrentUserFiles()
    .filter((f) => !f.deletedAt)
    .map((f) => f.id);
  assert.ok(myIds.length > 0, "the user owns some files");
  window.phTrashFiles(myIds);
  window.loadFileList();

  // The files page is a shared space, so other owners' files remain — but the
  // page must render exactly the non-trashed set: none of the just-trashed files
  // may linger (a deleted file reappearing reads as "delete isn't working").
  const activeCount = window.getPaperHubDataset().files.filter((f) => !f.deletedAt).length;
  assert.equal(rowCount(document), activeCount, "list shows every non-trashed file, no more");
  assert.ok(
    myIds.every((id) => window.getPaperHubDataset().files.find((f) => f.id === id)?.deletedAt),
    "every trashed file is gone from the active list",
  );
});

test("files: select-all + bulk delete trashes only the user's own rows", () => {
  const { window, document } = boot();
  const before = rowCount(document);
  assert.ok(before > 0, "starts with files");
  const myActive = window
    .getCurrentUserFiles()
    .filter((f) => !f.deletedAt)
    .map((f) => f.id);
  assert.ok(myActive.length > 0, "the user owns some files");

  const selectAll = document.getElementById("fileSelectAll");
  selectAll.checked = true;
  selectAll.dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("fileBulkDelete").click();

  // Select-all spans the whole shared list, but a regular user may only trash
  // their OWN files; other owners' rows must survive the bulk delete.
  const activeCount = window.getPaperHubDataset().files.filter((f) => !f.deletedAt).length;
  assert.equal(rowCount(document), activeCount, "other owners' files remain");
  assert.ok(rowCount(document) < before, "the user's own rows are gone");
  const uid = window.getCurrentUserData().id;
  const trashIds = new Set(window.phListTrash(uid).map((f) => f.id));
  assert.ok(
    myActive.every((id) => trashIds.has(id)),
    "every owned file moved to Trash",
  );
});

test("files: meta-panel delete of the selected file removes exactly that row", () => {
  const { window, document } = boot();
  const before = rowCount(document);
  // Delete only shows for files the user owns, so select a row for an owned file.
  const myId = window.getCurrentUserData().id;
  const ds = window.getPaperHubDataset();
  const ownRow = [...document.querySelectorAll("#fileTableBody tr")].find((tr) => {
    const fid = tr.querySelector(".file-row-select")?.getAttribute("data-file-select");
    const f = ds.files.find((x) => x.id === fid);
    return f && f.ownerId === myId && !f.deletedAt;
  });
  assert.ok(ownRow, "a row for an owned file exists");
  ownRow.click(); // select it
  const selected = window.getSelectedFile();
  assert.ok(selected && selected.ownerId === myId, "an owned file is selected");

  document.getElementById("metaDeleteBtn").click();

  assert.equal(rowCount(document), before - 1, "exactly one row removed");
  assert.ok(
    !window
      .getCurrentUserFiles()
      .filter((f) => !f.deletedAt)
      .some((f) => f.id === selected.id),
    "the deleted file is no longer active",
  );
});

test("files: the page links to the Trash so deleted files are findable", () => {
  const { document } = boot();
  const link = document.querySelector('.file-trash-link[data-app-href="pages/file/trash.html"]');
  assert.ok(link, "a Trash link is present in the files-page header");
  assert.match(link.getAttribute("href"), /\/pages\/file\/trash\.html$/);
});

test("files: a file trashed only in the global store still leaves the list (desync guard)", () => {
  const { window, document } = boot();
  const before = document.querySelectorAll("#fileTableBody tr").length;
  const victim = window.getCurrentUserFiles().filter((f) => !f.deletedAt)[0];

  // Simulate a copy desync: mark ONLY the global dataset.files copy as trashed,
  // leaving the embedded user.files copy without deletedAt.
  window.getPaperHubDataset().files.find((f) => f.id === victim.id).deletedAt =
    "2026-01-01T00:00:00.000Z";
  window.loadFileList();

  const rendered = [...document.querySelectorAll("#fileTableBody .file-name-cell")].map(
    (n) => n.textContent,
  );
  assert.ok(!rendered.includes(victim.name), "globally-trashed file does not linger on the page");
  assert.equal(document.querySelectorAll("#fileTableBody tr").length, before - 1);
});

test("files: a file present only in the global list (owned by me) still shows", () => {
  const { window, document } = boot();
  const uid = window.getCurrentUserData().id;
  // Desync: add to dataset.files only, NOT the embedded user.files.
  window.getPaperHubDataset().files.unshift({
    id: "ghost-1",
    name: "ZZZ-ghost.pdf",
    ownerId: uid,
    status: "pending",
    size: 100,
  });
  assert.ok(
    window.getCurrentUserFiles().some((f) => f.id === "ghost-1"),
    "global-only owned file is surfaced by getCurrentUserFiles",
  );
  window.loadFileList();
  const names = [...document.querySelectorAll("#fileTableBody .file-name-cell")].map(
    (n) => n.textContent,
  );
  assert.ok(names.includes("ZZZ-ghost.pdf"), "and it renders on the files page");
});
