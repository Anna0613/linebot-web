import { useState } from "react";
import { Button } from "@/components/ui/button";

type Language = "en" | "zh";

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle = ({ className }: LanguageToggleProps) => {
  const [language, setLanguage] = useState<Language>("en");

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "zh" : "en");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className={`bg-transparent border-none rounded-[5px] text-[#1a1a40] uppercase font-[Times] text-base h-[30px] min-w-[30px] transition-all hover:bg-[#A0A0A0] ${className}`}
    >
      {language === "en" ? "中" : "EN"}
    </Button>
  );
};

export default LanguageToggle;
