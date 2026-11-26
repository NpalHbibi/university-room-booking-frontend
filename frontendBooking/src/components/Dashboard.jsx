import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import adminPfp from "../assets/AD-organic-256x256.png";
import userPfp from "../assets/US-crystal-256x256.png";

function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const to = Number(target) || 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf;
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Stat({ label, value }) {
  const n = useCountUp(value);
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{n}</strong>
    </div>
  );
}

export default function Dashboard({ user, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary(signal) {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("/dashboard");
      if (!signal?.ignore) setStats(res.data);
    } catch (err) {
      if (!signal?.ignore) setError(err.message);
    } finally {
      if (!signal?.ignore) setLoading(false);
    }
  }

  useEffect(() => {
    const signal = { ignore: false };
    loadSummary(signal);
    return () => {
      signal.ignore = true;
    };
  }, []);

  const isAdmin = user.role === "ADMIN";
  const firstName = (user.name || "").split(" ")[0];
  const pfpSrc = isAdmin ? adminPfp : userPfp;

  return (
    <section>
      <div className="dash-profile-header">
        <img
          src={pfpSrc}
          alt={`Foto profil ${user.name || (isAdmin ? "Admin" : "User")}`}
          className="dash-pfp"
        />
        <div>
          <h2>Halo, {firstName}</h2>
          <p className="info-text dash-sub">
            {user.email ? `${user.email} · ` : ""}
            {isAdmin
              ? "Ringkasan ruangan dan seluruh booking hari ini."
              : "Ringkasan booking kamu. Mau pesan ruangan lagi?"}
          </p>
        </div>
      </div>

      <div className="quick-actions">
        {isAdmin ? (
          <>
            <button className="btn-primary" onClick={() => onNavigate?.("rooms")}>
              Kelola ruangan
            </button>
            <button className="btn-secondary" onClick={() => onNavigate?.("bookings")}>
              Lihat semua booking
            </button>
          </>
        ) : (
          <>
            <button className="btn-primary" onClick={() => onNavigate?.("bookings")}>
              Pesan ruangan
            </button>
            <button className="btn-secondary" onClick={() => onNavigate?.("rooms")}>
              Cek jadwal ruangan
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="alert-error alert-dismissible">
          <span>{error}</span>
          <button className="btn-secondary btn-sm" onClick={() => loadSummary()}>
            Coba lagi
          </button>
        </div>
      )}

      {loading && (
        <div className="stats-grid">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-card">
              <span className="skeleton sk-line" style={{ width: "60%" }} />
              <span className="skeleton sk-big" />
            </div>
          ))}
        </div>
      )}

      {!loading && stats && isAdmin && (
        <div className="stats-grid">
          <Stat label="Total ruangan" value={stats.total_rooms} />
          <Stat label="Ruangan aktif" value={stats.active_rooms} />
          <Stat label="Ruangan nonaktif" value={stats.inactive_rooms} />
          <Stat label="Total booking" value={stats.total_bookings} />
          <Stat label="Booking dikonfirmasi" value={stats.confirmed_bookings} />
          <Stat label="Booking dibatalkan" value={stats.cancelled_bookings} />
        </div>
      )}

      {!loading && stats && !isAdmin && (
        <div className="stats-grid">
          <Stat label="Total booking saya" value={stats.total_bookings} />
          <Stat label="Akan datang" value={stats.upcoming_bookings} />
          <Stat label="Selesai" value={stats.completed_bookings} />
          <Stat label="Dibatalkan" value={stats.cancelled_bookings} />
        </div>
      )}
    </section>
  );
}
