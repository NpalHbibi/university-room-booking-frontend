const API_BASE_URL = "http://localhost:8080/api/v1";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      result?.error?.message || `Terjadi kesalahan (${response.status})`;
    throw new Error(message);
  }

  return result;
}