import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
// Tests run against a frozen full dataset fixture, independent of the app's
// seed (which may be trimmed of demo content).
const SEED = readFileSync(join(ROOT, "tests/fixtures/dataset.json"), "utf8");

const loadScript = (name) => readFileSync(join(ROOT, "public/assets/js", name), "utf8");

/**
 * ESM-subset loader for converted page scripts.
 *
 * Production loads page scripts as native ES modules (`type="module"`).
 * jsdom cannot execute modules, so the harness evaluates them in the shared
 * jsdom scope with a source transform that preserves exact runtime semantics:
 *
 *  - depth-first dependency order (matches native module graph evaluation),
 *  - `import { a, b as c }` lines are stripped (deps already evaluated above;
 *    `as` aliases become `const` bindings),
 *  - `export` keywords are stripped (declarations stay in the shared scope,
 *    exactly like classic scripts), and every export is mirrored to `window`
 *    (mirrors what the modules assign explicitly for inline handlers/tests).
 *
 * Authoring subset (enforced by tests/esm-imports.test.mjs — keep in sync):
 * only single-line `import { a, b as c } from "<relative>"`, only
 * `export [async] function/const/let` and `export { a, b as c }`. No `export default`,
 * no `import *`, no dynamic `import()`, no `import.meta`.
 */
const ESM_IMPORT_RE = /^[ \t]*import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gm;
const ESM_EXPORT_LIST_RE = /^[ \t]*export\s*\{([^}]+)\}[ \t]*;?[ \t]*$/gm;

