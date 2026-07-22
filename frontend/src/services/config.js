export const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${API_BASE.replace(/^http/, "ws")}/ws/interview`;

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
