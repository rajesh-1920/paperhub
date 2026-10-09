import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JS = join(ROOT, "public/assets/js");

// Page scripts converted to the ESM subset (profile.js + tailwind-setup.js
// stay intentionally classic IIFE bundles — see eslint.config.js).
const MODULES = [
  "utils.js",
  "main.js",
  "navbar.js",
  "file.js",
  "review.js",
  "auth.js",
  "activity.js",
  "share-view.js",
  "pages/index.js",
];

const KEYWORDS = new Set(
  "break case catch class const continue debugger default delete do else export extends false finally for function if import in instanceof let new null return super switch this throw true try typeof var void while with yield static async await get set of from as".split(
    " ",
  ),
);
const RUNTIME = new Set(
  (
    "window document navigator localStorage sessionStorage location history fetch XMLHttpRequest " +
    "URL URLSearchParams Blob File FileReader FormData DOMParser setTimeout clearTimeout setInterval " +
    "clearInterval queueMicrotask requestAnimationFrame cancelAnimationFrame alert confirm prompt " +
    "console performance Intl JSON Math Object Array String Number Boolean Date RegExp Map Set WeakMap " +
    "WeakSet Symbol Error Promise NaN Infinity undefined parseInt parseFloat isNaN isFinite " +
    "encodeURI encodeURIComponent decodeURI decodeURIComponent getComputedStyle matchMedia scrollTo " +
    "innerWidth innerHeight Node Element HTMLElement Event CustomEvent KeyboardEvent SubmitEvent " +
    "AbortController TextEncoder TextDecoder google globalThis self"
  )
    .split(" ")
    .filter(Boolean),
);

const src = Object.fromEntries(MODULES.map((m) => [m, readFileSync(join(JS, m), "utf8")]));

