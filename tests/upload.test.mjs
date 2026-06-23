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
