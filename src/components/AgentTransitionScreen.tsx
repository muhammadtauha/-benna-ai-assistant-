import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, Bot, Cloud, Package, BrainCircuit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

type StepStatus = "pending" | "active" | "success";

interface Step {
  id: string;
  title: { en: string; ar: string };
  icon: React.ReactNode;
  status: StepStatus;
}

const INITIAL_STEPS: Step[] = [
  {
    id: "1",
    title: {
      en: "Welcome to Benna AI Procurement Agent",
      ar: "مرحباً بك في وكيل بنّا الذكي للمشتريات",
    },
    icon: <Bot className="w-4 h-4" />,
    status: "active",
  },
  {
    id: "2",
    title: {
      en: "Connecting to Benna cloud",
      ar: "جارٍ الاتصال بسحابة بنّا",
    },
    icon: <Cloud className="w-4 h-4" />,
    status: "pending",
  },
  {
    id: "3",
    title: {
      en: "Loading 182,000+ building materials",
      ar: "جارٍ تحميل أكثر من 182,000 مادة بناء",
    },
    icon: <Package className="w-4 h-4" />,
    status: "pending",
  },
  {
    id: "4",
    title: {
      en: "Preparing your AI procurement assistant",
      ar: "جارٍ تحضير مساعدك الذكي للمشتريات",
    },
    icon: <BrainCircuit className="w-4 h-4" />,
    status: "pending",
  },
];

const statusRing: Record<StepStatus, string> = {
  pending: "bg-secondary text-muted-foreground ring-border/50",
  active: "bg-[#7f7dfc]/15 text-[#533afd] ring-[#7f7dfc]/30",
  success: "bg-emerald-100 text-emerald-600 ring-emerald-500/20",
};

const STEP_MS = 450;

export function AgentTransitionScreen({ onSkip }: { onSkip?: () => void }) {
  const { language } = useLanguage();
  const isAr = language === "ar";
  const t = (en: string, ar: string) => (isAr ? ar : en);
  const [steps, setSteps] = useState<Step[]>(INITIAL_STEPS);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < INITIAL_STEPS.length - 1; i++) {
      const delay = (i + 1) * STEP_MS;

      timeouts.push(
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((step, idx) => {
              if (idx === i) return { ...step, status: "success" };
              if (idx === i + 1) return { ...step, status: "active" };
              return step;
            }),
          );
        }, delay),
      );
    }

    timeouts.push(
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((step, idx) =>
            idx === prev.length - 1 ? { ...step, status: "success" } : step,
          ),
        );
      }, INITIAL_STEPS.length * STEP_MS),
    );


    return () => timeouts.forEach(clearTimeout);
  }, []);

  const hasActive = steps.some((s) => s.status === "active");
  const allSuccess = steps.every((s) => s.status === "success");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-white/95 p-4 sm:p-6">
      <Card className="relative w-full max-w-2xl overflow-hidden border border-border/60 bg-card/90 p-5 shadow-2xl sm:p-7">
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #7f7dfc, transparent 70%)" }}
        />

        <div className="relative z-10 flex items-center gap-3 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7f7dfc]/10 text-[#533afd]">
            {hasActive ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : allSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <BrainCircuit className="h-4 w-4" />
            )}
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-foreground/90">
            {allSuccess
              ? t("Agent is ready", "الوكيل جاهز")
              : t("Benna AI is getting ready", "بنّا الذكي يستعد")}
          </span>
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="ms-auto rounded-[4px] border border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {t("Skip", "تخطي")}
            </button>
          )}
        </div>


        <div className="relative z-10 mt-2 space-y-0">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1;

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4 }}
                className={`relative flex gap-4 ${step.status === "pending" ? "opacity-60" : "opacity-100"}`}
              >
                {!isLast && (
                  <div className="absolute left-[11px] top-7 bottom-[-12px] w-[2px] bg-border/60" />
                )}

                <div className={`relative z-10 flex-none w-6 h-6 mt-0.5 rounded-full ring-4 ring-card flex items-center justify-center ${statusRing[step.status]}`}>
                  {step.status === "success" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : step.status === "active" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    step.icon
                  )}
                </div>

                <div className="flex-1 pb-5">
                  <div className="flex items-center justify-between">
                    <span className={`text-[14px] tracking-tight ${step.status === "active" ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                      {t(step.title.en, step.title.ar)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
