

import { useEffect, useState } from "react";
import { apiRequest } from "./api/client";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import RoomsPage from "./components/RoomsPage";
import BookingsPage from "./components/BookingsPage";
import "./App.css";

function getInitialTheme() {
  const saved = localStorage.getItem("colorTheme");
  return ["uhamka", "default", "gta6"].includes(saved) ? saved : "uhamka";
}

export default function App() {
  const [theme, setTheme] = useState(getInitialTheme);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  // State form Login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("colorTheme", theme);
  }, [theme]);

  function handleToggleTheme() {
    setTheme((prev) => {
      if (prev === "uhamka") return "default";
      if (prev === "default") return "gta6";
      return "uhamka";
    });
  }

  useEffect(() => {
    async function verifySession() {
      const token = localStorage.getItem("token");
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const res = await apiRequest("/auth/me");
        setUser(res.data);
      } catch {
        localStorage.removeItem("token");
      } finally {
        setCheckingAuth(false);
      }
    }
    verifySession();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    try {
      const res = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      setEmail("");
      setPassword("");
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setUser(null);
    setActiveTab("dashboard");
  }

  if (checkingAuth) {
    return <div className="center-screen">Memeriksa sesi login...</div>;
  }

  if (!user) {
    return (
      <div className="center-screen">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-top-bar">
            <h2>Login Sistem Booking Ruangan</h2>
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={handleToggleTheme}
            >
              {theme === "uhamka"
                ? "UHAMKA"
                : theme === "default"
                ? "Default"
                : "GTA VI"}
            </button>
          </div>
          {loginError && <div className="alert-error">{loginError}</div>}
          <label>
            Email
            <input
              type="email"
              required
              placeholder="nama@univ.ac.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button type="submit" className="btn-primary" disabled={loggingIn}>
            {loggingIn ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main className="main-content">
        {activeTab === "dashboard" && <Dashboard user={user} />}
        {activeTab === "rooms" && <RoomsPage user={user} />}
        {activeTab === "bookings" && <BookingsPage user={user} />}
      </main>
    </div>
  );
}