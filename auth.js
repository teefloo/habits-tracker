const authEls = {
  skipLink: document.querySelector(".skip-link"),
  bootView: document.getElementById("boot-view"),
  authView: document.getElementById("auth-view"),
  appView: document.getElementById("app-view"),
  blockedView: document.getElementById("blocked-view"),
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  loginSubmit: document.getElementById("login-submit"),
  registerSubmit: document.getElementById("register-submit"),
  loginError: document.getElementById("login-error"),
  registerError: document.getElementById("register-error"),
  showRegister: document.getElementById("show-register"),
  showLogin: document.getElementById("show-login"),
  logoutBtn: document.getElementById("logout-btn"),
  blockedTitle: document.getElementById("blocked-title"),
  blockedText: document.getElementById("blocked-text"),
  blockedRetry: document.getElementById("blocked-retry"),
  passwordToggles: document.querySelectorAll(".password-toggle"),
};

function setSkipTarget(id) {
  authEls.skipLink.href = `#${id}`;
}

async function api(path, opts = {}) {
  const res = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  let body = null;
  try {
    body = await res.json();
  } catch (err) {
    // corps non JSON (hors ligne simulé, etc.)
  }
  return { status: res.status, ok: res.ok, body };
}

function showAuth() {
  setSkipTarget("auth-content");
  authEls.bootView.hidden = true;
  authEls.authView.hidden = false;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = true;
  window.requestAnimationFrame(() => authEls.loginForm.email.focus());
}

function showApp() {
  setSkipTarget("main-content");
  authEls.bootView.hidden = true;
  authEls.authView.hidden = true;
  authEls.appView.hidden = false;
  authEls.blockedView.hidden = true;
  window.requestAnimationFrame(() => document.getElementById("main-content").focus());
}

function showBlocked(title, text) {
  setSkipTarget("blocked-content");
  authEls.bootView.hidden = true;
  authEls.authView.hidden = true;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = false;
  authEls.blockedTitle.textContent = title;
  authEls.blockedText.textContent = text;
  window.requestAnimationFrame(() => authEls.blockedTitle.focus());
}

function setError(el, message) {
  el.textContent = message;
  el.hidden = false;
  el.focus();
}

function clearError(el) {
  el.hidden = true;
}

function resetPasswordToggles() {
  authEls.passwordToggles.forEach((button) => {
    const input = document.getElementById(button.dataset.target);
    input.type = "password";
    button.textContent = "Afficher";
    button.setAttribute("aria-label", "Afficher le mot de passe");
    button.setAttribute("aria-pressed", "false");
  });
}

function togglePassword(button) {
  const input = document.getElementById(button.dataset.target);
  const visible = input.type === "password";
  input.type = visible ? "text" : "password";
  button.textContent = visible ? "Masquer" : "Afficher";
  button.setAttribute(
    "aria-label",
    `${visible ? "Masquer" : "Afficher"} le mot de passe`
  );
  button.setAttribute("aria-pressed", String(visible));
  input.focus({ preventScroll: true });
}

function validateCredentials(form, errorEl, isRegister) {
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email) {
    setError(errorEl, "Saisissez votre adresse email.");
    return false;
  }
  if (!form.email.checkValidity()) {
    setError(errorEl, "Saisissez une adresse email valide.");
    return false;
  }
  if (!password) {
    setError(errorEl, "Saisissez votre mot de passe.");
    return false;
  }
  if (isRegister && password.length < 8) {
    setError(errorEl, "Le mot de passe doit contenir au moins 8 caractères.");
    return false;
  }
  return true;
}

async function enterApp() {
  authEls.bootView.hidden = false;
  authEls.authView.hidden = true;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = true;
  await window.app.loadState();
  showApp();
}

async function submitLogin(e) {
  e.preventDefault();
  clearError(authEls.loginError);
  if (!validateCredentials(authEls.loginForm, authEls.loginError, false)) return;
  authEls.loginSubmit.disabled = true;
  authEls.loginSubmit.setAttribute("aria-busy", "true");
  try {
    const r = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: authEls.loginForm.email.value.trim(),
        password: authEls.loginForm.password.value,
      }),
    });
    if (r.ok) {
      authEls.loginForm.reset();
      await enterApp();
      return;
    }
    if (r.status === 503) {
      showBlocked("Service indisponible", "Le service sera bientôt de retour.");
      return;
    }
    setError(
      authEls.loginError,
      (r.body && r.body.error) || "Connexion impossible, réessayez."
    );
  } catch (err) {
    showBlocked("Hors ligne", "Vérifiez votre connexion puis réessayez.");
  } finally {
    authEls.loginSubmit.disabled = false;
    authEls.loginSubmit.removeAttribute("aria-busy");
  }
}

async function submitRegister(e) {
  e.preventDefault();
  clearError(authEls.registerError);
  if (!validateCredentials(authEls.registerForm, authEls.registerError, true)) return;
  authEls.registerSubmit.disabled = true;
  authEls.registerSubmit.setAttribute("aria-busy", "true");
  try {
    const r = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        email: authEls.registerForm.email.value.trim(),
        password: authEls.registerForm.password.value,
      }),
    });
    if (r.ok) {
      authEls.registerForm.reset();
      await enterApp();
      return;
    }
    if (r.status === 503) {
      showBlocked("Service indisponible", "Le service sera bientôt de retour.");
      return;
    }
    setError(
      authEls.registerError,
      (r.body && r.body.error) || "Inscription impossible, réessayez."
    );
  } catch (err) {
    showBlocked("Hors ligne", "Vérifiez votre connexion puis réessayez.");
  } finally {
    authEls.registerSubmit.disabled = false;
    authEls.registerSubmit.removeAttribute("aria-busy");
  }
}

async function logout() {
  try {
    await api("/api/logout", { method: "POST" });
  } catch (err) {
    // la session sera de toute façon invalidée côté client
  }
  showAuth();
  authEls.loginForm.password.value = "";
  resetPasswordToggles();
}

async function init() {
  setSkipTarget("boot-content");
  authEls.bootView.hidden = false;
  authEls.authView.hidden = true;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = true;
  let r;
  try {
    r = await api("/api/me");
  } catch (err) {
    showBlocked("Hors ligne", "Vérifiez votre connexion puis réessayez.");
    return;
  }
  if (r.status === 503) {
    showBlocked("Service indisponible", "Le service sera bientôt de retour.");
    return;
  }
  if (r.status === 401) {
    showAuth();
    return;
  }
  if (r.ok) {
    await enterApp();
    return;
  }
  showBlocked("Service indisponible", "Le service sera bientôt de retour.");
}

authEls.loginForm.addEventListener("submit", submitLogin);
authEls.registerForm.addEventListener("submit", submitRegister);
authEls.passwordToggles.forEach((button) => {
  button.addEventListener("click", () => togglePassword(button));
});

authEls.showRegister.addEventListener("click", () => {
  clearError(authEls.loginError);
  authEls.loginForm.hidden = true;
  authEls.registerForm.hidden = false;
  authEls.registerForm.email.focus();
});

authEls.showLogin.addEventListener("click", () => {
  clearError(authEls.registerError);
  authEls.registerForm.hidden = true;
  authEls.loginForm.hidden = false;
  authEls.loginForm.email.focus();
});

authEls.logoutBtn.addEventListener("click", logout);
authEls.blockedRetry.addEventListener("click", init);

init();
