export const BACKEND_URL = (import.meta.env.VITE_API_URL || "https://campus-love-backend.onrender.com").replace(/\/$/, "");
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || BACKEND_URL;

export async function api(path, { method = "GET", body, token, isForm = false } = {}) {
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (body && !isForm) {
    headers["Content-Type"] = "application/json";
  }

  const url = path.startsWith("http") ? path : `${BACKEND_URL}${path}`;

  const response = await fetch(url, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

export function imageUrl(value) {
  if (!value || value === "admin") {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Crect width='240' height='240' fill='%23eef3f7'/%3E%3Ccircle cx='120' cy='94' r='42' fill='%23c7d2df'/%3E%3Cpath d='M52 216c8-48 35-76 68-76s60 28 68 76' fill='%23c7d2df'/%3E%3C/svg%3E";
  }
  return value;
}
