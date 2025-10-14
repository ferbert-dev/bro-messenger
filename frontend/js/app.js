import { API_BASE_URL } from './chat.constants.js';

const API_BASE = API_BASE_URL;

const ENDPOINTS = {
  login: `${API_BASE}/auth/login`,
  register: `${API_BASE}/auth/register`,
};
const REDIRECT_URL = "chat.html";
const TOKEN_KEY = "authToken";
const USER_KEY = "user";

function showMessage(text, type = "info") {
  const el = document.getElementById("msg");
  if (!el) return alert(text);
  el.textContent = text;
  el.className = `msg ${type}`;
  el.style.opacity = 1;
  setTimeout(() => (el.style.opacity = 0), 4000);
}


// Helper: safe JSON parsing (doesn't throw on empty body)
async function safeJson(res) {
  const text = await res.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return {}; }
}

// Helper: robust redirect with fallbacks + debug
function goToDashboard() {
  try {
    // Fast path
    window.location.assign(REDIRECT_URL);
    // Fallbacks in case something blocks assign()
    setTimeout(() => { window.location.href = REDIRECT_URL; }, 50);
    setTimeout(() => { window.location.replace(REDIRECT_URL); }, 150);
  } catch (e) {
    console.error("Redirect failed:", e);
    window.location.href = REDIRECT_URL;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Login
  document.getElementById("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const res = await fetch(ENDPOINTS.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        //credentials: "include",
      });
      const data = await safeJson(res);
      if (!res.ok) {
        showMessage(data?.message || "Login failed", "error");
        return;
      }
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showMessage("Login successful. Redirecting...", "success");
        goToDashboard();
      } else {
        showMessage("Login successful but no token received.", "success");
      }
    } catch (err) {
      console.error(err);
      showMessage("Network error during login.", "error");
    }
  });

  // Signup
  document.getElementById("signup-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name").value.trim();
    const ageVal = document.getElementById("signup-age").value.trim();
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;

    const body = { name, email, password };
    if (ageVal) body.age = parseInt(ageVal, 10);

    try {
      const res = await fetch(ENDPOINTS.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        //credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await safeJson(res);
      if (!res.ok) {
        showMessage(data?.message || "Sign up failed", "error");
        return;
      }
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showMessage("Account created. Redirecting...", "success");
        goToDashboard();
      } else {
        showMessage("Account created. Please log in.", "success");
        document.getElementById("tab-login").checked = true;
      }
    } catch (err) {
      console.error(err);
      showMessage("Network error during sign up.", "error");
    }
  });
});
