import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => bootPage("public/pages/auth/login.html", ["utils.js", "auth.js"], "user");

test("frontend login goes through the API and stores tokens", async () => {
  const { window } = boot();
  const account = window.getPaperHubDataset().authAccounts[0];

  const data = await window.loginViaApi(account.email, "whatever");
  assert.match(data.token, /^test-token\./, "server-issued access token");
  assert.equal(data.user.email, account.email);

  window.persistAuthSession(data.user, data.token, data.refreshToken);
  assert.equal(window.getAuthToken(), data.token, "access token stored for API calls");
  assert.equal(window.getStorage("paperhub-refresh-token"), data.refreshToken);
  // persistAuthSession writes the session (bootPage stubs getCurrentUser, so
  // read the stored value directly).
  assert.equal(window.getStorage("paperhub-user").email, account.email);
});

test("frontend registration goes through the API", async () => {
  const { window } = boot();
  const data = await window.registerViaApi({
    name: "New Person",
    email: "np@paperhub.test",
    password: "longenough1",
  });
  assert.match(data.token, /^test-token\./);
  assert.equal(data.user.role, "user");
});

test("signed-in dataset requests carry the bearer token", () => {
  const { window } = boot();
  window.setStorage("paperhub-auth-token", "tok-xyz");

  const seen = [];
  const Real = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends Real {
    setRequestHeader(key, value) {
      seen.push([key, value]);
      super.setRequestHeader(key, value);
    }
  };

  delete window.__paperhubDataset; // force a fresh sync fetch
  window.getPaperHubDataset();

  assert.ok(
    seen.some(([k, v]) => k === "Authorization" && v === "Bearer tok-xyz"),
    "Authorization: Bearer header attached to the dataset request",
  );
});
