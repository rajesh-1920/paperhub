import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => {
  const ctx = bootPage("public/pages/file/files.html", ["utils.js", "main.js", "file.js"], "user");
  ctx.window.confirm = () => true;
  ctx.window.initFileDetailsPage();
  return ctx;
};

const folderLabels = (document) =>
  [...document.querySelectorAll("#folderList .folder-open")].map((b) => b.textContent);
const rowCount = (document) => document.querySelectorAll("#fileTableBody tr").length;

test("folders: create adds a folder to the panel and the move dropdown", () => {
  const { window, document } = boot();
  const input = document.getElementById("folderNameInput");
  input.value = "Tax Papers";
  document
    .getElementById("folderCreateForm")
    .dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  assert.ok(folderLabels(document).includes("Tax Papers"), "folder shown in the panel");
  const created = window
    .phListFolders(window.getCurrentUserData().id)
    .find((f) => f.name === "Tax Papers");
  assert.ok(created, "folder persisted");
  // The move dropdown labels by path, so match on the option's value (folder id).
  const moveValues = [...document.querySelectorAll("#fileBulkFolder option")].map((o) => o.value);
  assert.ok(moveValues.includes(created.id), "folder shown in the move dropdown");
});

test("folders: clicking a folder filters the table; All files clears it", () => {
  const { window, document } = boot();
  const uid = window.getCurrentUserData().id;
  const folder = window.phAddFolder({ name: "Bucket", ownerId: uid });
  const victim = window.getCurrentUserFiles().filter((f) => !f.deletedAt)[0];
  window.phMoveFiles([victim.id], folder.id);
  window.loadFileList();

  [...document.querySelectorAll("#folderList .folder-open")]
    .find((b) => b.textContent === "Bucket")
    .click();
  assert.equal(rowCount(document), 1, "only the file inside the folder is shown");

  document.querySelector('[data-folder-open=""]').click(); // "All files"
  assert.ok(rowCount(document) > 1, "all files shown again");
});

test("folders: rename updates the folder name everywhere", () => {
  const { window, document } = boot();
  const folder = window.phAddFolder({ name: "Old Name", ownerId: window.getCurrentUserData().id });
  window.loadFileList();
  window.prompt = () => "New Name";

  document.querySelector(`[data-folder-rename="${folder.id}"]`).click();

  assert.equal(window.phGetFolder(folder.id).name, "New Name", "folder renamed in the data");
  const labels = folderLabels(document);
  assert.ok(labels.includes("New Name") && !labels.includes("Old Name"), "panel reflects rename");
});

test("folders: delete removes the folder and rehomes its files to the parent", () => {
  const { window, document } = boot();
  const uid = window.getCurrentUserData().id;
  const folder = window.phAddFolder({ name: "Temp", ownerId: uid });
  const victim = window.getCurrentUserFiles().filter((f) => !f.deletedAt)[0];
  window.phMoveFiles([victim.id], folder.id);
  window.loadFileList();
  window.confirm = () => true;

  document.querySelector(`[data-folder-delete="${folder.id}"]`).click();

  assert.equal(window.phGetFolder(folder.id), null, "folder removed");
  const moved = window.getCurrentUserFiles().find((f) => f.id === victim.id);
  assert.equal(moved.folderId || null, null, "file rehomed to root (no orphan)");
  assert.ok(!folderLabels(document).includes("Temp"), "folder gone from the panel");
});
