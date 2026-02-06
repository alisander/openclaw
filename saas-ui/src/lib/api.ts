const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

type FetchOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("openclaw_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("openclaw_refresh_token");
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("openclaw_token", accessToken);
  localStorage.setItem("openclaw_refresh_token", refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem("openclaw_token");
  localStorage.removeItem("openclaw_refresh_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const resp = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

export async function api<T = unknown>(path: string, opts?: FetchOptions): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts?.headers ?? {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let resp = await fetch(`${API_BASE}${path}`, {
    method: opts?.method ?? "GET",
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });

  // Try token refresh on 401
  if (resp.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      resp = await fetch(`${API_BASE}${path}`, {
        method: opts?.method ?? "GET",
        headers,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
    }
  }

  if (!resp.ok) {
    const error = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error((error as { error?: string }).error ?? `API error: ${resp.status}`);
  }

  return resp.json() as Promise<T>;
}
