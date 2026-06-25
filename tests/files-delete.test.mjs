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

test("files: deleting your LAST files leaves the list empty (no global fallback)", () => {
  const { window, document } = boot();
  assert.ok(rowCount(document) > 0, "starts with files");

  // Trash every one of the user's files, then reload the list.
  const ids = window
    .getCurrentUserFiles()
    .filter((f) => !f.deletedAt)
    .map((f) => f.id);
  window.phTrashFiles(ids);
  window.loadFileList();

  // Regression: previously loadFileList fell back to a global file list when the
  // owned set was empty, so every file reappeared and delete looked broken.
  assert.equal(rowCount(document), 0, "no files reappear after deleting them all");
});

test("files: select-all + bulk delete removes the rows and they stay gone", () => {
  const { window, document } = boot();
  const before = rowCount(document);
  assert.ok(before > 0, "starts with files");

  const selectAll = document.getElementById("fileSelectAll");
  selectAll.checked = true;
  selectAll.dispatchEvent(new window.Event("change", { bubbles: true }));
  document.getElementById("fileBulkDelete").click();

  assert.equal(rowCount(document), 0, "all rows deleted and do not come back");
  const uid = window.getCurrentUserData().id;
  assert.equal(window.phListTrash(uid).length, before, "every deleted file is in Trash");
});

test("files: meta-panel delete of the selected file removes exactly that row", () => {
  const { window, document } = boot();
  const before = rowCount(document);
  document.querySelector("#fileTableBody tr").click(); // select first row
  const selected = window.getSelectedFile();
  assert.ok(selected, "a file is selected");

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
