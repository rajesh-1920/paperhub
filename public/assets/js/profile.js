(() => {
  function getElement(selector, root = document) {
    return root.querySelector(selector);
  }

  function getElements(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function openModal(modal) {
    if (!modal) return;
    modal.classList.remove("profile-hidden");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("overflow-hidden");
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.add("profile-hidden");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("overflow-hidden");
  }

  function syncVisibleFields(form) {
    const fieldMap = [
      ["[data-user-name]", "#profileName"],
      ["[data-user-email]", "#profileEmail"],
      ["[data-user-phone]", "#profilePhone"],
      ["[data-user-company]", "#profileCompany"],
      ["[data-user-title]", "#profileTitle"],
      ["[data-user-department]", "#profileDepartment"],
      ["[data-user-language]", "#profileLanguage"],
      ["[data-user-timezone]", "#profileTimezone"],
      ["[data-user-bio]", "#profileBio"],
    ];

    fieldMap.forEach(([displaySelector, inputSelector]) => {
      const displayNodes = getElements(displaySelector);
      const inputNode = getElement(inputSelector, form);
      if (!inputNode) return;
      const value = inputNode.value.trim();
      displayNodes.forEach((node) => {
        node.textContent = value || node.textContent;
      });
    });

    const twoFactor = getElement("#profileTwoFactor", form);
    const twoFactorLabel = getElement("[data-user-twofactor-label]");
    if (twoFactor && twoFactorLabel) {
      twoFactorLabel.textContent = twoFactor.checked ? "Enabled" : "Disabled";
    }

    const roleBadge = getElement("[data-profile-role-badge]");
    if (roleBadge) {
      roleBadge.textContent = roleBadge.textContent.toUpperCase();
    }
  }

  function syncFormFromView(form) {
    const bindings = {
      profileName: "[data-user-name]",
      profileEmail: "[data-user-email]",
      profilePhone: "[data-user-phone]",
      profileAddress: "[data-user-address]",
      profileTitle: "[data-user-title]",
      profileCompany: "[data-user-company]",
      profileDepartment: "[data-user-department]",
      profileTimezone: "[data-user-timezone]",
      profileLanguage: "[data-user-language]",
      profileBio: "[data-user-bio]",
    };

    Object.entries(bindings).forEach(([fieldId, selector]) => {
      const input = getElement(`#${fieldId}`, form);
      const source = getElement(selector);
      if (!input || !source) return;
      input.value = source.value || source.textContent || input.value;
    });

    const twoFactor = getElement("#profileTwoFactor", form);
    const twoFactorLabel = getElement("[data-user-twofactor-label]");
    if (twoFactor && twoFactorLabel) {
      twoFactor.checked = twoFactorLabel.textContent.trim().toLowerCase() === "enabled";
    }
  }

  function setAvatarPreview(fileInput, previewTarget, initialsTarget) {
    const file = fileInput?.files?.[0];
    if (!file || !previewTarget) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      previewTarget.src = String(event.target?.result || "");
      previewTarget.classList.remove("profile-hidden");
      if (initialsTarget) {
        initialsTarget.classList.add("profile-hidden");
      }
    };
    reader.readAsDataURL(file);
  }

  function initCollapsibleSections() {
    getElements("[data-section-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.getAttribute("data-section-toggle");
        const target = targetId ? document.getElementById(targetId) : null;
        if (!target) return;
        target.classList.toggle("hidden");
        const expanded = !target.classList.contains("hidden");
        button.setAttribute("aria-expanded", expanded ? "true" : "false");
        button.textContent = expanded ? "Collapse" : "Expand";
      });
    });
  }

  function initModal() {
    const modal = getElement("[data-profile-modal]");
    const openButtons = getElements("[data-profile-edit-open]");
    const closeButtons = getElements("[data-profile-modal-close]");
    const form = getElement("#profileEditForm");
    const fileInput = getElement("#profileAvatarUpload");
    const previewImage = fileInput?.closest("form")?.querySelector("[data-profile-avatar-preview]");
    const initials = fileInput?.closest("form")?.querySelector("[data-user-initials]");

    openButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (form) {
          syncFormFromView(form);
        }

        openModal(modal);
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => closeModal(modal));
    });

    modal?.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });

    fileInput?.addEventListener("change", () => setAvatarPreview(fileInput, previewImage, initials));

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      syncVisibleFields(form);
      closeModal(modal);
    });
  }

  function initSidebarFallback() {
    const sidebarToggle = getElement("[data-sidebar-toggle]");
    const sidebar = getElement("#paperhubSidebar");
    if (!sidebarToggle || !sidebar) return;

    sidebarToggle.addEventListener("click", () => {
      const collapsed = sidebar.classList.toggle("is-collapsed");
      sidebarToggle.setAttribute("aria-pressed", collapsed ? "true" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCollapsibleSections();
    initModal();
    initSidebarFallback();
  });
})();