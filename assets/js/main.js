let currentUser = {
  name: "Rajesh Biswas",
  email: "rajesh18@cse.pstu.ac.bd",
  role: "student",
  avatar: "https://ui-avatars.com/api/?name=Rajesh+Biswas",
};
const COMPONENT_CACHE_KEY = "paperhub-component-cache";

(function applyInitialThemePreference() {
  const root = document.documentElement;

  try {
    const storedTheme = localStorage.getItem("paperhub-theme");
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const useDark = storedTheme ? storedTheme === "dark" : prefersDark;

    root.classList.toggle("dark", useDark);
    root.setAttribute("data-theme", useDark ? "dark" : "light");
  } catch (error) {
    console.warn("Unable to apply initial theme preference", error);
  }
})();

async function initApp() {
  await Promise.all([ensureNavbarScript(), loadComponents()]);

  initNavbar();
  initSidebar();

  setActiveSidebarItem();
}

async function ensureNavbarScript() {
  if (typeof window.initPaperHubNavbar === "function") {
    return;
  }

  if (!document.querySelector('script[data-paperhub-navbar="true"]')) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/assets/js/navbar.js";
      script.dataset.paperhubNavbar = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn("Unable to load navbar module.");
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

  componentsToLoad.forEach((component) => {
    const container = getElement("#" + component.id);
    if (container && cache[component.file]) {
      container.innerHTML = cache[component.file];
    }
  });

  const fetchedComponents = await Promise.all(
    componentsToLoad.map(async (component) => {
      const container = getElement("#" + component.id);
      if (!container) {
        return null;
      }

      if (cache[component.file]) {
        return null;
      }

      try {
        const response = await fetch(component.file, { cache: "force-cache" });
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
    window.initPaperHubNavbar({
      user: currentUser,
    });
  }
}

function initSidebar() {
  const sidebarToggle = getElement("#sidebarToggle");
  const sidebar = getElement("#sidebar");
  const sidebarClose = getElement("#sidebarClose");
  const sidebarOverlay = getElement("#sidebarOverlay");

  const closeSidebar = () => {
    removeClass(sidebar, "sidebar-mobile-open");
    removeClass(sidebarOverlay, "active");
  };

  if (sidebarToggle && sidebar) {
    addEvent(sidebarToggle, "click", () => {
      addClass(sidebar, "sidebar-mobile-open");
      addClass(sidebarOverlay, "active");
    });
  }

  if (sidebarClose && sidebar) {
    addEvent(sidebarClose, "click", closeSidebar);
  }

  if (sidebarOverlay && sidebar) {
    addEvent(sidebarOverlay, "click", closeSidebar);
  }

  const sidebarItems = getElements(".sidebar-item");
  sidebarItems.forEach((item) => {
    addEvent(item, "click", () => {
      if (window.innerWidth <= 768) {
        closeSidebar();
      }
    });
  });
}

function setActiveSidebarItem() {
  const normalizePath = (path) => {
    const value = String(path || "")
      .replace(/index\.html$/, "")
      .replace(/\/+$/, "");

    return value || "/";
  };

  const currentPath = normalizePath(window.location.pathname);
  const sidebarItems = getElements(".sidebar-item");

  sidebarItems.forEach((item) => {
    const href = normalizePath(item.getAttribute("href"));
    const isMatch = href !== "/" && (currentPath === href || currentPath.startsWith(href + "/"));

    if (isMatch) {
      addClass(item, "active");
    } else {
      removeClass(item, "active");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
