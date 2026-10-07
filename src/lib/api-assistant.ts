// src/lib/api-assistant.ts
// Streaming client for the Benna AI shopping assistant.
// The chat endpoint speaks Server-Sent Events over POST, so it can't use
// EventSource (GET-only) or the JSON apiClient — we read the body stream here.
import { API_URL } from "@/config/env";
import { getAccessToken } from "./auth-session";
import { apiClient, unwrap } from "./api-client";

const BASE = (API_URL || "https://vendor.benna.com.sa/api").replace(/\/+$/, "");
const PUBLIC_KEY = import.meta.env.VITE_API_KEY;

export interface AssistantProduct {
  productId: string;
  name: string;
  nameArabic?: string;
  slug: string;
  image: string;
  brand: string;
  sku: string;
  collections: string;
  unit: string;
  price: number;
  effectivePrice: number;
  inStock: boolean;
  isRFQ: boolean;
  vendorId: string;
  score: number;
  reasons: string[];
}

export interface AssistantQuota {
  freeDaily: number;
  freeRemaining: number;
  usedToday: number;
  dailyCap: number;
  creditBalance: number | null;
  unlimited: boolean;
}

export type AssistantMode =
  | "product_search"
  | "boq"
  | "rfq"
  | "support"
  | "smalltalk";

export interface AssistantHandoff {
  action: "boq" | "rfq";
  href: string;
}

export interface AssistantLink {
  label: string;
  labelAr?: string;
  href: string;
}

export interface AssistantDone {
  threadId: string;
  reply: string;
  products: AssistantProduct[];
  links: AssistantLink[];
  handoff?: AssistantHandoff | null;
  mode: AssistantMode;
  lang: "en" | "ar";
  quota?: AssistantQuota;
}

export interface AssistantStreamHandlers {
  onMeta?: (data: { threadId: string; lang: "en" | "ar" }) => void;
  onStatus?: (stage: "understanding" | "searching" | "answering") => void;
  onDelta?: (text: string) => void;
  onProducts?: (products: AssistantProduct[]) => void;
  onDone?: (data: AssistantDone) => void;
  onLimit?: (data: { code: string; message: string; quota: AssistantQuota }) => void;
  onError?: (data: { message: string; retryable: boolean; fallback?: string }) => void;
}

export interface AssistantThreadSummary {
  threadId: string;
  title: string;
  lang: "en" | "ar";
  lastMessageAt: string;
  preview: string;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
  products: AssistantProduct[];
  mode: AssistantMode;
  createdAt: string;
}

/**
 * Streams one assistant turn. Resolves when the stream ends.
 * Pass `signal` from an AbortController to let the user stop generation.
 */
export async function streamAssistantChat(
  payload: { message: string; threadId?: string | null; lang?: "en" | "ar" },
  handlers: AssistantStreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    handlers.onError?.({
      message: "Please sign in to use the assistant.",
      retryable: false,
    });
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/users/website/assistant/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
        ...(PUBLIC_KEY ? { "x-api-key": PUBLIC_KEY } : {}),
      },
      body: JSON.stringify({
        message: payload.message,
        threadId: payload.threadId || undefined,
        lang: payload.lang || "en",
      }),
      // No timeout: a reasoning turn can legitimately take minutes. Only the
      // user's stop button (via `signal`) cancels it.
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return;
    handlers.onError?.({
      message: "Couldn't reach the assistant. Check your connection.",
      retryable: true,
    });
    return;
  }

  if (!res.ok || !res.body) {
    let message = "The assistant is unavailable right now.";
    try {
      const body = await res.json();
      message = body?.message || message;
    } catch {
      /* non-JSON error body */
    }
    handlers.onError?.({ message, retryable: res.status >= 500 });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const dispatch = (event: string, raw: string) => {
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      return;
    }
    switch (event) {
      case "meta":
        handlers.onMeta?.(data);
        break;
      case "status":
        handlers.onStatus?.(data.stage);
        break;
      case "delta":
        if (data.text) handlers.onDelta?.(data.text);
        break;
      case "products":
        handlers.onProducts?.(data.products || []);
        break;
      case "limit":
        handlers.onLimit?.(data);
        break;
      case "done":
        handlers.onDone?.(data);
        break;
      case "error":
        handlers.onError?.(data);
        break;
      default:
        break;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        let event = "message";
        const dataLines: string[] = [];
        for (const line of frame.split("\n")) {
          if (line.startsWith(":")) continue; // heartbeat
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        if (dataLines.length) dispatch(event, dataLines.join("\n"));
      }
    }
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      handlers.onError?.({
        message: "The connection dropped mid-answer. Please try again.",
        retryable: true,
      });
    }
  }
}

export async function fetchAssistantQuota(): Promise<AssistantQuota | null> {
  const res = await apiClient<{ success: boolean; data: AssistantQuota }>(
    "/users/website/assistant/quota",
    { method: "GET" },
  );
  return (unwrap(res as any) as AssistantQuota) ?? null;
}

export async function fetchAssistantThreads(
  limit = 20,
): Promise<AssistantThreadSummary[]> {
  const res = await apiClient<{ success: boolean; data: AssistantThreadSummary[] }>(
    `/users/website/assistant/threads?limit=${limit}`,
    { method: "GET" },
  );
  return (unwrap(res as any) as AssistantThreadSummary[]) ?? [];
}

export async function fetchAssistantThread(threadId: string): Promise<{
  threadId: string;
  title: string;
  lang: "en" | "ar";
  turns: AssistantTurn[];
} | null> {
  const res = await apiClient<any>(
    `/users/website/assistant/threads/${encodeURIComponent(threadId)}`,
    { method: "GET" },
  );
  return (unwrap(res) as any) ?? null;
}

export async function deleteAssistantThread(threadId: string): Promise<void> {
  await apiClient(`/users/website/assistant/threads/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
}
