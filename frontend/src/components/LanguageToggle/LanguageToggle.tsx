import { Button } from "@/components/ui/button";
import { useLanguagePreference } from "@/hooks/useLanguagePreference";

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle = ({ className }: LanguageToggleProps) => {
  const { language, toggleLanguage } = useLanguagePreference();
  const nextLanguageLabel = language === "en" ? "中文" : "English";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      aria-label={`Switch language to ${nextLanguageLabel}`}
      title={`Switch language to ${nextLanguageLabel}`}
      className={`bg-transparent border-none rounded-[5px] text-[#1a1a40] uppercase font-[Times] text-base h-[30px] min-w-[30px] transition-all hover:bg-[#A0A0A0] ${className ?? ""}`}
    >
      {language === "en" ? "中" : "EN"}
    </Button>
  );
};

export default LanguageToggle;
