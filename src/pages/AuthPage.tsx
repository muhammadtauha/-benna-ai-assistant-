// Sign in / Register — connected to the standalone backend
// (POST /api/users/auth/customer/login, POST /api/users/auth/registration).
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeo } from "@/lib/seo";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Sparkles } from "lucide-react";

const ALLOWED_REDIRECT_PATHS = /^\/[a-zA-Z0-9\-_/]*$/;

const validateRedirectTarget = (target: string): string => {
  try {
    const url = new URL(target, window.location.origin);
    if (url.origin !== window.location.origin) return "/assistant";
    if (!ALLOWED_REDIRECT_PATHS.test(url.pathname)) return "/assistant";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/assistant";
  }
};

const AuthPage = ({ mode: initialMode }: { mode: "login" | "register" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { login, register, isAuthenticated } = useAuth();

  const [mode, setMode] = useState<"login" | "register">(
    location.pathname === "/register" ? "register" : initialMode,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title:
      mode === "login" ? "Sign in | Benna Assistant" : "Create account | Benna Assistant",
  });

  const redirectTarget = validateRedirectTarget(
    new URLSearchParams(location.search).get("redirect") || "/assistant",
  );

  useEffect(() => {
    setMode(location.pathname === "/register" ? "register" : "login");
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTarget, { replace: true });
  }, [isAuthenticated, navigate, redirectTarget]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email, password);
      else await register({ name: name || "User", email, password });
      navigate(redirectTarget, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-[6px] border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-[8px] border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <Sparkles className="mx-auto h-7 w-7 text-primary" />
            <h1 className="mt-3 text-[20px] font-medium text-foreground">
              {mode === "login"
                ? t("Sign in", "تسجيل الدخول")
                : t("Create your account", "أنشئ حسابك")}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {mode === "login"
                ? t(
                    "Welcome back to Benna's AI procurement assistant.",
                    "مرحباً بعودتك إلى مساعد بنّا الذكي للمشتريات.",
                  )
                : t(
                    "Sign up to chat with the AI procurement assistant.",
                    "سجّل للتحدث مع مساعد المشتريات الذكي.",
                  )}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "register" ? (
              <input
                className={inputCls}
                placeholder={t("Full name", "الاسم الكامل")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            ) : null}
            <input
              className={inputCls}
              type="email"
              required
              placeholder={t("Email", "البريد الإلكتروني")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              className={inputCls}
              type="password"
              required
              minLength={6}
              placeholder={t("Password", "كلمة المرور")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />

            {error ? (
              <p className="rounded-[4px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-[6px] bg-primary px-4 py-2.5 text-[14px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? t("Please wait…", "يرجى الانتظار…")
                : mode === "login"
                  ? t("Sign in", "تسجيل الدخول")
                  : t("Create account", "إنشاء الحساب")}
            </button>
          </form>

          <p className="mt-5 text-center text-[13px] text-muted-foreground">
            {mode === "login" ? (
              <>
                {t("New here?", "جديد هنا؟")}{" "}
                <Link
                  to={`/register?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {t("Create an account", "أنشئ حساباً")}
                </Link>
              </>
            ) : (
              <>
                {t("Already have an account?", "لديك حساب بالفعل؟")}{" "}
                <Link
                  to={`/login?redirect=${encodeURIComponent(redirectTarget)}`}
                  className="font-medium text-primary hover:underline"
                >
                  {t("Sign in", "تسجيل الدخول")}
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AuthPage;
