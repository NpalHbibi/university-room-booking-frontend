
export default function Navbar({
  user,
  activeTab,
  setActiveTab,
  onLogout,
  theme,
  onToggleTheme,
}) {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <strong>University Room Booking</strong>
        <span className={`badge badge-${user.role.toLowerCase()}`}>
          {user.role}
        </span>
      </div>

      <nav className="navbar-links">
        <button
          className={activeTab === "dashboard" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </button>
        <button
          className={activeTab === "rooms" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActiveTab("rooms")}
        >
          Ruangan
        </button>
        <button
          className={activeTab === "bookings" ? "nav-btn active" : "nav-btn"}
          onClick={() => setActiveTab("bookings")}
        >
          Booking
        </button>
      </nav>

      <div className="navbar-user">
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title="Ganti skema warna"
        >
          {theme === "uhamka"
            ? "Tema: UHAMKA"
            : theme === "default"
            ? "Tema: Default"
            : "Tema: GTA VI"}
        </button>
        <span>{user.name}</span>
        <button className="btn-danger btn-sm" onClick={onLogout}>
          Keluar
        </button>
      </div>
    </header>
  );
}