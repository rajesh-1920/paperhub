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
