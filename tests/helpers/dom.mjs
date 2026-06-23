import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SEED = readFileSync(join(ROOT, "public/assets/data/paperhub-backend.json"), "utf8");

const loadScript = (name) => readFileSync(join(ROOT, "public/assets/js", name), "utf8");

/** Parsed copy of the seed dataset (fresh object each call). */
export function seedDataset() {
  return JSON.parse(SEED);
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

  // In-memory stand-in for the Node backend's JSON-file API.
  window.XMLHttpRequest = class {
    open(method, requestUrl) {
      this._method = String(method || "GET").toUpperCase();
      this._url = String(requestUrl || "");
    }
    setRequestHeader() {}
    send(body) {
      if (this._method === "POST" && this._url.includes("/api/reset")) {
        ctx.server.dataset = JSON.parse(SEED);
        this.status = 200;
        this.responseText = JSON.stringify(ctx.server.dataset);
        return;
      }
      if (this._method === "PUT") {
        try {
          ctx.server.dataset = JSON.parse(body);
        } catch {
          /* ignore malformed body */
        }
        this.status = 200;
        this.responseText = '{"ok":true}';
        return;
      }
      this.status = 200;
      this.responseText = JSON.stringify(ctx.server.dataset);
    }
  };
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.confirm = () => true;
  // Component partials are fetched over the network in the browser; in tests we
  // return empty HTML so the bootstrap path stays quiet and side-effect-free.
  window.fetch = async () => ({
    ok: true,
    status: 200,
    text: async () => "",
    json: async () => ({}),
  });
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
