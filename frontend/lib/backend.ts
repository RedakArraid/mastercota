/** Base URL du backend pour le SSR (réseau Docker ou local). */
export function backendUrl() {
  return (
    process.env.BACKEND_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://127.0.0.1:4000"
  );
}

export async function backendFetch<T = unknown>(
  path: string,
  init?: RequestInit & { cookie?: string }
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (init?.cookie) {
    (headers as Record<string, string>)["Cookie"] = init.cookie;
  }
  const res = await fetch(`${backendUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Erreur ${res.status}`
    );
  }
  return data as T;
}
