import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

const boot = () => {
  const ctx = bootPage("public/pages/file/files.html", ["utils.js", "main.js", "file.js"], "user");
  ctx.window.initFileDetailsPage();
  return ctx;
};

test("file preview: opens a modal with the PDF embedded for a stored file", () => {
  const { window, document } = boot();
  const modal = document.getElementById("filePreviewModal");
  assert.ok(modal.classList.contains("hidden"), "modal starts hidden");

  window.openFilePreview({
    id: "file-x",
    name: "report.pdf",
    hasContent: true,
    fileType: "PDF Document",
    pageCount: 3,
    size: 2048,
  });

  assert.ok(!modal.classList.contains("hidden"), "modal opens");
  assert.equal(document.getElementById("filePreviewTitle").textContent, "report.pdf");
  const iframe = modal.querySelector("iframe.file-preview-frame");
  assert.ok(iframe, "real PDF embedded in an iframe");
  assert.match(iframe.getAttribute("src"), /\/api\/files\/file-x\/content$/);
  // portaled to <body> so it overlays the whole page
  assert.equal(modal.parentElement, document.body, "modal portaled to body");
});

test("file preview: a text-only record shows its stored content, not an iframe", () => {
  const { window, document } = boot();
  window.openFilePreview({ id: "file-y", name: "note.txt", content: "hello bangladesh" });

  const modal = document.getElementById("filePreviewModal");
  assert.ok(!modal.classList.contains("hidden"));
  assert.equal(modal.querySelector("iframe.file-preview-frame"), null, "no iframe for text record");
  const pre = modal.querySelector("pre.file-preview-text");
  assert.ok(pre && /hello bangladesh/.test(pre.textContent), "text content shown");
});

test("file preview: the row View button opens the modal, and it can be closed", () => {
  const { document } = boot();
  const modal = document.getElementById("filePreviewModal");

  const viewBtn = document.querySelector('#fileTableBody [data-action="view"]');
  assert.ok(viewBtn, "a row View button exists");
  viewBtn.click();
  assert.ok(!modal.classList.contains("hidden"), "View opens the preview modal");

  modal.querySelector("[data-preview-close]").click();
  assert.ok(modal.classList.contains("hidden"), "closing hides the modal");
  assert.equal(
    document.getElementById("filePreviewBody").innerHTML,
    "",
    "iframe torn down on close",
  );
});
