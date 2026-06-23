// Activity log view. Reads the server-side audit log (own events for users, all
// for admins) and renders it.

const ACTIVITY_LABELS = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.logout": "Signed out",
  "auth.register": "Registered",
  "auth.password_changed": "Changed password",
  "file.upload": "Uploaded a file",
  "file.trash": "Moved a file to Trash",
  "share.create": "Created a share link",
};

function formatActivityAction(action) {
  return ACTIVITY_LABELS[action] || String(action || "Activity");
}

async function loadActivityLog() {
  const container = document.getElementById("activityLogBody");
  if (!container) return;

  const data =
    typeof listActivityViaApi === "function"
      ? await listActivityViaApi({ pageSize: 100 })
      : { items: [] };

  container.innerHTML = "";
  if (!data.items || !data.items.length) {
    container.innerHTML = '<tr><td colspan="4" class="muted">No activity yet.</td></tr>';
    return;
  }

  const fragment = document.createDocumentFragment();
  data.items.forEach((event) => {
    const when =
      event.ts && typeof formatDate === "function" ? formatDate(event.ts) : event.ts || "";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(formatActivityAction(event.action))}</td>
      <td>${escapeHtml(event.resourceName || event.resourceId || "—")}</td>
      <td>${escapeHtml(event.actorName || event.actorId || "—")}</td>
      <td>${escapeHtml(when)}</td>`;
    fragment.appendChild(row);
  });
  container.appendChild(fragment);
}

document.addEventListener("DOMContentLoaded", loadActivityLog);
