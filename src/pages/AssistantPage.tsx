// src/pages/AssistantPage.tsx
// Full-page assistant workspace with conversation history.
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useMatch, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AssistantChat from "@/components/assistant/AssistantChat";
import { AgentTransitionScreen } from "@/components/AgentTransitionScreen";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSeo } from "@/lib/seo";
import {
  fetchAssistantThreads,
  deleteAssistantThread,
  type AssistantThreadSummary,
} from "@/lib/api-assistant";
import { Sparkles, MessageSquare, Trash2, Hammer, FileText } from "lucide-react";

const AssistantPage = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { isAuthenticated } = useAuth();
  // Read from a match rather than useParams: this page is the PARENT route of
  // /assistant/:threadId, so its own params never carry the id.
  const threadId = useMatch("/assistant/:threadId")?.params.threadId || undefined;
  const navigate = useNavigate();
  const [threads, setThreads] = useState<AssistantThreadSummary[]>([]);
  const [newChatKey, setNewChatKey] = useState(0);
  // Bumped when the user picks a conversation from the sidebar, so a thread
  // this session created can still be re-opened (forces a fresh restore).
  const [restoreKey, setRestoreKey] = useState(0);
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !window.sessionStorage.getItem("benna-assistant-intro-seen");
    } catch {
      return true;
    }
  });
  // Thread ids created by the live chat instance — navigating to them must not
  // remount the chat (which would wipe the in-progress conversation).
  const ownThreadsRef = useRef<Set<string>>(new Set());



  useSeo({
    title: isAr
      ? "المساعد الذكي للمشتريات | بنّاء"
      : "AI Procurement Assistant | Benna",
    description: isAr
      ? "اسأل مساعد بنّاء الذكي عن مواد البناء التي تحتاجها، واحصل على منتجات مطابقة من أكثر من 182,000 منتج وأضفها إلى سلتك."
      : "Ask Benna's AI assistant what materials you need and get matching products from 182,000+ building materials, ready to add to your cart.",
  });

  const loadThreads = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setThreads(await fetchAssistantThreads(20));
    } catch {
      /* history is optional */
    }
  }, [isAuthenticated]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      window.sessionStorage.setItem("benna-assistant-intro-seen", "1");
    } catch {
      /* ignore */
    }
  }, []);

  // Shown once per browser session only, and never long enough to feel stuck.
  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(dismissIntro, 2200);
    return () => clearTimeout(timer);
  }, [showIntro, dismissIntro]);


  const remove = async (id: string) => {
    setThreads((prev) => prev.filter((t) => t.threadId !== id));
    if (id === threadId) navigate("/assistant", { replace: true });
    try {
      await deleteAssistantThread(id);
    } catch {
      void loadThreads();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showIntro && !threadId && <AgentTransitionScreen onSkip={dismissIntro} />}

      <Header />

      <main className="flex-1">
        <div className="w-full px-4 py-6 md:px-8">
          <header className="mb-5">
            <h1 className="flex items-center gap-2 text-[24px] font-light text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              {isAr ? "المساعد الذكي للمشتريات" : "AI Procurement Assistant"}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
              {isAr
                ? "اوصف مشروعك أو المنتج الذي تحتاجه، وسيبحث المساعد في كتالوج بنّاء الكامل ويقترح منتجات جاهزة للإضافة إلى سلتك."
                : "Describe your project or the product you need. The assistant searches Benna's full catalog and suggests products you can add straight to your cart."}
            </p>
          </header>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)_260px]">
            {/* History */}
            <aside className="order-2 lg:order-1">
              <div className="rounded-[6px] border border-border bg-card">
                <div className="border-b border-border px-3 py-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
                  {isAr ? "المحادثات" : "Conversations"}
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {threads.length ? (
                    threads.map((t) => {
                      const active = t.threadId === threadId;
                      return (
                        <div
                          key={t.threadId}
                          className={`group flex items-start gap-2 rounded-[4px] px-2 py-2 ${
                            active
                              ? "bg-primary/5 ring-1 ring-primary/30"
                              : "hover:bg-muted"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              // Explicit user intent to re-open this thread —
                              // drop it from the "live session" set so the chat
                              // remounts and restores its full history, even if
                              // it was created moments ago in this session.
                              ownThreadsRef.current.delete(t.threadId);
                              setRestoreKey((k) => k + 1);
                              navigate(`/assistant/${t.threadId}`);
                            }}
                            className="flex min-w-0 flex-1 items-start gap-2 text-start"
                          >

                            <MessageSquare
                              className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                                active ? "text-primary" : "text-muted-foreground"
                              }`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[12px] text-foreground">
                                {t.title}
                              </span>
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {t.preview}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(t.threadId)}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="px-2 py-3 text-[12px] text-muted-foreground">
                      {isAr ? "لا توجد محادثات بعد." : "No conversations yet."}
                    </p>
                  )}
                </div>
              </div>
            </aside>

            {/* Chat */}
            <section className="order-1 lg:order-2">
              <div className="h-[70vh] min-h-[520px] overflow-hidden rounded-[6px] border border-border bg-background">
                <AssistantChat
                  key={
                    threadId && !ownThreadsRef.current.has(threadId)
                      ? `${threadId}-${restoreKey}`
                      : `new-${newChatKey}`
                  }

                  variant="page"
                  className="h-full"
                  initialThreadId={threadId || null}
                  onThreadChange={(id) => {
                    ownThreadsRef.current.add(id);
                    if (id !== threadId) navigate(`/assistant/${id}`, { replace: true });
                    void loadThreads();
                  }}
                />

              </div>
            </section>

            {/* Handoffs */}
            <aside className="order-3 space-y-3">
              <Link
                to="/build-project"
                className="block rounded-[6px] border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <Hammer className="h-4 w-4 text-primary" />
                <h2 className="mt-2 text-[13px] font-normal text-foreground">
                  {isAr ? "جدول الكميات (BOQ)" : "Bill of Quantities"}
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isAr
                    ? "احسب كميات المواد لمشروعك بالكامل وأضفها إلى السلة."
                    : "Calculate material quantities for a full project and add them to your cart."}
                </p>
              </Link>
              <Link
                to="/rfqs"
                className="block rounded-[6px] border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <FileText className="h-4 w-4 text-primary" />
                <h2 className="mt-2 text-[13px] font-normal text-foreground">
                  {isAr ? "طلبات عروض الأسعار" : "RFQ Marketplace"}
                </h2>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {isAr
                    ? "انشر كمياتك ودع الموردين يتنافسون على السعر."
                    : "Post your quantities and let suppliers bid on price."}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setNewChatKey((k) => k + 1);
                  if (threadId) navigate("/assistant");
                  void loadThreads();
                }}
                className="w-full rounded-[4px] border border-border px-3 py-2 text-[12px] text-foreground hover:bg-muted"
              >
                {isAr ? "محادثة جديدة" : "Start a new conversation"}
              </button>
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AssistantPage;
