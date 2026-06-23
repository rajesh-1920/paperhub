import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

test("share view: resolves a token and embeds the shared PDF", async () => {
  const url = "http://localhost/pages/share/view.html?token=tok-1";
  const { window, document, server } = bootPage(
    "public/pages/share/view.html",
    ["utils.js", "share-view.js"],
    "user",
    undefined,
    url,
  );
  server.dataset.files.push({ id: "file-shared", name: "Shared.pdf", hasContent: true });
  server.dataset.shareLinks = [
    {
      token: "tok-1",
      resourceType: "file",
      resourceId: "file-shared",
      revoked: false,
      permission: "view",
    },
  ];

  await window.resolveAndRenderShare("tok-1", "");

  assert.equal(document.getElementById("shareResourceName").textContent, "Shared.pdf");
  const iframe = document.querySelector("#shareViewBody iframe");
  assert.ok(iframe, "PDF embedded");
  assert.match(iframe.getAttribute("src"), /\/api\/share\/tok-1\/content/);
});

test("share view: shows an error for an unknown token", async () => {
  const { window, document } = bootPage(
    "public/pages/share/view.html",
    ["utils.js", "share-view.js"],
    "user",
    undefined,
    "http://localhost/pages/share/view.html?token=missing",
  );
  await window.resolveAndRenderShare("missing", "");
  assert.ok(document.getElementById("shareViewError").textContent.length > 0, "error shown");
});

test("share button: creates a view-only link for the selected file", async () => {
  const { window, server } = bootPage(
    "public/pages/file/files.html",
    ["utils.js", "main.js", "file.js"],
    "user",
  );
  await window.loadFileList();
  await window.shareSelectedFile();

  assert.ok((server.dataset.shareLinks || []).length >= 1, "a share link was created");
  assert.equal(server.dataset.shareLinks[0].resourceType, "file");
});
