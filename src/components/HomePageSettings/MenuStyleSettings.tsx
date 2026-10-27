import React from 'react';
import { Check } from 'lucide-react';
import type { ReadingPreferences } from '../../types';
import { getInterfaceTheme, isHexColorDark } from '../../utils/themes';

interface MenuStyleSettingsProps {
  preferences: ReadingPreferences;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
    panelBackground?: string;
    panelSecondaryBackground?: string;
    accent?: string;
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    buttonPrimary?: string;
    buttonPrimaryText?: string;
    buttonSecondary?: string;
    buttonSecondaryText?: string;
    inputBackground?: string;
    inputText?: string;
    isDark?: boolean;
  };
  getTranslation: (key: string) => string;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  handleMenuStyleChange: (style: 'classic' | 'wood' | 'neon' | 'glass' | 'retro8bit') => void;
  handleLinkStyleToggle: (enabled: boolean) => void;
  applyPreferencesTheme: (preferences: ReadingPreferences) => void;
}

export const MenuStyleSettings: React.FC<MenuStyleSettingsProps> = ({
  preferences,
  interfaceStyles,
  getTranslation,
  onPreferencesChange,
  handleMenuStyleChange,
  handleLinkStyleToggle,
  applyPreferencesTheme,
}) => {
  const isCustomTheme = preferences.selectedInterfaceTheme === 'custom';
  const customActiveBg = preferences.customInterfaceColors?.panelText || '#1f2937';
  const customActiveText = preferences.customInterfaceColors?.panelBackground || '#ffffff';

  return (
    <div 
      className={`mt-6 p-5 rounded-xl border space-y-4 themed-panel transition-all duration-300 ${
        preferences.glassEnabled ? 'backdrop-blur-xl shadow-lg' : ''
      }`}
      style={{ 
        backgroundColor: interfaceStyles.panelSecondaryBackground || interfaceStyles.backgroundColor,
        borderColor: interfaceStyles.borderColor,
        color: interfaceStyles.color
      }}
    >
      {/* Universal Settings Synchronization Notice */}
      <div 
        className="flex items-start p-2.5 rounded-lg border text-[11px] gap-2 animate-fade-in" 
        style={{ 
          borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          backgroundColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
        }}
      >
        <span className="opacity-90 flex items-start gap-1.5" style={{ color: interfaceStyles.color }}>
          <span className="text-sm">🔗</span>
          <span>
            <strong>{getTranslation('universalThemeGlassSystem')}</strong>{' '}
            <span dangerouslySetInnerHTML={{ __html: getTranslation('universalThemeNotice') }} />
          </span>
        </span>
      </div>

      <div>
        <h4 className="font-semibold text-sm" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
          {getTranslation('menuStyle')}
        </h4>
        <p className="text-xs opacity-75" style={{ color: interfaceStyles.textSecondary || interfaceStyles.color }}>
          {getTranslation('menuStyleDescription')}
        </p>
      </div>

      {/* Menu Style Grid buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(['classic', 'wood', 'neon', 'retro8bit'] as const).map((styleOpt) => {
          const isSelected = (preferences.menuStyle || 'classic') === styleOpt;
          return (
            <button
              key={styleOpt}
              type="button"
              onClick={() => handleMenuStyleChange(styleOpt)}
              className={`py-2 px-1 text-xs rounded-lg font-medium transition-all text-center border capitalize cursor-pointer ${
                isSelected 
                  ? 'shadow-md font-bold' 
                  : 'hover:bg-black/5 dark:hover:bg-white/5'
              }`}
              style={{
                borderColor: isSelected 
                  ? (isCustomTheme ? customActiveBg : (interfaceStyles.accent || '#007BFF')) 
                  : interfaceStyles.borderColor,
                backgroundColor: isSelected 
                  ? (isCustomTheme ? customActiveBg : (interfaceStyles.buttonPrimary || interfaceStyles.accent || '#007BFF')) 
                  : (preferences.glassEnabled ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)') : 'transparent'),
                color: isSelected 
                  ? (isCustomTheme ? customActiveText : (interfaceStyles.buttonPrimaryText || '#ffffff')) 
                  : (interfaceStyles.textPrimary || interfaceStyles.color)
              }}
            >
              {styleOpt === 'retro8bit' ? getTranslation('menuStyleRetro') : styleOpt === 'wood' ? getTranslation('menuStyleWooden') : styleOpt === 'neon' ? getTranslation('menuStyleNeon') : getTranslation('menuStyleClassic')}
            </button>
          );
        })}
      </div>

      {/* Interactive Menu Style Preview Box */}
      <div className="space-y-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
          {getTranslation('stylePreview')}
        </span>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(['classic', 'wood', 'neon', 'retro8bit'] as const).map((styleOpt) => {
            const themeId = preferences.selectedInterfaceTheme || 'light';
            const subTheme = preferences.snowSubTheme || 'day';
            const previewTheme = getInterfaceTheme(
              themeId,
              subTheme,
              styleOpt,
              preferences.linkStyleWithTheme !== false,
              preferences.menuSubTheme || 'default',
              preferences.neonCustomColor,
              preferences.glassEnabled ?? false,
              preferences.glassTintColor
            );
            const previewColors = previewTheme.colors;
            const styleLabel = styleOpt === 'retro8bit' ? getTranslation('menuStyleRetro') : styleOpt === 'wood' ? getTranslation('menuStyleWooden') : styleOpt === 'neon' ? getTranslation('menuStyleNeon') : getTranslation('menuStyleClassic');
            const isSelected = (preferences.menuStyle || 'classic') === styleOpt;

            return (
              <div 
                key={styleOpt}
                className={`p-3 rounded-lg border text-xs relative overflow-hidden flex flex-col justify-between gap-1.5 transition-all themed-panel ${
                  preferences.glassEnabled && (styleOpt === 'classic' || styleOpt === 'neon') ? 'backdrop-blur-md' : ''
                }`}
                data-interface-menu-style={styleOpt}
                style={{
                  backgroundColor: previewColors.panelBackground,
                  borderColor: isSelected 
                    ? (isCustomTheme ? customActiveBg : (interfaceStyles.accent || '#007BFF')) 
                    : previewColors.panelBorder,
                  color: previewColors.textPrimary,
                  boxShadow: isSelected 
                    ? `0 0 0 2.5px ${isCustomTheme ? customActiveBg : (interfaceStyles.accent || '#007BFF')}, 0 4px 6px -1px rgba(0, 0, 0, 0.15)` 
                    : undefined,
                  '--preview-panel-border': previewColors.panelBorder || '#000000',
                  '--preview-accent': previewColors.accent || '#3b82f6',
                } as React.CSSProperties}
              >
                <div className="flex justify-between items-center pb-1 border-b" style={{ borderColor: previewColors.divider || previewColors.panelBorder || 'inherit' }}>
                  <span className="font-bold flex items-center gap-1" style={{ color: previewColors.textPrimary }}>
                    {styleLabel}
                  </span>
                  {isSelected && (
                    <span 
                      className="w-4 h-4 flex items-center justify-center shadow-sm"
                      style={{ 
                        borderRadius: '9999px',
                        backgroundColor: isCustomTheme ? customActiveBg : (interfaceStyles.buttonPrimary || '#007BFF'),
                        color: isCustomTheme ? customActiveText : (interfaceStyles.buttonPrimaryText || '#ffffff')
                      }}
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" style={{ color: isCustomTheme ? customActiveText : (interfaceStyles.buttonPrimaryText || '#ffffff') }} />
                    </span>
                  )}
                </div>
                <p className="text-[10px] opacity-80 leading-tight truncate" style={{ color: previewColors.textSecondary || previewColors.textPrimary }}>
                  {styleOpt === 'retro8bit' ? getTranslation('pixelUI') : styleOpt === 'wood' ? getTranslation('grainUI') : styleOpt === 'neon' ? getTranslation('glowUI') : getTranslation('minimalUI')}
                </p>
                <div className="flex gap-1 mt-1">
                  <div 
                    className="px-1.5 py-0.5 text-[8px] font-bold rounded text-center border shadow-xs pointer-events-none"
                    style={{
                      backgroundColor: previewColors.buttonPrimary,
                      color: previewColors.buttonPrimaryText || '#ffffff',
                      borderColor: previewColors.buttonPrimary
                    }}
                  >
                    Action
                  </div>
                  <div 
                    className="px-1.5 py-0.5 text-[8px] font-semibold rounded text-center border pointer-events-none"
                    style={{
                      backgroundColor: previewColors.buttonSecondary,
                      color: previewColors.buttonSecondaryText || previewColors.textSecondary || '#ffffff',
                      borderColor: previewColors.borderColor || 'transparent'
                    }}
                  >
                    Info
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Link Style with Theme Toggle */}
      <div className="flex items-center justify-between pt-2 border-t border-dashed" style={{ borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}>
        <div className="flex-1 pr-4">
          <label className="text-xs font-semibold cursor-pointer" htmlFor="link-style-toggle" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
            {getTranslation('linkStyleWithTheme')}
          </label>
          <p className="text-[11px] opacity-75" style={{ color: interfaceStyles.textSecondary || interfaceStyles.color }}>
            {getTranslation('menuStyleBlendDescription')}
          </p>
        </div>
        <input
          id="link-style-toggle"
          type="checkbox"
          checked={preferences.linkStyleWithTheme !== false}
          onChange={(e) => handleLinkStyleToggle(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/* Glass Effect Toggle */}
      <div className="flex items-center justify-between pt-3 border-t border-dashed" style={{ borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}>
        <div className="flex-1 pr-4">
          <label className="text-xs font-semibold cursor-pointer" htmlFor="glass-effect-toggle" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
            {getTranslation('glassEnabled') || 'Glass Effect'}
          </label>
          <p className="text-[11px] opacity-75" style={{ color: interfaceStyles.textSecondary || interfaceStyles.color }}>
            {getTranslation('glassDescription') || 'Enable a transparent frosted glass backdrop.'}
          </p>
        </div>
        <input
          id="glass-effect-toggle"
          type="checkbox"
          checked={preferences.glassEnabled ?? false}
          onChange={(e) => {
            const currentStyle = preferences.menuStyle || 'classic';
            const needsStyleReset = e.target.checked && (currentStyle === 'retro8bit' || currentStyle === 'wood');
            const updated: ReadingPreferences = { 
              ...preferences, 
              glassEnabled: e.target.checked,
              glassOpacity: e.target.checked ? 55 : 45,
              glassBlur: e.target.checked ? 20 : 14,
              menuStyle: needsStyleReset ? 'classic' : currentStyle,
              // preserve subtheme when toggling glass
              menuSubTheme: preferences.menuSubTheme || 'default',
              // Reset glassReaderAreaOnly to false if disabling glass
              glassReaderAreaOnly: e.target.checked ? (preferences.glassReaderAreaOnly ?? false) : false
            };
            applyPreferencesTheme(updated);
            onPreferencesChange(updated);
          }}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      </div>

      {/* Glass Backdrop Variation Sub-themes ONLY IF Glass Effect is enabled */}
      {preferences.glassEnabled && (
        <div className="mt-3 pl-4 border-l-2 border-blue-500/50 space-y-2.5 animate-fade-in text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
              {getTranslation('glassBackdropVariation')}
            </span>
            <span className="text-[10px] opacity-75 px-1.5 py-0.5 rounded border font-mono capitalize" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color, borderColor: interfaceStyles.borderColor, backgroundColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}>
              {preferences.menuSubTheme || 'default'}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'default', label: `${getTranslation('default') || 'Default'} ⚙️`, glass: true },
              { id: 'translucent', label: `${getTranslation('ultraTranslucent') || 'Ultra Translucent'} 💎`, glass: true },
              { id: 'snowy', label: `${getTranslation('heavyFrosted') || 'Heavy Frosted'} ❄️`, glass: true },
              { id: 'tinted', label: `${getTranslation('accentTinted') || 'Accent Tinted'} 🎨`, glass: true },
            ].map((subOpt) => {
              const isSelected = (preferences.menuSubTheme || 'default') === subOpt.id;
              const activeColor = subOpt.id === 'tinted' ? (preferences.glassTintColor || interfaceStyles.accent || '#3b82f6') : (interfaceStyles.accent || '#2563eb');
              const isDarkColor = isHexColorDark(activeColor);

              return (
                <button
                  key={subOpt.id}
                  type="button"
                  onClick={() => {
                    const updated: ReadingPreferences = {
                      ...preferences,
                      glassEnabled: true,
                      menuSubTheme: subOpt.id,
                      glassOpacity: subOpt.id === 'snowy' ? 55 : (subOpt.id === 'translucent' ? 15 : 45),
                      glassBlur: subOpt.id === 'snowy' ? 20 : (subOpt.id === 'translucent' ? 8 : 14),
                      // Preserve the previous glassReaderArea setting
                      glassReaderArea: preferences.glassReaderArea ?? true,
                      // Always reset glassReaderAreaOnly to false if changing from 'tinted'
                      glassReaderAreaOnly: subOpt.id === 'tinted' ? (preferences.glassReaderAreaOnly ?? false) : false
                    };
                    applyPreferencesTheme(updated);
                    onPreferencesChange(updated);
                  }}
                  className={`px-2.5 py-1 text-[10px] rounded border font-semibold cursor-pointer transition-all ${
                    isSelected
                      ? 'font-bold shadow-sm'
                      : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  style={{
                    backgroundColor: isSelected ? activeColor : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                    color: isSelected ? (isDarkColor ? '#ffffff' : '#0f172a') : (interfaceStyles.textPrimary || interfaceStyles.color),
                    borderColor: isSelected ? activeColor : interfaceStyles.borderColor,
                  }}
                >
                  {subOpt.label}
                </button>
              );
            })}
          </div>

          {/* Accent Tinted Colors and Reader Area Toggle */}
          {preferences.menuSubTheme === 'tinted' && (
            <div className="mt-3 pt-2 border-t border-dashed space-y-3 animate-in fade-in slide-in-from-top-1" style={{ borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}>
              {/* Color Pre-sets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-75" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
                  {getTranslation('glassColorsTint')}
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(() => {
                    const currentThemeColor = (() => {
                      const themeId = preferences.theme || 'light';
                      switch (themeId) {
                        case 'light': return '#3b82f6';
                        case 'dark': return '#312e81';
                        case 'sepia': return '#7c2d12';
                        case 'highcontrast': return '#1e293b';
                        case 'ocean': return '#0284c7';
                        case 'aurora': return '#a855f7';
                        case 'snow': return '#0c4a6e';
                        case 'rain': return '#1d4ed8';
                        case 'custom': return preferences.colors?.textColor || '#4f46e5';
                        default: return '#3b82f6';
                      }
                    })();

                    return [
                      { hex: currentThemeColor, name: getTranslation('currentThemeColor') },
                      { hex: '#2563eb', name: getTranslation('royalBlue') },
                      { hex: '#0f5132', name: getTranslation('forestGreen') },
                      { hex: '#842029', name: getTranslation('rubyWine') },
                      { hex: '#b45309', name: getTranslation('warmAmber') },
                      { hex: '#4c1d95', name: getTranslation('imperialPurple') },
                      { hex: '#0f172a', name: getTranslation('infiniteBlack') },
                    ];
                  })().map((colorPreset) => {
                    const isPresetSelected = (preferences.glassTintColor || '#3b82f6') === colorPreset.hex;
                    return (
                      <button
                        key={colorPreset.hex}
                        type="button"
                        onClick={() => {
                          const updated: ReadingPreferences = {
                            ...preferences,
                            glassTintColor: colorPreset.hex
                          };
                          applyPreferencesTheme(updated);
                          onPreferencesChange(updated);
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition-all relative cursor-pointer hover:scale-110 flex items-center justify-center color-preset-btn`}
                        style={{
                          '--preset-color': colorPreset.hex,
                          '--preset-border-color': isPresetSelected ? '#ffffff' : 'transparent',
                          '--preset-box-shadow': isPresetSelected ? `0 0 0 2px ${colorPreset.hex}, 0 2px 4px rgba(0,0,0,0.25)` : '0 1px 2px rgba(0,0,0,0.15)',
                          backgroundColor: colorPreset.hex,
                          borderColor: isPresetSelected ? '#ffffff' : 'transparent',
                          boxShadow: isPresetSelected ? `0 0 0 2.5px ${colorPreset.hex}, 0 2px 4px rgba(0,0,0,0.25)` : '0 1px 2px rgba(0,0,0,0.15)'
                        } as React.CSSProperties}
                        title={colorPreset.name}
                      >
                        {isPresetSelected && (
                          <Check className="w-3 text-white stroke-[3]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Apply in Reader Area Toggle */}
              <div className="pt-2 border-t border-dashed" style={{ borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
                      {getTranslation('applyInReaderArea')}
                    </span>
                    <p className="text-[10px] opacity-75 mt-0.5" style={{ color: interfaceStyles.textSecondary || interfaceStyles.color }}>
                      {getTranslation('applyInReaderAreaDescription')}
                    </p>
                  </div>
                  <div className="relative flex flex-col justify-center">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.glassReaderArea ?? true}
                        onChange={(e) => {
                          const updated: ReadingPreferences = {
                            ...preferences,
                            glassReaderArea: e.target.checked
                          };
                          applyPreferencesTheme(updated);
                          onPreferencesChange(updated);
                        }}
                        className="sr-only animate-none"
                      />
                      <div 
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${(preferences.glassReaderArea ?? true) ? '' : 'bg-gray-300 dark:bg-gray-700'}`}
                        style={{
                          backgroundColor: (preferences.glassReaderArea ?? true) ? (preferences.glassTintColor || interfaceStyles.accent || '#3b82f6') : undefined
                        }}
                      >
                        <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${(preferences.glassReaderArea ?? true) ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Apply in Reader Area Only Toggle */}
              <div className="pt-2 border-t border-dashed" style={{ borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)' }}>
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-semibold text-xs" style={{ color: interfaceStyles.textPrimary || interfaceStyles.color }}>
                      {getTranslation('applyInReaderAreaOnly')}
                    </span>
                    <p className="text-[10px] opacity-75 mt-0.5" style={{ color: interfaceStyles.textSecondary || interfaceStyles.color }}>
                      {getTranslation('applyInReaderAreaOnlyDescription')}
                    </p>
                  </div>
                  <div className="relative flex flex-col justify-center">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.glassReaderAreaOnly ?? false}
                        onChange={(e) => {
                          const updated: ReadingPreferences = {
                            ...preferences,
                            glassReaderAreaOnly: e.target.checked
                          };
                          applyPreferencesTheme(updated);
                          onPreferencesChange(updated);
                        }}
                        className="sr-only animate-none"
                      />
                      <div 
                        className={`relative w-10 h-5 rounded-full transition-all duration-300 ${(preferences.glassReaderAreaOnly ?? false) ? '' : 'bg-gray-300 dark:bg-gray-700'}`}
                        style={{
                          backgroundColor: (preferences.glassReaderAreaOnly ?? false) ? (preferences.glassTintColor || interfaceStyles.accent || '#3b82f6') : undefined
                        }}
                      >
                        <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${(preferences.glassReaderAreaOnly ?? false) ? 'translate-x-5' : 'translate-x-0'}`} />
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
