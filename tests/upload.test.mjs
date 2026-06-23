import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const UPLOAD = "public/pages/file/upload.html";
const boot = () => bootPage(UPLOAD, ["utils.js", "main.js", "file.js"], "user");

test("PDF files pass validation", () => {
  const { window } = boot();
  assert.equal(
    window.validateFile({ name: "report.pdf", size: 1000, type: "application/pdf" }),
    true,
  );
  assert.equal(
    window.validateFile({ name: "report.pdf", size: 1000, type: "" }),
    true,
    "a .pdf with an empty MIME type is allowed",
  );
});

test("non-PDF files are rejected", () => {
  const { window } = boot();
  assert.equal(
    window.validateFile({
      name: "a.docx",
      size: 1000,
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    false,
  );
  assert.equal(window.validateFile({ name: "a.png", size: 1000, type: "image/png" }), false);
  assert.equal(
    window.validateFile({ name: "a.xlsx", size: 1000, type: "application/vnd.ms-excel" }),
    false,
  );
});

test("a non-PDF renamed to .pdf is rejected (MIME mismatch)", () => {
  const { window } = boot();
  assert.equal(window.validateFile({ name: "spoof.pdf", size: 1000, type: "image/png" }), false);
});

test("an oversized PDF is rejected", () => {
  const { window } = boot();
  assert.equal(
    window.validateFile({ name: "big.pdf", size: 60 * 1024 * 1024, type: "application/pdf" }),
    false,
  );
});

test("uploaded files embed the real PDF and target the content endpoint", () => {
  const { window, document } = bootPage(
    "public/pages/file/files.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );

  assert.match(window.fileContentUrl({ id: "file-1" }), /\/api\/files\/file-1\/content$/);
  assert.equal(window.ensureExtension("a.pdf", "pdf"), "a.pdf");
  assert.equal(window.ensureExtension("a", "pdf"), "a.pdf");
  assert.equal(window.ensureExtension("photo.txt", "pdf"), "photo.pdf");

  window.updateMetaPanel({
    id: "file-1",
    name: "report.pdf",
    hasContent: true,
    fileType: "PDF Document",
    pageCount: 3,
    size: 2048,
    tags: [],
  });
  const iframe = document.querySelector("#fileContentBody iframe.file-pdf-frame");
  assert.ok(iframe, "real PDF is embedded in an iframe");
  assert.match(iframe.getAttribute("src"), /\/api\/files\/file-1\/content$/);
});
