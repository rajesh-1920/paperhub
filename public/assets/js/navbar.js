(function () {
  const ACTIVE_CLASSES = ["is-active"];
  const SIDEBAR_STATE_STORAGE_KEY = "paperhub-sidebar-state";
  const SIDEBAR_COLLAPSED_BREAKPOINT = 768;
  const SIDEBAR_EXPANDED_BREAKPOINT = 1200;
  let hasPartialRoutingSetup = false;

  const TOP_NAV_ROUTE_GROUPS = {
    dashboard: [
      "/pages/dashboard/user.html",
      "/pages/dashboard/officer.html",
      "/pages/dashboard/admin.html",
    ],
    files: [
      "/pages/file/files.html",
      "/pages/file/upload.html",
      "/pages/file/version-history.html",
    ],
    reviews: [
      "/pages/review/review-queue.html",
      "/pages/review/review-details.html",
    ],
    support: ["/pages/support/contact.html"],
  };

  const SIDEBAR_ROUTE_GROUPS = {
    dashboard: TOP_NAV_ROUTE_GROUPS.dashboard,
    fileDetails: ["/pages/file/files.html"],
    fileUpload: ["/pages/file/upload.html"],
    fileHistory: ["/pages/file/version-history.html"],
    reviews: TOP_NAV_ROUTE_GROUPS.reviews,
    profile: [
      "/pages/profile/profile.html",
      "/pages/profile/profile-edit.html",
    ],
    settings: ["/pages/account/settings.html"],
    billing: ["/pages/payment/payment.html"],
    support: TOP_NAV_ROUTE_GROUPS.support,
  };

  const NAV_STATE_SELECTORS = {
    topNav: "[data-top-nav]",
    sidebar: "[data-sidebar-route]",
  };

  function resolveLink(path) {
    if (typeof resolveAppPath === "function") {
      return resolveAppPath(path);
    }

    const normalizedPath = String(path || "").replace(/^\/+/, "");
    return new URL(normalizedPath, window.location.href).href;
  }

  function applyAppLinks() {
    document.querySelectorAll("[data-app-href]").forEach((link) => {
      const path = link.dataset.appHref;
      if (!path) {
        return;
      }

      link.setAttribute("href", resolveLink(path));
    });
  }

  function normalizeRoutePath(pathname) {
    const rawPath = String(pathname || "")
      .split("?")[0]
      .split("#")[0]
      .toLowerCase();

    const appPathIndex = rawPath.lastIndexOf("/pages/");
    let normalizedPath = appPathIndex >= 0 ? rawPath.slice(appPathIndex) : rawPath;

    if (normalizedPath.endsWith("/index.html")) {
      normalizedPath = normalizedPath.slice(0, -"/index.html".length) || "/";
    }

    if (normalizedPath.endsWith("index.html") && !normalizedPath.endsWith("/index.html")) {
      normalizedPath = "/";
    }

    normalizedPath = normalizedPath.replace(/\/{2,}/g, "/");

    if (normalizedPath.length > 1) {
      normalizedPath = normalizedPath.replace(/\/+$/g, "");
    }

    return normalizedPath || "/";
  }

  function pathMatchesRoute(currentPath, candidatePath) {
    const normalizedCurrent = normalizeRoutePath(currentPath);
    const normalizedCandidate = normalizeRoutePath(candidatePath);

    if (!normalizedCandidate) {
      return false;
    }

    if (normalizedCurrent === normalizedCandidate) {
      return true;
    }
    return normalizedCurrent.startsWith(`${normalizedCandidate}/`);
  }

  function getRouteKeyForPath(routeGroups, pathname) {
    const currentPath = normalizeRoutePath(pathname);

    return (
      Object.entries(routeGroups).find(([, routes]) =>
        routes.some((routePath) => pathMatchesRoute(currentPath, routePath)),
      )?.[0] || null
    );
  }

  function getTopNavKeyForCurrentRoute(pathname = window.location.pathname) {
    return getRouteKeyForPath(TOP_NAV_ROUTE_GROUPS, pathname);
  }

  function syncTopNavState(pathname = window.location.pathname) {
    const activeKey = getTopNavKeyForCurrentRoute(pathname);

    document.querySelectorAll(NAV_STATE_SELECTORS.topNav).forEach((link) => {
      const isActive = link.dataset.topNav === activeKey;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function applyRoleVisibility(role) {
    const roleElements = document.querySelectorAll("[data-roles]");

    roleElements.forEach((element) => {
      const roles = element.dataset.roles
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      const canView = roles.length === 0 || roles.includes(role);
      element.classList.toggle("hidden", !canView);
    });

    const roleBadge = document.querySelector("[data-role-badge]");
    if (roleBadge) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      roleBadge.textContent = roleLabel;
      roleBadge.className =
        "ph-role-badge hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold sm:inline-flex transition-all duration-200";

      if (role === "admin") {
        roleBadge.classList.add("border-red-300", "bg-red-50", "text-red-700");
      } else if (role === "officer") {
        roleBadge.classList.add(
          "border-purple-300",
          "bg-purple-50",
          "text-purple-700",
        );
      } else {
        roleBadge.classList.add("text-slate-600");
      }
    }

    const mobileRoleBadge = document.querySelector("[data-role-badge-mobile]");
    if (mobileRoleBadge) {
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
      mobileRoleBadge.textContent = roleLabel;
    }
  }

  function syncSidebarState(pathname = window.location.pathname) {
    const activeKey = getRouteKeyForPath(SIDEBAR_ROUTE_GROUPS, pathname);

    document.querySelectorAll(NAV_STATE_SELECTORS.sidebar).forEach((link) => {
      const isActive = link.dataset.sidebarRoute === activeKey;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function syncNavigationState(pathname = window.location.pathname) {
    syncTopNavState(pathname);
    syncSidebarState(pathname);
  }

  function applyUserIdentity(user) {
    if (!user) {
      return;
    }

    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = user.name;
    });

    document.querySelectorAll("[data-user-email]").forEach((element) => {
      element.textContent = user.email;
    });

    document.querySelectorAll("[data-user-title]").forEach((element) => {
      element.textContent = user.title;
    });

    document.querySelectorAll("[data-user-initials]").forEach((element) => {
      const initials = String(user.name || "U")
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
      element.textContent = initials || "U";
    });
  }

  function setupSignOut() {
    document.querySelectorAll("[data-sign-out]").forEach((button) => {
      button.addEventListener("click", () => {
        if (typeof logout === "function") {
          logout();
          return;
        }

        try {
          localStorage.removeItem("paperhub-user");
          localStorage.removeItem("paperhub-user-role");
        } catch (error) {
          console.warn("Unable to clear auth storage", error);
        }

        window.location.href = resolveLink("pages/auth/login.html");
      });
    });
  }

  function setDropdownRoleState(role) {
    const normalizedRole = normalizeRole(role);

    document.querySelectorAll("[data-switch-role]").forEach((button) => {
      const isActive = button.getAttribute("data-switch-role") === normalizedRole;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    document.querySelectorAll("[data-user-role]").forEach((element) => {
      element.textContent = normalizedRole.toUpperCase();
    });
  }

  function switchUserRole(role) {
    const normalizedRole = normalizeRole(role);

    if (typeof getDefaultUserForRole !== "function" || typeof setCurrentUserById !== "function") {
      return;
    }

    const nextUser = getDefaultUserForRole(normalizedRole);
    if (!nextUser) {
      return;
    }

    setCurrentUserById(nextUser.id);
    const nextDashboard =
      typeof getDashboardRouteForRole === "function"
        ? getDashboardRouteForRole(normalizedRole)
        : resolveLink(`pages/dashboard/${normalizedRole}.html`);

    window.location.href = nextDashboard;
  }

  function applyDynamicMeta() {
    const currentYear = String(new Date().getFullYear());
    document.querySelectorAll("[data-current-year]").forEach((element) => {
      element.textContent = currentYear;
    });
  }

  function getStoredSidebarState() {
    try {
      const storedState = localStorage.getItem(SIDEBAR_STATE_STORAGE_KEY);
      if (storedState === "expanded" || storedState === "collapsed") {
        return storedState;
      }
    } catch (error) {
      console.warn("Unable to read sidebar preference", error);
    }

    return null;
  }

  function setStoredSidebarState(state) {
    try {
      localStorage.setItem(SIDEBAR_STATE_STORAGE_KEY, state);
    } catch (error) {
      console.warn("Unable to persist sidebar preference", error);
    }
  }

  function getAutoSidebarState() {
    if (window.innerWidth >= SIDEBAR_EXPANDED_BREAKPOINT) {
      return "expanded";
    }

    if (window.innerWidth >= SIDEBAR_COLLAPSED_BREAKPOINT) {
      return "collapsed";
    }

    return "collapsed";
  }

  function applySidebarState(state, persist = false) {
    const isExpanded = state === "expanded";
    const body = document.body;
    const sidebar = document.getElementById("paperhubSidebar");
    const toggleButtons = Array.from(
      document.querySelectorAll("[data-sidebar-toggle]"),
    );
    const toggleLabels = document.querySelectorAll(
      "[data-sidebar-toggle-label]",
    );
    const toggleIcons = document.querySelectorAll("[data-sidebar-toggle-icon]");

    body.classList.toggle("ph-sidebar-expanded", isExpanded);
    body.classList.toggle("ph-sidebar-collapsed", !isExpanded);
    body.dataset.sidebarState = state;

    if (sidebar) {
      sidebar.setAttribute("data-sidebar-state", state);
    }

    toggleButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(isExpanded));
      button.setAttribute(
        "aria-label",
        isExpanded ? "Collapse sidebar" : "Expand sidebar",
      );
    });

    toggleLabels.forEach((element) => {
      element.textContent = isExpanded ? "Collapse" : "Expand";
    });

    toggleIcons.forEach((element) => {
      element.textContent = isExpanded ? "⟨⟨" : "⟩⟩";
    });

    if (persist) {
      setStoredSidebarState(state);
    }
  }

  function setupSidebarToggle() {
    const toggleButtons = Array.from(
      document.querySelectorAll("[data-sidebar-toggle]"),
    );
    if (toggleButtons.length === 0) {
      return;
    }

    let hasManualPreference = getStoredSidebarState() !== null;
    const applyCurrentSidebarState = () => {
      const storedState = getStoredSidebarState();
      const nextState = storedState || getAutoSidebarState();
      applySidebarState(nextState, false);
    };

    applyCurrentSidebarState();

    toggleButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const isExpanded = document.body.classList.contains(
          "ph-sidebar-expanded",
        );
        const nextState = isExpanded ? "collapsed" : "expanded";

        hasManualPreference = true;
        applySidebarState(nextState, true);
      });
    });

    if (!hasManualPreference) {
      window.addEventListener("resize", () => {
        if (getStoredSidebarState()) {
          return;
        }

        applyCurrentSidebarState();
      });
    }
  }

  function setupMobileMenu(navLinks) {
    const toggleButton = document.getElementById("navbarHamburger");
    const mobileMenu = document.getElementById("mobileMenu");

    if (!toggleButton || !mobileMenu) {
      return;
    }

    const closeMenu = () => {
      mobileMenu.classList.add("hidden");
      toggleButton.setAttribute("aria-expanded", "false");
    };

    toggleButton.addEventListener("click", () => {
      const isOpen = !mobileMenu.classList.contains("hidden");
      mobileMenu.classList.toggle("hidden", isOpen);
      toggleButton.setAttribute("aria-expanded", String(!isOpen));
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  async function loadMainContentFromUrl(url, { replaceState = false } = {}) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (!res.ok) {
        window.location.href = url;
        return;
      }

      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      const newMain = doc.querySelector("main");
      const targetMain = document.querySelector("main");

      if (newMain && targetMain) {
        try {
          const headLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
          headLinks.forEach((link) => {
            const href = link.getAttribute("href") || link.href || "";
            if (!href) return;
            const absHref = new URL(href, url).href;
            const already = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
              (existing) => existing.href === absHref,
            );
            if (!already) {
              const linkEl = document.createElement("link");
              linkEl.rel = "stylesheet";
              linkEl.href = absHref;
              document.head.appendChild(linkEl);
            }
          });

          const styleEls = Array.from(doc.querySelectorAll("style"));
          styleEls.forEach((s) => {
            const txt = s.textContent && s.textContent.trim();
            if (!txt) return;
            const exists = Array.from(document.querySelectorAll("style")).some(
              (existing) => existing.textContent && existing.textContent.trim() === txt,
            );
            if (!exists) {
              const styleNode = document.createElement("style");
              styleNode.textContent = txt;
              document.head.appendChild(styleNode);
            }
          });
        } catch (err) {
          console.warn("Failed to import styles from fetched page", err);
        }

        try {
          const preserve = Array.from(document.body.classList).filter((c) =>
            c && (c.startsWith("paperhub") || c.startsWith("ph-") || c === "dark" || c === "light"),
          );
          const incoming = Array.from(doc.body.classList || []);
          const merged = Array.from(new Set([...preserve, ...incoming]));
          document.body.className = merged.join(" ");
        } catch (err) {
          console.warn("Failed to merge body classes from fetched page", err);
        }

        targetMain.innerHTML = newMain.innerHTML;

        if (doc.title) {
          document.title = doc.title;
        }

        const scripts = Array.from(doc.querySelectorAll("script"));
        const scriptPromises = [];

        scripts.forEach((s) => {
          try {
            if (s.src) {
              const hrefAttr = s.getAttribute("src") || s.src;
              const absSrc = new URL(hrefAttr, url).href;
              const already = Array.from(document.scripts).some(
                (existing) => existing.src === absSrc,
              );
              if (!already) {
                scriptPromises.push(
                  new Promise((resolve) => {
                    const scriptEl = document.createElement("script");
                    scriptEl.src = absSrc;
                    scriptEl.async = false;
                    scriptEl.onload = () => resolve();
                    scriptEl.onerror = () => {
                      console.warn("Failed to inject script from fetched page", absSrc);
                      resolve();
                    };
                    document.body.appendChild(scriptEl);
                  }),
                );
              }
            } else if (s.textContent && s.textContent.trim()) {
              const inline = document.createElement("script");
              inline.textContent = s.textContent;
              document.body.appendChild(inline);
            }
          } catch (err) {
            console.warn("Failed to inject script from fetched page", err);
          }
        });

        if (scriptPromises.length > 0) {
          await Promise.all(scriptPromises);
        }

        const runPageInitializer = () => {
          const body = document.body;

          if (body.classList.contains("support-page") && typeof initPageSpecificForms === "function") {
            initPageSpecificForms();
          }

          if (body.classList.contains("review-queue-page") && typeof initReviewQueuePage === "function") {
            initReviewQueuePage();
          }

          if (body.classList.contains("review-details-page") && typeof initReviewDetailsPage === "function") {
            initReviewDetailsPage();
          }

          if (body.classList.contains("file-upload-page") && typeof initFileUploadPage === "function") {
            initFileUploadPage();
          }

          if (body.classList.contains("file-details-page") && typeof initFileDetailsPage === "function") {
            initFileDetailsPage();
          }

          if (body.classList.contains("version-history-page") && typeof initVersionHistoryPage === "function") {
            initVersionHistoryPage();
          }

        };

        runPageInitializer();

        if (typeof applyCurrentUserPageData === "function") {
          applyCurrentUserPageData();
        }

        const sidebarLinks = document.querySelectorAll("[data-sidebar-link]");
        const nextPathname = new URL(url, window.location.href).pathname;

        if (replaceState) {
          history.replaceState({ url }, "", url);
        } else {
          history.pushState({ url }, "", url);
        }

        syncNavigationState(nextPathname);

        applyDynamicMeta();

        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      window.location.href = url;
    } catch (err) {
      console.warn(
        "Partial navigation failed, falling back to full reload",
        err,
      );
      window.location.href = url;
    }
  }

  function enablePartialRouting() {
    if (!hasPartialRoutingSetup) {
      window.addEventListener("popstate", () => {
        loadMainContentFromUrl(location.href, { replaceState: true });
      });
      hasPartialRoutingSetup = true;
    }

    const appLinks = Array.from(
      document.querySelectorAll(
        "[data-app-href], [data-nav-link], [data-sidebar-link]",
      ),
    );

    appLinks.forEach((link) => {
      if (link.dataset.partialRoutingBound === "true") {
        return;
      }

      const href = link.getAttribute("href");
      if (!href) {
        return;
      }

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) {
        return;
      }

      const handler = (e) => {
        if (
          e.defaultPrevented ||
          e.button !== 0 ||
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey
        ) {
          return;
        }
        e.preventDefault();
        loadMainContentFromUrl(url.href);
      };

      link.addEventListener("click", handler);
      link.dataset.partialRoutingBound = "true";
    });
  }

  function setupUserDropdown() {
    const menuButton = document.getElementById("userMenuBtn");
    const menu = document.getElementById("userDropdown");

    if (menuButton && menu) {
      const positionMenu = () => {
        const buttonRect = menuButton.getBoundingClientRect();
        const spacing = 8;
        const viewportPadding = 12;

        const wasHidden = menu.classList.contains("hidden");
        if (wasHidden) {
          menu.classList.remove("hidden");
          menu.style.visibility = "hidden";
          menu.style.left = "0px";
        }

        let menuWidth = menu.offsetWidth || 220;
        menuWidth = Math.min(
          menuWidth,
          window.innerWidth - viewportPadding * 2,
        );

        const idealLeft = Math.round(buttonRect.right - menuWidth);
        const maxLeft = window.innerWidth - menuWidth - viewportPadding;
        const minLeft = viewportPadding;
        const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));
        const top = Math.round(buttonRect.bottom + spacing);

        menu.style.position = "fixed";
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.right = "auto";
        menu.style.transformOrigin = "top center";

        if (wasHidden) {
          menu.style.visibility = "";
          menu.classList.add("hidden");
          menu.style.left = "";
        }
      };

      const closeMenu = () => {
        menu.classList.add("hidden");
        menuButton.setAttribute("aria-expanded", "false");
      };

      const currentRole =
        typeof getCurrentUserData === "function" ? normalizeRole(getCurrentUserData()?.role || "user") : "user";

      setDropdownRoleState(currentRole);

      menu.querySelectorAll("[data-switch-role]").forEach((button) => {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          const nextRole = button.getAttribute("data-switch-role");
          if (!nextRole) {
            return;
          }

          closeMenu();
          switchUserRole(nextRole);
        });
      });

      menu.querySelectorAll("[data-app-href], [data-sign-out]").forEach((item) => {
        item.addEventListener("click", () => {
          closeMenu();
        });
      });

      menu.addEventListener("click", (event) => {
        const target = event.target;
        if (target && target.closest("[data-app-href], [data-sign-out], [data-switch-role]")) {
          return;
        }

        if (target && target.closest(".ph-menu-link, .ph-menu-btn")) {
          closeMenu();
        }
      });

      menuButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = !menu.classList.contains("hidden");

        if (isOpen) {
          closeMenu();
        } else {
          menu.classList.remove("hidden");
          menuButton.setAttribute("aria-expanded", "true");
          setDropdownRoleState(
            typeof getCurrentUserData === "function"
              ? normalizeRole(getCurrentUserData()?.role || "user")
              : "user",
          );
          requestAnimationFrame(positionMenu);
        }
      });

      window.addEventListener("resize", () => {
        if (!menu.classList.contains("hidden")) {
          positionMenu();
        }
      });

      window.addEventListener("scroll", () => {
        if (!menu.classList.contains("hidden")) {
          positionMenu();
        }
      });

      document.addEventListener("click", (event) => {
        if (
          !menuButton.contains(event.target) &&
          !menu.contains(event.target)
        ) {
          closeMenu();
        }
      });
    }
  }

  function setupNotificationsDropdown() {
    const notifyBtn = document.getElementById("notifyBtn");
    const notifyDropdown = document.getElementById("notifyDropdown");
    const notifyList = document.getElementById("notifyList");
    const notifyCount = document.getElementById("notifyCount");
    const clearBtn = document.getElementById("clearNotificationsBtn");

    if (!notifyBtn || !notifyDropdown || !notifyList) return;

    const positionMenu = () => {
      const buttonRect = notifyBtn.getBoundingClientRect();
      const spacing = 8;
      const viewportPadding = 12;

      const wasHidden = notifyDropdown.classList.contains("hidden");
      if (wasHidden) {
        notifyDropdown.classList.remove("hidden");
        notifyDropdown.style.visibility = "hidden";
        notifyDropdown.style.left = "0px";
      }

      let menuWidth = notifyDropdown.offsetWidth || 320;
      menuWidth = Math.min(menuWidth, window.innerWidth - viewportPadding * 2);

      const idealLeft = Math.round(buttonRect.right - menuWidth);
      const maxLeft = window.innerWidth - menuWidth - viewportPadding;
      const minLeft = viewportPadding;
      const left = Math.max(minLeft, Math.min(idealLeft, maxLeft));
      const top = Math.round(buttonRect.bottom + spacing);

      notifyDropdown.style.position = "fixed";
      notifyDropdown.style.top = `${top}px`;
      notifyDropdown.style.left = `${left}px`;
      notifyDropdown.style.right = "auto";
      notifyDropdown.style.transformOrigin = "top center";

      if (wasHidden) {
        notifyDropdown.style.visibility = "";
        notifyDropdown.classList.add("hidden");
        notifyDropdown.style.left = "";
      }
    };

    function getTargetForNotification(n) {
      if (!n || !n.category) return resolveLink("pages/dashboard/user.html");
      if (n.category === "review") return resolveLink("pages/review/review-queue.html");
      if (n.category === "billing") return resolveLink("pages/payment/payment.html");
      if (n.category === "file") return resolveLink("pages/file/files.html");
      return resolveLink("pages/dashboard/user.html");
    }

    function renderNotifications() {
      const items = typeof getCurrentUserNotifications === "function" ? getCurrentUserNotifications() : [];
      const sorted = items.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      notifyList.innerHTML = sorted
        .map((item) => {
          const isUnread = !item.read;
          const time = item.createdAt ? timeAgo(item.createdAt) : "";
          const icon = item.category === "review" ? "📝" : item.category === "billing" ? "💳" : item.category === "file" ? "📁" : "🔔";

          return `
            <li class="notification-item ${isUnread ? "unread" : ""}" tabindex="0" role="menuitem" data-notification-id="${escapeHtml(item.id)}">
              <div class="notification-icon" aria-hidden="true">${icon}</div>
              <div class="notification-body">
                <div class="notification-title">${escapeHtml(item.title)}</div>
                <div class="notification-desc">${escapeHtml(item.description)}</div>
                <div class="notification-meta">
                  <div class="notification-time">${escapeHtml(time)}</div>
                  <div class="notification-badge">${escapeHtml(item.category || "general")}</div>
                </div>
              </div>
            </li>
          `;
        })
        .join("");

      const unreadCount = sorted.filter((i) => !i.read).length;
      if (notifyCount) {
        if (unreadCount > 0) {
          notifyCount.textContent = String(unreadCount > 99 ? "99+" : unreadCount);
          notifyCount.classList.remove("hidden");
        } else {
          notifyCount.classList.add("hidden");
        }
      }
    }

    notifyList.addEventListener("click", (e) => {
      const li = e.target.closest("[data-notification-id]");
      if (!li) return;
      activateNotificationItem(li);
    });

    notifyList.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        const li = e.target.closest("[data-notification-id]");
        if (!li) return;
        e.preventDefault();
        activateNotificationItem(li);
      }
    });

    function activateNotificationItem(li) {
      const id = li.getAttribute("data-notification-id");
      const items = typeof getCurrentUserNotifications === "function" ? getCurrentUserNotifications() : [];
      const item = items.find((x) => String(x.id) === String(id));
      if (item) item.read = true;

      if (typeof phSetNotificationRead === "function" && typeof getCurrentUserData === "function") {
        const currentUser = getCurrentUserData();
        if (currentUser) phSetNotificationRead(currentUser.id, id, true);
      }

      renderNotifications();

      const target = getTargetForNotification(item);
      if (typeof loadMainContentFromUrl === "function") {
        loadMainContentFromUrl(target);
      } else {
        window.location.href = target;
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const items = typeof getCurrentUserNotifications === "function" ? getCurrentUserNotifications() : [];
        items.forEach((i) => (i.read = true));

        if (typeof phMarkAllNotificationsRead === "function" && typeof getCurrentUserData === "function") {
          const currentUser = getCurrentUserData();
          if (currentUser) phMarkAllNotificationsRead(currentUser.id);
        }

        renderNotifications();
      });
    }

    notifyBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = !notifyDropdown.classList.contains("hidden");
      if (isOpen) {
        notifyDropdown.classList.add("hidden");
        notifyBtn.setAttribute("aria-expanded", "false");
      } else {
        renderNotifications();
        notifyDropdown.classList.remove("hidden");
        notifyBtn.setAttribute("aria-expanded", "true");
        requestAnimationFrame(positionMenu);
      }
    });

    window.addEventListener("resize", () => {
      if (!notifyDropdown.classList.contains("hidden")) positionMenu();
    });

    window.addEventListener("scroll", () => {
      if (!notifyDropdown.classList.contains("hidden")) positionMenu();
    });

    document.addEventListener("click", (event) => {
      if (!notifyBtn.contains(event.target) && !notifyDropdown.contains(event.target)) {
        notifyDropdown.classList.add("hidden");
        notifyBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function setupThemeToggle() {
    const themeToggle = document.getElementById("themeToggle");
    const mobileThemeToggle = document.getElementById("mobileThemeToggle");
    const sharedThemeToggles = Array.from(
      document.querySelectorAll("[data-theme-toggle]"),
    );
    const root = document.documentElement;

    const getStoredTheme = () => {
      try {
        return localStorage.getItem("paperhub-theme");
      } catch (error) {
        console.warn("Unable to read theme preference", error);
        return null;
      }
    };

    const setStoredTheme = (theme) => {
      try {
        localStorage.setItem("paperhub-theme", theme);
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    };

    const syncThemeLabels = (isDark) => {
      const nextIcon = isDark ? "◑" : "◐";
      const nextLabel = isDark ? "Light Mode" : "Dark Mode";

      document.querySelectorAll("[data-theme-icon]").forEach((element) => {
        element.textContent = nextIcon;
      });

      document.querySelectorAll("[data-theme-label]").forEach((element) => {
        element.textContent = nextLabel;
      });
    };

    const applyTheme = (isDark, persist = false) => {
      root.classList.toggle("dark", isDark);
      themeToggle?.setAttribute("aria-pressed", String(isDark));
      mobileThemeToggle?.setAttribute("aria-pressed", String(isDark));
      sharedThemeToggles.forEach((toggle) => {
        toggle.setAttribute("aria-pressed", String(isDark));
      });
      syncThemeLabels(isDark);

      if (persist) {
        setStoredTheme(isDark ? "dark" : "light");
      }
    };

    const storedTheme = getStoredTheme();
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = storedTheme ? storedTheme === "dark" : prefersDark;

    applyTheme(shouldUseDark, false);

    if (!themeToggle && !mobileThemeToggle && sharedThemeToggles.length === 0) {
      return;
    }

    themeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    mobileThemeToggle?.addEventListener("click", () => {
      const isDark = !root.classList.contains("dark");
      applyTheme(isDark, true);
    });

    sharedThemeToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const isDark = !root.classList.contains("dark");
        applyTheme(isDark, true);
      });
    });

    if (!storedTheme && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.addEventListener("change", (event) => {
        applyTheme(event.matches, false);
      });
    }
  }

  function initPaperHubNavbar() {
    const navbar = document.getElementById("paperhubNavbar");
    if (!navbar) {
      return;
    }

    const user =
      typeof getCurrentUserData === "function" ? getCurrentUserData() : null;
    const role = normalizeRole(user?.role || "student");
    const navLinks = document.querySelectorAll("[data-nav-link]");
    const sidebarLinks = document.querySelectorAll("[data-sidebar-link]");

    applyAppLinks();
    applyRoleVisibility(role);
    applyUserIdentity(user);
    syncNavigationState();
    setupMobileMenu(navLinks);
    setupUserDropdown();
    setupThemeToggle();
    try {
      const notifyBtn = document.getElementById("notifyBtn");
      const notifyCount = document.getElementById("notifyCount");

      if (notifyCount) {
        const unread = user && Array.isArray(user.notifications) ? user.notifications.filter((n) => !n.read).length : 0;
        if (unread > 0) {
          notifyCount.textContent = String(unread > 99 ? "99+" : unread);
          notifyCount.classList.remove("hidden");
        } else {
          notifyCount.classList.add("hidden");
        }
      }

      setupNotificationsDropdown();
    } catch (err) {
      console.warn("Notifications init failed", err);
    }
    setupSidebarToggle();
    setupSignOut();
    applyDynamicMeta();
    enablePartialRouting();
  }

  window.initPaperHubNavbar = initPaperHubNavbar;
})();
