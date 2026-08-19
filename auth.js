const authEls = {
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
};

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
  authEls.authView.hidden = false;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = true;
}

function showApp() {
  authEls.authView.hidden = true;
  authEls.appView.hidden = false;
  authEls.blockedView.hidden = true;
}

function showBlocked(title, text) {
  authEls.authView.hidden = true;
  authEls.appView.hidden = true;
  authEls.blockedView.hidden = false;
  authEls.blockedTitle.textContent = title;
  authEls.blockedText.textContent = text;
}

function setError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.hidden = true;
}

async function enterApp() {
  showApp();
  await window.app.loadState();
}

async function submitLogin(e) {
  e.preventDefault();
  clearError(authEls.loginError);
  authEls.loginSubmit.disabled = true;
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
  }
}

async function submitRegister(e) {
  e.preventDefault();
  clearError(authEls.registerError);
  authEls.registerSubmit.disabled = true;
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
}

async function init() {
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
