const TOKEN_KEY = 'nexustalk_token';
const SERVER_KEY = 'nexustalk_server';

/**
 * Server base URL resolution:
 * 1. A server address saved INSIDE the app (set on the login screen — this is
 *    how the bundled desktop/mobile apps point at their own server)
 * 2. A build-time default (VITE_DEFAULT_SERVER — baked into the app bundles)
 * 3. Empty = same origin (web app served by the server itself / dev proxy)
 */
const DEFAULT_SERVER = (import.meta.env.VITE_DEFAULT_SERVER || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const getDefaultServer = () => DEFAULT_SERVER;

export const getServerBase = () =>
  (localStorage.getItem(SERVER_KEY) ?? DEFAULT_SERVER).replace(/\/$/, '');

export const setServerBase = (url: string) => {
  const clean = url.trim().replace(/\/$/, '');
  if (clean) localStorage.setItem(SERVER_KEY, clean);
  else localStorage.removeItem(SERVER_KEY);
};

export const hasCustomServer = () => !!localStorage.getItem(SERVER_KEY);

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

/** Fetch with the auth token attached; throws readable errors. */
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(getServerBase() + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  return res.json();
}

export const apiUrl = (path: string) => getServerBase() + path;
