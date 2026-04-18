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
  await Promise.all([ensureNavbarScript(), ensureSidebarScript(), loadComponents()]);

  initNavbar();
  initSidebar();
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

async function ensureSidebarScript() {
  if (typeof window.initPaperHubSidebar === "function") {
    return;
  }

  if (!document.querySelector('script[data-paperhub-sidebar="true"]')) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "/assets/js/sidebar.js";
      script.dataset.paperhubSidebar = "true";
      script.onload = resolve;
      script.onerror = () => {
        console.warn("Unable to load sidebar module.");
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
  if (typeof window.initPaperHubSidebar === "function") {
    window.initPaperHubSidebar({
      user: currentUser,
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});
