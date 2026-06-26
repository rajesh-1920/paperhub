// Build a professional PDF from docs/PROJECT_REPORT.md.
//
// Requires: markdown-it (npm i markdown-it) and WeasyPrint (pip install weasyprint).
// Usage:    node docs/build-report.mjs            # -> docs/PaperHub-Project-Report.pdf
//
// Renders the Markdown to styled HTML, then shells out to `weasyprint`.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "PROJECT_REPORT.md");
const HTML = join(HERE, ".report.build.html");
const PDF = join(HERE, "PaperHub-Project-Report.pdf");

// Resolve markdown-it from the project, or from NODE_PATH if installed elsewhere.
const require = createRequire(import.meta.url);
let MarkdownIt;
try {
  MarkdownIt = require("markdown-it");
} catch {
  console.error("markdown-it not found. Install it first:  npm i markdown-it");
  process.exit(1);
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// GitHub-style heading slugs so the table-of-contents links resolve in the PDF.
const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const inline = tokens[idx + 1];
  const text = inline && inline.type === "inline" ? inline.content : "";
  tokens[idx].attrSet("id", slugify(text));
  return self.renderToken(tokens, idx, options);
};

const body = md.render(readFileSync(SRC, "utf8"));

const css = `
  @page {
    size: A4;
    margin: 18mm 16mm 20mm 16mm;
    @bottom-center { content: "PaperHub — Project Report"; font-size: 8pt; color: #94a3b8; }
    @bottom-right  { content: counter(page) " / " counter(pages); font-size: 8pt; color: #94a3b8; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: "DejaVu Sans", "Helvetica Neue", Arial, sans-serif;
    font-size: 10.2pt; line-height: 1.5; color: #1e293b; margin: 0;
  }
  h1 { font-size: 21pt; color: #0f172a; margin: 0 0 4pt; line-height: 1.2; }
  h2 { font-size: 15pt; color: #0f766e; border-bottom: 2px solid #99f6e4; padding-bottom: 4pt; margin: 22pt 0 8pt; }
  h3 { font-size: 12pt; color: #0f172a; margin: 14pt 0 5pt; }
  h1 + h3 { color: #64748b; font-weight: 600; margin-top: 2pt; }
  p { margin: 0 0 7pt; }
  a { color: #0d9488; text-decoration: none; word-break: break-word; }
  ul, ol { margin: 0 0 8pt; padding-left: 18pt; }
  li { margin: 2pt 0; }
  strong { color: #0f172a; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 14pt 0; }
  code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.6pt; background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 10pt 12pt; border-radius: 6px; overflow-x: auto; page-break-inside: avoid; }
  pre code { background: none; color: inherit; font-size: 8pt; line-height: 1.35; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0 12pt; font-size: 9pt; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 5pt 7pt; text-align: left; vertical-align: top; }
  th { background: #0f766e; color: #fff; font-weight: 600; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  h2 { page-break-after: avoid; }
  blockquote { margin: 8pt 0; padding: 6pt 12pt; border-left: 3px solid #99f6e4; background: #f0fdfa; color: #475569; font-size: 9.4pt; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
writeFileSync(HTML, html);

execFileSync("weasyprint", [HTML, PDF], { stdio: "inherit" });
console.log("Wrote", PDF);
