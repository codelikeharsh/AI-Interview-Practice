import { API_BASE } from "./config";

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
