import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { isRTL } = useLanguage();
  return (
    <footer className="border-t border-border px-4 py-6 text-center text-[12px] text-muted-foreground md:px-8">
      {isRTL
        ? "بنّا — مساعد المشتريات الذكي (نسخة مستقلة)"
        : "Benna — AI Procurement Assistant (standalone build)"}
    </footer>
  );
};

export default Footer;
