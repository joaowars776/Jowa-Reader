import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Monitor, Eye, RotateCcw, Globe, Settings as SettingsIcon, Download } from 'lucide-react';
import { INTERFACE_THEMES, COLOR_THEMES, getColorTheme, getInterfaceTheme, isHexColorDark } from '../../utils/themes';
import { LanguageSelector } from '../LanguageSelector';
import { useTranslations } from '../../hooks/useTranslations';
import { otherUsersBooksTranslations } from '../../utils/translations/other-users-books';
import { getCurrentLanguage } from '../../utils/translations';
import { resetToDefaults, exportUserData } from '../../utils/storage';
import { ImportDataModal } from '../ImportDataModal';
import { SettingsAppearanceTab } from './SettingsAppearanceTab';
import { SettingsBehaviorTab } from './SettingsBehaviorTab';
import { SettingsAdvancedTab } from './SettingsAdvancedTab';
import type { ReadingPreferences } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface ReaderSettingsProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  onClose: () => void;
  pdfMode?: boolean;
  initialTab?: 'appearance' | 'behavior' | 'advanced';
}

// Default values for comparison
const DEFAULT_VALUES = {
  fontSize: 38,
  lineHeight: 1.6,
  marginSize: 0.5,
  fontFamily: 'Arial',
  customFontUrl: '',
  customFontName: '',
  maxWidth: 'custom',
  scrollButtons: { visible: false, size: 'medium', customSize: 48 },
  cornerNavigation: { visible: false },
  syncInterfaceWithReading: true,
  selectedColorTheme: 'light',
  selectedInterfaceTheme: 'light',
  themeApplyMode: 'both',
  iconVisibility: {
    showSearchIcon: true,
    showBookmarkIcon: true,
    showFavoriteIcon: true,
    showShareIcon: false,
    showFullscreenIcon: false,
    showShortcutsIcon: true,
    showTranslateIcon: true
  },
  enableTextToSpeech: false,
  paragraphSpacing: 1.5,
  fixedTopBar: true,
  bookmarkHighlight: {
    color: '#fef08a',
    style: 'highlight'
  }
};

