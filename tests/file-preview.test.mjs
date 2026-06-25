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
  // The markup lives inside <main> so SPA navigation (which swaps only main's
  // content) re-injects it, instead of falling back to a new browser tab.
  assert.ok(modal.closest("main"), "preview modal markup lives inside <main>");

  // Spy: the popup must show inline, never fall back to opening a new tab.
  let openedTab = false;
  window.open = () => {
    openedTab = true;
    return null;
  };

  window.openFilePreview({
    id: "file-x",
    name: "report.pdf",
    hasContent: true,
    fileType: "PDF Document",
    pageCount: 3,
    size: 2048,
    ownerName: "Tester",
    status: "completed",
  });

  assert.ok(!modal.classList.contains("hidden"), "modal opens");
  assert.equal(openedTab, false, "no new tab opened — preview shows in the popup");
  assert.equal(document.getElementById("filePreviewTitle").textContent, "report.pdf");
  const iframe = modal.querySelector("iframe.file-preview-frame");
  assert.ok(iframe, "real PDF embedded in an iframe");
  assert.match(iframe.getAttribute("src"), /\/api\/files\/file-x\/content$/);

  // The details panel is populated alongside the document.
  assert.equal(document.getElementById("previewOwner").textContent, "Tester");
  assert.equal(document.getElementById("previewType").textContent, "PDF Document");
  assert.equal(document.getElementById("previewPages").textContent, "3");
  assert.equal(document.getElementById("previewStatus").textContent, "Completed");

  // On open the popup is portaled to <body> so it paints above the dashboard's
  // navbar/sidebar (a stacking context it can't escape from inside <main>).
  assert.equal(modal.parentElement, document.body, "popup portaled to <body> on open");
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

test("file preview: focus moves into the dialog on open and returns to the trigger on close", () => {
  const { window, document } = boot();
  const trigger = document.querySelector('#fileTableBody [data-action="view"]');
  trigger.focus();
  assert.equal(document.activeElement, trigger, "trigger holds focus before open");

  window.openFilePreview({ id: "file-f", name: "focus.pdf", hasContent: true });
  const dialog = document.querySelector(".file-preview-dialog");
  assert.equal(document.activeElement, dialog, "focus moves into the dialog on open");

  window.closeFilePreview();
  assert.equal(document.activeElement, trigger, "focus returns to the trigger on close");
});
