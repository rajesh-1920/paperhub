import nodemailer from "nodemailer";

// Email notifications. Currently used to tell the admin when an officer forwards
// a document for their review. Configured entirely from the environment so the
// app runs fine without it: when no transport is configured the notification is
// logged instead of sent, and a forward never fails because email is down.

// Where forwarded-document notifications are sent. Defaults to the project admin.
export function adminEmail(env = process.env) {
  return env.ADMIN_EMAIL || "rajesh18@cse.pstu.ac.bd";
}

function fromAddress(env) {
  return env.SMTP_FROM || env.GMAIL_USER || env.SMTP_USER || adminEmail(env);
}

// Build an SMTP transport from the environment, or return null if email isn't
// configured. Supports a Gmail shortcut (GMAIL_USER + an App Password) or a
// generic SMTP server (SMTP_HOST/PORT/USER/PASS).
export function buildTransport(env = process.env) {
  if (env.GMAIL_USER && env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const port = Number(env.SMTP_PORT || 587);
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  }
  return null;
}

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function buildMessage(details, env) {
  const doc = details.documentName || "a document";
  const subject = `[PaperHub] Document forwarded for your review: ${doc}`;
  const rows = [
    ["Document", details.documentName || "(unknown)"],
    ["Forwarded by", details.forwardedBy || "An officer"],
    details.ownerName ? ["Submitted by", details.ownerName] : null,
    details.comment ? ["Officer's note", details.comment] : null,
    details.reviewId ? ["Review id", details.reviewId] : null,
  ].filter(Boolean);

  const text =
    `${details.forwardedBy || "An officer"} has forwarded a document to you for review.\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nOpen PaperHub to review and decide.`;

  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a">` +
    `<h2 style="color:#0ea5e9;margin:0 0 12px">PaperHub — Document forwarded for review</h2>` +
    `<p>${escapeHtml(details.forwardedBy || "An officer")} has forwarded a document to you for review.</p>` +
    `<table cellpadding="6" style="border-collapse:collapse;font-size:14px">` +
    rows
      .map(
        ([k, v]) =>
          `<tr><td style="color:#64748b">${escapeHtml(k)}</td>` +
          `<td style="font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join("") +
    `</table>` +
    `<p style="margin-top:16px">Open PaperHub to review and decide.</p></div>`;

  return { subject, text, html, from: fromAddress(env) };
}

// Notify the admin that an officer forwarded a document. Returns a small result
// object instead of throwing on a missing transport, so callers can report
// status without the forward itself failing. `deps.transport` injects a fake
// transport for tests; `deps.log` overrides the console logger.
export async function sendForwardEmail(details = {}, env = process.env, deps = {}) {
  const to = adminEmail(env);
  const transport = deps.transport !== undefined ? deps.transport : buildTransport(env);
  const { subject, text, html, from } = buildMessage(details, env);

  if (!transport) {
    (deps.log || console.log)(`[email] not configured — would notify ${to}: ${subject}`);
    return { sent: false, reason: "not_configured", to };
  }

  const info = await transport.sendMail({ from, to, subject, text, html });
  return { sent: true, to, messageId: info && info.messageId };
}
