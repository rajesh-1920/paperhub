import test from "node:test";
import assert from "node:assert/strict";
import { authConfig, assertAuthConfig } from "../server/config.js";

test("authConfig falls back to safe dev defaults", () => {
  const c = authConfig({});
  assert.ok(c.jwtSecret.length > 0 && c.refreshSecret.length > 0);
  assert.equal(c.bcryptRounds, 12);
  // Long-lived by default: a user stays signed in until they log out.
  assert.equal(c.accessTtl, "3650d");
  assert.equal(c.refreshTtl, "3650d");
});

test("authConfig reads overrides from the environment", () => {
  const c = authConfig({ JWT_SECRET: "abc", BCRYPT_ROUNDS: "10", ACCESS_TTL: "5m" });
  assert.equal(c.jwtSecret, "abc");
  assert.equal(c.refreshSecret, "abc", "refresh falls back to JWT_SECRET when unset");
  assert.equal(c.bcryptRounds, 10);
  assert.equal(c.accessTtl, "5m");
});

test("assertAuthConfig fails fast on a weak production secret", () => {
  assert.throws(() => assertAuthConfig({ NODE_ENV: "production" }), /JWT_SECRET/);
  assert.throws(
    () => assertAuthConfig({ NODE_ENV: "production", JWT_SECRET: "short" }),
    /JWT_SECRET/,
  );
  assert.doesNotThrow(() =>
    assertAuthConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(24) }),
  );
  assert.doesNotThrow(() => assertAuthConfig({ NODE_ENV: "test" }));
});
