import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");

function dualCopiedFile(window) {
  const ds = window.getPaperHubDataset();
  return ds.files.find((f) => ds.users.some((u) => (u.files || []).some((x) => x.id === f.id)));
}

test("acl: grant, upsert and revoke file access across copies", () => {
  const { window } = boot();
  const target = dualCopiedFile(window);
  const ownerCopy = () =>
    window
      .getPaperHubDataset()
      .users.flatMap((u) => u.files || [])
      .find((f) => f.id === target.id);

  assert.equal(
    window.phGrantFileAccess(target.id, {
      principalType: "user",
      principalId: "user-x",
      permission: "edit",
    }),
    true,
  );
  assert.equal(window.phListFileGrants(target.id).length, 1);
  assert.equal(window.phListFileGrants(target.id)[0].permission, "edit");
  assert.equal(ownerCopy().acl.length, 1, "owner copy carries the grant too");

  // Re-granting the same principal replaces (no duplicate).
  window.phGrantFileAccess(target.id, {
    principalType: "user",
    principalId: "user-x",
    permission: "view",
  });
  assert.equal(window.phListFileGrants(target.id).length, 1);
  assert.equal(window.phListFileGrants(target.id)[0].permission, "view");

  // Invalid grant rejected.
  assert.equal(window.phGrantFileAccess(target.id, { principalType: "nope" }), false);

  assert.equal(window.phRevokeFileAccess(target.id, "user", "user-x"), true);
  assert.equal(window.phListFileGrants(target.id).length, 0);
});

test("acl: grant and revoke on a folder", () => {
  const { window } = boot();
  const folder = window.phAddFolder({ name: "Shared", ownerId: "user-mahmud.hasan" });

  assert.equal(
    window.phGrantFolderAccess(folder.id, {
      principalType: "role",
      principalId: "officer",
      permission: "view",
    }),
    true,
  );
  assert.equal(window.phListFolderGrants(folder.id).length, 1);

  assert.equal(window.phRevokeFolderAccess(folder.id, "role", "officer"), true);
  assert.equal(window.phListFolderGrants(folder.id).length, 0);
});