function isESM(source) {
  return (
    ESM_IMPORT_RE.test(source) ||
    /^[ \t]*export\s+((async\s+)?(function|const|let)|\{)/m.test(source)
  );
}

function resolveScriptKey(baseKey, spec) {
  const baseDir = baseKey.includes("/") ? baseKey.slice(0, baseKey.lastIndexOf("/")) : "";
  const parts = [];
  for (const seg of `${baseDir}/${spec}`.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function parseImportNames(clause) {
  return clause
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const seg = p.split(/\s+as\s+/);
      return seg.length === 2
        ? { original: seg[0].trim(), alias: seg[1].trim() }
        : { original: seg[0].trim(), alias: null };
    });
}

function parseExportListNames(clause) {
  return parseImportNames(clause).map(({ original, alias }) => alias || original);
}

function collectExportNames(source) {
  const names = [];
  for (const m of source.matchAll(/^[ \t]*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
    names.push(m[1]);
  }
  for (const m of source.matchAll(/^[ \t]*export\s+(?:const|let)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.push(m[1]);
  }
  for (const m of source.matchAll(ESM_EXPORT_LIST_RE)) {
    names.push(...parseExportListNames(m[1]));
  }
  return [...new Set(names)];
}

/**
 * Evaluate classic + ESM-subset scripts in dependency order inside the jsdom
 * window scope. ESM evaluation is single-pass per bootPage call, so module
 * state is fresh on every boot — exactly like a real page reload.
 */
function runScriptsInOrder(window, scripts) {
  const run = window.eval.bind(window);
  const done = new Set();
  const inProgress = new Set();

  const evaluate = (key) => {
    if (done.has(key)) return;
    if (inProgress.has(key)) return; // import cycle: live bindings resolve at call time
    inProgress.add(key);

    let source = loadScript(key);
    if (!isESM(source)) {
      run(source);
      done.add(key);
      return;
    }

    const aliases = [];
    for (const m of source.matchAll(ESM_IMPORT_RE)) {
      evaluate(resolveScriptKey(key, m[2].trim()));
      for (const { original, alias } of parseImportNames(m[1])) {
        if (alias && alias !== original) aliases.push(`const ${alias} = ${original};`);
      }
    }

    ESM_IMPORT_RE.lastIndex = 0;
    source = source.replace(ESM_IMPORT_RE, "");
    const exportNames = collectExportNames(source);
    ESM_EXPORT_LIST_RE.lastIndex = 0;
    source = source.replace(ESM_EXPORT_LIST_RE, (m, clause) => {
      const extra = [];
      for (const { original, alias } of parseImportNames(clause)) {
        if (alias && alias !== original) extra.push(`const ${alias} = ${original};`);
      }
      return extra.length ? extra.join("\n") : "";
    });
    source = source
      .replace(/^[ \t]*export\s+async\s+function\s+/gm, "async function ")
      .replace(/^[ \t]*export\s+function\s+/gm, "function ")
      .replace(/^[ \t]*export\s+const\s+/gm, "const ")
      .replace(/^[ \t]*export\s+let\s+/gm, "let ");

    if (aliases.length) run(aliases.join("\n"));
    run(source);
    // Mirror exports to window (same assignments the modules make explicitly
    // for inline handlers; harmless for function declarations).
    if (exportNames.length) {
      run(`Object.assign(window, { ${exportNames.join(", ")} });`);
    }
    done.add(key);
  };

  for (const s of scripts) evaluate(s);
}

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
  if (url.includes("/api/files/search")) {
    const params = new URL(url, "http://localhost").searchParams;
    const query = (params.get("q") || "").toLowerCase();
    let items = (ds.files || []).filter((f) => !f.deletedAt);
    if (query) {
      items = items.filter((f) =>
        String(f.name || "")
          .toLowerCase()
          .includes(query),
      );
    }
    if (params.get("folderId") !== null) {
      const raw = params.get("folderId");
      const target = raw === "root" || raw === "" ? null : raw;
      items = items.filter((f) => (f.folderId || null) === target);
    }
    const pageSize = Number(params.get("pageSize") || 20);
    return {
      status: 200,
      body: JSON.stringify({
        items: items.slice(0, pageSize),
        total: items.length,
        page: 1,
        pageSize,
        pages: 1,
      }),
    };
  }
  if (url.includes("/api/share")) {
    const pathname = new URL(url, "http://localhost").pathname;
    if (pathname.endsWith("/api/share/mine")) {
      const items = (ds.shareLinks || []).map(({ passwordHash, ...rest }) => ({
        ...rest,
        passwordProtected: !!passwordHash,
      }));
      return { status: 200, body: JSON.stringify({ items }) };
    }
    if (m === "POST" && /\/api\/share\/?$/.test(pathname)) {
      const b = parse();
      const link = {
        token: `share-${b.resourceId || "x"}`,
        resourceType: b.resourceType,
        resourceId: b.resourceId,
        permission: b.permission || "view",
        createdBy: "me",
        createdAt: "2026-01-01T00:00:00.000Z",
        expiresAt: b.expiresAt || null,
        revoked: false,
        accessCount: 0,
      };
      ds.shareLinks = ds.shareLinks || [];
      ds.shareLinks.push(link);
      return {
        status: 201,
        body: JSON.stringify({ ok: true, token: link.token, link: { ...link } }),
      };
    }
    if (m === "DELETE") {
      return { status: 200, body: JSON.stringify({ ok: true }) };
    }
    const tokenMatch = pathname.match(/\/api\/share\/([^/]+)$/);
    if (tokenMatch) {
      const link = (ds.shareLinks || []).find((l) => l.token === tokenMatch[1] && !l.revoked);
      if (!link) return { status: 404, body: JSON.stringify({ error: "Not found" }) };
      const resource =
        link.resourceType === "file"
          ? (ds.files || []).find((f) => f.id === link.resourceId)
          : (ds.folders || []).find((f) => f.id === link.resourceId);
      return {
        status: 200,
        body: JSON.stringify({
          ok: true,
          resourceType: link.resourceType,
          permission: link.permission,
          resource: resource
            ? { id: resource.id, name: resource.name, hasContent: !!resource.hasContent }
            : null,
        }),
      };
    }
  }
  if (url.includes("/api/audit")) {
    if (m === "POST") {
      const b = parse();
      ds.auditLog = ds.auditLog || [];
      ds.auditLog.push({
        id: `evt-${ds.auditLog.length + 1}`,
        ts: "2026-01-01T00:00:00.000Z",
        action: b.action,
        actorId: "me",
        actorName: "Me",
        resourceId: b.resourceId || null,
        resourceName: b.resourceName || null,
      });
      return { status: 201, body: JSON.stringify({ ok: true }) };
    }
    const items = (ds.auditLog || []).slice().reverse();
    return {
      status: 200,
      body: JSON.stringify({ items, total: items.length, page: 1, pageSize: 50 }),
    };
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

  runScriptsInOrder(window, scripts);

  const user = seedDataset().users.find((u) => u.role === role);
  window.getCurrentUser = () => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });

  return { window, document: window.document, user, store: ctx.ls, server: ctx.server };
}