/** Strip comments + string literals (keeping ${...} code inside templates). */
function stripNoise(text) {
  let out = "";
  let i = 0;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === "/" && text[i + 1] === "/") {
      while (i < n && text[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'") {
      const q = c;
      i++;
      while (i < n && text[i] !== q) {
        if (text[i] === "\\") i++;
        i++;
      }
      i++;
      out += '""';
      continue;
    }
    if (c === "`") {
      i++;
      let depth = 0;
      let seg = "";
      while (i < n) {
        if (text[i] === "\\") {
          i += 2;
          continue;
        }
        if (text[i] === "`" && depth === 0) {
          i++;
          break;
        }
        if (text[i] === "$" && text[i + 1] === "{") {
          depth++;
          i += 2;
          continue;
        }
        if (text[i] === "}" && depth > 0) {
          depth--;
          i++;
          if (depth === 0) {
            out += `(${seg})`;
            seg = "";
          }
          continue;
        }
        if (depth > 0) seg += text[i];
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function declaredNames(text) {
  const names = new Set();
  for (const m of text.matchAll(/^[ \t]*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/^[ \t]*export\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) {
    names.add(m[1]);
  }
  for (const m of text.matchAll(/^[ \t]*export\s*\{([^}]+)\}[ \t]*;?[ \t]*$/gm)) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue; // trailing comma on its own line
      const seg = trimmed.split(/\s+as\s+/);
      names.add((seg[1] || seg[0]).trim());
    }
  }
  return names;
}

function globalCommentNames(text) {
  const m = text.match(/\/\*\s*global\s+([^*]+)\*\//);
  if (!m) return new Set();
  return new Set(
    m[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function importEntries(text) {
  const entries = [];
  for (const m of text.matchAll(
    /^[ \t]*import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gm,
  )) {
    for (const part of m[1].split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue; // trailing comma on its own line
      const seg = trimmed.split(/\s+as\s+/);
      entries.push({
        original: seg[0].trim(),
        alias: (seg[1] || seg[0]).trim(),
        spec: m[2].trim(),
      });
    }
  }
  return entries;
}

function resolveKey(base, spec) {
  const baseDir = base.includes("/") ? base.slice(0, base.lastIndexOf("/")) : "";
  const parts = [];
  for (const seg of `${baseDir}/${spec}`.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

/** Every name declared anywhere in a module (top-level or nested). */
function localNames(text) {
  const names = new Set();
  for (const m of text.matchAll(
    /^[ \t]*(?:export\s+)?(?:async\s+function|function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
  )) {
    names.add(m[1]);
  }
  return names;
}

/** External identifiers used by a module (declared in another page module). */
function externalUsages(key, declaredBy, localsBy) {
  const text = stripNoise(src[key]);
  const own = localsBy.get(key);
  const used = new Set();
  const re = /[A-Za-z_$][\w$]*/g;
  let m;
  while ((m = re.exec(text))) {
    const name = m[0];
    if (KEYWORDS.has(name) || RUNTIME.has(name) || own.has(name)) continue;
    let j = m.index - 1;
    while (j >= 0 && /\s/.test(text[j])) j--;
    if (text[j] === ".") continue; // property access
    const lineStart = text.lastIndexOf("\n", m.index) + 1;
    if (/(^|\s)(function|const|let|var)\s*$/.test(text.slice(lineStart, m.index))) continue;
    const after = text.slice(re.lastIndex);
    if (/^\s*:/.test(after)) {
      const line = text.slice(lineStart, text.indexOf("\n", m.index));
      if (!line.includes("?")) continue; // object key, not a usage
    }
    if (![...declaredBy.values()].some((s) => s.has(name))) continue;
    used.add(name);
  }
  // names provided by *other* modules only
  return [...used].filter((name) =>
    [...declaredBy.entries()].some(([k, s]) => k !== key && s.has(name)),
  );
}

describe("esm authoring subset (harness loader contract)", () => {
  for (const key of MODULES) {
    it(`${key} uses only the supported subset`, () => {
      const text = src[key];
      assert.ok(!text.includes("export default"), "no default exports");
      assert.ok(!/\bimport\s*\(\s*["'`]/.test(text), "no dynamic import()");
      assert.ok(!text.includes("import.meta"), "no import.meta");
      assert.ok(!/\bimport\s+\*\s+as\b/.test(text), "no namespace imports");
      const withoutImports = text.replace(
        /^[ \t]*import\s*\{[^}]+\}\s*from\s*["'][^"']+["'];?[ \t]*$/gm,
        "",
      );
      assert.ok(
        !/^[ \t]*import\s/m.test(withoutImports),
        "every import must be named-from-relative (multi-line allowed):\n" +
          withoutImports
            .split("\n")
            .filter((l) => /^\s*import\s/.test(l))
            .join("\n"),
      );
      for (const m of text.matchAll(
        /^[ \t]*import\s*\{[^}]+\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gm,
      )) {
        assert.match(m[1], /^(\.\/|\.\.\/)/, `import spec must be relative: ${m[1]}`);
      }
    });
  }
});

describe("esm imports resolve to real exported bindings", () => {
  for (const key of MODULES) {
    it(`${key} imports exist where declared`, () => {
      const declaredBy = new Map(MODULES.map((m) => [m, declaredNames(src[m])]));
      for (const { original, spec } of importEntries(src[key])) {
        const target = resolveKey(key, spec);
        assert.ok(
          declaredBy.has(target),
          `${key} imports from unknown module ${spec} (resolved ${target})`,
        );
        assert.ok(
          declaredBy.get(target).has(original),
          `${key} imports ${original} from ${target}, which does not export it`,
        );
      }
    });
  }
});

describe("esm cross-module references are all wired (import or /* global */ mirror)", () => {
  it("every external usage is imported or an acknowledged window mirror", () => {
    const declaredBy = new Map(MODULES.map((m) => [m, declaredNames(src[m])]));
    const localsBy = new Map(MODULES.map((m) => [m, localNames(src[m])]));
    const problems = [];
    for (const key of MODULES) {
      const imported = new Set(importEntries(src[key]).map((e) => e.alias));
      const globals = globalCommentNames(src[key]);
      for (const name of externalUsages(key, declaredBy, localsBy)) {
        if (!imported.has(name) && !globals.has(name)) {
          const providers = [...declaredBy.entries()]
            .filter(([k, s]) => k !== key && s.has(name))
            .map(([k]) => k);
          problems.push(
            `${key} uses ${name} (from ${providers.join(",")}) without import or /* global */`,
          );
        }
      }
      for (const name of globals) {
        const provided = [...declaredBy.entries()].some(([k, s]) => k !== key && s.has(name));
        if (!provided)
          problems.push(`${key} declares /* global */ ${name} but no module exports it`);
      }
    }
    assert.deepEqual(problems, [], "unwired cross-module references:\n" + problems.join("\n"));
  });
});
