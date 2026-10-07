// src/components/assistant/AssistantChat.tsx
// Shared chat surface used by both the floating bubble and the /assistant page.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Send,
  Square,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  Hammer,
  FileText,
  ShoppingCart,
} from "lucide-react";
import { useAssistant } from "@/hooks/useAssistant";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useVendorChat } from "@/hooks/useVendorChat";
import AssistantProductCard from "./AssistantProductCard";
import BennaLoader from "@/components/BennaLoader";
import type { AssistantProduct } from "@/lib/api-assistant";

const ChatManager = lazy(() => import("@/components/ChatManager"));


const SUGGESTIONS_EN = [
  "White cement for a 200 sqm villa",
  "Porcelain floor tiles under 60 SAR/sqm",
  "PPR pipes and fittings 32mm",
  "I need a full material list for a 2-floor villa",
];
const SUGGESTIONS_AR = [
  "أسمنت أبيض لفيلا 200 متر مربع",
  "بلاط بورسلان أرضيات أقل من 60 ريال/م²",
  "مواسير وتوصيلات PPR مقاس 32 مم",
  "أحتاج قائمة مواد كاملة لفيلا من طابقين",
];

const STAGE_LABEL = {
  understanding: { en: "Understanding your request…", ar: "جاري فهم طلبك…" },
  searching: { en: "Searching 182,000+ products…", ar: "جاري البحث في أكثر من 182,000 منتج…" },
  answering: { en: "Preparing recommendations…", ar: "جاري تجهيز التوصيات…" },
};

interface Props {
  variant?: "panel" | "page";
  className?: string;
  /** Existing conversation to restore on mount. */
  initialThreadId?: string | null;
  /** Fired when this conversation gets (or changes) its server thread id. */
  onThreadChange?: (threadId: string) => void;
}

