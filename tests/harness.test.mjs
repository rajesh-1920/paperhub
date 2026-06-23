import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

// Guards the upgraded bootPage stub (auth-aware) used by later frontend tests.
test("harness: stub serves the dataset and handles the auth endpoints", async () => {
  const { window } = bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");

  const ds = window.getPaperHubDataset();
  assert.ok(Array.isArray(ds.users) && ds.users.length > 0, "dataset still served via XHR");

  const account = ds.authAccounts[0];
  const res = await window.fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: account.email, password: "x" }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.match(data.token, /^test-token\./, "login issues a token");
  assert.equal(data.user.email, account.email);
  assert.equal(data.user.password, undefined, "stub never leaks a password");

  const bad = await window.fetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "nobody@nowhere.test", password: "x" }),
  });
  assert.equal(bad.status, 401, "unknown email is rejected");
});

test("harness: Authorization header reaches the stubbed /api/auth/me", async () => {
  const { window } = bootPage("public/pages/dashboard/user.html", ["utils.js"], "user");
  const ds = window.getPaperHubDataset();
  const id = ds.authAccounts[0].id;
  const res = await window.fetch("/api/auth/me", {
    headers: { Authorization: `Bearer test-token.${id}` },
  });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).user.id, id);
});
