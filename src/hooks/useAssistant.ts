// src/hooks/useAssistant.ts
// Owns one assistant conversation: streaming turn state, quota, and history.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  streamAssistantChat,
  fetchAssistantQuota,
  fetchAssistantThread,
  type AssistantProduct,
  type AssistantQuota,
  type AssistantMode,
  type AssistantHandoff,
  type AssistantLink,
} from "@/lib/api-assistant";

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  products?: AssistantProduct[];
  links?: AssistantLink[];
  handoff?: AssistantHandoff | null;
  mode?: AssistantMode;
  streaming?: boolean;
  error?: string;
}

export type AssistantStage = "idle" | "understanding" | "searching" | "answering";

const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function useAssistant(options?: { lang?: "en" | "ar" }) {
  const lang = options?.lang === "ar" ? "ar" : "en";
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [stage, setStage] = useState<AssistantStage>("idle");
  const [isStreaming, setIsStreaming] = useState(false);
  const [quota, setQuota] = useState<AssistantQuota | null>(null);
  const [limitReached, setLimitReached] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshQuota = useCallback(async () => {
    try {
      setQuota(await fetchAssistantQuota());
    } catch {
      /* quota is advisory — never block the chat on it */
    }
  }, []);

  useEffect(() => {
    void refreshQuota();
  }, [refreshQuota]);

  // Abort an in-flight stream if the component unmounts mid-answer.
  useEffect(() => () => abortRef.current?.abort(), []);

  const patchLast = useCallback(
    (patch: Partial<AssistantMessage> | ((m: AssistantMessage) => Partial<AssistantMessage>)) => {
      setMessages((prev) => {
        if (!prev.length) return prev;
        const next = [...prev];
        const last = next[next.length - 1];
        const delta = typeof patch === "function" ? patch(last) : patch;
        next[next.length - 1] = { ...last, ...delta };
        return next;
      });
    },
    [],
  );

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || isStreaming) return;

      setLimitReached(null);
      const controller = new AbortController();
      abortRef.current = controller;
      setIsStreaming(true);
      setStage("understanding");

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "user", content: message },
        { id: uid(), role: "assistant", content: "", streaming: true },
      ]);

      await streamAssistantChat(
        { message, threadId, lang },
        {
          onMeta: (data) => setThreadId(data.threadId),
          onStatus: (s) => setStage(s),
          onDelta: (text) =>
            patchLast((m) => ({ content: (m.content || "") + text })),
          onProducts: (products) => patchLast({ products }),
          onDone: (data) => {
            setThreadId(data.threadId);
            patchLast({
              content: data.reply,
              products: data.products,
              links: data.links,
              handoff: data.handoff ?? null,
              mode: data.mode,
              streaming: false,
            });
            if (data.quota) setQuota(data.quota);
            else void refreshQuota();
          },
          onLimit: (data) => {
            setQuota(data.quota);
            setLimitReached(data.message);
            // Drop the empty assistant placeholder — the gate renders instead.
            setMessages((prev) => prev.slice(0, -1));
          },
          onError: (data) => {
            patchLast((m) => ({
              streaming: false,
              content: m.content || data.fallback || "",
              error: data.message,
            }));
          },
        },
        controller.signal,
      );

      setIsStreaming(false);
      setStage("idle");
      abortRef.current = null;
      patchLast({ streaming: false });
    },
    [isStreaming, threadId, lang, patchLast, refreshQuota],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setStage("idle");
    patchLast({ streaming: false });
  }, [patchLast]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setThreadId(null);
    setStage("idle");
    setIsStreaming(false);
    setLimitReached(null);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const thread = await fetchAssistantThread(id);
      if (!thread) return;
      setThreadId(thread.threadId);
      setMessages(
        thread.turns.map((t) => ({
          id: uid(),
          role: t.role,
          content: t.content,
          products: t.products,
          mode: t.mode,
        })),
      );
    } catch {
      /* keep the current conversation on failure */
    }
  }, []);

  return {
    messages,
    threadId,
    stage,
    isStreaming,
    quota,
    limitReached,
    send,
    stop,
    reset,
    loadThread,
    refreshQuota,
  };
}
