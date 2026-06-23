import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");

// A file present in BOTH dataset.files and its owner's user.files (separate
// objects from the JSON round-trip) — so we can prove the copies stay in sync.
function dualCopiedFile(window) {
  const ds = window.getPaperHubDataset();
  return ds.files.find((f) => ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)));
}
const ownerCopyOf = (window, id) =>
  window
    .getPaperHubDataset()
    .users.flatMap((u) => u.files || [])
    .find((f) => f.id === id);

test("files: rename updates every copy", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  assert.ok(target, "a dual-copied file exists in the fixture");

  assert.equal(window.phRenameFile(target.id, "Renamed Report.pdf"), true);
  assert.equal(
    window.getPaperHubDataset().files.find((f) => f.id === target.id).name,
    "Renamed Report.pdf",
  );
  assert.equal(ownerCopyOf(window, target.id).name, "Renamed Report.pdf", "owner copy synced");
});

test("files: move sets folderId on every copy", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  const folder = window.phAddFolder({ name: "Box", ownerId: target.ownerId });

  assert.equal(window.phMoveFile(target.id, folder.id), true);
  assert.equal(
    window.getPaperHubDataset().files.find((f) => f.id === target.id).folderId,
    folder.id,
  );
  assert.equal(ownerCopyOf(window, target.id).folderId, folder.id, "owner copy moved too");

  assert.equal(window.phMoveFile(target.id, null), true);
  assert.equal(window.getPaperHubDataset().files.find((f) => f.id === target.id).folderId, null);
});

test("files: copy creates a distinct duplicate record", () => {
  const { window } = boot();
  const src = dualCopiedFile(window);
  const before = window.getPaperHubDataset().files.length;

  const copy = window.phCopyFile(src.id, null);
  assert.ok(copy && copy.id !== src.id, "new id assigned");
  assert.match(copy.name, /\(copy\)/, "name marked as a copy");
  assert.equal(window.getPaperHubDataset().files.length, before + 1, "added to the global list");
  assert.ok(ownerCopyOf(window, copy.id), "added to the owner's list");
});
