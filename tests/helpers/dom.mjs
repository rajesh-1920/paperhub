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
 * @param {string} htmlPath  repo-relative path to the page HTML
 * @param {string[]} scripts script filenames under public/assets/js (in order)
 * @param {"user"|"officer"|"admin"} role  role to sign in as
 * @param {Record<string,string>} [sharedStore] reuse to simulate cross-page reloads
 * @param {string} [url] page URL (use to drive `?id=` query handling)
 * @returns {{ window: any, document: any, user: any, store: Record<string,string> }}
 */
export function bootPage(
  htmlPath,
  scripts,
  role = "user",
  sharedStore,
  url = "http://localhost/pages/x.html",
) {
  const store = sharedStore || {};
  const dom = new JSDOM(readFileSync(join(ROOT, htmlPath), "utf8"), {
    runScripts: "outside-only",
    url,
  });
  const { window } = dom;

  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v);
    },
    removeItem: (k) => {
      delete store[k];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };
  Object.defineProperty(window, "localStorage", { value: localStorage, configurable: true });

  window.XMLHttpRequest = class {
    open() {}
    send() {
      this.status = 200;
      this.responseText = SEED;
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

  return { window, document: window.document, user, store };
}
