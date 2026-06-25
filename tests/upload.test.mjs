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

test("uploaded files target the content endpoint", () => {
  const { window } = bootPage(
    "public/pages/file/files.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );

  assert.match(window.fileContentUrl({ id: "file-1" }), /\/api\/files\/file-1\/content$/);
  assert.equal(window.ensureExtension("a.pdf", "pdf"), "a.pdf");
  assert.equal(window.ensureExtension("a", "pdf"), "a.pdf");
  assert.equal(window.ensureExtension("photo.txt", "pdf"), "photo.pdf");
});

test("upload: a batch with one failed file still opens the files page", async () => {
  const { window } = bootPage(
    "public/pages/file/upload.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );

  // Detect the post-upload redirect (navigation itself is a no-op in jsdom).
  let redirected = false;
  const origResolve = window.resolveAppPath;
  window.resolveAppPath = (p) => {
    if (String(p).includes("file/files.html")) redirected = true;
    return origResolve(p);
  };

  // Fail the SECOND file's binary upload (simulating e.g. a rejected file).
  const origFetch = window.fetch;
  let contentPuts = 0;
  window.fetch = (url, opts) => {
    if (String(url).includes("/content") && opts && opts.method === "PUT") {
      contentPuts += 1;
      if (contentPuts === 2) {
        return Promise.resolve({
          ok: false,
          status: 415,
          json: async () => ({ error: "Only PDF files are accepted" }),
        });
      }
    }
    return origFetch(url, opts);
  };

  window.initFileUploadPage();
  const before = window.getCurrentUserFiles().filter((f) => !f.deletedAt).length;
  const mk = (name) => ({
    name,
    size: 18,
    type: "application/pdf",
    lastModified: 1,
    arrayBuffer: async () => new TextEncoder().encode("%PDF-1.4\nx").buffer,
  });
  window.handleFiles([mk("good.pdf"), mk("bad.pdf")]);
  await window.handleUpload();
  await new Promise((r) => setTimeout(r, 1200)); // let the redirect timer fire

  assert.ok(redirected, "navigates to the files page even though one file failed");
  assert.equal(
    window.getCurrentUserFiles().filter((f) => !f.deletedAt).length,
    before + 1,
    "the successful file is persisted (the failed one rolled back)",
  );
});
