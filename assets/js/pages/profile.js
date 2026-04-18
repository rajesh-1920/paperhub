document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("profileForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    showSuccess("Profile updated successfully");
  });
});
