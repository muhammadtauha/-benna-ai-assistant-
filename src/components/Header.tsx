// Standalone header matching the Benna storefront chrome:
// thin top bar (delivery line + language/user/bell/cart), then logo.
// Search bar and action buttons intentionally removed — no redirecting away
// from the assistant.
import { Link, useNavigate } from "react-router-dom";
import { Globe, Bell, ShoppingCart, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sparkles } from "lucide-react";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { items } = useCart();
  const { isRTL, t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const displayName =
    (user as { name?: string; fullName?: string } | null)?.name ||
    (user as { name?: string; fullName?: string } | null)?.fullName ||
    user?.email?.split("@")[0] ||
    "";

  const tagCls =
    "rounded-[3px] bg-primary/10 px-1 py-px text-[9px] font-semibold uppercase text-primary";

  return (
    <header className="sticky top-0 z-40 bg-background">
      {/* Top announcement bar */}
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-1.5 text-[11px] text-muted-foreground md:px-8">
        <span>
          <Sparkles className="me-1 inline h-3 w-3 text-primary" />
          {t("Deliver to", "التوصيل إلى")}{" "}
          <span className="font-medium text-foreground">
            {t("KSA, GCC & Worldwide", "السعودية والخليج والعالم")}
          </span>{" "}
          <span className={tagCls}>{t("Global", "عالمي")}</span>
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            className="flex items-center gap-1 hover:text-foreground"
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
              className="flex items-center gap-1 font-medium text-foreground hover:text-primary"
              title={t("Log out", "تسجيل الخروج")}
            >
              <User className="h-3.5 w-3.5" />
              {displayName}
            </button>
          ) : (
            <Link
              to="/login?redirect=/assistant"
              className="font-medium text-foreground hover:text-primary"
            >
              {t("Log In", "تسجيل الدخول")}
            </Link>
          )}
          <Bell className="h-3.5 w-3.5" />
          <span className="relative">
            <ShoppingCart className="h-3.5 w-3.5" />
            {items.length > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                {items.length}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Main bar — logo only */}
      <div className="flex items-center px-4 py-3 md:px-8">
        <Link to="/assistant" className="flex shrink-0 items-center" aria-label="Benna - Home">
          <img
            src="https://static.wixstatic.com/media/b99a57_66162956ac1345b7b402744d22076d87~mv2.png/v1/fit/w_320,h_128,q_80,enc_avif/image.avif"
            alt="Benna"
            width={180}
            height={56}
            decoding="async"
            className="h-12 w-auto"
          />
        </Link>
      </div>
    </header>
  );
};

export default Header;
