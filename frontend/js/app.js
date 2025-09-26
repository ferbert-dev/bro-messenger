const ENDPOINTS = {
  login: "http://localhost:3000/api/auth/login",
  register: "http://localhost:3000/api/auth/register",
};
const REDIRECT_URL = "/dashboard.html";
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
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data?.message || "Login failed", "error");
        return;
      }
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showMessage("Login successful. Redirecting...", "success");
        window.location.assign(REDIRECT_URL);
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
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data?.message || "Sign up failed", "error");
        return;
      }
      if (data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        showMessage("Account created. Redirecting...", "success");
        window.location.assign(REDIRECT_URL);
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