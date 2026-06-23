import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Tests run against a frozen full dataset fixture, independent of the app's
// seed (which may be trimmed of demo content).
const SEED = readFileSync(join(ROOT, "tests/fixtures/dataset.json"), "utf8");

const loadScript = (name) => readFileSync(join(ROOT, "public/assets/js", name), "utf8");

/** Parsed copy of the seed dataset (fresh object each call). */
export function seedDataset() {
  return JSON.parse(SEED);
}

function findAccount(dataset, email) {
  const lower = String(email || "").toLowerCase();
  return (dataset.authAccounts || []).find((a) => String(a.email).toLowerCase() === lower) || null;
}

// Public projection of a user — never leaks password/passwordHash.
function publicUser(dataset, account) {
  if (!account) return null;
  const profile = (dataset.users || []).find((u) => u.id === account.id) || {};
  const merged = { ...profile, ...account };
  delete merged.password;
  delete merged.passwordHash;
  return merged;
}

const mockToken = (id) => `test-token.${id}`;

// Tiny in-memory stand-in for the PaperHub REST API. Understands the auth
// endpoints and the whole-dataset routes; both the XHR and fetch stubs share
// it so frontend tests can exercise authenticated flows without boilerplate.
function handleApi(method, url, body, headers, ctx) {
  const m = String(method || "GET").toUpperCase();
  const ds = ctx.server.dataset;
  const parse = () => {
    try {
      return JSON.parse(body || "{}");
    } catch {
      return {};
    }
  };

  if (url.includes("/api/auth/login")) {
    const creds = parse();
    const account = findAccount(ds, creds.email);
    if (!account) {
      return { status: 401, body: JSON.stringify({ error: "Invalid credentials" }) };
    }
    return {
      status: 200,
      body: JSON.stringify({
        ok: true,
        token: mockToken(account.id),
        refreshToken: `refresh.${account.id}`,
        user: publicUser(ds, account),
      }),
    };
  }
  if (url.includes("/api/auth/register")) {
    const p = parse();
    const id = `user-${String(p.email || "new").split("@")[0]}`;
    const user = { id, name: p.name || "New User", email: p.email || "", role: "user" };
    return {
      status: 200,
      body: JSON.stringify({ ok: true, token: mockToken(id), refreshToken: `refresh.${id}`, user }),
    };
  }
  if (url.includes("/api/auth/refresh")) {
    return { status: 200, body: JSON.stringify({ ok: true, token: "test-token.refreshed" }) };
  }
  if (url.includes("/api/auth/logout")) {
    return { status: 200, body: JSON.stringify({ ok: true }) };
  }
  if (url.includes("/api/auth/me")) {
    const auth = (headers && headers.authorization) || "";
    const id = auth.replace(/^Bearer\s+test-token\./i, "");
    const account = (ds.authAccounts || []).find((a) => a.id === id);
    if (!account) return { status: 401, body: JSON.stringify({ error: "Unauthenticated" }) };
    return { status: 200, body: JSON.stringify({ user: publicUser(ds, account) }) };
  }
  if (m === "POST" && url.includes("/api/reset")) {
    ctx.server.dataset = JSON.parse(SEED);
    return { status: 200, body: JSON.stringify(ctx.server.dataset) };
  }
  if (m === "PUT" && url.includes("/api/dataset")) {
    try {
      ctx.server.dataset = JSON.parse(body);
    } catch {
      /* ignore malformed body */
    }
    return { status: 200, body: '{"ok":true}' };
  }
  // Default (GET /api/dataset and any other /api/* read): the current dataset.
  return { status: 200, body: JSON.stringify(ctx.server.dataset) };
}

/**
 * Boot a page into jsdom with a working localStorage and an XHR stub that
 * returns the seed dataset, then evaluate the given browser scripts in order.
 *
 * The PaperHub scripts run as classic globals, so after booting you call the
 * page functions directly (e.g. `window.applyCurrentUserPageData()`), exactly
 * as the browser would after DOMContentLoaded.
 *
 * Persistence is server-backed in the app, so the XHR stub here acts as a tiny
 * in-memory PaperHub API: GET returns the current dataset, PUT replaces it, and
 * POST /api/reset restores the seed. Pass a shared context object to simulate
 * cross-page reloads hitting the same "server".
 *
 * @param {string} htmlPath  repo-relative path to the page HTML
 * @param {string[]} scripts script filenames under public/assets/js (in order)
 * @param {"user"|"officer"|"admin"} role  role to sign in as
 * @param {{ ls?: object, server?: { dataset: object } }} [shared] reuse across reloads
 * @param {string} [url] page URL (use to drive `?id=` query handling)
 * @returns {{ window: any, document: any, user: any, store: object, server: { dataset: object } }}
 */
export function bootPage(
  htmlPath,
  scripts,
  role = "user",
  shared,
  url = "http://localhost/pages/x.html",
) {
  const ctx = shared || {};
  ctx.ls = ctx.ls || {};
  ctx.server = ctx.server || { dataset: JSON.parse(SEED) };

  const dom = new JSDOM(readFileSync(join(ROOT, htmlPath), "utf8"), {
    runScripts: "outside-only",
    url,
  });
  const { window } = dom;

  const localStorage = {
    getItem: (k) => (k in ctx.ls ? ctx.ls[k] : null),
    setItem: (k, v) => {
      ctx.ls[k] = String(v);
    },
    removeItem: (k) => {
      delete ctx.ls[k];
    },
    clear: () => {
      for (const k of Object.keys(ctx.ls)) delete ctx.ls[k];
    },
  };
  Object.defineProperty(window, "localStorage", { value: localStorage, configurable: true });

  // In-memory stand-in for the Node backend's REST API. Records request headers
  // (so authenticated flows can be exercised) and delegates to handleApi.
  window.XMLHttpRequest = class {
    constructor() {
      this._headers = {};
    }
    open(method, requestUrl) {
      this._method = String(method || "GET").toUpperCase();
      this._url = String(requestUrl || "");
    }
    setRequestHeader(key, value) {
      this._headers[String(key).toLowerCase()] = value;
    }
    send(body) {
      const { status, body: resBody } = handleApi(
        this._method,
        this._url,
        body,
        this._headers,
        ctx,
      );
      this.status = status;
      this.responseText = resBody;
    }
  };
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.confirm = () => true;
  // API calls go through the in-memory backend; everything else (component
  // partials fetched over the network) returns empty HTML so the bootstrap path
  // stays quiet and side-effect-free.
  window.fetch = async (input, init = {}) => {
    const url = String(typeof input === "string" ? input : (input && input.url) || "");
    const method = (init && init.method) || "GET";
    const headers = {};
    const rawHeaders = (init && init.headers) || {};
    for (const k of Object.keys(rawHeaders)) headers[k.toLowerCase()] = rawHeaders[k];
    if (url.includes("/api/")) {
      const { status, body } = handleApi(method, url, init && init.body, headers, ctx);
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => body,
        json: async () => JSON.parse(body),
        arrayBuffer: async () => new ArrayBuffer(0),
      };
    }
    return { ok: true, status: 200, text: async () => "", json: async () => ({}) };
  };
  window.URL.createObjectURL = () => "blob:mock";
  window.URL.revokeObjectURL = () => {};

  const run = window.eval.bind(window);
  for (const s of scripts) run(loadScript(s));

  const user = seedDataset().users.find((u) => u.role === role);
  window.getCurrentUser = () => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return { window, document: window.document, user, store: ctx.ls, server: ctx.server };
}
