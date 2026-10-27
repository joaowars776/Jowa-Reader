import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Palette, Monitor, Globe, RotateCcw, Download, Upload } from 'lucide-react';
import { INTERFACE_THEMES, COLOR_THEMES, getInterfaceTheme, getColorTheme, applyInterfaceTheme, applyPreferencesTheme, getInterfaceThemeFromPrefs, isHexColorDark } from '../utils/themes';
import { LanguageSelector } from './LanguageSelector';
import { useTranslations } from '../hooks/useTranslations';
import { otherUsersBooksTranslations } from '../utils/translations/other-users-books';
import { getCurrentLanguage } from '../utils/translations';
import { resetToDefaults, exportUserData } from '../utils/storage';
import { ImportDataModal } from './ImportDataModal';
import { SnowEffect } from './SnowEffect';
import { RainEffect } from './RainEffect';
import { PetalEffect } from './PetalEffect';
import { ThemePreview } from './HomePageSettings/ThemePreview';
import { MenuStyleSettings } from './HomePageSettings/MenuStyleSettings';
import { SnowThemeSettings } from './HomePageSettings/SnowThemeSettings';
import { CustomColorSettings } from './HomePageSettings/CustomColorSettings';
import type { ReadingPreferences, InterfaceTheme } from '../types';

interface HomePageSettingsProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  onClose: () => void;
}

