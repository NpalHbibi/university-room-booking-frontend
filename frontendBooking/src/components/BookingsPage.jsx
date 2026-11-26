import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../api/client";

function toSeconds(timeStr) {
  if (!timeStr) return 0;
  const [h = 0, m = 0, s = 0] = timeStr.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}

function formatTimeShort(timeStr) {
  return timeStr ? timeStr.slice(0, 5) : "";
}

function canCancelBooking(booking) {
  if (booking.status !== "CONFIRMED") return false;
  const normalizedTime =
    booking.start_time.length === 5
      ? `${booking.start_time}:00`
      : booking.start_time;
  const startDateTime = new Date(`${booking.booking_date}T${normalizedTime}`);
  return !Number.isNaN(startDateTime.getTime()) && new Date() < startDateTime;
}

export default function BookingsPage({ user }) {
  const todayWIB = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filter server-side & search client-side
  const [filters, setFilters] = useState({
    date: "",
    room_id: "",
    status: "",
  });
  const [searchQuery, setSearchQuery] = useState("");

  // Form booking (USER)
  const [showForm, setShowForm] = useState(true);
  const [form, setForm] = useState({
    room_id: "",
    title: "",
    purpose: "",
    booking_date: todayWIB,
    start_time: "09:00",
    end_time: "11:00",
  });

  // Live availability preview untuk form USER
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Modal detail booking (GET /bookings/:id)
  const [detailBooking, setDetailBooking] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const activeRooms = useMemo(
    () => rooms.filter((r) => r.status === "ACTIVE"),
    [rooms]
  );

  const selectedRoomObj = useMemo(
    () => activeRooms.find((r) => String(r.id) === String(form.room_id)),
    [activeRooms, form.room_id]
  );

  // Validasi waktu & deteksi bentrok real-time di frontend
  const isTimeRangeInvalid = useMemo(() => {
    if (!form.start_time || !form.end_time) return false;
    return toSeconds(form.start_time) >= toSeconds(form.end_time);
  }, [form.start_time, form.end_time]);

  const conflictingSlot = useMemo(() => {
    if (isTimeRangeInvalid || !form.start_time || !form.end_time) return null;
    const reqStart = toSeconds(form.start_time);
    const reqEnd = toSeconds(form.end_time);
    return (
      bookedSlots.find(
        (slot) =>
          toSeconds(slot.start_time) < reqEnd &&
          toSeconds(slot.end_time) > reqStart
      ) || null
    );
  }, [bookedSlots, form.start_time, form.end_time, isTimeRangeInvalid]);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  async function loadRooms() {
    try {
      const res = await apiRequest("/rooms");
      const allRooms = res.data || [];
      setRooms(allRooms);

      const firstActive = allRooms.find((r) => r.status === "ACTIVE");
      if (firstActive) {
        setForm((prev) =>
          prev.room_id ? prev : { ...prev, room_id: String(firstActive.id) }
        );
      }
    } catch {
      // Abaikan error opsi ruangan
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

  async function fetchRoomAvailability(roomId, dateStr) {
    if (!roomId || !dateStr) {
      setBookedSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const res = await apiRequest(
        `/rooms/${roomId}/availability?date=${dateStr}`
      );
      setBookedSlots(res.data?.booked_slots || []);
    } catch {
      setBookedSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [filters]);

  useEffect(() => {
    if (user.role === "USER" && form.room_id && form.booking_date) {
      fetchRoomAvailability(form.room_id, form.booking_date);
    }
  }, [user.role, form.room_id, form.booking_date]);

  const filteredBookings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.purpose?.toLowerCase().includes(q) ||
        b.room_name?.toLowerCase().includes(q) ||
        b.room_code?.toLowerCase().includes(q) ||
        b.user_name?.toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  async function handleCreateBooking(e) {
    e.preventDefault();
    if (isTimeRangeInvalid || conflictingSlot) return;

    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await apiRequest("/bookings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          title: form.title.trim(),
          purpose: form.purpose.trim(),
          room_id: Number(form.room_id),
        }),
      });
      const createdId = res.data?.id ? ` (#${res.data.id})` : "";
      setSuccess(`Booking berhasil dikonfirmasi otomatis${createdId}!`);
      setForm((prev) => ({ ...prev, title: "", purpose: "" }));
      fetchBookings();
      fetchRoomAvailability(form.room_id, form.booking_date);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(bookingId) {
    setError("");
    setSuccess("");
    setCancellingId(bookingId);
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, {
        method: "PATCH",
      });
      setSuccess("Booking berhasil dibatalkan. Slot jadwal kembali tersedia.");
      setConfirmCancelId(null);
      if (detailBooking?.id === bookingId) {
        setDetailBooking((prev) => ({ ...prev, status: "CANCELLED" }));
      }
      fetchBookings();
      if (user.role === "USER" && form.room_id && form.booking_date) {
        fetchRoomAvailability(form.room_id, form.booking_date);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCancellingId(null);
    }
  }

  async function handleOpenDetail(bookingId) {
    setLoadingDetail(true);
    setError("");
    try {
      const res = await apiRequest(`/bookings/${bookingId}`);
      setDetailBooking(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  const durationHours =
    (toSeconds(form.end_time) - toSeconds(form.start_time)) / 3600;

  function setDuration(h) {
    const endSec = Math.min(
      toSeconds(form.start_time) + h * 3600,
      23 * 3600 + 59 * 60
    );
    const hh = String(Math.floor(endSec / 3600)).padStart(2, "0");
    const mm = String(Math.floor((endSec % 3600) / 60)).padStart(2, "0");
    setForm((prev) => ({ ...prev, end_time: `${hh}:${mm}` }));
  }

  const hasActiveFilters =
    filters.date || filters.room_id || filters.status || searchQuery.trim();

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>{user.role === "ADMIN" ? "Semua Booking" : "Booking Saya"}</h2>
          <p className="subtext">
            {user.role === "ADMIN"
              ? "Pantau seluruh transaksi peminjaman ruangan dari semua pengguna."
              : "Ajukan pemesanan ruangan otomatis (auto-confirm) atau kelola jadwal Anda."}
          </p>
        </div>

        {user.role === "USER" && (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowForm((prev) => !prev)}
          >
            {showForm ? "Sembunyikan Form" : "+ Buat Booking"}
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error alert-dismissible">
          <span>{error}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="alert-success alert-dismissible">
          <span>{success}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {user.role === "USER" && showForm && (
        <form className="card form-grid" onSubmit={handleCreateBooking}>
          <div className="card-header">
            <h3>Form Pemesanan Ruangan</h3>
            {selectedRoomObj && (
              <span className="badge badge-active">
                Kapasitas Maks: {selectedRoomObj.capacity} orang •{" "}
                {selectedRoomObj.location}
              </span>
            )}
          </div>

          <div className="grid-2">
            <label>
              Pilih Ruangan
              <select
                required
                value={form.room_id}
                onChange={(e) => setForm({ ...form, room_id: e.target.value })}
              >
                <option value="">-- Pilih Ruangan Aktif --</option>
                {activeRooms.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.code} - {rm.name} ({rm.capacity} org)
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="label-row">
                <span>Judul Kegiatan</span>
                <span className="char-count">{form.title.length}/150</span>
              </span>
              <input
                type="text"
                required
                minLength={5}
                maxLength={150}
                placeholder="Contoh: Seminar Proposal Skripsi"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>

            <label>
              Tanggal Pemakaian
              <input
                type="date"
                required
                min={todayWIB}
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

          <div className="chip-row">
            <span className="subtext">Durasi cepat:</span>
            {[1, 2, 3, 4].map((h) => (
              <button
                key={h}
                type="button"
                className={durationHours === h ? "chip active" : "chip"}
                onClick={() => setDuration(h)}
              >
                {h} jam
              </button>
            ))}
          </div>

          {form.room_id && form.booking_date && (
            <div className="slot-preview-box">
              <div className="slot-preview-header">
                <strong>Jadwal {form.booking_date}</strong>
                {loadingSlots && (
                  <span className="subtext">Memeriksa jadwal...</span>
                )}
              </div>

              <Timeline
                slots={bookedSlots}
                requested={
                  isTimeRangeInvalid
                    ? null
                    : {
                        start: form.start_time,
                        end: form.end_time,
                        conflict: Boolean(conflictingSlot),
                      }
                }
              />

              {!loadingSlots && bookedSlots.length === 0 ? (
                <p className="subtext" style={{ marginTop: "0.6rem" }}>
                  Belum ada yang memesan. Semua jam tersedia.
                </p>
              ) : (
                <div className="slot-pill-list">
                  {bookedSlots.map((slot) => (
                    <span key={slot.booking_id} className="slot-pill">
                      {formatTimeShort(slot.start_time)} -{" "}
                      {formatTimeShort(slot.end_time)} ({slot.title})
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {isTimeRangeInvalid && (
            <div className="inline-warning">
              Jam mulai harus lebih awal daripada jam selesai.
            </div>
          )}

          {conflictingSlot && (
            <div className="inline-warning">
              Bentrok dengan jadwal "{conflictingSlot.title}" (
              {formatTimeShort(conflictingSlot.start_time)} -{" "}
              {formatTimeShort(conflictingSlot.end_time)}). Silakan geser jam
              pemakaian.
            </div>
          )}

          <label>
            <span className="label-row">
              <span>Tujuan / Keperluan Peminjaman</span>
              <span className="char-count">{form.purpose.length}/2000</span>
            </span>
            <textarea
              rows={2}
              required
              minLength={10}
              maxLength={2000}
              placeholder="Jelaskan detail kegiatan dan keperluan penggunaan ruangan (minimal 10 karakter)"
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
            />
          </label>

          <div className="btn-row">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting || isTimeRangeInvalid || Boolean(conflictingSlot)}
            >
              {submitting ? "Memproses..." : "Pesan ruangan"}
            </button>
          </div>
        </form>
      )}

      {/* Quick Status Tabs */}
      <div className="status-tabs">
        {[
          { label: "Semua", value: "" },
          { label: "Confirmed", value: "CONFIRMED" },
          { label: "Completed", value: "COMPLETED" },
          { label: "Cancelled", value: "CANCELLED" },
        ].map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={
              filters.status === tab.value ? "tab-pill active" : "tab-pill"
            }
            onClick={() => setFilters({ ...filters, status: tab.value })}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="card filter-row">
        <label className="filter-grow">
          Cari Kegiatan / Ruangan
          <input
            type="text"
            placeholder="Ketik judul, kode ruangan, atau nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>

        <label>
          Tanggal
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
        </label>

        <label>
          Ruangan
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
                {rm.status === "INACTIVE" ? " (Nonaktif)" : ""}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setFilters({ date: "", room_id: "", status: "" });
              setSearchQuery("");
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Tabel Daftar Booking */}
      {loading ? (
        <div className="table-wrapper">
          <table className="data-table">
            <tbody>
              {[0, 1, 2, 3].map((i) => (
                <tr key={i} className="sk-row">
                  <td><span className="skeleton sk-line" /></td>
                  <td><span className="skeleton sk-line" /></td>
                  <td><span className="skeleton sk-line" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card empty-state">
          <strong>
            {hasActiveFilters ? "Tidak ada booking yang cocok" : "Belum ada booking"}
          </strong>
          <p className="subtext">
            {hasActiveFilters
              ? "Ubah atau reset filter untuk melihat data lain."
              : user.role === "USER"
              ? "Isi form di atas untuk memesan ruangan pertamamu."
              : "Booking dari pengguna akan muncul di sini."}
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Ruangan</th>
                <th>Kegiatan</th>
                {user.role === "ADMIN" && <th>Pemesan</th>}
                <th>Jadwal</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map((b) => {
                const cancellable =
                  user.role === "USER" && canCancelBooking(b);
                const isConfirming = confirmCancelId === b.id;

                return (
                  <tr key={b.id}>
                    <td>#{b.id}</td>
                    <td>
                      <strong>{b.room_code}</strong>
                      <div className="subtext">{b.room_name}</div>
                    </td>
                    <td>
                      <strong>{b.title}</strong>
                      <div className="subtext line-clamp">{b.purpose}</div>
                    </td>
                    {user.role === "ADMIN" && <td>{b.user_name}</td>}
                    <td>
                      <strong>{b.booking_date}</strong>
                      <div className="subtext">
                        {formatTimeShort(b.start_time)} -{" "}
                        {formatTimeShort(b.end_time)} WIB
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${b.status.toLowerCase()}`}>
                        {b.status}
                      </span>
                    </td>
                    <td>
                      <div className="btn-row">
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={loadingDetail}
                          onClick={() => handleOpenDetail(b.id)}
                        >
                          Detail
                        </button>

                        {cancellable && !isConfirming && (
                          <button
                            type="button"
                            className="btn-danger btn-sm"
                            onClick={() => setConfirmCancelId(b.id)}
                          >
                            Batalkan
                          </button>
                        )}

                        {cancellable && isConfirming && (
                          <>
                            <button
                              type="button"
                              className="btn-danger btn-sm"
                              disabled={cancellingId === b.id}
                              onClick={() => handleCancel(b.id)}
                            >
                              {cancellingId === b.id ? "..." : "Ya, Batal"}
                            </button>
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              disabled={cancellingId === b.id}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Tidak
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Detail Booking */}
      {detailBooking && (
        <div
          className="modal-backdrop"
          onClick={() => setDetailBooking(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3>Detail Booking #{detailBooking.id}</h3>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => setDetailBooking(null)}
              >
                Tutup
              </button>
            </div>

            <div className="detail-grid">
              <div>
                <span className="subtext">Status</span>
                <div>
                  <span
                    className={`badge badge-${detailBooking.status.toLowerCase()}`}
                  >
                    {detailBooking.status}
                  </span>
                </div>
              </div>
              <div>
                <span className="subtext">Ruangan</span>
                <div>
                  <strong>
                    {detailBooking.room_code} - {detailBooking.room_name}
                  </strong>
                </div>
              </div>
              <div>
                <span className="subtext">Pemesan</span>
                <div>
                  <strong>{detailBooking.user_name}</strong>
                </div>
              </div>
              <div>
                <span className="subtext">Tanggal & Waktu</span>
                <div>
                  <strong>
                    {detailBooking.booking_date} (
                    {formatTimeShort(detailBooking.start_time)} -{" "}
                    {formatTimeShort(detailBooking.end_time)} WIB)
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <span className="subtext">Nama Kegiatan</span>
              <div>
                <strong>{detailBooking.title}</strong>
              </div>
            </div>

            <div className="detail-block">
              <span className="subtext">Keperluan / Tujuan</span>
              <p className="detail-purpose">{detailBooking.purpose}</p>
            </div>

            {user.role === "USER" && canCancelBooking(detailBooking) && (
              <div className="btn-row" style={{ marginTop: "1rem" }}>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={cancellingId === detailBooking.id}
                  onClick={() => handleCancel(detailBooking.id)}
                >
                  {cancellingId === detailBooking.id
                    ? "Membatalkan..."
                    : "Batalkan Booking Ini"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}