export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(28000),
  });
  const data = await r.json().catch(() => ({
    error:
      "Could not read the server response. Reconnect to check saved progress.",
  }));
  if (!r.ok) throw new ApiError(data.error ?? "Request failed.", r.status);
  return data as T;
}
