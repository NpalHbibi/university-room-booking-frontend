import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;
    async function loadSummary() {
      setLoading(true);
      setError("");
      try {
        const res = await apiRequest("/dashboard");
        if (!ignore) setStats(res.data);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSummary();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) return <p className="info-text">Memuat ringkasan dashboard...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!stats) return null;

  return (
    <section>
      <h2>Dashboard {user.role === "ADMIN" ? "Administrator" : "Pengguna"}</h2>

      {user.role === "ADMIN" ? (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Ruangan</span>
            <strong>{stats.total_rooms}</strong>
          </div>
          <div className="stat-card">
            <span>Ruangan Aktif</span>
            <strong>{stats.active_rooms}</strong>
          </div>
          <div className="stat-card">
            <span>Ruangan Nonaktif</span>
            <strong>{stats.inactive_rooms}</strong>
          </div>
          <div className="stat-card">
            <span>Total Booking</span>
            <strong>{stats.total_bookings}</strong>
          </div>
          <div className="stat-card">
            <span>Booking Dikonfirmasi</span>
            <strong>{stats.confirmed_bookings}</strong>
          </div>
          <div className="stat-card">
            <span>Booking Dibatalkan</span>
            <strong>{stats.cancelled_bookings}</strong>
          </div>
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <span>Total Booking Saya</span>
            <strong>{stats.total_bookings}</strong>
          </div>
          <div className="stat-card">
            <span>Akan Datang</span>
            <strong>{stats.upcoming_bookings}</strong>
          </div>
          <div className="stat-card">
            <span>Selesai</span>
            <strong>{stats.completed_bookings}</strong>
          </div>
          <div className="stat-card">
            <span>Dibatalkan</span>
            <strong>{stats.cancelled_bookings}</strong>
          </div>
        </div>
      )}
    </section>
  );
}