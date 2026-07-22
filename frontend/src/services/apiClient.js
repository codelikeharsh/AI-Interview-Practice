import { API_BASE } from "./config";

/**
 * fetch wrapper for authenticated app pages. On a 401 (expired/missing
 * session) it redirects to /login instead of making every page render
 * its own "please sign in" error text - this is what makes an expired
 * session feel like a normal re-auth prompt rather than a broken page.
 */
export async function apiFetch(path, options = {}) {
  const { redirectOnAuthError = true, ...fetchOptions } = options;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...fetchOptions,
  });

  if (res.status === 401 && redirectOnAuthError) {
    window.location.href = "/login?expired=1";
    // Navigation is in flight - don't let callers process a stale response.
    return new Promise(() => {});
  }

  return res;
}
