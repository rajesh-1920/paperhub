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

// Authentication is server-authoritative: login/registration/password-change go
// through /api/auth/* (see loginViaApi/registerViaApi and changePasswordViaApi).
// The browser never holds or compares credentials.

function getAuthPageRouteByRole(role) {
  const roleRoutes = {
    user: "../dashboard/user.html",
    officer: "../dashboard/officer.html",
    admin: "../dashboard/admin.html",
  };

  const relativePath = roleRoutes[role] || roleRoutes.user;
  return new URL(relativePath, window.location.href).href;
}

function persistAuthSession(user, token, refreshToken) {
  setCurrentUser(user);
  if (token) {
    setStorage("paperhub-auth-token", token);
  }
  if (refreshToken) {
    setStorage("paperhub-refresh-token", refreshToken);
  }
}

// Call the server auth API and return { token, refreshToken, user } or throw a
// message suitable for display.
async function postAuth(path, payload) {
  const response = await fetch(paperhubApiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed. Please try again.");
  }
  return data;
}

function loginViaApi(email, password) {
  return postAuth("/api/auth/login", { email, password });
}

function registerViaApi({ name, email, password }) {
  return postAuth("/api/auth/register", { name, email, password });
}

function enforceAuthLightTheme() {
  document.documentElement.classList.remove("dark");
  setStorage("paperhub-theme", "light");
}

function initLoginPage() {
  const loginForm = getElement("#loginForm");
  if (!loginForm) return;

  addEvent(loginForm, "submit", handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const formData = getFormDataSafe(e.target);

  const errors = validateLoginData(formData);

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    const { token, refreshToken, user } = await loginViaApi(formData.email, formData.password);
    persistAuthSession(user, token, refreshToken);
    showSuccess("Login successful!");

    setTimeout(() => {
      window.location.href = getAuthPageRouteByRole(user.role);
    }, 500);
  } catch (error) {
    showError(error.message || "Login failed");
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function initRegisterPage() {
  const registerForm = getElement("#registerForm");
  if (!registerForm) return;

  addEvent(registerForm, "submit", handleRegister);

  const passwordInput = registerForm.querySelector("#password");
  if (passwordInput) {
    addEvent(passwordInput, "input", updatePasswordStrength);
  }

  const showPasswordCheckbox = registerForm.querySelector("#showPassword");
  if (showPasswordCheckbox) {
    addEvent(showPasswordCheckbox, "change", (e) => {
      passwordInput.type = e.target.checked ? "text" : "password";
    });
  }
}

function updatePasswordStrength(e) {
  const password = e.target.value;
  const strengthIndicator = getElement("#passwordStrength");

  if (!strengthIndicator) return;

  let strength = 0;
  let strengthText;
  let strengthClass;

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

async function handleRegister(e) {
  e.preventDefault();

  const formData = getFormDataSafe(e.target);

  const errors = validateRegisterData(formData);

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    const { token, refreshToken, user } = await registerViaApi({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });
    persistAuthSession(user, token, refreshToken);
    showSuccess("Account created successfully!");

    setTimeout(() => {
      window.location.href = getAuthPageRouteByRole(user.role || "user");
    }, 500);
  } catch (error) {
    showError("Registration failed: " + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

function displayFormErrors(form, errors) {
  const errorMessages = form.querySelectorAll(".form-error");
  errorMessages.forEach((err) => err.remove());

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
