import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sendForwardEmail, buildTransport, adminEmail } from "../server/email.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- unit: sendForwardEmail / buildTransport / adminEmail --------------------

test("email: adminEmail defaults to the project admin, ADMIN_EMAIL overrides", () => {
  assert.equal(adminEmail({}), "rajesh18@cse.pstu.ac.bd");
  assert.equal(adminEmail({ ADMIN_EMAIL: "boss@school.test" }), "boss@school.test");
});

test("email: buildTransport is null unless Gmail or SMTP is configured", () => {
  assert.equal(buildTransport({}), null);
  assert.ok(buildTransport({ GMAIL_USER: "a@gmail.com", GMAIL_APP_PASSWORD: "app-pass" }));
  assert.ok(buildTransport({ SMTP_HOST: "smtp.test", SMTP_USER: "u", SMTP_PASS: "p" }));
});

test("email: sendForwardEmail sends to the admin with document details", async () => {
  const calls = [];
  const transport = {
    sendMail: async (msg) => {
      calls.push(msg);
      return { messageId: "msg-1" };
    },
  };
  const result = await sendForwardEmail(
    {
      documentName: "Scholarship.pdf",
      forwardedBy: "Officer Roy",
      comment: "Please review",
      ownerName: "Mahmud",
    },
    { ADMIN_EMAIL: "admin@school.test" },
    { transport },
  );
  assert.equal(result.sent, true);
  assert.equal(result.to, "admin@school.test");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].to, "admin@school.test");
  assert.match(calls[0].subject, /forwarded/i);
  assert.match(calls[0].subject, /Scholarship\.pdf/);
  assert.match(calls[0].text, /Officer Roy/);
  assert.match(calls[0].text, /Please review/);
  assert.match(calls[0].text, /Mahmud/);
  assert.match(calls[0].html, /Scholarship\.pdf/);
});

test("email: sendForwardEmail logs (does not throw) when no transport is configured", async () => {
  const logs = [];
  const result = await sendForwardEmail(
    { documentName: "Doc.pdf" },
    {},
    { transport: null, log: (m) => logs.push(m) },
  );
  assert.equal(result.sent, false);
  assert.equal(result.reason, "not_configured");
  assert.equal(result.to, "rajesh18@cse.pstu.ac.bd");
  assert.ok(logs.some((l) => /not configured/.test(l) && /rajesh18@cse\.pstu\.ac\.bd/.test(l)));
});

test("email: HTML output escapes document fields", async () => {
  let sent;
  await sendForwardEmail(
    { documentName: "<script>x</script>.pdf", forwardedBy: "A & B" },
    {},
    { transport: { sendMail: async (m) => ((sent = m), {}) } },
  );
  assert.doesNotMatch(sent.html, /<script>x<\/script>/);
  assert.match(sent.html, /&lt;script&gt;/);
  assert.match(sent.html, /A &amp; B/);
});

// --- route: POST /api/reviews/forward ----------------------------------------

async function startServer() {
  const dir = await mkdtemp(join(tmpdir(), "ph-fwd-"));
  process.env.PAPERHUB_DB_FILE = join(dir, "db.json");
  process.env.PAPERHUB_SEED_FILE = join(ROOT, "tests/fixtures/dataset.json");
  process.env.PAPERHUB_UPLOAD_DIR = join(dir, "up");
  process.env.BCRYPT_ROUNDS = "4";
  const { createApp } = await import("../server/index.js");
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test("forward route: officer/admin only; returns a delivery result", async (t) => {
  const { server, base } = await startServer();
  t.after(() => server.close());
  const login = (email, password) =>
    fetch(`${base}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => r.json());

  const officerTok = (await login("rajdip.roy@paperhub.com.bd", "officer01")).token;
  const userTok = (await login("mahmud.hasan@paperhub.edu.bd", "user01")).token;
  const forward = (tok) =>
    fetch(`${base}/api/reviews/forward`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(tok ? { authorization: `Bearer ${tok}` } : {}),
      },
      body: JSON.stringify({
        reviewId: "file-003-review",
        documentName: "Doc.pdf",
        comment: "escalating",
      }),
    });

  assert.equal((await forward(null)).status, 401, "unauthenticated rejected");
  assert.equal((await forward(userTok)).status, 403, "a regular user cannot forward");

  const res = await forward(officerTok);
  assert.equal(res.status, 200, "officer can forward");
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(body.emailed, "delivery result reported");
  // No SMTP configured in tests -> the notification is logged, not sent.
  assert.equal(body.emailed.sent, false);
  assert.equal(body.emailed.to, "rajesh18@cse.pstu.ac.bd");
});
