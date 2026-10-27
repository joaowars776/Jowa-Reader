import React, { useRef, useEffect } from 'react';
import { Check, X, Globe } from 'lucide-react';
import { 
  getAvailableLanguages, 
  getCurrentLanguage, 
  setLanguage, 
  getTranslation,
  getDefaultBrowserLanguageCode
} from '../utils/translations';
import { getInterfaceThemeFromPrefs, isHexColorDark } from '../utils/themes';
import { getCachedPreferences } from '../utils/storage';
import type { ReadingPreferences } from '../types';
import type { Language } from '../utils/translations';

interface LanguageSelectorProps {
  onClose: () => void;
  preferences?: ReadingPreferences;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onClose, preferences: propPreferences }) => {
  const selectorRef = useRef<HTMLDivElement>(null);
  const currentLanguage = getCurrentLanguage();
  const availableLanguages = getAvailableLanguages();
  const defaultBrowserLanguageCode = getDefaultBrowserLanguageCode();

  // Close when clicking outside modal content
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        // Don't close if clicking on the toggle button itself
        const target = event.target as HTMLElement;
        if (target.closest('[data-language-toggle]')) {
          return;
        }
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleLanguageChange = (languageCode: Language) => {
    setLanguage(languageCode);
    onClose();
  };

  // 1. Resolve active preferences
  const prefs = propPreferences || getCachedPreferences();
  const themeObj = getInterfaceThemeFromPrefs(prefs);
  
  // Custom colors or standard theme colors
  const themeColors = (prefs?.selectedInterfaceTheme === 'custom' && prefs?.customInterfaceColors)
    ? { ...themeObj.colors, ...prefs.customInterfaceColors }
    : (prefs?.interfaceColors || themeObj.colors);

  // 2. Determine base darkness & accent / tint color
  const isDark = isHexColorDark(themeColors?.panelBackground || '#ffffff');
  
  // Tint color resolution
  const isTinted = prefs?.menuSubTheme === 'tinted' && Boolean(prefs?.glassTintColor);
  const tintColor = isTinted 
    ? (prefs?.glassTintColor || '#3b82f6')
    : (themeColors?.accent || '#3b82f6');
  
  const isAccentDark = isHexColorDark(tintColor);

  // 3. Establish 100% SOLID, completely opaque colors (NEVER transparent)
  const makeFullySolidHexOrRgb = (colorStr: string | undefined, fallback: string): string => {
    if (!colorStr) return fallback;
    const trimmed = colorStr.trim();
    
    // Transparent or empty
    if (trimmed.toLowerCase() === 'transparent' || !trimmed) return fallback;

    // Hex color
    if (trimmed.startsWith('#')) {
      if (trimmed.length === 9) return trimmed.slice(0, 7); // #RRGGBBAA -> #RRGGBB
      if (trimmed.length === 5) return trimmed.slice(0, 4); // #RGBA -> #RGB
      return trimmed;
    }
    
    // rgba or rgb
    if (trimmed.toLowerCase().startsWith('rgba') || trimmed.toLowerCase().startsWith('rgb')) {
      const matches = trimmed.match(/\d+(\.\d+)?/g);
      if (matches && matches.length >= 3) {
        return `rgb(${Math.round(Number(matches[0]))}, ${Math.round(Number(matches[1]))}, ${Math.round(Number(matches[2]))})`;
      }
    }
    
    return trimmed;
  };

  // Solid background base (completely opaque)
  const solidBg = makeFullySolidHexOrRgb(
    themeColors?.panelBackground,
    isDark ? '#18181b' : '#ffffff'
  );

  const solidHeaderBg = isDark ? '#1f2026' : '#f4f5f7';
  const solidText = makeFullySolidHexOrRgb(themeColors?.panelText || themeColors?.textPrimary, isDark ? '#f9fafb' : '#1f2937');
  const solidTextSecondary = makeFullySolidHexOrRgb(themeColors?.textSecondary, isDark ? '#a1a1aa' : '#64748b');
  
  // Solid Border adapting to accent / tint
  const solidBorder = isTinted
    ? tintColor
    : makeFullySolidHexOrRgb(themeColors?.panelBorder || themeColors?.borderColor, isDark ? '#2e323b' : '#e2e8f0');

  const solidDivider = isDark ? '#272a33' : '#e5e7eb';
  const hoverBg = isDark ? '#272932' : '#f1f5f9';

  return (
    <div 
      ref={selectorRef}
      data-no-glass="true"
      className="language-selector-popup w-72 rounded-2xl shadow-2xl overflow-hidden border z-[99999] animate-fade-in"
      style={{
        backgroundColor: solidBg,
        color: solidText,
        borderColor: solidBorder,
        boxShadow: `0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5), 0 0 0 1px ${solidBorder}`,
        opacity: 1,
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none'
      } as React.CSSProperties}
    >
      {/* Solid Top Header */}
      <div 
        className="px-4 py-3 border-b flex items-center justify-between transition-colors"
        style={{ 
          backgroundColor: solidHeaderBg,
          borderColor: solidDivider 
        }}
      >
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 flex-shrink-0" style={{ color: tintColor }} />
          <h3 
            className="text-xs font-bold tracking-wider uppercase"
            style={{ color: solidText }}
          >
            {getTranslation('language') || 'Language'}
          </h3>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
          style={{ 
            color: solidTextSecondary,
            backgroundColor: 'transparent'
          }}
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Languages List (100% Solid) */}
      <div 
        className="p-2 max-h-[260px] overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col gap-1.5"
        style={{ backgroundColor: solidBg }}
      >
        {availableLanguages.map((language) => {
          const isSelected = currentLanguage === language.code;

          return (
            <button
              key={language.code}
              type="button"
              onClick={() => handleLanguageChange(language.code)}
              className="group relative flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all duration-200 border cursor-pointer w-full text-left"
              style={{
                backgroundColor: isSelected ? tintColor : 'transparent',
                color: isSelected 
                  ? (isAccentDark ? '#ffffff' : '#0f172a') 
                  : solidText,
                borderColor: isSelected ? tintColor : 'transparent',
                fontWeight: isSelected ? 700 : 500
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = hoverBg;
                  e.currentTarget.style.borderColor = isDark ? '#3f3f46' : '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }
              }}
            >
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs">
                  {language.name}
                </span>
                <span 
                  className="text-[9px] uppercase tracking-wider font-mono opacity-75"
                  style={{
                    color: isSelected 
                      ? (isAccentDark ? '#f1f5f9' : '#1e293b')
                      : solidTextSecondary
                  }}
                >
                  {language.code}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {language.code === defaultBrowserLanguageCode && (
                  <span 
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tight shadow-xs"
                    style={{ 
                      backgroundColor: isSelected 
                        ? (isAccentDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)')
                        : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'),
                      color: isSelected 
                        ? (isAccentDark ? '#ffffff' : '#0f172a')
                        : solidText
                    }}
                  >
                    {getTranslation('default') || 'Auto'}
                  </span>
                )}
                
                {isSelected && (
                  <span 
                    className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs"
                    style={{
                      backgroundColor: isAccentDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                      color: isAccentDark ? '#ffffff' : '#0f172a'
                    }}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
