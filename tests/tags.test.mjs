import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
const OWNER = "user-mahmud.hasan";

function dualCopiedFile(window) {
  const ds = window.getPaperHubDataset();
  return ds.files.find((f) => ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)));
}

test("tags: create is idempotent by slug", () => {
  const { window } = boot();
  const a = window.phCreateTag({ label: "Important" });
  const b = window.phCreateTag({ label: "  important " });
  assert.equal(a.id, b.id, "same slug returns the same tag");
  assert.equal(a.slug, "important");
  assert.equal(window.phListTags().filter((t) => t.slug === "important").length, 1);
});

test("tags: tag and untag a file across every copy", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  const tag = window.phCreateTag({ label: "Reviewed" });

  assert.equal(window.phTagFile(target.id, tag.id), true);
  const ds = () => window.getPaperHubDataset();
  const globalCopy = () => ds().files.find((f) => f.id === target.id);
  const ownerCopy = () =>
    ds()
      .users.flatMap((u) => u.files || [])
      .find((f) => f.id === target.id);
  assert.ok(globalCopy().tagIds.includes(tag.id));
  assert.ok(ownerCopy().tagIds.includes(tag.id), "owner copy tagged too");

  // Resolve back to tag objects.
  assert.equal(window.phResolveTags(globalCopy().tagIds)[0].label, "Reviewed");

  assert.equal(window.phUntagFile(target.id, tag.id), true);
  assert.ok(!globalCopy().tagIds.includes(tag.id));
  assert.ok(!ownerCopy().tagIds.includes(tag.id));
});

test("tags: tag and untag a folder", () => {
  const { window } = boot();
  const folder = window.phAddFolder({ name: "Box", ownerId: OWNER });
  const tag = window.phCreateTag({ label: "Archive" });

  assert.equal(window.phTagFolder(folder.id, tag.id), true);
  assert.ok(window.phGetFolder(folder.id).tagIds.includes(tag.id));

  assert.equal(window.phUntagFolder(folder.id, tag.id), true);
  assert.ok(!window.phGetFolder(folder.id).tagIds.includes(tag.id));
});
