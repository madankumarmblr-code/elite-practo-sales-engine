/** Shared fetch helper for integration clients. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; simulated?: boolean };

export async function safeJsonFetch<T>(
  url: string,
  init?: RequestInit,
  simulate?: { data: T; label: string }
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      if (simulate) {
        return { ok: true, data: simulate.data };
      }
      return { ok: false, error: `${res.status} ${res.statusText}` };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    if (simulate) {
      return { ok: true, data: simulate.data };
    }
    return { ok: false, error: err instanceof Error ? err.message : "Request failed" };
  }
}

export function requireKey(key: string | undefined, name: string) {
  if (!key?.trim()) {
    return { missing: true as const, message: `${name} not configured` };
  }
  return { missing: false as const, key: key.trim() };
}
