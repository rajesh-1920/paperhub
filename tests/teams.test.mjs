import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
const OWNER = "user-mahmud.hasan";

test("teams: create adds the owner as a manager", () => {
  const { window } = boot();
  const team = window.phCreateTeam({ name: "Reviewers", ownerId: OWNER });
  assert.ok(team && team.id);
  assert.equal(team.members.length, 1);
  assert.equal(team.members[0].userId, OWNER);
  assert.equal(team.members[0].role, "manager");
  assert.equal(window.phListMyTeams(OWNER).length, 1);
});

test("teams: add, update-role and remove members", () => {
  const { window } = boot();
  const team = window.phCreateTeam({ name: "T", ownerId: OWNER });

  assert.equal(window.phAddTeamMember(team.id, "user-x", "member"), true);
  assert.equal(window.phGetTeam(team.id).members.length, 2);
  assert.equal(window.phListMyTeams("user-x").length, 1, "membership grants team listing");

  // Re-adding updates the role, not the count.
  window.phAddTeamMember(team.id, "user-x", "manager");
  assert.equal(window.phGetTeam(team.id).members.length, 2);
  assert.equal(
    window.phGetTeam(team.id).members.find((m) => m.userId === "user-x").role,
    "manager",
  );

  assert.equal(window.phRemoveTeamMember(team.id, "user-x"), true);
  assert.equal(window.phGetTeam(team.id).members.length, 1);
});
