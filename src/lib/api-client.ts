// Minimal fetch client compatible with the assistant module's usage:
//   apiClient<T>(path, { method, body }) -> T (raw envelope)
//   unwrap(envelope) -> envelope.data ?? envelope
import { API_URL } from "@/config/env";
import { getAccessToken } from "./auth-session";

const BASE = API_URL.replace(/\/+$/, "");
const PUBLIC_KEY = import.meta.env.VITE_API_KEY as string | undefined;

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

interface Options extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function apiClient<T = unknown>(
  path: string,
  options: Options = {},
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (PUBLIC_KEY) headers["x-api-key"] = PUBLIC_KEY;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    throw new ApiError(body?.message || `Request failed (${res.status})`, res.status, body);
  }
  return body as T;
}

/** Unwrap { success, data } envelopes; pass through anything else. */
export function unwrap<T = unknown>(res: unknown): T {
  const r = res as { data?: T };
  return (r && typeof r === "object" && "data" in r ? r.data : res) as T;
}

export { getAccessToken };
