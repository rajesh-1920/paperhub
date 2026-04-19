const COMPONENT_CACHE_KEY = "paperhub-component-cache";

(function applyInitialThemePreference() {
  const root = document.documentElement;

  try {
    const storedTheme = localStorage.getItem("paperhub-theme");
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = storedTheme ? storedTheme === "dark" : prefersDark;

    root.classList.toggle("dark", useDark);
  } catch (error) {
    console.warn("Unable to apply initial theme preference", error);
  }
})();

async function initApp() {
  await Promise.all([
    ensureScript({
      globalKey: "initPaperHubNavbar",
      selector: 'script[data-paperhub-navbar="true"]',
      src: "/assets/js/navbar.js",
      datasetKey: "paperhubNavbar",
      errorMessage: "Unable to load navbar module.",
    }),
    ensureScript({
      globalKey: "initPaperHubSidebar",
      selector: 'script[data-paperhub-sidebar="true"]',
      src: "/assets/js/sidebar.js",
      datasetKey: "paperhubSidebar",
      errorMessage: "Unable to load sidebar module.",
    }),
    loadComponents(),
  ]);

  if (typeof enforcePageAccess === "function") {
    const canRender = enforcePageAccess();
    if (!canRender) {
      return;
    }
  }

  initNavbar();
  initSidebar();
  applyCurrentUserPageData();
  initPageSpecificForms();
}

function applyCurrentUserPageData() {
  if (typeof getCurrentUserData !== "function") {
    return;
  }

  const user = getCurrentUserData();
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const dashboardRoute =
    typeof getDashboardRouteForUser === "function"
      ? getDashboardRouteForUser(user)
      : "/pages/dashboard/user.html";

  const applyText = (selector, value) => {
    if (value === undefined || value === null) {
      return;
    }

    document.querySelectorAll(selector).forEach((element) => {
      if ("value" in element && ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) {
        element.value = String(value);
        return;
      }

      element.textContent = String(value);
    });
  };

  applyText("[data-user-name]", user.name);
  applyText("[data-user-email]", user.email);
  applyText("[data-user-role]", roleLabel);
  applyText("[data-user-title]", user.title);
  applyText("[data-user-department]", user.department);
  applyText("[data-user-last-login]", user.lastLogin);
  applyText("[data-dashboard-description]", user.dashboard?.description);

  document.querySelectorAll("[data-user-dashboard-link]").forEach((element) => {
    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("href", dashboardRoute);
    }
  });

  const stats = user.dashboard?.stats || {};
  document.querySelectorAll("[data-dashboard-stat]").forEach((element) => {
    const key = element.getAttribute("data-dashboard-stat");
    if (key && Object.prototype.hasOwnProperty.call(stats, key)) {
      element.textContent = String(stats[key]);
    }
  });

  document.querySelectorAll("[data-user-permissions]").forEach((container) => {
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    container.innerHTML = permissions
      .map(
        (permission) =>
          `<span class="inline-flex items-center rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">${escapeHtml(permission)}</span>`,
      )
      .join(" ");
  });

  if (typeof getCurrentUserPayment === "function") {
    const payment = getCurrentUserPayment();
    if (payment) {
      applyText("[data-payment-status]", payment.status);
      applyText("[data-payment-total-due]", payment.totalDue);
      applyText("[data-payment-last-updated]", payment.lastUpdated);
      applyText("[data-payment-next-review]", payment.nextReview);
    }
  }
}

async function ensureScript({ globalKey, selector, src, datasetKey, errorMessage }) {
  if (typeof window[globalKey] === "function") {
    return;
  }

  if (!document.querySelector(selector)) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = src;
      script.dataset[datasetKey] = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn(errorMessage);
        resolve();
      };
      document.body.appendChild(script);
    });
  }
}

async function loadComponents() {
  const componentsToLoad = [
    { id: "navbar-container", file: "/components/navbar.html" },
    { id: "sidebar-container", file: "/components/sidebar.html" },
    { id: "footer-container", file: "/components/footer.html" },
  ];

  const getComponentCache = () => {
    try {
      const cachedValue = sessionStorage.getItem(COMPONENT_CACHE_KEY);
      return cachedValue ? JSON.parse(cachedValue) : {};
    } catch (error) {
      console.warn("Unable to read component cache", error);
      return {};
    }
  };

  const setComponentCache = (cache) => {
    try {
      sessionStorage.setItem(COMPONENT_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn("Unable to persist component cache", error);
    }
  };

  const cache = getComponentCache();
  const containers = new Map(
    componentsToLoad.map((component) => [component.file, getElement("#" + component.id)]),
  );

  // Invalidate navbar cache to force fresh fetch
  delete cache["/components/navbar.html"];

  componentsToLoad.forEach((component) => {
    const container = containers.get(component.file);
    if (container && cache[component.file]) {
      container.innerHTML = cache[component.file];
    }
  });

  const pendingComponents = componentsToLoad.filter((component) => {
    return !cache[component.file] && containers.get(component.file);
  });

  if (pendingComponents.length === 0) {
    return;
  }

  const fetchedComponents = await Promise.all(
    pendingComponents.map(async (component) => {
      const container = containers.get(component.file);

      try {
        const response = await fetch(component.file, { cache: "no-cache" });
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const html = await response.text();
        container.innerHTML = html;
        return [component.file, html];
      } catch (error) {
        console.error(`Error loading ${component.file}:`, error);
        return null;
      }
    }),
  );

  const nextCache = { ...cache };
  fetchedComponents.forEach((entry) => {
    if (entry) {
      const [file, html] = entry;
      nextCache[file] = html;
    }
  });

  if (Object.keys(nextCache).length > 0) {
    setComponentCache(nextCache);
  }
}

function initNavbar() {
  if (typeof window.initPaperHubNavbar === "function") {
    window.initPaperHubNavbar();
  }
}

function initSidebar() {
  if (typeof window.initPaperHubSidebar === "function") {
    window.initPaperHubSidebar();
  }
}

function initPageSpecificForms() {
  const registerSimpleForm = (formId, successMessage, options = {}) => {
    const form = getElement(`#${formId}`);
    if (!form) {
      return;
    }

    addEvent(form, "submit", (event) => {
      event.preventDefault();
      showSuccess(successMessage);

      if (options.resetAfterSubmit) {
        form.reset();
      }
    });
  };

  registerSimpleForm("contactForm", "Your message has been sent to support", {
    resetAfterSubmit: true,
  });
  registerSimpleForm("profileForm", "Profile updated successfully");
  registerSimpleForm("settingsForm", "Settings saved successfully");

  const darkModeToggle = getElement("#settingsDarkMode");
  if (darkModeToggle) {
    darkModeToggle.checked = document.documentElement.classList.contains("dark");
    addEvent(darkModeToggle, "change", () => {
      const useDark = Boolean(darkModeToggle.checked);
      document.documentElement.classList.toggle("dark", useDark);

      try {
        localStorage.setItem("paperhub-theme", useDark ? "dark" : "light");
      } catch (error) {
        console.warn("Unable to persist theme preference", error);
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initApp);
