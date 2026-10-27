import { useState, useEffect, useCallback } from 'react';
import { getTranslation as getRawTranslation, getCurrentLanguage, Language } from '../utils/translations';

export const useTranslations = () => {
  const [language, setLanguageState] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const handleLanguageChange = (event: any) => {
      setLanguageState(event.detail);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const getTranslation = useCallback((key: string, params?: Record<string, string | number>, fallbackLang?: Language) => {
    // If a module is provided, we can prefix the key if needed, 
    // but the current implementation in utils/translations/index.ts 
    // flattens all translations into a single object.
    return getRawTranslation(key, params, fallbackLang);
  }, []);

  return {
    language,
    getTranslation
  };
};
