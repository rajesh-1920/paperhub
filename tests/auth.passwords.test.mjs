import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, backfillPasswords } from "../server/auth/passwords.js";

// Cheap cost factor keeps the suite fast.
const fast = { BCRYPT_ROUNDS: "4" };

test("hash + verify round-trips and rejects wrong passwords", async () => {
  const hash = await hashPassword("S3cret!", fast);
  assert.notEqual(hash, "S3cret!", "never stored in clear");
  assert.match(hash, /^\$2[aby]\$/, "looks like a bcrypt hash");
  assert.equal(await verifyPassword("S3cret!", hash), true);
  assert.equal(await verifyPassword("wrong", hash), false);
  assert.equal(await verifyPassword("anything", ""), false, "no hash never verifies");
});

test("backfillPasswords hashes plaintext accounts idempotently", async () => {
  const dataset = {
    authAccounts: [
      { id: "a", email: "a@x", password: "admin01" },
      { id: "b", email: "b@x", passwordHash: "$2a$04$alreadyhashedvaluekeepme......" },
    ],
  };

  const { changed } = await backfillPasswords(dataset, fast);
  assert.equal(changed, true);

  const a = dataset.authAccounts[0];
  assert.equal(a.password, undefined, "plaintext stripped");
  assert.ok(a.passwordHash, "hash set");
  assert.equal(await verifyPassword("admin01", a.passwordHash), true);
  assert.equal(dataset.authAccounts[1].passwordHash, "$2a$04$alreadyhashedvaluekeepme......");

  const second = await backfillPasswords(dataset, fast);
  assert.equal(second.changed, false, "re-running changes nothing");
});
