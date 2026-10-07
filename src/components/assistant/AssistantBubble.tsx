// src/components/assistant/AssistantBubble.tsx
// Sitewide floating entry point. Renders through a portal at z-9999 so it sits
// above drawers/modals, and stays clear of the WhatsApp + back-to-top stack.
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const HIDDEN_PREFIXES = ["/assistant", "/checkout", "/login", "/register", "/otp"];

const AssistantBubble = () => {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const { pathname } = useLocation();

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]" dir={isAr ? "rtl" : "ltr"}>
      <Link
        to="/assistant"
        className="pointer-events-auto absolute bottom-[152px] end-4 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground shadow-lg transition-transform hover:scale-[1.03] md:bottom-[104px]"
        aria-label={isAr ? "المساعد الذكي" : "Ask Benna AI"}
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">{isAr ? "المساعد الذكي" : "Ask Benna AI"}</span>
      </Link>
    </div>,
    document.body,
  );
};

export default AssistantBubble;
