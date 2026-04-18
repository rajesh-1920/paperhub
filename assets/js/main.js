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

  initNavbar();
  initSidebar();
  initPageSpecificForms();
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
