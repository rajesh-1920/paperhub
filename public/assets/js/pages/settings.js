document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("settingsForm");
  const darkModeToggle = document.getElementById("settingsDarkMode");

  if (darkModeToggle) {
    darkModeToggle.checked = document.documentElement.classList.contains("dark");
    darkModeToggle.addEventListener("change", () => {
      document.documentElement.classList.toggle("dark", darkModeToggle.checked);
      localStorage.setItem("paperhub-theme", darkModeToggle.checked ? "dark" : "light");
    });
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (typeof showSuccess === "function") {
        showSuccess("Settings saved successfully");
      }
    });
  }
});