export const ReaderSettings: React.FC<ReaderSettingsProps> = ({
  preferences,
  onPreferencesChange,
  onClose,
  pdfMode = false,
  initialTab
}) => {
  const { getTranslation, language } = useTranslations();
  const getLocalTranslation = (key: string) => {
    const lang = getCurrentLanguage();
    const dict = otherUsersBooksTranslations;
    return dict[lang]?.[key] || dict['en']?.[key] || getTranslation(key);
  };
  const panelRef = useRef<HTMLDivElement>(null);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [isFontFamilyExpanded, setIsFontFamilyExpanded] = useState(true);
  const [isColorThemeExpanded, setIsColorThemeExpanded] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(3);
  const [isResetting, setIsResetting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [themeApplyMode, setThemeApplyMode] = useState<'both' | 'interface' | 'reader'>(
    preferences?.themeApplyMode || 'both'
  );
  const [activeTab, setActiveTab] = useState<'appearance' | 'behavior' | 'advanced'>(initialTab || 'appearance');
  const [activeThemeTab, setActiveThemeTab] = useState<'color' | 'menu'>('color');

  // Sync themeApplyMode state when preferences prop changes
  useEffect(() => {
    if (preferences?.themeApplyMode) {
      setThemeApplyMode(preferences.themeApplyMode);
    }
  }, [preferences?.themeApplyMode]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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

  // Get interface theme styles memoized for optimal rendering performance
  const interfaceStyles = useMemo(() => {
    const themeId = preferences?.selectedInterfaceTheme || 'light';
    const subTheme = preferences?.snowSubTheme || 'night';
    const menuStyle = preferences?.menuStyle || 'classic';
    const menuSubTheme = preferences?.menuSubTheme || 'default';
    const neonCustomColor = preferences?.neonCustomColor;
    const glassEnabled = (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);
    const glassTintColor = preferences?.glassTintColor;
    
    const theme = getInterfaceTheme(
      themeId,
      subTheme,
      menuStyle,
      preferences?.linkStyleWithTheme !== false,
      menuSubTheme,
      neonCustomColor,
      glassEnabled,
      glassTintColor
    );
    
    const colors = themeId === 'custom' && preferences?.interfaceColors 
      ? preferences.interfaceColors 
      : theme.colors;

    const isDark = isHexColorDark(colors.panelBackground || '#ffffff');
    const accentColor = colors.accent || '#007BFF';

    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      color: colors.panelText || colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      borderColor: colors.borderColor || (isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb'),
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || (isDark ? '#111827' : '#f9fafb'),
      accent: accentColor,
      textSecondary: colors.textSecondary || (isDark ? '#cbd5e1' : '#6b7280'),
      inputBackground: colors.inputBackground || (isDark ? 'rgba(0, 0, 0, 0.35)' : '#ffffff'),
      inputText: colors.inputText || (isDark ? '#ffffff' : '#1f2937'),
      isDark
    };
  }, [
    preferences?.selectedInterfaceTheme,
    preferences?.snowSubTheme,
    preferences?.menuStyle,
    preferences?.linkStyleWithTheme,
    preferences?.menuSubTheme,
    preferences?.neonCustomColor,
    preferences?.glassEnabled,
    preferences?.glassReaderAreaOnly,
    preferences?.glassTintColor,
    preferences?.interfaceColors
  ]);

  // Check if value is default
  const isDefault = useCallback((key: string, value: unknown) => {
    if (key === 'scrollButtons') {
      return JSON.stringify(value) === JSON.stringify(DEFAULT_VALUES.scrollButtons);
    }
    if (key === 'cornerNavigation') {
      return JSON.stringify(value) === JSON.stringify(DEFAULT_VALUES.cornerNavigation);
    }
    if (key === 'themeApplyMode') {
      return value === DEFAULT_VALUES.themeApplyMode;
    }
    if (key === 'iconVisibility') {
      return JSON.stringify(value) === JSON.stringify(DEFAULT_VALUES.iconVisibility);
    }
    return DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES] === value;
  }, []);

  // Ref to track scheduled animation frame for slider updates
  const sliderUpdateTimeoutRef = useRef<number | null>(null);

  // Slider functionality
  const handleSliderChange = useCallback((key: keyof ReadingPreferences, value: number) => {
    if (sliderUpdateTimeoutRef.current) {
      cancelAnimationFrame(sliderUpdateTimeoutRef.current);
    }
    sliderUpdateTimeoutRef.current = requestAnimationFrame(() => {
      const updatedPreferences: any = {
        ...preferences,
        [key]: value
      };

      if (key === 'marginSize') {
        updatedPreferences.maxWidth = 'custom';
      }

      onPreferencesChange(updatedPreferences);
    });
  }, [preferences, onPreferencesChange]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (sliderUpdateTimeoutRef.current) {
        cancelAnimationFrame(sliderUpdateTimeoutRef.current);
      }
    };
  }, []);

  const generateInterfaceColors = useCallback((background: string, text: string) => {
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
  }, []);

  const handleColorThemeChange = useCallback((themeId: string) => {
    const theme = getColorTheme(themeId, preferences.snowSubTheme || 'night');
    
    const updatedPreferences: ReadingPreferences = {
      ...preferences,
    };

    if (themeApplyMode === 'both' || themeApplyMode === 'reader') {
      updatedPreferences.selectedColorTheme = themeId;
      updatedPreferences.theme = themeId as any;
      updatedPreferences.useThemeBasedColors = themeId !== 'custom';
      if (themeId === 'custom' && preferences.customColors) {
        updatedPreferences.colors = preferences.customColors;
      } else {
        updatedPreferences.colors = theme.colors;
      }
    }

    if (themeApplyMode === 'both' || themeApplyMode === 'interface') {
      let interfaceThemeColors;
      if (themeId === 'custom') {
        const background = preferences.customInterfaceColors?.panelBackground || '#ffffff';
        const text = preferences.customInterfaceColors?.panelText || '#1f2937';
        interfaceThemeColors = generateInterfaceColors(background, text);
      } else {
        interfaceThemeColors = getInterfaceTheme(
          themeId,
          preferences.snowSubTheme || 'night',
          preferences.menuStyle || 'classic',
          preferences.linkStyleWithTheme !== false
        ).colors;
      }
      updatedPreferences.selectedInterfaceTheme = themeId;
      updatedPreferences.interfaceTheme = themeId as any;
      updatedPreferences.interfaceColors = interfaceThemeColors;
    }

    onPreferencesChange(updatedPreferences);
  }, [preferences, onPreferencesChange, themeApplyMode, generateInterfaceColors]);

  const handleInterfaceThemeChange = useCallback((themeId: string) => {
    let interfaceThemeColors;
    if (themeId === 'custom') {
      const background = preferences.customInterfaceColors?.panelBackground || '#ffffff';
      const text = preferences.customInterfaceColors?.panelText || '#1f2937';
      interfaceThemeColors = generateInterfaceColors(background, text);
    } else {
      interfaceThemeColors = getInterfaceTheme(
        themeId,
        preferences.snowSubTheme || 'night',
        preferences.menuStyle || 'classic',
        preferences.linkStyleWithTheme !== false
      ).colors;
    }

    const updatedPreferences: ReadingPreferences = {
      ...preferences,
    };

    if (themeApplyMode === 'both' || themeApplyMode === 'interface') {
      updatedPreferences.selectedInterfaceTheme = themeId;
      updatedPreferences.interfaceTheme = themeId as any;
      updatedPreferences.interfaceColors = interfaceThemeColors;
    }

    if (themeApplyMode === 'both' || themeApplyMode === 'reader') {
      const matchingColorTheme = getColorTheme(themeId, preferences.snowSubTheme || 'night');
      if (matchingColorTheme) {
        const colorTheme = { ...matchingColorTheme };
        if (themeId === 'custom' && preferences.customColors) {
          colorTheme.colors = preferences.customColors;
        }
        updatedPreferences.selectedColorTheme = themeId;
        updatedPreferences.theme = themeId as any;
        updatedPreferences.colors = colorTheme.colors;
        updatedPreferences.useThemeBasedColors = themeId !== 'custom';
      }
    }

    onPreferencesChange(updatedPreferences);
  }, [preferences, onPreferencesChange, themeApplyMode, generateInterfaceColors]);

  const handleCustomColorChange = useCallback((type: 'reader' | 'interface', colorKey: string, value: string) => {
    const updatedPreferences = { ...preferences };
    const sync = preferences.syncInterfaceWithReading ?? true;
    
    if (type === 'reader') {
      updatedPreferences.colors = {
        ...preferences.colors,
        [colorKey]: value
      };
      updatedPreferences.customColors = {
        ...(preferences.customColors || {
          textColor: preferences.colors.textColor,
          backgroundColor: preferences.colors.backgroundColor
        }),
        [colorKey]: value
      };
      updatedPreferences.selectedColorTheme = 'custom';
      updatedPreferences.theme = 'custom';
      updatedPreferences.useThemeBasedColors = false;

      if (sync) {
        const background = colorKey === 'backgroundColor' ? value : preferences.colors.backgroundColor;
        const text = colorKey === 'textColor' ? value : preferences.colors.textColor;
        
        updatedPreferences.interfaceColors = generateInterfaceColors(background, text);
        updatedPreferences.customInterfaceColors = {
          panelBackground: background,
          panelText: text
        };
        updatedPreferences.selectedInterfaceTheme = 'custom';
        updatedPreferences.interfaceTheme = 'custom';
      }
    } else {
      const background = colorKey === 'background' ? value : (preferences.customInterfaceColors?.panelBackground || preferences.interfaceColors.panelBackground);
      const text = colorKey === 'text' ? value : (preferences.customInterfaceColors?.panelText || preferences.interfaceColors.panelText);
      
      updatedPreferences.interfaceColors = generateInterfaceColors(background, text);
      updatedPreferences.customInterfaceColors = {
        panelBackground: background,
        panelText: text
      };
      updatedPreferences.selectedInterfaceTheme = 'custom';
      updatedPreferences.interfaceTheme = 'custom';

      if (sync) {
        if (colorKey === 'background') {
          updatedPreferences.colors = {
            ...preferences.colors,
            backgroundColor: value
          };
          updatedPreferences.customColors = {
            ...(preferences.customColors || {
              textColor: preferences.colors.textColor,
              backgroundColor: preferences.colors.backgroundColor
            }),
            backgroundColor: value
          };
        } else if (colorKey === 'text') {
          updatedPreferences.colors = {
            ...preferences.colors,
            textColor: value
          };
          updatedPreferences.customColors = {
            ...(preferences.customColors || {
              textColor: preferences.colors.textColor,
              backgroundColor: preferences.colors.backgroundColor
            }),
            textColor: value
          };
        }
        updatedPreferences.selectedColorTheme = 'custom';
        updatedPreferences.theme = 'custom';
        updatedPreferences.useThemeBasedColors = false;
      }
    }
    
    onPreferencesChange(updatedPreferences);
  }, [preferences, onPreferencesChange, generateInterfaceColors]);

  const handleIconVisibilityChange = useCallback((iconKey: string, visible: boolean) => {
    const currentIconVisibility = preferences.iconVisibility || DEFAULT_VALUES.iconVisibility;
    
    onPreferencesChange({
      ...preferences,
      iconVisibility: {
        ...currentIconVisibility,
        [iconKey]: visible
      }
    });
  }, [preferences, onPreferencesChange]);

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
      window.location.href = '/';
    } catch (error) {
      console.error('Error resetting to defaults:', error);
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleExportData = async () => {
    await exportUserData(true);
  };

  const cancelResetToDefaults = () => {
    if (isResetting) return;
    setShowResetConfirm(false);
  };

  const glassEnabled = (preferences.glassEnabled ?? false) && !(preferences.glassReaderAreaOnly ?? false);
  const activeEffect = preferences.selectedInterfaceTheme || preferences.selectedColorTheme || preferences.theme || 'light';
  const isEffectsActive = activeEffect === 'snow' || activeEffect === 'rain' || activeEffect === 'aurora';

  const isDarkTheme = preferences.selectedInterfaceTheme === 'dark' || 
                      preferences.selectedInterfaceTheme === 'ocean' || 
                      (preferences.selectedInterfaceTheme === 'aurora' && preferences.snowSubTheme !== 'day') || 
                      preferences.selectedInterfaceTheme === 'highcontrast' || 
                      preferences.snowSubTheme === 'night' || 
                      preferences.snowSubTheme === 'midnight';

  const overlayBg = (() => {
    const bg = interfaceStyles.backgroundColor || '#ffffff';
    let r = 255, g = 255, b = 255;
    if (bg.startsWith('#')) {
      const hex = bg.substring(1);
      if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (hex.length === 3) {
        r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
        g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
        b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
      }
    }
    const opacity = glassEnabled && !isEffectsActive ? 0.15 : (isDarkTheme ? 0.65 : 0.45);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  })();

  const backdropFilterVal = glassEnabled && !isEffectsActive ? 'blur(var(--interface-glass-blur, 14px))' : 'none';

  // Render tab contents dynamically directly in the component body to avoid selection lag/stale closure bugs.

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop overlay background with filter */}
      <div 
        className="absolute inset-0 animate-fade-in"
        style={{
          backgroundColor: overlayBg,
          backdropFilter: backdropFilterVal,
          WebkitBackdropFilter: backdropFilterVal,
        }}
      />
      
      {/* Settings Panel */}
      <div 
        ref={panelRef}
        className="settings-panel relative w-full max-w-lg h-full shadow-xl overflow-hidden animate-slide-in-right flex flex-col z-10"
        style={{
          backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' :
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' : 
             'Georgia, serif') : undefined
        }}
        data-settings-panel
      >
        <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        {preferences.selectedInterfaceTheme === 'light' && (
          <style>{`
            [data-settings-panel] .rounded-lg.border,
            [data-settings-panel] .rounded-xl.border {
              border-style: dashed !important;
              border-width: 1px !important;
              box-shadow: 0 1px 2px rgba(0,0,0,0.02) !important;
            }
          `}</style>
        )}
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b flex-shrink-0 gap-2 min-w-0"
          style={{ 
            backgroundColor: glassEnabled ? 'transparent' : interfaceStyles.backgroundColor,
            borderColor: interfaceStyles.borderColor 
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Monitor className="w-5 h-5 shrink-0" style={{ color: '#007BFF' }} />
            <h2 className="text-base sm:text-lg font-semibold truncate" style={{ color: interfaceStyles.color }} title={getTranslation('readerSettings')}>
              {getTranslation('readerSettings')}
            </h2>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reset to Defaults */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 cursor-pointer shrink-0"
              style={{ color: '#ef4444' }}
              aria-label={getTranslation('resetToDefaults')}
              title={getTranslation('resetToDefaults')}
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Language Selector */}
            {!pdfMode && (
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 cursor-pointer shrink-0"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('language')}
                  data-language-toggle
                >
                  <Globe className="w-5 h-5" />
                </button>
                
                {showLanguageSelector && (
                  <div className="absolute top-full right-0 mt-2 z-50 animate-fade-in">
                    <LanguageSelector preferences={preferences} onClose={() => setShowLanguageSelector(false)} />
                  </div>
                )}
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 cursor-pointer shrink-0"
              style={{ color: interfaceStyles.color }}
              aria-label="Close settings"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        {!pdfMode && (
          <div 
            className="flex border-b"
            style={{ borderColor: interfaceStyles.borderColor }}
          >
            {[
              { id: 'appearance', label: getTranslation('appearance'), icon: Monitor },
              { id: 'behavior', label: getTranslation('behavior'), icon: Eye },
              { id: 'advanced', label: getTranslation('advanced'), icon: SettingsIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'appearance' | 'behavior' | 'advanced')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-300 cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'hover:bg-gray-100 hover:bg-opacity-20'
                  }`}
                  style={{
                    color: activeTab === tab.id ? '#007BFF' : interfaceStyles.color,
                    backgroundColor: activeTab === tab.id ? '#007BFF10' : 'transparent'
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Settings Content */}
        <div id="reader-settings-scroll-container" className="flex-1 overflow-y-auto relative">
          {/* PDF Mode Overlay */}
          {pdfMode && (
            <div 
              className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-[2px] bg-white/10"
              style={{ backgroundColor: interfaceStyles.backgroundColor + '80' }}
            >
              <div 
                className="p-6 rounded-2xl shadow-2xl border-2 max-w-xs animate-bounce-subtle"
                style={{ 
                  backgroundColor: interfaceStyles.backgroundColor,
                  borderColor: '#f59e0b'
                }}
              >
                <Monitor className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                <h3 className="text-lg font-bold mb-2" style={{ color: interfaceStyles.color }}>
                  {getTranslation('pdfSettingsBlocked')}
                </h3>
                <p className="text-sm opacity-80" style={{ color: interfaceStyles.color }}>
                  {getTranslation('pdfSettingsBlockedDescription')}
                </p>
              </div>
            </div>
          )}
          
          <div className={`p-4 space-y-6 ${pdfMode ? 'opacity-30 pointer-events-none grayscale-[0.5]' : ''}`}>
            {/* PDF Mode Warning */}
            {pdfMode && (
              <div 
                className="p-4 rounded-lg border-l-4 mb-2 animate-fade-in"
                style={{ 
                  backgroundColor: '#fffbeb',
                  borderColor: '#f59e0b',
                  color: '#92400e'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <SettingsIcon className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm mb-1">
                      {getTranslation('pdfOriginalModeActive')}
                    </h4>
                    <p className="text-xs leading-relaxed opacity-90">
                      {getTranslation('pdfOriginalModeWarning')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <SettingsAppearanceTab
                preferences={preferences}
                onPreferencesChange={onPreferencesChange}
                interfaceStyles={interfaceStyles}
                isDefault={isDefault}
                handleSliderChange={handleSliderChange}
                handleColorThemeChange={handleColorThemeChange}
                handleInterfaceThemeChange={handleInterfaceThemeChange}
                handleCustomColorChange={handleCustomColorChange}
                isFontFamilyExpanded={isFontFamilyExpanded}
                setIsFontFamilyExpanded={setIsFontFamilyExpanded}
                isColorThemeExpanded={isColorThemeExpanded}
                setIsColorThemeExpanded={setIsColorThemeExpanded}
                themeApplyMode={themeApplyMode}
                setThemeApplyMode={setThemeApplyMode}
                activeThemeTab={activeThemeTab}
                setActiveThemeTab={setActiveThemeTab}
              />
            )}
 
            {/* Behavior Tab */}
            {activeTab === 'behavior' && (
              <SettingsBehaviorTab
                preferences={preferences}
                onPreferencesChange={onPreferencesChange}
                interfaceStyles={interfaceStyles}
                isDefault={isDefault}
              />
            )}
 
            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <SettingsAdvancedTab
                preferences={preferences}
                onPreferencesChange={onPreferencesChange}
                interfaceStyles={interfaceStyles}
                isDefault={isDefault}
                DEFAULT_VALUES={DEFAULT_VALUES}
                handleIconVisibilityChange={handleIconVisibilityChange}
                handleExportData={handleExportData}
                setShowImportModal={setShowImportModal}
              />
            )}
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-fade-in"
            style={{
              backgroundColor: glassEnabled ? overlayBg : 'rgba(0,0,0,0.5)',
              backdropFilter: backdropFilterVal !== 'none' ? backdropFilterVal : 'blur(4px)',
              WebkitBackdropFilter: backdropFilterVal !== 'none' ? backdropFilterVal : 'blur(4px)',
            }}
            data-reset-modal
          >
            <div 
              className="rounded-2xl p-6 max-w-md w-full mx-4 animate-scale-in border shadow-2xl"
              style={{
                backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor,
                color: interfaceStyles.color,
                borderColor: interfaceStyles.borderColor,
                backdropFilter: glassEnabled ? 'blur(10px)' : undefined,
                WebkitBackdropFilter: glassEnabled ? 'blur(10px)' : undefined,
              }}
            >
              <h3 className="text-xl font-black mb-3 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-red-500" />
                {getLocalTranslation('confirmResetButton')}
              </h3>

              {/* Warning Notice */}
              <div className="p-3.5 mb-4 rounded-xl border bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs leading-relaxed font-semibold">
                <p>{getLocalTranslation('resetNotice')}</p>
              </div>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportData}
                className="w-full mb-5 py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all hover:opacity-90 active:scale-[0.99] cursor-pointer shadow-xs"
                style={{ 
                  backgroundColor: `${interfaceStyles.accent || '#3b82f6'}15`, 
                  color: interfaceStyles.accent || '#3b82f6', 
                  borderColor: `${interfaceStyles.accent || '#3b82f6'}40` 
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
                  style={{ color: interfaceStyles.color }}
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
        )}

        {/* Import Modal */}
        {showImportModal && (
          <ImportDataModal 
            onClose={() => setShowImportModal(false)} 
            preferences={preferences}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
