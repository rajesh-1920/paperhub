import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () =>
  bootPage("public/pages/file/files.html", ["utils.js", "main.js", "file.js"], "user");

const fakeFile = (text, name = "doc.pdf") => ({
  name,
  size: text.length,
  type: "application/pdf",
  arrayBuffer: async () => new TextEncoder().encode(text).buffer,
});

test("page count: derives the real page count from the PDF bytes", async () => {
  const { window } = boot();
  const threePage = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R 4 0 R 5 0 R] /Count 3 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R >> endobj",
    "4 0 obj << /Type /Page /Parent 2 0 R >> endobj",
    "5 0 obj << /Type /Page /Parent 2 0 R >> endobj",
    "%%EOF",
  ].join("\n");

  assert.equal(await window.countPdfPagesFromFile(fakeFile(threePage)), 3);

  // The /Pages tree node must not be miscounted as a page.
  const onePage = "%PDF-1.4\n2 0 obj << /Type /Pages /Count 1 >>\n3 0 obj << /Type /Page >>\n%%EOF";
  assert.equal(await window.countPdfPagesFromFile(fakeFile(onePage)), 1);

  // Unreadable / non-PDF input falls back to 1 (never throws).
  assert.equal(await window.countPdfPagesFromFile({ name: "x" }), 1);
});

test("page count: an uploaded file stores its real page count", () => {
  const { window } = boot();
  const record = window.persistUploadedFile({ name: "report.pdf", size: 2048 }, 7);
  assert.equal(record.pageCount, 7, "file record carries the real page count");
  const review = window.getPaperHubDataset().reviewQueue.find((r) => r.fileId === record.id);
  assert.equal(review.pageCount, 7, "review item carries the same page count");
});
