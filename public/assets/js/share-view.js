// Public share-link viewer. No authentication: a recipient opens
// /pages/share/view.html?token=... and we resolve the link and embed the PDF.

function shareViewEls() {
  return {
    name: document.getElementById("shareResourceName"),
    body: document.getElementById("shareViewBody"),
    error: document.getElementById("shareViewError"),
  };
}

function shareViewError(message) {
  const { error, body } = shareViewEls();
  if (error) error.textContent = message;
  if (body) body.innerHTML = "";
}

async function resolveAndRenderShare(token, password) {
  const { name, body } = shareViewEls();
  const qs = password ? `?password=${encodeURIComponent(password)}` : "";
  let response;
  try {
    response = await fetch(
      new URL(`/api/share/${encodeURIComponent(token)}${qs}`, window.location.origin).href,
    );
  } catch (err) {
    shareViewError("Unable to open this link. Please try again.");
    return;
  }

  if (response.status === 401) {
    const pw = window.prompt("This link is password protected. Enter the password:");
    if (pw) {
      await resolveAndRenderShare(token, pw);
    } else {
      shareViewError("A password is required to view this link.");
    }
    return;
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    shareViewError(data.error || "This link is no longer available.");
    return;
  }

  const data = await response.json();
  const safeName =
    data.resource && data.resource.name
      ? typeof escapeHtml === "function"
        ? escapeHtml(data.resource.name)
        : data.resource.name
      : "Shared item";
  if (name) name.textContent = data.resource ? data.resource.name : "Shared item";

  if (!body) return;
  if (data.resourceType === "file" && data.resource && data.resource.hasContent) {
    const src = new URL(
      `/api/share/${encodeURIComponent(token)}/content${qs}`,
      window.location.origin,
    ).href;
    body.innerHTML = `<iframe class="file-pdf-frame" src="${src}" title="Shared document"></iframe>`;
  } else {
    body.innerHTML = `<p class="muted">Shared ${data.resourceType}: ${safeName}</p>`;
  }
}

function initShareView() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) {
    shareViewError("No share link was provided.");
    return;
  }
  resolveAndRenderShare(token, "");
}

document.addEventListener("DOMContentLoaded", initShareView);
