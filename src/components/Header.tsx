// Standalone header — same chrome structure as the storefront header region
// shown around the assistant page (logo, search, action buttons, auth state).
import { Link, useNavigate } from "react-router-dom";
import { Search, Sparkles, Hammer, FileText, Store, Package, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const { isRTL, t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="flex items-center gap-3 px-4 py-3 md:px-8">
        <Link to="/assistant" className="flex flex-col leading-none">
          <span className="text-[22px] font-bold tracking-tight text-foreground">
            BENNA
          </span>
          <span className="text-[9px] tracking-[0.3em] text-muted-foreground">
            BUILD SMART
          </span>
        </Link>

        <div className="mx-4 hidden flex-1 md:block">
          <div className="flex max-w-md items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground">
            <Search className="h-4 w-4" />
            {t("What are you looking for", "ما الذي تبحث عنه")}
          </div>
        </div>

        <nav className="ms-auto flex items-center gap-2">
          <Link
            to="/build-project"
            className="hidden items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted lg:flex"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("GENERATE BOQ NOW", "أنشئ BOQ الآن")}
          </Link>
          <Link
            to="/rfqs"
            className="hidden items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted lg:flex"
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            {t("BID RFQ/RFP INSTANTLY", "قدّم عروض الأسعار")}
          </Link>
          <span className="hidden items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground lg:flex">
            <Store className="h-3.5 w-3.5" />
            {t("BECOME VENDOR FOR FREE", "كن بائعاً مجاناً")}
          </span>
          <span className="hidden items-center gap-1.5 rounded-[4px] px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground lg:flex">
            <Package className="h-3.5 w-3.5" />
            {t("TRACK ORDER", "تتبع الطلب")}
          </span>

          <button
            type="button"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="flex items-center gap-1 rounded-[4px] px-2 py-1.5 text-[12px] text-foreground hover:bg-muted"
          >
            <Globe className="h-3.5 w-3.5" />
            {isRTL ? "EN" : "العربية"}
          </button>

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/assistant");
              }}
              className="rounded-[4px] border border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-muted"
            >
              {t("Log out", "تسجيل الخروج")}
            </button>
          ) : (
            <Link
              to="/login?redirect=/assistant"
              className="rounded-[4px] bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
            >
              {t("Log In", "تسجيل الدخول")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
