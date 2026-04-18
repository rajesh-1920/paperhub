function initLoginPage() {
  const loginForm = getElement("#loginForm");
  if (!loginForm) return;

  addEvent(loginForm, "submit", handleLogin);
}

async function handleLogin(e) {
  e.preventDefault();

  const formData = getFormData(e.target);

  const errors = validateForm(formData, {
    email: {
      label: "Email",
      required: true,
      type: "email",
    },
    password: {
      label: "Password",
      required: true,
    },
  });

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const session = {
      token: "mock-token-" + Date.now(),
      user: {
        id: "1",
        name: "John Doe",
        email: formData.email,
        role: "user",
        avatar: `https://ui-avatars.com/api/?name=${formData.email.split("@")[0]}`,
      },
    };

    setSession(session);
    showSuccess("Login successful!");

    setTimeout(() => {
      window.location.href = "/pages/dashboard/user.html";
    }, 500);
  } catch (error) {
    showError("Login failed: " + error.message);
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

async function handleRegister(e) {
  e.preventDefault();

  const formData = getFormData(e.target);

  const errors = validateForm(formData, {
    name: {
      label: "Full Name",
      required: true,
      minLength: 3,
    },
    email: {
      label: "Email",
      required: true,
      type: "email",
    },
    password: {
      label: "Password",
      required: true,
      type: "password",
    },
    confirmPassword: {
      label: "Confirm Password",
      required: true,
      match: "password",
    },
  });

  if (Object.keys(errors).length > 0) {
    displayFormErrors(e.target, errors);
    return;
  }

  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Creating account...';

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const session = {
      token: "mock-token-" + Date.now(),
      user: {
        id: Math.random().toString(36).substr(2, 9),
        name: formData.name,
        email: formData.email,
        role: "user",
        avatar: `https://ui-avatars.com/api/?name=${formData.name}`,
      },
    };

    setSession(session);
    showSuccess("Account created successfully!");

    setTimeout(() => {
      window.location.href = "/pages/dashboard/user.html";
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

function isAuthenticated() {
  return isLoggedIn();
}

function getAuthToken() {
  const session = getSession();
  return session ? session.token : null;
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("login-page")) {
    initLoginPage();
  } else if (document.body.classList.contains("register-page")) {
    initRegisterPage();
  }
});
