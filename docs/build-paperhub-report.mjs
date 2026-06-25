// Build the PSTU-format PaperHub project report PDF from docs/PaperHub-Report.md.
//
// Requires: markdown-it (npm i markdown-it) and WeasyPrint (pip install weasyprint).
// Usage:    node docs/build-paperhub-report.mjs   # -> docs/PaperHub-Report.pdf
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "PaperHub-Report.md");
const HTML = join(HERE, ".paperhub-report.build.html");
const PDF = join(HERE, "PaperHub-Report.pdf");

const require = createRequire(import.meta.url);
let MarkdownIt;
try {
  MarkdownIt = require("markdown-it");
} catch {
  console.error("markdown-it not found. Install it first:  npm i markdown-it");
  process.exit(1);
}

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// GitHub-style heading slugs so the TOC links + page numbers resolve.
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

let body = md.render(readFileSync(SRC, "utf8"));
// Tag figure/table captions (emitted as <p><em>Figure …</em></p>) for styling.
body = body.replace(/<p><em>((?:Figure|Table)[^<]*)<\/em><\/p>/g, '<p class="caption">$1</p>');

const css = `
  @page {
    size: A4; margin: 17mm 16mm 16mm 16mm;
    @bottom-center { content: counter(page); font-size: 8pt; color: #94a3b8; }
  }
  @page cover { margin: 20mm 18mm; @bottom-center { content: none; } }
  * { box-sizing: border-box; }
  body { font-family: "DejaVu Serif", Georgia, serif; font-size: 10.6pt; line-height: 1.5; color: #1e293b; margin: 0; }

  /* ---- Cover ---- */
  .cover { page: cover; page-break-after: always; text-align: center; }
  .cover-univ { font-size: 20pt; font-weight: bold; margin-top: 8mm; }
  .cover-fac { font-size: 13pt; margin-top: 2mm; }
  .cover-rule { border: none; border-top: 1.5px solid #334155; margin: 6mm 0; }
  .cover-course { font-size: 15pt; font-weight: bold; }
  .cover-rep { font-size: 13pt; margin-top: 2mm; }
  .cover-logo { font-size: 34pt; font-weight: bold; color: #0f766e; letter-spacing: 1px; margin: 16mm 0; }
  .cover-title { font-size: 12pt; text-align: left; }
  .cover-date { font-size: 11pt; text-align: left; margin-bottom: 5mm; }
  table.cover-table { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10pt; }
  table.cover-table th, table.cover-table td { border: 1px solid #334155; padding: 8pt 10pt; text-align: left; vertical-align: top; }
  table.cover-table th { background: #f1f5f9; color: #0f172a; font-size: 11pt; }
  table.cover-table td { width: 50%; }

  /* ---- Contents ---- */
  .toc-page { page-break-after: always; }
  .toc-page h2 { border: none; color: #0f172a; }
  .toc-page ol { list-style: decimal; padding-left: 20pt; }
  .toc-page ul { list-style: none; padding-left: 22pt; }
  .toc-page li { margin: 3.5pt 0; }
  .toc-page a { text-decoration: none; color: #0f172a; }
  .toc-page a::after { content: leader('. ') target-counter(attr(href), page); color: #64748b; }

  /* ---- Body ---- */
  h1 { font-size: 22pt; color: #0f172a; text-align: center; margin: 4pt 0 14pt; }
  h2 { font-size: 15pt; color: #0f766e; border-bottom: 1.5px solid #99f6e4; padding-bottom: 3pt; margin: 18pt 0 7pt; page-break-after: avoid; }
  h3 { font-size: 12pt; color: #0f172a; margin: 12pt 0 5pt; page-break-after: avoid; }
  p { margin: 0 0 7pt; text-align: justify; }
  a { color: #0d9488; text-decoration: none; word-break: break-word; }
  ul, ol { margin: 0 0 8pt; padding-left: 20pt; }
  li { margin: 3pt 0; }
  strong { color: #0f172a; }
  code { font-family: "DejaVu Sans Mono", monospace; font-size: 8.8pt; background: #f1f5f9; padding: 1px 3px; border-radius: 3px; }

  table { border-collapse: collapse; width: 100%; margin: 6pt 0 4pt; font-size: 8.8pt; page-break-inside: avoid; }
  th, td { border: 1px solid #cbd5e1; padding: 4.5pt 6pt; text-align: left; vertical-align: top; }
  th { background: #0f766e; color: #fff; font-weight: bold; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  td:has(*), td { text-align: left; }

  img { max-width: 100%; max-height: 170mm; display: block; margin: 8pt auto 2pt; border: 1px solid #e2e8f0; border-radius: 4px; }
  .caption { text-align: center; font-style: italic; font-size: 9pt; color: #475569; margin: 0 0 12pt; }
  .theend { text-align: center; font-weight: bold; margin-top: 22pt; }
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
writeFileSync(HTML, html);
execFileSync("weasyprint", ["-e", "utf-8", HTML, PDF], { stdio: "inherit" });
console.log("Wrote", PDF);
