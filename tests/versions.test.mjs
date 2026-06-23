import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");

function dualCopiedFile(window) {
  const ds = window.getPaperHubDataset();
  return ds.files.find((f) => ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)));
}

test("versions: legacy file with content reports a synthesized v1", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  target.hasContent = true;
  const versions = window.phListVersions(target.id);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].versionLabel, "v1");
  assert.equal(versions[0].contentRef, target.id, "v1 maps to the current binary");
});

test("versions: adding a version updates history and currentVersion across copies", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  const ownerCopy = () =>
    window
      .getPaperHubDataset()
      .users.flatMap((u) => u.files || [])
      .find((f) => f.id === target.id);

  assert.equal(
    window.phAddFileVersion(target.id, {
      versionId: "vabc",
      size: 2048,
      changeNote: "Revised figures",
    }),
    true,
  );

  const versions = window.phListVersions(target.id);
  const latest = versions[versions.length - 1];
  assert.equal(latest.versionId, "vabc");
  assert.equal(latest.changeNote, "Revised figures");
  assert.equal(latest.contentRef, `${target.id}__vabc`);

  const globalCopy = window.getPaperHubDataset().files.find((f) => f.id === target.id);
  assert.equal(globalCopy.currentVersion, "vabc");
  assert.equal(ownerCopy().currentVersion, "vabc", "owner copy got the new current version");
  assert.equal(ownerCopy().versionCount, globalCopy.versionCount);
});
