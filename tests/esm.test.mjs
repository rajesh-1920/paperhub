import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  formatDate,
  formatFileSize,
  slugify,
  timeAgo,
} from "../public/assets/js/esm/format.mjs";
import {
  canAccessPathByRole,
  isValidEmail,
  isValidPassword,
  isValidUrl,
  normalizeRole,
} from "../public/assets/js/esm/validate.mjs";
import { apiFetch, getAuthHeaders, paperhubApiUrl } from "../public/assets/js/esm/api.mjs";

describe("esm/format.mjs — parity with legacy utils.js", () => {
  it("escapeHtml escapes all HTML metacharacters", () => {
    assert.equal(
      escapeHtml("<a href=\"x\">&'test'</a>"),
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;test&#39;&lt;/a&gt;",
    );
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });

  it("formatDate returns Invalid date for bad input", () => {
    assert.equal(formatDate("not-a-date"), "Invalid date");
    assert.match(formatDate("2026-01-15T00:00:00Z"), /Jan 15, 2026/);
  });

  it("formatFileSize handles 0 and scales", () => {
    assert.equal(formatFileSize(0), "0 Bytes");
    assert.equal(formatFileSize(1024), "1 KB");
    assert.equal(formatFileSize("bad"), "0 Bytes");
  });

  it("slugify normalizes", () => {
    assert.equal(slugify("  Hello, World!  "), "hello-world");
  });

  it("timeAgo handles recent dates", () => {
    assert.equal(timeAgo(new Date().toISOString()), "just now");
  });
});

describe("esm/validate.mjs — parity with legacy utils.js", () => {
  it("email/password/url validators", () => {
    assert.equal(isValidEmail("a@b.com"), true);
    assert.equal(isValidEmail("bad"), false);
    assert.equal(isValidPassword("12345678"), true);
    assert.equal(isValidPassword("short"), false);
    assert.equal(isValidUrl("https://example.com"), true);
    assert.equal(isValidUrl("nota url"), false);
  });

  it("normalizeRole maps teacher/student aliases", () => {
    assert.equal(normalizeRole("teacher"), "officer");
    assert.equal(normalizeRole("student"), "user");
    assert.equal(normalizeRole("ADMIN"), "admin");
    assert.equal(normalizeRole("bogus"), "user");
  });

  it("canAccessPathByRole matches legacy matrix", () => {
    assert.equal(canAccessPathByRole("/pages/dashboard/admin.html", "admin"), true);
    assert.equal(canAccessPathByRole("/pages/dashboard/admin.html", "user"), false);
    assert.equal(canAccessPathByRole("/pages/review/review-queue.html", "officer"), true);
    assert.equal(canAccessPathByRole("/pages/review/review-queue.html", "user"), false);
    assert.equal(canAccessPathByRole("/pages/file/upload.html", "user"), true);
    assert.equal(canAccessPathByRole("/pages/file/upload.html", "officer"), false);
    assert.equal(canAccessPathByRole("/pages/payment/payment.html", "user"), true);
  });
});

describe("esm/api.mjs — async replacement for sync XHR", () => {
  it("paperhubApiUrl joins origin + path", () => {
    assert.equal(paperhubApiUrl("/api/dataset", "http://x.test"), "http://x.test/api/dataset");
  });

  it("getAuthHeaders is empty when signed out", () => {
    assert.deepEqual(getAuthHeaders(""), {});
    assert.deepEqual(getAuthHeaders("abc"), { Authorization: "Bearer abc" });
  });

  it("apiFetch sends Bearer + parses JSON", async () => {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, text: async () => '{"ok":true}' };
    };
    const data = await apiFetch("/api/dataset", {
      token: "t123",
      origin: "http://x.test",
      fetchImpl,
    });
    assert.deepEqual(data, { ok: true });
    assert.equal(calls[0].url, "http://x.test/api/dataset");
    assert.equal(calls[0].init.headers.Authorization, "Bearer t123");
  });

  it("apiFetch retries once after refresh on 401", async () => {
    let n = 0;
    const fetchImpl = async (url, init) => {
      n += 1;
      if (n === 1) return { ok: false, status: 401, text: async () => '{"error":"Expired"}' };
      assert.equal(init.headers.Authorization, "Bearer fresh");
      return { ok: true, status: 200, text: async () => '{"ok":true}' };
    };
    const data = await apiFetch("/api/dataset", {
      token: "stale",
      origin: "http://x.test",
      fetchImpl,
      refreshFn: async () => "fresh",
    });
    assert.deepEqual(data, { ok: true });
    assert.equal(n, 2);
  });

  it("apiFetch throws displayable error payload", async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 403,
      text: async () => '{"error":"Insufficient permissions"}',
    });
    await assert.rejects(
      apiFetch("/api/dataset", { origin: "http://x.test", fetchImpl }),
      /Insufficient permissions/,
    );
  });
});