const AssistantChat = ({
  variant = "panel",
  className = "",
  initialThreadId = null,
  onThreadChange,
}: Props) => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { isAuthenticated } = useAuth();
  const { addToCart, setIsCartOpen } = useCart();
  const {
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
  } = useAssistant({ lang: isAr ? "ar" : "en" });

  const vendorChat = useVendorChat();

  const openVendorChat = (p: AssistantProduct) => {
    vendorChat.openChat({
      id: String(p.productId),
      name: p.name,
      vendorId: String(p.vendorId || ""),
      image: p.image,
      price: p.effectivePrice || p.price,
    });
  };

  // Restore a previously saved conversation once, on mount only. Later thread
  // id changes come from this very chat and must not reload/reset it.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (initialThreadId) void loadThread(initialThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Surface a newly created thread id so the page can update its URL/history.
  useEffect(() => {
    if (threadId && threadId !== initialThreadId) onThreadChange?.(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);


  const [input, setInput] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestions = isAr ? SUGGESTIONS_AR : SUGGESTIONS_EN;

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, stage]);

  const lastProducts = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const p = messages[i].products;
      if (p && p.length) return p;
    }
    return [];
  }, [messages]);

  const submit = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    void send(value);
  };

  const addAll = async () => {
    const items = lastProducts.filter((p) => !p.isRFQ && p.inStock);
    if (!items.length || bulkBusy) return;
    setBulkBusy(true);
    for (const p of items) {
      await addToCart({
        productId: String(p.productId),
        productName: p.name,
        uniqueProductSlug: p.slug,
        productPrice: p.effectivePrice || p.price,
        productQuantity: 1,
        productImageUrl: p.image || "/placeholder.svg",
        vendorId: String(p.vendorId || ""),
      } as never);
    }
    setBulkBusy(false);
    setIsCartOpen(true);
  };

  if (!isAuthenticated) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 p-8 text-center ${className}`}>
        <Sparkles className="h-7 w-7 text-primary" />
        <h2 className="text-[15px] font-normal text-foreground">
          {isAr ? "سجّل الدخول لاستخدام المساعد" : "Sign in to use the assistant"}
        </h2>
        <p className="max-w-xs text-[13px] text-muted-foreground">
          {isAr
            ? "المساعد الذكي يبحث في كتالوج بنّاء ويضيف المنتجات إلى سلتك مباشرة."
            : "The AI assistant searches Benna's catalog and adds products straight to your cart."}
        </p>
        <Link
          to="/login"
          className="rounded-[4px] bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
        >
          {isAr ? "تسجيل الدخول" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      {/* Messages */}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 ${
          variant === "page" ? "md:px-6" : ""
        }`}
      >
        {!messages.length ? (
          <div className="space-y-4">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-[14px] font-normal text-foreground">
                  {isAr ? "مساعد المشتريات من بنّاء" : "Benna Procurement Assistant"}
                </h3>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                {isAr
                  ? "اوصف ما تحتاجه — منتج، ماركة، ميزانية، أو مشروع كامل — وسأجد المنتجات المناسبة من كتالوج بنّاء وأضيفها إلى سلتك."
                  : "Describe what you need — a product, a brand, a budget, or a whole project — and I'll find matching products from Benna's catalog and add them to your cart."}
              </p>
            </div>
            <div className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="w-full rounded-[6px] border border-border bg-background px-3 py-2 text-start text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className="space-y-3">
            {m.role === "user" ? (
              <div className="flex justify-end">
                <div className="max-w-[85%] rounded-[6px] bg-primary px-3 py-2 text-[13px] leading-relaxed text-primary-foreground">
                  {m.content}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {m.content ? (
                  <div className="max-w-[92%] whitespace-pre-wrap rounded-[6px] border border-border bg-card px-3 py-2 text-[13px] leading-relaxed text-foreground">
                    {m.content}
                  </div>
                ) : null}

                {m.error ? (
                  <div className="flex items-start gap-2 rounded-[6px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{m.error}</span>
                  </div>
                ) : null}

                {m.products?.length ? (
                  <div className="space-y-2">
                    {m.products.map((p) => (
                      <AssistantProductCard
                        key={p.productId}
                        product={p}
                        onChat={openVendorChat}
                      />

                    ))}
                  </div>
                ) : null}

                {m.links?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {m.links.map((l) => (
                      <Link
                        key={l.href}
                        to={l.href}
                        className="rounded-[4px] border border-border px-2.5 py-1.5 text-[12px] text-foreground hover:bg-muted"
                      >
                        {isAr && l.labelAr ? l.labelAr : l.label}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {m.handoff ? (
                  <Link
                    to={m.handoff.href}
                    className="inline-flex items-center gap-2 rounded-[4px] border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] font-medium text-primary hover:bg-primary/10"
                  >
                    {m.handoff.action === "boq" ? (
                      <Hammer className="h-3.5 w-3.5" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    {m.handoff.action === "boq"
                      ? isAr
                        ? "أنشئ جدول كميات كامل"
                        : "Generate a full BOQ"
                      : isAr
                        ? "انشر طلب عرض سعر"
                        : "Post an RFQ"}
                  </Link>
                ) : null}
              </div>
            )}
          </div>
        ))}

        {isStreaming && stage !== "idle" ? (
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <BennaLoader size="sm" />
            <span>{STAGE_LABEL[stage][isAr ? "ar" : "en"]}</span>
          </div>
        ) : null}

        {limitReached ? (
          <div className="space-y-2 rounded-[6px] border border-primary/30 bg-primary/5 p-3">
            <p className="text-[13px] text-foreground">{limitReached}</p>
            <Link
              to="/build-project?credits=1"
              className="inline-block rounded-[4px] bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
            >
              {isAr ? "شراء رصيد" : "Add credits"}
            </Link>
          </div>
        ) : null}
      </div>

      {/* Bulk add */}
      {lastProducts.filter((p) => !p.isRFQ && p.inStock).length > 1 ? (
        <div className="border-t border-border px-4 py-2">
          <button
            type="button"
            onClick={addAll}
            disabled={bulkBusy}
            className="flex w-full items-center justify-center gap-2 rounded-[4px] border border-border bg-background px-3 py-2 text-[12px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isAr ? "أضف كل المقترحات إلى السلة" : "Add all suggestions to cart"}
          </button>
        </div>
      ) : null}

      {/* Composer */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={
              isAr ? "ما الذي تحتاجه لمشروعك؟" : "What do you need for your project?"
            }
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-[4px] border border-border bg-background px-3 py-2 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/50"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-10 w-10 items-center justify-center rounded-[4px] border border-border text-foreground hover:bg-muted"
              aria-label={isAr ? "إيقاف" : "Stop"}
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit()}
              disabled={!input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-[4px] bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40"
              aria-label={isAr ? "إرسال" : "Send"}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {quota
              ? quota.unlimited
                ? isAr
                  ? "رسائل غير محدودة"
                  : "Unlimited messages"
                : isAr
                  ? `${quota.freeRemaining} رسالة مجانية اليوم · ${quota.creditBalance ?? 0} رصيد`
                  : `${quota.freeRemaining} free messages today · ${quota.creditBalance ?? 0} credits`
              : ""}
          </span>
          {messages.length ? (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {isAr ? "محادثة جديدة" : "New chat"}
            </button>
          ) : null}
        </div>
      </div>

      {vendorChat.showChat && vendorChat.openChats.length > 0 ? (
        <Suspense fallback={null}>
          <ChatManager
            openChats={vendorChat.openChats}
            activeChatId={vendorChat.activeChatId}
            setActiveChatId={vendorChat.setActiveChatId}
            setOpenChats={vendorChat.setOpenChats}
            setShowChat={vendorChat.setShowChat}
          />
        </Suspense>
      ) : null}
    </div>
  );
};


export default AssistantChat;
