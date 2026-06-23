import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
const OWNER = "user-mahmud.hasan";

test("folders: add builds a materialized path and persists", () => {
  const { window } = boot();
  const root = window.phAddFolder({ name: "Reports", ownerId: OWNER });
  assert.equal(root.path, "/Reports");
  assert.equal(root.parentId, null);

  const child = window.phAddFolder({ name: "2026", parentId: root.id, ownerId: OWNER });
  assert.equal(child.path, "/Reports/2026");

  // Persisted to the (stubbed) backend.
  assert.ok(window.getPaperHubDataset().folders.some((f) => f.id === child.id));
  assert.equal(window.phListFolders(OWNER).length, 2);
});

test("folders: rename reindexes descendant paths", () => {
  const { window } = boot();
  const root = window.phAddFolder({ name: "Reports", ownerId: OWNER });
  const child = window.phAddFolder({ name: "2026", parentId: root.id, ownerId: OWNER });

  assert.equal(window.phRenameFolder(root.id, "Archive"), true);
  assert.equal(window.phGetFolder(root.id).path, "/Archive");
  assert.equal(window.phGetFolder(child.id).path, "/Archive/2026", "descendant path updated");
});

test("folders: delete reparents children and rehomes files", () => {
  const { window } = boot();
  const root = window.phAddFolder({ name: "Reports", ownerId: OWNER });
  const child = window.phAddFolder({ name: "2026", parentId: root.id, ownerId: OWNER });

  // Put a file in the parent folder.
  const dataset = window.getPaperHubDataset();
  dataset.files.push({ id: "file-fdr", name: "x.pdf", ownerId: OWNER, folderId: root.id });

  assert.equal(window.phDeleteFolder(root.id), true);
  assert.equal(window.phGetFolder(root.id), null, "folder removed");
  assert.equal(window.phGetFolder(child.id).parentId, null, "child reparented to root");
  assert.equal(window.phGetFolder(child.id).path, "/2026");
  assert.equal(
    window.getPaperHubDataset().files.find((f) => f.id === "file-fdr").folderId,
    null,
    "file rehomed to root",
  );
});

test("folders: listing is owner-scoped and ignores soft-deleted", () => {
  const { window } = boot();
  window.phAddFolder({ name: "Mine", ownerId: OWNER });
  window.phAddFolder({ name: "Theirs", ownerId: "user-someone-else" });
  const dataset = window.getPaperHubDataset();
  dataset.folders.push({ id: "f-del", name: "Gone", ownerId: OWNER, deletedAt: "2026-01-01" });

  const mine = window.phListFolders(OWNER);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].name, "Mine");
});
