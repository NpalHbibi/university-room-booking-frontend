import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "../api/client";

const initialForm = {
  name: "",
  code: "",
  description: "",
  capacity: 30,
  location: "",
  status: "ACTIVE",
};

function today() {
  return new Date().toLocaleDateString("en-CA");
}

function shiftDate(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

function formatDateLong(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const short = (t) => (t ? t.slice(0, 5) : "");

export default function RoomsPage({ user, onNavigate }) {
  const isAdmin = user.role === "ADMIN";

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const formRef = useRef(null);

  const [drawerRoom, setDrawerRoom] = useState(null);
  const [drawerDate, setDrawerDate] = useState(today());
  const [availability, setAvailability] = useState(null);
  const [loadingAvail, setLoadingAvail] = useState(false);

  async function fetchRooms() {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("/rooms");
      setRooms(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  // Muat jadwal setiap kali drawer dibuka / tanggal berganti
  useEffect(() => {
    if (!drawerRoom) return;
    let ignore = false;
    async function load() {
      setLoadingAvail(true);
      try {
        const res = await apiRequest(
          `/rooms/${drawerRoom.id}/availability?date=${drawerDate}`
        );
        if (!ignore) setAvailability(res.data);
      } catch (err) {
        if (!ignore) {
          setAvailability(null);
          setError(err.message);
        }
      } finally {
        if (!ignore) setLoadingAvail(false);
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [drawerRoom, drawerDate]);

  // Tutup drawer dengan Esc
  useEffect(() => {
    if (!drawerRoom) return;
    const onKey = (e) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerRoom]);

  function openDrawer(room) {
    setDrawerDate(today());
    setAvailability(null);
    setDrawerRoom(room);
  }

  function closeDrawer() {
    setDrawerRoom(null);
    setAvailability(null);
  }

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.name?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q) ||
        r.location?.toLowerCase().includes(q)
      );
    });
  }, [rooms, search, statusFilter]);

  function startCreate() {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
    setError("");
    setSuccess("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function startEdit(room) {
    setEditingId(room.id);
    setForm({
      name: room.name,
      code: room.code,
      description: room.description || "",
      capacity: room.capacity,
      location: room.location,
      status: room.status,
    });
    setShowForm(true);
    setSuccess("");
    setError("");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    const payload = { ...form, capacity: Number(form.capacity) };

    try {
      if (editingId) {
        await apiRequest(`/rooms/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        setSuccess("Data ruangan berhasil diperbarui.");
      } else {
        await apiRequest("/rooms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setSuccess("Ruangan baru berhasil ditambahkan.");
      }
      cancelForm();
      fetchRooms();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(room) {
    const next = room.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setTogglingId(room.id);
    setError("");
    try {
      await apiRequest(`/rooms/${room.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: room.name,
          code: room.code,
          description: room.description || "",
          capacity: room.capacity,
          location: room.location,
          status: next,
        }),
      });
      setRooms((prev) =>
        prev.map((r) => (r.id === room.id ? { ...r, status: next } : r))
      );
      setSuccess(
        next === "ACTIVE"
          ? `${room.name} diaktifkan.`
          : `${room.name} dinonaktifkan. Riwayat booking tetap tersimpan.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  const statusTabs = isAdmin
    ? [
        { label: "Semua", value: "" },
        { label: "Aktif", value: "ACTIVE" },
        { label: "Nonaktif", value: "INACTIVE" },
      ]
    : [];

  return (
    <section>
      <div className="page-header">
        <div>
          <h2>Daftar Ruangan</h2>
          <p className="subtext">
            {isAdmin
              ? "Kelola data ruangan dan pantau jadwal pemakaiannya."
              : "Pilih ruangan, lalu cek jam yang masih kosong."}
          </p>
        </div>
        {isAdmin && (
          <button
            className="btn-primary"
            onClick={showForm && !editingId ? cancelForm : startCreate}
          >
            {showForm && !editingId ? "Tutup form" : "+ Tambah ruangan"}
          </button>
        )}
      </div>

      {error && (
        <div className="alert-error alert-dismissible">
          <span>{error}</span>
          <button className="alert-close" onClick={() => setError("")}>×</button>
        </div>
      )}
      {success && (
        <div className="alert-success alert-dismissible">
          <span>{success}</span>
          <button className="alert-close" onClick={() => setSuccess("")}>×</button>
        </div>
      )}

      {isAdmin && showForm && (
        <form
          ref={formRef}
          className="card form-grid reveal"
          onSubmit={handleAdminSubmit}
        >
          <h3>{editingId ? "Edit ruangan" : "Tambah ruangan baru"}</h3>
          <div className="grid-2">
            <label>
              Nama ruangan
              <input
                type="text"
                required
                minLength={3}
                placeholder="Aula Utama"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Kode ruangan
              <input
                type="text"
                required
                minLength={2}
                placeholder="R-101"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label>
              Lokasi
              <input
                type="text"
                required
                minLength={3}
                placeholder="Gedung A, Lantai 2"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
            <label>
              Kapasitas (orang)
              <input
                type="number"
                required
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label>
              Deskripsi dan fasilitas
              <input
                type="text"
                placeholder="Proyektor, AC, 40 kursi"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving
                ? "Menyimpan..."
                : editingId
                ? "Simpan perubahan"
                : "Tambah ruangan"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelForm}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="rooms-toolbar">
        <input
          className="search-input"
          type="search"
          placeholder="Cari nama, kode, atau lokasi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {statusTabs.length > 0 && (
          <div className="status-tabs" style={{ marginBottom: 0 }}>
            {statusTabs.map((t) => (
              <button
                key={t.value}
                type="button"
                className={statusFilter === t.value ? "tab-pill active" : "tab-pill"}
                onClick={() => setStatusFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="room-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="room-card">
              <span className="skeleton sk-line" style={{ width: "35%" }} />
              <span className="skeleton sk-title" />
              <span className="skeleton sk-line" style={{ width: "70%" }} />
              <span className="skeleton sk-line" />
            </div>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="empty-state card">
          <strong>
            {rooms.length === 0 ? "Belum ada ruangan" : "Tidak ada ruangan yang cocok"}
          </strong>
          <p className="subtext">
            {rooms.length === 0
              ? isAdmin
                ? "Tambahkan ruangan pertama agar bisa dipesan."
                : "Admin belum menambahkan ruangan aktif."
              : "Coba kata kunci lain atau reset filter."}
          </p>
          {(search || statusFilter) && (
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
              }}
            >
              Reset filter
            </button>
          )}
        </div>
      ) : (
        <div className="room-grid">
          {filteredRooms.map((room) => (
            <article
              key={room.id}
              className={`room-card ${room.status === "INACTIVE" ? "inactive" : ""}`}
            >
              <div className="room-top">
                <span className="room-code">{room.code}</span>
                <span className={`badge badge-${room.status.toLowerCase()}`}>
                  {room.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                </span>
              </div>

              <h3 className="room-name">{room.name}</h3>
              <p className="room-meta">
                {room.location} · {room.capacity} orang
              </p>
              <p className="room-desc">
                {room.description || "Belum ada deskripsi fasilitas."}
              </p>

              <div className="btn-row room-actions">
                <button
                  className="btn-primary btn-sm"
                  onClick={() => openDrawer(room)}
                >
                  Cek jadwal
                </button>
                {!isAdmin && room.status === "ACTIVE" && (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => onNavigate?.("bookings")}
                  >
                    Pesan
                  </button>
                )}
                {isAdmin && (
                  <>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => startEdit(room)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      disabled={togglingId === room.id}
                      onClick={() => handleToggleStatus(room)}
                    >
                      {togglingId === room.id
                        ? "..."
                        : room.status === "ACTIVE"
                        ? "Nonaktifkan"
                        : "Aktifkan"}
                    </button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {drawerRoom && (
        <div className="drawer-backdrop" onClick={closeDrawer}>
          <aside
            className="drawer"
            role="dialog"
            aria-label={`Jadwal ${drawerRoom.name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <div>
                <h3>{drawerRoom.name}</h3>
                <p className="subtext">
                  {drawerRoom.code} · {drawerRoom.location} · {drawerRoom.capacity} orang
                </p>
              </div>
              <button className="btn-secondary btn-sm" onClick={closeDrawer}>
                Tutup
              </button>
            </div>

            {drawerRoom.description && (
              <p className="drawer-desc">{drawerRoom.description}</p>
            )}

            <div className="date-nav">
              <button
                className="btn-secondary btn-sm"
                aria-label="Hari sebelumnya"
                disabled={drawerDate <= today()}
                onClick={() => setDrawerDate(shiftDate(drawerDate, -1))}
              >
                ←
              </button>
              <input
                type="date"
                min={today()}
                value={drawerDate}
                onChange={(e) => e.target.value && setDrawerDate(e.target.value)}
              />
              <button
                className="btn-secondary btn-sm"
                aria-label="Hari berikutnya"
                onClick={() => setDrawerDate(shiftDate(drawerDate, 1))}
              >
                →
              </button>
              {drawerDate !== today() && (
                <button
                  className="btn-secondary btn-sm"
                  onClick={() => setDrawerDate(today())}
                >
                  Hari ini
                </button>
              )}
            </div>

            <p className="drawer-date">{formatDateLong(drawerDate)}</p>

            {loadingAvail && !availability ? (
              <span className="skeleton sk-track" />
            ) : (
              <Timeline slots={availability?.booked_slots || []} />
            )}

            {availability && availability.booked_slots.length === 0 ? (
              <p className="info-text drawer-empty">
                Belum ada yang memesan. Semua jam kosong.
              </p>
            ) : (
              <ul className="slot-list">
                {(availability?.booked_slots || []).map((slot) => (
                  <li key={slot.booking_id}>
                    <strong>
                      {short(slot.start_time)} – {short(slot.end_time)}
                    </strong>
                    <span>{slot.title}</span>
                    <span className="subtext">{slot.user_name}</span>
                  </li>
                ))}
              </ul>
            )}

            {!isAdmin && drawerRoom.status === "ACTIVE" && (
              <button
                className="btn-primary drawer-cta"
                onClick={() => onNavigate?.("bookings")}
              >
                Pesan ruangan ini
              </button>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}