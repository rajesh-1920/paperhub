import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () =>
  bootPage("public/pages/file/files.html", ["utils.js", "main.js", "file.js"], "user");

test("search: frontend helper hits the endpoint and returns a result page", async () => {
  const { window } = boot();
  const res = await window.searchFilesViaApi({ pageSize: 5 });
  assert.ok(Array.isArray(res.items), "items array returned");
  assert.equal(typeof res.total, "number");
  assert.ok(res.total >= res.items.length);
});

test("bulk UI: selecting rows shows the toolbar and deletes them", async () => {
  const { window, document } = boot();
  await window.loadFileList();
  window.setupBulkActions();

  const boxes = document.querySelectorAll(".file-row-select");
  assert.ok(boxes.length > 0, "rows render with selection checkboxes");

  const id = boxes[0].getAttribute("data-file-select");
  boxes[0].checked = true;
  boxes[0].dispatchEvent(new window.Event("change", { bubbles: true }));

  assert.equal(document.getElementById("fileBulkBar").hidden, false, "toolbar appears");
  assert.match(document.getElementById("fileBulkCount").textContent, /1 selected/);

  document
    .getElementById("fileBulkDelete")
    .dispatchEvent(new window.Event("click", { bubbles: true }));
  const trashed = window.getPaperHubDataset().files.find((f) => f.id === id);
  assert.ok(trashed && trashed.deletedAt, "selected file moved to Trash (soft-deleted)");
});

test("bulk: move/tag/delete apply to every copy and persist once", () => {
  const { window } = boot();
  const ds = window.getPaperHubDataset();
  const dual = ds.files.filter((f) =>
    ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)),
  );
  assert.ok(dual.length >= 2, "fixture has dual-copied files");
  const ids = dual.slice(0, 2).map((f) => f.id);
  const ownerCopy = (id) => ds.users.flatMap((u) => u.files || []).find((f) => f.id === id);

  const folder = window.phAddFolder({ name: "Bulk", ownerId: dual[0].ownerId });
  window.phMoveFiles(ids, folder.id);
  ids.forEach((id) => {
    assert.equal(ds.files.find((f) => f.id === id).folderId, folder.id);
    assert.equal(ownerCopy(id).folderId, folder.id, "owner copy moved");
  });

  const tag = window.phCreateTag({ label: "Batch" });
  window.phTagFiles(ids, tag.id);
  ids.forEach((id) => {
    assert.ok(ds.files.find((f) => f.id === id).tagIds.includes(tag.id));
    assert.ok(ownerCopy(id).tagIds.includes(tag.id), "owner copy tagged");
  });

  window.phDeleteFiles(ids);
  ids.forEach((id) => {
    assert.equal(
      ds.files.find((f) => f.id === id),
      undefined,
      "removed from global list",
    );
    assert.equal(ownerCopy(id), undefined, "removed from owner list");
  });
});
