document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (typeof showSuccess === "function") {
        showSuccess("Profile updated successfully");
      }
    });
  }
});
