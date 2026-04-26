/**
 * PaperHub - Authentication Module
 * Handles login, registration, and session management
 */

const STATIC_LOGIN_CREDENTIALS = {
  "user@gmail.com": {
    password: "user",
    id: "demo-user",
    name: "Demo User",
    role: "user",
    title: "User",
  },
  "officer@gmail.com": {
    password: "officer",
    id: "demo-officer",
    name: "Demo Officer",
    role: "officer",
    title: "Review Officer",
  },
  "admin@gmail.com": {
    password: "admin",
    id: "demo-admin",
    name: "Demo Admin",
    role: "admin",
    title: "Administrator",
  },
};

const AUTH_USERS_STORAGE_KEY = "paperhub-auth-users";

function getFormDataSafe(form) {
  const data = {};
  const formData = new FormData(form);
  formData.forEach((value, key) => {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

function validateLoginData(formData) {
  const errors = {};

  if (!formData.email) {
    errors.email = "Email is required";
  } else if (!isValidEmail(formData.email)) {
    errors.email = "Please enter a valid email";
  }

  if (!formData.password) {
    errors.password = "Password is required";
  }

  return errors;
}

function validateRegisterData(formData) {
  const errors = {};

  if (!formData.name || formData.name.length < 3) {
    errors.name = "Full Name must be at least 3 characters";
  }

  if (!formData.email) {
    errors.email = "Email is required";
  } else if (!isValidEmail(formData.email)) {
    errors.email = "Please enter a valid email";
  }

  if (!formData.password) {
    errors.password = "Password is required";
  } else if (!isValidPassword(formData.password)) {
    errors.password = "Password must be at least 8 characters";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (formData.confirmPassword !== formData.password) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

function getStaticLoginUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const account = STATIC_LOGIN_CREDENTIALS[normalizedEmail];

  if (!account || account.password !== password) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    email: normalizedEmail,
    role: account.role,
    title: account.title,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}`,
  };
}

function getSeedAuthUsers() {
  return Object.entries(STATIC_LOGIN_CREDENTIALS).map(([email, account]) => ({
    id: account.id,
    name: account.name,
    email,
    password: account.password,
    role: account.role,
    title: account.title,
  }));
}

function getStoredAuthUsers() {
  const savedUsers = getStorage(AUTH_USERS_STORAGE_KEY, []);
  const list = Array.isArray(savedUsers) ? savedUsers : [];
  const merged = [...getSeedAuthUsers()];

  list.forEach((entry) => {
    const normalizedEmail = String(entry?.email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    const existingIndex = merged.findIndex((user) => user.email === normalizedEmail);
    const normalizedEntry = {
      id: entry.id || Math.random().toString(36).slice(2, 11),
      name: entry.name || "PaperHub User",
      email: normalizedEmail,
      password: String(entry.password || ""),
      role: entry.role || "user",
      title: entry.title || "User",
    };

    if (existingIndex >= 0) {
      merged[existingIndex] = normalizedEntry;
      return;
    }

    merged.push(normalizedEntry);
  });

  return merged;
}

function persistAuthUsers(users) {
  setStorage(AUTH_USERS_STORAGE_KEY, users);
}

function findAuthenticatedUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const users = getStoredAuthUsers();
  const account = users.find(
    (user) => user.email === normalizedEmail && String(user.password) === String(password),
  );

  if (!account) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
    title: account.title,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}`,
  };
}

function getAuthPageRouteByRole(role) {
  const roleRoutes = {
    user: "../dashboard/user.html",
    officer: "../dashboard/officer.html",
    admin: "../dashboard/admin.html",
  };

  const relativePath = roleRoutes[role] || roleRoutes.user;
  return new URL(relativePath, window.location.href).href;
}

function getDashboardPathByRole(role) {
  const roleRoutes = {
    user: "/pages/dashboard/user.html",
    officer: "/pages/dashboard/officer.html",
    admin: "/pages/dashboard/admin.html",
  };

  return roleRoutes[role] || roleRoutes.user;
}

function persistAuthSession(user) {
  const token = `mock-token-${Date.now()}`;
  setCurrentUser(user);
  setStorage("paperhub-auth-token", token);
}

function enforceAuthLightTheme() {
  document.documentElement.classList.remove("dark");
  setStorage("paperhub-theme", "light");
}

/**
 * Initialize login page
 */
function initLoginPage() {
  const loginForm = getElement("#loginForm");
  if (!loginForm) return;

  addEvent(loginForm, "submit", handleLogin);
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
  e.preventDefault();

  const formData = getFormDataSafe(e.target);

  // Validate
  const errors = validateLoginData(formData);

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    await delay(500);

    const user = findAuthenticatedUser(formData.email, formData.password);
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    persistAuthSession(user);
    showSuccess("Login successful!");

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = getAuthPageRouteByRole(user.role);
    }, 500);
  } catch (error) {
    showError(error.message || "Login failed");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Initialize register page
 */
function initRegisterPage() {
  const registerForm = getElement("#registerForm");
  if (!registerForm) return;

  addEvent(registerForm, "submit", handleRegister);

  // Password strength indicator
  const passwordInput = registerForm.querySelector("#password");
  if (passwordInput) {
    addEvent(passwordInput, "input", updatePasswordStrength);
  }

  // Show password toggle
  const showPasswordCheckbox = registerForm.querySelector("#showPassword");
  if (showPasswordCheckbox) {
    addEvent(showPasswordCheckbox, "change", (e) => {
      passwordInput.type = e.target.checked ? "text" : "password";
    });
  }
}

/**
 * Update password strength indicator
 */
function updatePasswordStrength(e) {
  const password = e.target.value;
  const strengthIndicator = getElement("#passwordStrength");

  if (!strengthIndicator) return;

  let strength = 0;
  let strengthText = "Very Weak";
  let strengthClass = "weak";

  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  if (strength < 2) {
    strengthText = "Very Weak";
    strengthClass = "weak";
  } else if (strength < 3) {
    strengthText = "Weak";
    strengthClass = "warn";
  } else if (strength < 4) {
    strengthText = "Fair";
    strengthClass = "fair";
  } else if (strength < 5) {
    strengthText = "Good";
    strengthClass = "good";
  } else {
    strengthText = "Very Strong";
    strengthClass = "stronger";
  }

  strengthIndicator.textContent = strengthText;
  strengthIndicator.className = `password-strength-text strength-${strengthClass}`;

  const strengthBar = getElement("#passwordStrengthBar");
  if (strengthBar) {
    strengthBar.style.width = strength * 20 + "%";
    strengthBar.className = `password-strength-bar strength-${strengthClass}-bar`;
  }
}

/**
 * Handle register form submission
 */
async function handleRegister(e) {
  e.preventDefault();

  const formData = getFormDataSafe(e.target);

  // Validate
  const errors = validateRegisterData(formData);

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  // Show loading state
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    await delay(700);

    const normalizedEmail = String(formData.email || "").trim().toLowerCase();
    const users = getStoredAuthUsers();
    const alreadyExists = users.some((user) => user.email === normalizedEmail);

    if (alreadyExists) {
      throw new Error("An account with this email already exists.");
    }

    // Create session
    const user = {
      id: Math.random().toString(36).slice(2, 11),
      name: formData.name,
      email: normalizedEmail,
      role: "user",
      title: "User",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name)}`,
    };

    users.push({
      id: user.id,
      name: user.name,
      email: user.email,
      password: formData.password,
      role: user.role,
      title: user.title,
    });
    persistAuthUsers(users);

    persistAuthSession(user);
    showSuccess("Account created successfully!");

    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = getAuthPageRouteByRole("user");
    }, 500);
  } catch (error) {
    showError("Registration failed: " + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

/**
 * Display form errors
 */
function displayFormErrors(form, errors) {
  // Clear previous errors
  const errorMessages = form.querySelectorAll(".form-error");
  errorMessages.forEach((err) => err.remove());

  // Display new errors
  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) {
      const errorElement = createElement("div", "form-error");
      errorElement.textContent = message;
      input.parentNode.appendChild(errorElement);
    }
  });

  showError("Please fix the errors above");
}

/**
 * Check authentication status
 */
function isAuthenticated() {
  return isLoggedIn();
}

/**
 * Get auth token
 */
function getAuthToken() {
  return getStorage("paperhub-auth-token");
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const isAuthPage =
    document.body.classList.contains("login-page") ||
    document.body.classList.contains("register-page");

  if (isAuthPage) {
    enforceAuthLightTheme();
  }

  if (document.body.classList.contains("login-page")) {
    initLoginPage();
  } else if (document.body.classList.contains("register-page")) {
    initRegisterPage();
  }
});