export const HomePageSettings: React.FC<HomePageSettingsProps> = ({
  preferences,
  onPreferencesChange,
  onClose
}) => {
  const { getTranslation } = useTranslations();
  const getLocalTranslation = (key: string) => {
    const lang = getCurrentLanguage();
    const dict = otherUsersBooksTranslations;
    return dict[lang]?.[key] || dict['en']?.[key] || getTranslation(key);
  };
  const panelRef = useRef<HTMLDivElement>(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);
  const [isResetting, setIsResetting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if clicking inside the import modal portal or reset confirm modal
        const target = event.target as HTMLElement;
        if (target.closest('[data-import-modal]') || target.closest('[data-reset-modal]')) {
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

  // Get interface theme styles
  const getInterfaceStyles = () => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;
    const isDark = isHexColorDark(colors.panelBackground || '#ffffff');
    const accentColor = colors.accent || '#007BFF';
    const buttonText = colors.buttonPrimaryText || (isHexColorDark(accentColor) ? '#ffffff' : '#0f172a');

    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      headerBackground: colors.headerBackground || colors.panelBackground || '#ffffff',
      color: colors.panelText || colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      borderColor: colors.borderColor || colors.panelBorder || (isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb'),
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || (isDark ? '#111827' : '#f9fafb'),
      accent: accentColor,
      textPrimary: colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      textSecondary: colors.textSecondary || (isDark ? '#cbd5e1' : '#6b7280'),
      textMuted: colors.textMuted || (isDark ? '#94a3b8' : '#9ca3af'),
      buttonPrimary: colors.buttonPrimary || accentColor,
      buttonPrimaryText: buttonText,
      buttonSecondary: colors.buttonSecondary || (isDark ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6'),
      buttonSecondaryText: colors.buttonSecondaryText || (isDark ? '#f9fafb' : '#374151'),
      inputBackground: colors.inputBackground || (isDark ? 'rgba(0, 0, 0, 0.35)' : '#ffffff'),
      inputText: colors.inputText || (isDark ? '#ffffff' : '#1f2937'),
      isDark
    };
  };

  const interfaceStyles = getInterfaceStyles();

  const generateInterfaceColors = (background: string, text: string) => {
    const baseTheme = INTERFACE_THEMES.find(t => t.id === 'custom') || INTERFACE_THEMES[0];
    const baseColors = { ...baseTheme.colors };
    
    baseColors.headerBackground = background;
    baseColors.panelBackground = background;
    baseColors.panelSecondaryBackground = background;
    baseColors.inputBackground = background;
    
    baseColors.headerText = text;
    baseColors.panelText = text;
    baseColors.inputText = text;
    baseColors.textPrimary = text;
    baseColors.textSecondary = text;
    baseColors.textMuted = text;
    baseColors.buttonPrimaryText = background;
    baseColors.buttonSecondaryText = text;
    
    baseColors.panelBorder = text;
    baseColors.headerBorder = text;
    baseColors.inputBorder = text;
    baseColors.divider = text;
    baseColors.borderColor = text;
    
    return baseColors;
  };

  const handlePreferencesChangeWrapper = (updatedPrefs: ReadingPreferences) => {
    // 1. Force themeApplyMode to 'both' to sync interface and reading themes
    const finalPrefs: ReadingPreferences = {
      ...updatedPrefs,
      themeApplyMode: 'both'
    };

    // 2. Ensure reading theme matches the selected interface theme
    const themeId = finalPrefs.selectedInterfaceTheme || 'light';
    if (themeId === 'custom') {
      const background = finalPrefs.customInterfaceColors?.panelBackground || '#ffffff';
      const text = finalPrefs.customInterfaceColors?.panelText || '#1f2937';
      finalPrefs.selectedColorTheme = 'custom';
      finalPrefs.theme = 'custom';
      finalPrefs.colors = {
        backgroundColor: background,
        textColor: text
      };
      finalPrefs.customColors = {
        backgroundColor: background,
        textColor: text
      };
      finalPrefs.useThemeBasedColors = false;
    } else {
      const matchingColorTheme = getColorTheme(themeId, finalPrefs.snowSubTheme || 'day');
      if (matchingColorTheme) {
        finalPrefs.selectedColorTheme = themeId;
        finalPrefs.theme = themeId; // align reading area theme too
        finalPrefs.colors = matchingColorTheme.colors;
        finalPrefs.useThemeBasedColors = themeId !== 'custom';
      }
    }

    // 3. Keep interfaceColors synchronized with glass and subthemes
    const computedInterfaceTheme = getInterfaceThemeFromPrefs(finalPrefs);
    finalPrefs.interfaceColors = computedInterfaceTheme.colors;

    // Apply theme immediately for preview
    applyPreferencesTheme(finalPrefs);
    onPreferencesChange(finalPrefs);
  };

  const handleCustomInterfaceColorChange = (colorKey: 'background' | 'text', value: string) => {
    const background = colorKey === 'background' ? value : (preferences.customInterfaceColors?.panelBackground || '#ffffff');
    const text = colorKey === 'text' ? value : (preferences.customInterfaceColors?.panelText || '#1f2937');
    
    const colors = generateInterfaceColors(background, text);
    
    const updatedPreferences: ReadingPreferences = {
      ...preferences,
      selectedInterfaceTheme: 'custom',
      interfaceTheme: 'custom',
      interfaceColors: colors,
      customInterfaceColors: {
        panelBackground: background,
        panelText: text
      }
    };
    
    handlePreferencesChangeWrapper(updatedPreferences);
  };

  const handleInterfaceThemeChange = (themeId: string) => {
    // When activating snow, rain, or aurora for the first time, speed is 100% and density is 10%
    const isActivatingWeather = themeId === 'snow' || themeId === 'rain' || themeId === 'aurora';
    const isFirstTime = preferences.snowDensity === undefined || preferences.snowDensity === 100;
    
    // Mutual exclusivity: if selecting rain or aurora, ensure menuSubTheme isn't lingering as 'snowy'
    const newMenuSubTheme = (themeId === 'rain' || themeId === 'aurora') && preferences.menuSubTheme === 'snowy'
      ? 'default'
      : (preferences.menuSubTheme || 'default');

    let theme = getInterfaceTheme(
      themeId,
      preferences.snowSubTheme || 'day',
      preferences.menuStyle || 'classic',
      preferences.linkStyleWithTheme !== false,
      newMenuSubTheme,
      preferences.neonCustomColor,
      preferences.glassEnabled ?? false,
      preferences.glassTintColor
    );
    
    // If custom theme, use the custom colors from preferences if they exist
    if (themeId === 'custom') {
      const background = preferences.customInterfaceColors?.panelBackground || '#ffffff';
      const text = preferences.customInterfaceColors?.panelText || '#1f2937';
      theme = { ...theme, colors: generateInterfaceColors(background, text) };
    }
    
    const updatedPreferences: ReadingPreferences = {
      ...preferences,
      selectedInterfaceTheme: themeId as any,
      interfaceTheme: themeId as any,
      interfaceColors: theme.colors,
      menuSubTheme: newMenuSubTheme,
      snowDensity: isActivatingWeather ? (isFirstTime ? 10 : (preferences.snowDensity ?? 10)) : preferences.snowDensity,
      snowSpeed: isActivatingWeather ? (isFirstTime ? 100 : (preferences.snowSpeed ?? 100)) : preferences.snowSpeed
    };

    handlePreferencesChangeWrapper(updatedPreferences);
  };

  const handleMenuStyleChange = (style: 'classic' | 'wood' | 'neon' | 'glass' | 'retro8bit') => {
    const disableGlass = style === 'retro8bit' || style === 'wood';
    const glassEnabledToUse = disableGlass ? false : (preferences.glassEnabled ?? false);
    // If glass is enabled, preserve the glass sub-theme (like tinted); otherwise reset to default
    const subThemeToUse = glassEnabledToUse ? (preferences.menuSubTheme || 'default') : 'default';
    const updatedPreferences = {
      ...preferences,
      menuStyle: style,
      glassEnabled: glassEnabledToUse,
      menuSubTheme: subThemeToUse,
      snowMenuType: style === 'wood' ? 'wood' : style === 'glass' ? 'glass' : 'urban'
    };
    
    const theme = getInterfaceTheme(
      preferences.selectedInterfaceTheme || 'light',
      preferences.snowSubTheme || 'day',
      style,
      preferences.linkStyleWithTheme !== false,
      subThemeToUse,
      preferences.neonCustomColor,
      glassEnabledToUse,
      preferences.glassTintColor
    );
    updatedPreferences.interfaceColors = theme.colors;
    
    handlePreferencesChangeWrapper(updatedPreferences);
  };

  const handleLinkStyleToggle = (enabled: boolean) => {
    const updatedPreferences = {
      ...preferences,
      linkStyleWithTheme: enabled
    };
    
    const theme = getInterfaceTheme(
      preferences.selectedInterfaceTheme || 'light',
      preferences.snowSubTheme || 'day',
      preferences.menuStyle || 'classic',
      enabled,
      preferences.menuSubTheme || 'default',
      preferences.neonCustomColor,
      preferences.glassEnabled ?? false,
      preferences.glassTintColor
    );
    updatedPreferences.interfaceColors = theme.colors;
    
    handlePreferencesChangeWrapper(updatedPreferences);
  };

  const handleResetToDefaults = () => {
    setResetCountdown(3);
    setShowResetConfirm(true);
  };

  useEffect(() => {
    let timer: any = null;
    if (showResetConfirm) {
      setResetCountdown(3);
      timer = setInterval(() => {
        setResetCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showResetConfirm]);

  const confirmResetToDefaults = async () => {
    if (resetCountdown > 0 || isResetting) return;
    setIsResetting(true);
    try {
      await resetToDefaults();
      // Reload the page to ensure completely fresh state
      window.location.href = '/';
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleExportData = async () => {
    await exportUserData(true); // Include files by default as requested "100% of cache"
  };

  const cancelResetToDefaults = () => {
    if (isResetting) return;
    setShowResetConfirm(false);
  };

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/50 z-[100] flex justify-end animate-fade-in">
        <div 
          ref={panelRef}
          className={`w-full max-w-2xl h-full shadow-2xl overflow-hidden animate-slide-in-right flex flex-col relative themed-panel border-l ${preferences?.glassEnabled ? 'backdrop-blur-xl' : ''}`}
          style={{
            backgroundColor: interfaceStyles.backgroundColor,
            borderColor: interfaceStyles.borderColor,
            color: interfaceStyles.color,
            fontFamily: preferences?.applyFontGlobally ? 
              (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
               preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
               'Georgia, serif') : undefined
          }}
          data-settings-panel
        >
        {/* Header - Fixed at top with higher z-index */}
        <div 
          className="flex items-center justify-between p-6 border-b flex-shrink-0 relative z-[60] gap-3 min-w-0"
          style={{ 
            backgroundColor: interfaceStyles.headerBackground,
            color: interfaceStyles.color,
            borderColor: interfaceStyles.borderColor 
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div 
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: `${interfaceStyles.accent}20` }}
            >
              <Monitor className="w-6 h-6" style={{ color: interfaceStyles.accent }} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold truncate" style={{ color: interfaceStyles.color }} title={getTranslation('homePageSettings')}>
                {getTranslation('homePageSettings')}
              </h2>
              <p className="text-sm opacity-75 truncate" style={{ color: interfaceStyles.color }}>
                {getTranslation('customizeHomePageAppearance')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {/* Reset to Defaults */}
            <button
              onClick={handleResetToDefaults}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all duration-300 group cursor-pointer shrink-0"
              style={{ color: '#ef4444' }}
              aria-label={getTranslation('resetToDefaults')}
              title={getTranslation('resetToDefaults')}
            >
              <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-300" />
            </button>

            {/* Language Selector */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all duration-300 cursor-pointer shrink-0"
                style={{ color: interfaceStyles.color }}
                aria-label={getTranslation('language')}
                data-language-toggle
              >
                <Globe className="w-5 h-5" />
              </button>
              
              {showLanguageSelector && (
                <div className="absolute top-full right-0 mt-2 z-[9999] animate-fade-in">
                  <LanguageSelector preferences={preferences} onClose={() => setShowLanguageSelector(false)} />
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-all duration-300 cursor-pointer shrink-0"
              style={{ color: interfaceStyles.color }}
              aria-label={getTranslation('closeSettings')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Settings Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Interface Theme Section */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Palette className="w-6 h-6" style={{ color: interfaceStyles.accent }} />
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: interfaceStyles.color }}>
                    {getTranslation('interfaceTheme')}
                  </h3>
                  <p className="text-sm opacity-75" style={{ color: interfaceStyles.color }}>
                    {getTranslation('chooseInterfaceTheme')}
                  </p>
                </div>
              </div>
              
              {/* Themes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {INTERFACE_THEMES.map((theme) => {
                  let previewTheme = theme;
                  if (theme.id === 'custom') {
                    if (preferences.selectedInterfaceTheme === 'custom') {
                      previewTheme = { ...theme, colors: preferences.interfaceColors };
                    } else if (preferences.customInterfaceColors) {
                      previewTheme = { ...theme, colors: preferences.customInterfaceColors };
                    }
                  } else {
                    const isSelected = preferences.selectedInterfaceTheme === theme.id;
                    if (isSelected) {
                      previewTheme = getInterfaceThemeFromPrefs(preferences);
                    } else {
                      previewTheme = getInterfaceTheme(
                        theme.id,
                        preferences.snowSubTheme || 'day',
                        preferences.menuStyle || 'classic',
                        preferences.linkStyleWithTheme !== false,
                        preferences.glassEnabled ? (preferences.menuSubTheme || 'default') : 'default',
                        preferences.neonCustomColor,
                        preferences.glassEnabled ?? false,
                        preferences.glassTintColor
                      );
                    }
                  }
                  
                  return (
                    <ThemePreview
                      key={theme.id}
                      theme={previewTheme}
                      isSelected={preferences.selectedInterfaceTheme === theme.id}
                      onSelect={handleInterfaceThemeChange}
                      interfaceStyles={interfaceStyles}
                      getTranslation={getTranslation}
                    />
                  );
                })}
              </div>

              {/* UNIVERSAL MENU STYLE SECTION */}
              <MenuStyleSettings
                preferences={preferences}
                interfaceStyles={interfaceStyles}
                getTranslation={getTranslation}
                onPreferencesChange={handlePreferencesChangeWrapper}
                handleMenuStyleChange={handleMenuStyleChange}
                handleLinkStyleToggle={handleLinkStyleToggle}
                applyPreferencesTheme={applyPreferencesTheme}
              />

              {/* Snow Theme Details & Controls */}
              <SnowThemeSettings
                preferences={preferences}
                interfaceStyles={interfaceStyles}
                getTranslation={getTranslation}
                onPreferencesChange={handlePreferencesChangeWrapper}
              />

              {/* Custom Color Selectors */}
              <CustomColorSettings
                preferences={preferences}
                interfaceStyles={interfaceStyles}
                getTranslation={getTranslation}
                onCustomInterfaceColorChange={handleCustomInterfaceColorChange}
              />
            </div>

            {/* Data Management Section */}
            <div className="pt-4 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
              <div className="flex items-center gap-3 mb-6">
                <div 
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: '#10b98120' }}
                >
                  <Download className="w-6 h-6" style={{ color: '#10b981' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: interfaceStyles.color }}>
                    {getTranslation('exportData')}
                  </h3>
                  <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('exportDataDescription')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleExportData}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
                  style={{ 
                    backgroundColor: '#10b981',
                    color: '#ffffff'
                  }}
                >
                  <Download className="w-5 h-5" />
                  {getTranslation('exportData')}
                </button>

                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 border-2"
                  style={{ 
                    borderColor: '#10b981',
                    color: '#10b981',
                    backgroundColor: 'transparent'
                  }}
                >
                  <Upload className="w-5 h-5" />
                  {getTranslation('importData')}
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Footer - Fixed at bottom */}
        <div 
          className="p-6 border-t flex-shrink-0"
          style={{ 
            borderColor: interfaceStyles.borderColor,
            backgroundColor: interfaceStyles.headerBackground,
            color: interfaceStyles.color
          }}
        >
          <p className="text-sm text-center opacity-75" style={{ color: interfaceStyles.color }}>
            {getTranslation('homePageThemeNote')}
          </p>
        </div>
      </div>
    </div>

    {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-sm"
          data-reset-modal
        >
          <div 
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-current/10"
            style={{
              backgroundColor: interfaceStyles.backgroundColor,
              color: interfaceStyles.color,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="p-6">
              <h3 className="text-xl font-black mb-3 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-500" />
                {getLocalTranslation('confirmResetButton')}
              </h3>

              {/* Warning Notice about losing all data & profiles */}
              <div className="p-3.5 mb-4 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed font-semibold">
                <p>{getLocalTranslation('resetNotice')}</p>
              </div>

              {/* Prominent Export Button */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full mb-5 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer shadow-xs"
                style={{ 
                  backgroundColor: `${interfaceStyles.accent}15`, 
                  color: interfaceStyles.accent, 
                  borderColor: `${interfaceStyles.accent}40` 
                }}
                title={getLocalTranslation('exportCurrentData')}
              >
                <Download className="w-4 h-4" />
                <span>{getLocalTranslation('exportCurrentData')}</span>
              </button>

              <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
                <button
                  type="button"
                  onClick={cancelResetToDefaults}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer disabled:opacity-50"
                >
                  {getTranslation('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmResetToDefaults}
                  disabled={resetCountdown > 0 || isResetting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-red-600 text-white hover:bg-red-700 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <span>...</span>
                  ) : resetCountdown > 0 ? (
                    <span>{getLocalTranslation('resetCooldown').replace('{seconds}', String(resetCountdown))}</span>
                  ) : (
                    <span>{getLocalTranslation('confirmResetButton')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <ImportDataModal 
          onClose={() => setShowImportModal(false)} 
          preferences={preferences}
        />
      )}
    </>,
    document.body
  );
};
