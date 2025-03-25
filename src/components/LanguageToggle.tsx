
import { useState } from 'react';
import { Button } from "@/components/ui/button";

type Language = 'en' | 'zh';

interface LanguageToggleProps {
  className?: string;
}

const LanguageToggle = ({ className }: LanguageToggleProps) => {
  const [language, setLanguage] = useState<Language>('en');

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={toggleLanguage}
      className={`rounded-full text-sm font-medium transition-all ${className}`}
    >
      {language === 'en' ? '中文' : 'EN'}
    </Button>
  );
};

export default LanguageToggle;
