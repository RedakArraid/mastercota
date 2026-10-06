export class ApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); this.name = "ApiError"; }
}

/** Client HTTP navigateur — cookies de session inclus */
export async function api<T = unknown>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
    signal: init?.signal ?? AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith("/api/auth/")) {
    window.location.assign(`/auth/phone?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
  }
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string }).error || `Erreur ${res.status}`, res.status
    );
  }
  return data as T;
}
