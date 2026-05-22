const NOTIFICATION_FILTERS = ["all", "unread", "review", "billing", "system", "security"];

let notificationsState = [];
let activeNotificationFilter = "all";

function initNotificationsPage() {
  notificationsState = typeof getCurrentUserNotifications === "function"
    ? getCurrentUserNotifications().map((item) => ({ ...item }))
    : [];

  setupNotificationFilters();
  setupNotificationActions();
  renderNotifications();
}

function setupNotificationFilters() {
  const filterButtons = getElements("[data-notification-filter]");
  filterButtons.forEach((button) => {
    addEvent(button, "click", () => {
      activeNotificationFilter = button.getAttribute("data-notification-filter") || "all";
      filterButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      renderNotifications();
    });
  });
}

function setupNotificationActions() {
  const searchInput = getElement("#notificationSearch");
  if (searchInput && !searchInput.dataset.bound) {
    addEvent(searchInput, "input", renderNotifications);
    searchInput.dataset.bound = "true";
  }

  const markAllReadButton = getElement("#markAllReadBtn");
  if (markAllReadButton && !markAllReadButton.dataset.bound) {
    addEvent(markAllReadButton, "click", () => {
      notificationsState = notificationsState.map((notification) => ({
        ...notification,
        read: true,
      }));
      renderNotifications();
      showSuccess("All notifications marked as read");
    });
    markAllReadButton.dataset.bound = "true";
  }
}

function renderNotifications() {
  const list = getElement("#notificationList");
  if (!list) {
    return;
  }

  const searchValue = String(getElement("#notificationSearch")?.value || "").trim().toLowerCase();
  const filtered = notificationsState.filter((notification) => {
    const matchesSearch =
      !searchValue ||
      [notification.title, notification.description, notification.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchValue);

    const matchesFilter =
      activeNotificationFilter === "all" ||
      (activeNotificationFilter === "unread" && !notification.read) ||
      notification.category === activeNotificationFilter;

    return matchesSearch && matchesFilter;
  });

  list.innerHTML = filtered.length
    ? filtered.map(renderNotificationItem).join("")
    : `
      <div class="card empty-state">
        <h3>No notifications found</h3>
        <p class="notification-summary">Try another filter or clear the search input.</p>
      </div>
    `;

  updateNotificationStats();
  setupNotificationItemActions();
}

function renderNotificationItem(notification) {
  const unreadClass = notification.read ? "" : "unread";
  const dotClass = notification.read ? "read" : "";
  return `
    <article class="card notification-item ${unreadClass}" data-notification-id="${escapeHtml(notification.id)}">
      <span class="notification-dot ${dotClass}" aria-hidden="true"></span>
      <div class="notification-meta flex-1">
        <div class="notifications-toolbar">
          <div>
            <div class="notification-title">${escapeHtml(notification.title)}</div>
            <div class="notification-description">${escapeHtml(notification.description)}</div>
          </div>
          <span class="badge badge-primary">${escapeHtml(notification.category)}</span>
        </div>
        <div class="notification-time">${timeAgo(notification.createdAt)}</div>
      </div>
      <div class="notification-actions">
        <button type="button" class="btn btn-outline btn-sm" data-notification-action="toggle-read" data-notification-id="${escapeHtml(notification.id)}">
          ${notification.read ? "Mark unread" : "Mark read"}
        </button>
      </div>
    </article>
  `;
}

function updateNotificationStats() {
  const unreadCount = notificationsState.filter((notification) => !notification.read).length;
  const totalCount = notificationsState.length;
  const unreadEl = getElement("#notificationUnreadCount");
  const totalEl = getElement("#notificationTotalCount");
  const unreadBadgeEl = getElement("#notificationUnreadBadge");
  const totalBadgeEl = getElement("#notificationTotalBadge");

  if (unreadEl) unreadEl.textContent = String(unreadCount);
  if (totalEl) totalEl.textContent = String(totalCount);
  if (unreadBadgeEl) unreadBadgeEl.textContent = String(unreadCount);
  if (totalBadgeEl) totalBadgeEl.textContent = String(totalCount);

  document.querySelectorAll("[data-notification-filter]").forEach((button) => {
    const filter = button.getAttribute("data-notification-filter");
    button.classList.toggle("is-active", filter === activeNotificationFilter);
  });
}

function setupNotificationItemActions() {
  document.querySelectorAll("[data-notification-action='toggle-read']").forEach((button) => {
    if (button.dataset.bound === "true") {
      return;
    }

    addEvent(button, "click", () => {
      const id = button.getAttribute("data-notification-id");
      notificationsState = notificationsState.map((notification) => {
        if (notification.id !== id) {
          return notification;
        }

        return { ...notification, read: !notification.read };
      });
      renderNotifications();
    });

    button.dataset.bound = "true";
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("notifications-page")) {
    initNotificationsPage();
  }
});
