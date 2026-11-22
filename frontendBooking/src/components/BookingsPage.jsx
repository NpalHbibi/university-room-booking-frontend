import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

export default function BookingsPage({ user }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter daftar booking
  const [filters, setFilters] = useState({
    date: "",
    room_id: "",
    status: "",
  });

  // Form buat booking (khusus USER)
  const [form, setForm] = useState({
    room_id: "",
    title: "",
    purpose: "",
    booking_date: new Date().toISOString().slice(0, 10),
    start_time: "09:00",
    end_time: "11:00",
  });

  async function loadRooms() {
    try {
      const res = await apiRequest("/rooms");
      const activeRooms = (res.data || []).filter((r) => r.status === "ACTIVE");
      setRooms(activeRooms);
      if (activeRooms.length > 0 && !form.room_id) {
        setForm((prev) => ({ ...prev, room_id: String(activeRooms[0].id) }));
      }
    } catch {
      // Abaikan jika gagal memuat opsi ruangan
    }
  }

  async function fetchBookings() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append("date", filters.date);
      if (filters.room_id) params.append("room_id", filters.room_id);
      if (filters.status) params.append("status", filters.status);

      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await apiRequest(`/bookings${query}`);
      setBookings(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  async function handleCreateBooking(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          room_id: Number(form.room_id),
        }),
      });
      setSuccess("Booking ruangan berhasil dibuat!");
      setForm((prev) => ({ ...prev, title: "", purpose: "" }));
      fetchBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancel(bookingId) {
    if (!window.confirm("Yakin ingin membatalkan booking ini?")) return;
    setError("");
    setSuccess("");
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, {
        method: "PATCH",
      });
      setSuccess("Booking berhasil dibatalkan.");
      fetchBookings();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section>
      <h2>Manajemen Booking</h2>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {user.role === "USER" && (
        <form className="card form-grid" onSubmit={handleCreateBooking}>
          <h3>Buat Pemesanan Ruangan</h3>
          <div className="grid-2">
            <label>
              Pilih Ruangan
              <select
                required
                value={form.room_id}
                onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              >
                <option value="">-- Pilih Ruangan --</option>
                {rooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.code} - {rm.name} (Kapasitas {rm.capacity})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Judul Kegiatan (min. 5 karakter)
              <input
                type="text"
                required
                minLength={5}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Tanggal Pemakaian
              <input
                type="date"
                required
                value={form.booking_date}
                onChange={(e) =>
                  setForm({ ...form, booking_date: e.target.value })
                }
              />
            </label>
            <div className="grid-2">
              <label>
                Jam Mulai
                <input
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) =>
                    setForm({ ...form, start_time: e.target.value })
                  }
                />
              </label>
              <label>
                Jam Selesai
                <input
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) =>
                    setForm({ ...form, end_time: e.target.value })
                  }
                />
              </label>
            </div>
          </div>
          <label>
            Tujuan / Keperluan (min. 10 karakter)
            <textarea
              rows={2}
              required
              minLength={10}
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </label>
          <div>
            <button type="submit" className="btn-primary">
              Ajukan Booking
            </button>
          </div>
        </form>
      )}

      <div className="card filter-row">
        <label>
          Tanggal:
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </label>
        <label>
          Ruangan:
          <select
            value={filters.room_id}
            onChange={(e) =>
              setFilters({ ...filters, room_id: e.target.value })
            }
          >
            <option value="">Semua Ruangan</option>
            {rooms.map((rm) => (
              <option key={rm.id} value={rm.id}>
                {rm.code} - {rm.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status:
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Semua Status</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </label>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setFilters({ date: "", room_id: "", status: "" })}
        >
          Reset Filter
        </button>
      </div>

      {loading ? (
        <p className="info-text">Memuat daftar booking...</p>
      ) : bookings.length === 0 ? (
        <p className="info-text">Belum ada data booking.</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ruangan</th>
                <th>Kegiatan</th>
                {user.role === "ADMIN" && <th>Pemesan</th>}
                <th>Tanggal & Waktu</th>
                <th>Status</th>
                {user.role === "USER" && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <strong>{b.room_code}</strong> - {b.room_name}
                  </td>
                  <td>
                    <strong>{b.title}</strong>
                    <div className="subtext">{b.purpose}</div>
                  </td>
                  {user.role === "ADMIN" && <td>{b.user_name}</td>}
                  <td>
                    {b.booking_date}
                    <div className="subtext">
                      {b.start_time} - {b.end_time}
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  {user.role === "USER" && (
                    <td>
                      {b.status === "CONFIRMED" && (
                        <button
                          className="btn-danger btn-sm"
                          onClick={() => handleCancel(b.id)}
                        >
                          Batalkan
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}