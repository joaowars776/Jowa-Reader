// Main translations index file
import { readerSettingsTranslations } from './reader-settings';
import { readerHistoryTranslations } from './reader-history';
import { homePageTranslations } from './home-page';
import { readerInterfaceTranslations } from './reader-interface';
import { notesTranslations } from './notes';

export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar' | 'hi' | 'tr' | 'sw' | 'bn' | 'id' | 'yo' | 'nl' | 'th' | 'ur';

export interface LanguageInfo {
  code: Language;
  name: string;
}

const unsortedLanguages: LanguageInfo[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'pt', name: 'Português' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'th', name: 'ไทย' },
  { code: 'ur', name: 'اردو' }
];

// Function to check if a character is a Latin alphabet character
const isLatinAlphabet = (char: string) => {
  return (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
};

// Separate languages into three groups: English, other Latin-based, and non-Latin-based
const englishLanguage = unsortedLanguages.find(lang => lang.code === 'en');
const otherLanguages = unsortedLanguages.filter(lang => lang.code !== 'en');

const latinLanguages = otherLanguages.filter(lang => isLatinAlphabet(lang.name.charAt(0)));
const nonLatinLanguages = otherLanguages.filter(lang => !isLatinAlphabet(lang.name.charAt(0)));

// Sort Latin-based languages alphabetically by name
latinLanguages.sort((a, b) => a.name.localeCompare(b.name));

// Sort non-Latin-based languages alphabetically by name
nonLatinLanguages.sort((a, b) => a.name.localeCompare(b.name));

// Combine the sorted lists with English at the top
export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  ...(englishLanguage ? [englishLanguage] : []),
  ...latinLanguages,
  ...nonLatinLanguages
];

// Combine all translations by language from their respective regional modules
const translations: Record<Language, Record<string, string>> = {} as Record<Language, Record<string, string>>;

AVAILABLE_LANGUAGES.forEach(({ code }) => {
  translations[code] = {
    ...readerSettingsTranslations[code],
    ...readerHistoryTranslations[code],
    ...homePageTranslations[code],
    ...readerInterfaceTranslations[code],
    ...notesTranslations[code],
  };
});

// Detect initial language immediately on module load
const detectInitialLanguage = (): { current: Language; browser: Language } => {
  let browser: Language = 'en';
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    const navLangs = navigator.languages && navigator.languages.length > 0 
      ? navigator.languages 
      : [navigator.language];
      
    for (const rawLang of navLangs) {
      if (!rawLang) continue;
      const code = rawLang.split('-')[0].toLowerCase() as Language;
      if (AVAILABLE_LANGUAGES.some(lang => lang.code === code)) {
        browser = code;
        break;
      }
    }
  }

  let savedLanguage: string | null = null;
  try {
    if (typeof localStorage !== 'undefined') {
      savedLanguage = localStorage.getItem('selectedLanguage');
    }
  } catch {
    // Ignore localStorage access restrictions
  }

  if (savedLanguage && savedLanguage !== 'auto' && AVAILABLE_LANGUAGES.some(lang => lang.code === savedLanguage)) {
    return { current: savedLanguage as Language, browser };
  }
  
  return { current: browser, browser };
};

export const RTL_LANGUAGES: Language[] = [];

export const isRtlLanguage = (_lang?: Language): boolean => {
  // Completely blocked to prevent layout flipping as requested
  return false;
};

export const applyDirection = (_language: Language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.dir = 'ltr';
    document.documentElement.setAttribute('data-direction', 'ltr');
  }
};

const initialDetection = detectInitialLanguage();
let currentLanguage: Language = initialDetection.current;
let defaultBrowserLanguage: Language = initialDetection.browser;
applyDirection(currentLanguage);

export const initializeLanguage = () => {
  const result = detectInitialLanguage();
  defaultBrowserLanguage = result.browser;
  currentLanguage = result.current;
  applyDirection(currentLanguage);
};

export const setLanguage = (language: Language) => {
  currentLanguage = language;
  applyDirection(language);
  try {
    localStorage.setItem('selectedLanguage', language);
  } catch {
    console.warn('Could not save language to localStorage');
  }
  
  // Trigger a custom event to notify components of language change
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: language }));
};

export const getCurrentLanguage = (): Language => {
  return currentLanguage;
};

export const getAvailableLanguages = (): LanguageInfo[] => {
  return AVAILABLE_LANGUAGES;
};

export const getTranslation = (key: string, params?: Record<string, string | number>, fallbackLang: Language = 'en'): string => {
  const languageTranslations = translations[currentLanguage];
  let text = '';
  if (languageTranslations && languageTranslations[key]) {
    text = languageTranslations[key];
  } else {
    // Fallback to the specified fallback language (defaulting to English)
    const fallbackTranslations = translations[fallbackLang];
    if (fallbackTranslations && fallbackTranslations[key]) {
      text = fallbackTranslations[key];
    } else {
      // Return key if translation not found
      console.warn(`Translation not found for key: ${key} in language: ${currentLanguage}. Fallback to ${fallbackLang} also failed.`);
      text = key;
    }
  }

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
};

export const isDefaultBrowserLanguage = (): boolean => {
  return currentLanguage === defaultBrowserLanguage;
};

export const getDefaultBrowserLanguageName = (): string => {
  const langInfo = AVAILABLE_LANGUAGES.find(lang => lang.code === defaultBrowserLanguage);
  return langInfo ? langInfo.name : 'English'; // Fallback name
};

export const getDefaultBrowserLanguageCode = (): Language => {
  return defaultBrowserLanguage;
};
