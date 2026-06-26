import test from "node:test";
import assert from "node:assert/strict";
import { bootPage } from "./helpers/dom.mjs";

test("upload persists and appears on the files page and officer queue (end-to-end)", async () => {
  const store = {};

  // 1. User uploads a document.
  const up = bootPage(
    "public/pages/file/upload.html",
    ["utils.js", "main.js", "file.js"],
    "user",
    store,
  );
  up.window.persistUploadedFile({ name: "E2E-Proof.pdf", size: 50000, type: "application/pdf" });

  // 2. A fresh "page load" (shared store) shows it on the files page.
  const files = bootPage(
    "public/pages/file/files.html",
    ["utils.js", "main.js", "file.js"],
    "user",
    store,
  );
  await files.window.loadFileList();
  assert.match(files.document.querySelector("#fileTableBody").textContent, /E2E-Proof\.pdf/);
  // The files page is a shared space: the count reflects EVERY non-trashed file,
  // not just the uploader's own.
  const expectedTotal = files.window.getPaperHubDataset().files.filter((f) => !f.deletedAt).length;
  assert.equal(files.document.querySelector("#filesStatTotal").textContent, String(expectedTotal));

  // 3. The officer sees it in the review queue.
  const queue = bootPage(
    "public/pages/review/review-queue.html",
    ["utils.js", "review.js", "main.js"],
    "officer",
    store,
  );
  assert.ok(
    queue.window.getPaperHubDataset().reviewQueue.some((r) => r.documentName === "E2E-Proof.pdf"),
  );
});

test("admin add-user creates a profile and a loginable auth account", () => {
  const { window } = bootPage(
    "public/pages/dashboard/admin.html",
    ["utils.js", "main.js"],
    "admin",
  );
  const account = {
    id: "officer-new-x",
    name: "New Officer",
    email: "new.officer@paperhub.com.bd",
    password: "officer01",
    role: "officer",
    title: "Document Review Officer",
  };
  window.phAddUser(account, window.buildNewUserProfile(account));

  const ds = window.getPaperHubDataset();
  assert.ok(ds.users.some((u) => u.email === "new.officer@paperhub.com.bd"));
  assert.ok(
    ds.authAccounts.some(
      (a) => a.email === "new.officer@paperhub.com.bd" && a.password === "officer01",
    ),
    "new account can authenticate",
  );
});

test("payment confirm marks the user's payment as paid", () => {
  const { window, user } = bootPage(
    "public/pages/payment/payment.html",
    ["utils.js", "main.js"],
    "user",
  );
  window.applyCurrentUserPageData();
  const button = window.document.getElementById("confirmPaymentBtn");
  assert.ok(
    button && !button.classList.contains("hidden"),
    "confirm button shown for pending user",
  );

  button.click();
  assert.equal(
    window.getPaperHubDataset().users.find((u) => u.id === user.id).payment.status,
    "Paid",
  );
  assert.ok(button.classList.contains("hidden"), "button hidden after payment");
});
