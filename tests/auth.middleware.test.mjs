import test from "node:test";
import assert from "node:assert/strict";
import { requireAuth, optionalAuth, authorize } from "../server/middleware/auth.js";
import { canAccessResource, isOwner } from "../server/auth/ownership.js";
import { signAccessToken } from "../server/auth/tokens.js";

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const bearer = (account) => ({ headers: { authorization: `Bearer ${signAccessToken(account)}` } });

test("requireAuth rejects missing/invalid tokens and accepts valid ones", () => {
  const noToken = mockRes();
  requireAuth({ headers: {} }, noToken, () => assert.fail("should not call next"));
  assert.equal(noToken.statusCode, 401);

  const bad = mockRes();
  requireAuth({ headers: { authorization: "Bearer not.a.jwt" } }, bad, () =>
    assert.fail("should not call next"),
  );
  assert.equal(bad.statusCode, 401);

  const req = bearer({ id: "user-1", role: "user", name: "Mahmud" });
  let called = false;
  requireAuth(req, mockRes(), () => {
    called = true;
  });
  assert.ok(called, "next called for a valid token");
  assert.equal(req.user.id, "user-1");
  assert.equal(req.user.role, "user");
});

test("optionalAuth attaches a guest (null) without a token", () => {
  const req = { headers: {} };
  let called = false;
  optionalAuth(req, mockRes(), () => {
    called = true;
  });
  assert.ok(called);
  assert.equal(req.user, null);
});

test("authorize enforces roles with admin as superuser", () => {
  const guard = authorize("officer");

  const officer = mockRes();
  let officerOk = false;
  guard({ user: { id: "o", role: "officer" } }, officer, () => {
    officerOk = true;
  });
  assert.ok(officerOk, "allowed role passes");

  const admin = mockRes();
  let adminOk = false;
  guard({ user: { id: "a", role: "admin" } }, admin, () => {
    adminOk = true;
  });
  assert.ok(adminOk, "admin is a superuser");

  const user = mockRes();
  guard({ user: { id: "u", role: "user" } }, user, () => assert.fail("should not pass"));
  assert.equal(user.statusCode, 403);
});

test("ownership: owner or admin can access, others cannot", () => {
  const file = { id: "f1", ownerId: "user-1" };
  assert.equal(isOwner({ id: "user-1" }, file), true);
  assert.equal(canAccessResource({ id: "user-1", role: "user" }, file), true);
  assert.equal(canAccessResource({ id: "user-2", role: "user" }, file), false);
  assert.equal(canAccessResource({ id: "x", role: "admin" }, file), true);
  assert.equal(canAccessResource({ id: "user-1", role: "user" }, null), false);
});
