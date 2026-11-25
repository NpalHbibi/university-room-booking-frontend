import { useEffect, useState } from "react";
import { apiRequest } from "../api/client";

const initialForm = {
  name: "",
  code: "",
  description: "",
  capacity: 30,
  location: "",
  status: "ACTIVE",
};

export default function RoomsPage({ user }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // State form Admin (Create / Edit)
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // State cek ketersediaan ruangan
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [checkDate, setCheckDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );
  const [availability, setAvailability] = useState(null);

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

  async function handleCheckAvailability(roomId, dateStr) {
    setError("");
    try {
      const res = await apiRequest(
        `/rooms/${roomId}/availability?date=${dateStr}`
      );
      setAvailability(res.data);
    } catch (err) {
      setError(err.message);
    }
  }

  function openAvailability(room) {
    setSelectedRoom(room);
    handleCheckAvailability(room.id, checkDate);
  }

  async function handleAdminSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      ...form,
      capacity: Number(form.capacity),
    };

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
      setForm(initialForm);
      setEditingId(null);
      fetchRooms();
    } catch (err) {
      setError(err.message);
    }
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
    setSuccess("");
    setError("");
  }

  return (
    <section>
      <h2>Daftar Ruangan</h2>

      {error && <div className="alert-error">{error}</div>}
      {success && <div className="alert-success">{success}</div>}

      {user.role === "ADMIN" && (
        <form className="card form-grid" onSubmit={handleAdminSubmit}>
          <h3>{editingId ? "Edit Ruangan" : "Tambah Ruangan Baru"}</h3>
          <div className="grid-2">
            <label>
              Nama Ruangan
              <input
                type="text"
                required
                minLength={3}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              Kode Ruangan
              <input
                type="text"
                required
                minLength={2}
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
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </label>
            <label>
              Kapasitas
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
              Deskripsi
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
          </div>
          <div className="btn-row">
            <button type="submit" className="btn-primary">
              {editingId ? "Simpan Perubahan" : "Tambah Ruangan"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                }}
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      )}

      {selectedRoom && (
        <div className="card">
          <div className="card-header">
            <h3>
              Ketersediaan: {selectedRoom.name} ({selectedRoom.code})
            </h3>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setSelectedRoom(null);
                setAvailability(null);
              }}
            >
              Tutup
            </button>
          </div>

          <div className="filter-row">
            <input
              type="date"
              value={checkDate}
              onChange={(e) => {
                setCheckDate(e.target.value);
                handleCheckAvailability(selectedRoom.id, e.target.value);
              }}
            />
          </div>

          {availability && (
            <div>
              {availability.booked_slots.length === 0 ? (
                <p className="info-text">
                  Tidak ada jadwal terpakai pada tanggal {availability.date}.
                </p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Jam</th>
                      <th>Kegiatan</th>
                      <th>Pemesan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availability.booked_slots.map((slot) => (
                      <tr key={slot.booking_id}>
                        <td>
                          {slot.start_time} - {slot.end_time}
                        </td>
                        <td>{slot.title}</td>
                        <td>{slot.user_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <p className="info-text">Memuat daftar ruangan...</p>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Lokasi</th>
                <th>Kapasitas</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td>{room.code}</td>
                  <td>
                    <strong>{room.name}</strong>
                    {room.description && (
                      <div className="subtext">{room.description}</div>
                    )}
                  </td>
                  <td>{room.location}</td>
                  <td>{room.capacity} orang</td>
                  <td>
                    <span className={`badge badge-${room.status.toLowerCase()}`}>
                      {room.status}
                    </span>
                  </td>
                  <td className="btn-row">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => openAvailability(room)}
                    >
                      Cek Jadwal
                    </button>
                    {user.role === "ADMIN" && (
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => startEdit(room)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}