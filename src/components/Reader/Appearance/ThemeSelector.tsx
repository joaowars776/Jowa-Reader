import React from 'react';
import { Palette, Monitor, BookOpen, Layers, Check, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { COLOR_THEMES, getColorTheme, getInterfaceTheme, applyPreferencesTheme } from '../../../utils/themes';
import { useTranslations } from '../../../hooks/useTranslations';
import { ThemePreview } from './ThemePreview';
import type { ReadingPreferences } from '../../../types';

interface ThemeSelectorProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
  handleColorThemeChange: (themeId: string) => void;
  handleInterfaceThemeChange: (themeId: string) => void;
  handleCustomColorChange: (type: 'reader' | 'interface', colorKey: string, value: string) => void;
  isColorThemeExpanded: boolean;
  setIsColorThemeExpanded: (expanded: boolean) => void;
  themeApplyMode: 'both' | 'interface' | 'reader';
  setThemeApplyMode: (mode: 'both' | 'interface' | 'reader') => void;
  activeThemeTab: 'color' | 'menu';
  setActiveThemeTab: (tab: 'color' | 'menu') => void;
}

const DefaultIndicator: React.FC<{ isDefault: boolean }> = ({ isDefault }) => {
  const { getTranslation } = useTranslations();
  return isDefault ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-2">
      {getTranslation('default')}
    </span>
  ) : null;
};

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
  isDefault,
  handleColorThemeChange,
  handleInterfaceThemeChange,
  handleCustomColorChange,
  isColorThemeExpanded,
  setIsColorThemeExpanded,
  themeApplyMode,
  setThemeApplyMode,
  activeThemeTab,
  setActiveThemeTab,
}) => {
  const { getTranslation } = useTranslations();
  const onColorThemeClick = (themeId: string) => {
    handleColorThemeChange(themeId);
    if (themeId === 'snow' || themeId === 'rain' || themeId === 'aurora') {
      const timer = setTimeout(() => {
        const scrollContainer = document.getElementById('reader-settings-scroll-container');
        if (scrollContainer) {
          scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
        }
      }, 150);
    }
  };

  return (
    <div>
      <div 
        className="flex items-center justify-between mb-4 cursor-pointer group"
        onClick={() => setIsColorThemeExpanded(!isColorThemeExpanded)}
      >
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5" style={{ color: '#007BFF' }} />
          <h3 className="text-lg font-semibold" style={{ color: interfaceStyles.color }}>
            {getTranslation('colorTheme')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!isColorThemeExpanded && (
            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-500">
              {getTranslation(preferences.selectedColorTheme || 'light')}
            </span>
          )}
          {isColorThemeExpanded ? (
            <ChevronUp className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
          ) : (
            <ChevronDown className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
          )}
        </div>
      </div>

      {isColorThemeExpanded && (
        <div className="animate-fade-in space-y-4">
          {/* Theme Apply Mode Selector */}
          <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
            <label className="block text-base font-medium mb-3 flex items-center" style={{ color: interfaceStyles.color }}>
              {getTranslation('applyThemeTo')}
              <DefaultIndicator isDefault={isDefault('themeApplyMode', themeApplyMode)} />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: getTranslation('interfaceAndReader'), icon: Layers },
                { id: 'interface', label: getTranslation('interfaceOnly'), icon: Monitor },
                { id: 'reader', label: getTranslation('readerOnly'), icon: BookOpen }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => {
                    const newMode = id as 'both' | 'interface' | 'reader';
                    setThemeApplyMode(newMode);
                    onPreferencesChange({
                      ...preferences,
                      themeApplyMode: newMode
                    });
                  }}
                  className={`p-3 rounded-lg border-2 transition-all duration-300 text-xs font-medium flex flex-col items-center gap-1 cursor-pointer ${
                    themeApplyMode === id ? 'transform scale-105' : 'hover:transform hover:scale-102'
                  }`}
                  style={{
                    borderColor: themeApplyMode === id ? '#007BFF' : interfaceStyles.borderColor,
                    backgroundColor: themeApplyMode === id ? '#007BFF10' : 'transparent',
                    color: interfaceStyles.color
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {id === 'both' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{getTranslation('default')}</span>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* SUB-OPTIONS TABS FOR COLOR THEMES vs MENU THEMES */}
          <div className="flex gap-2 border-b pb-2 mb-4 mt-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <button
              type="button"
              onClick={() => setActiveThemeTab('color')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 text-center flex items-center justify-center gap-1.5 border cursor-pointer ${
                activeThemeTab === 'color' ? 'shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeThemeTab === 'color' ? '#007BFF' : 'transparent',
                color: activeThemeTab === 'color' ? '#ffffff' : interfaceStyles.color,
                borderColor: activeThemeTab === 'color' ? '#0056b3' : interfaceStyles.borderColor
              }}
            >
              🎨 {getTranslation('colorThemes') || 'Temas de Cor'}
            </button>
            <button
              type="button"
              onClick={() => setActiveThemeTab('menu')}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 text-center flex items-center justify-center gap-1.5 border cursor-pointer ${
                activeThemeTab === 'menu' ? 'shadow-md scale-[1.02]' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: activeThemeTab === 'menu' ? '#007BFF' : 'transparent',
                color: activeThemeTab === 'menu' ? '#ffffff' : interfaceStyles.color,
                borderColor: activeThemeTab === 'menu' ? '#0056b3' : interfaceStyles.borderColor
              }}
            >
              ⚙️ {getTranslation('menuThemes') || 'Temas de Menu'}
            </button>
          </div>

          {activeThemeTab === 'color' ? (
            /* Color Themes Grid */
            <div className="grid grid-cols-2 gap-3">
              {COLOR_THEMES.slice(0, 8).map((theme) => (
                <ThemePreview
                  key={theme.id}
                  theme={theme}
                  isSelected={
                    themeApplyMode === 'interface'
                      ? (preferences.selectedInterfaceTheme || 'light') === theme.id
                      : (preferences.selectedColorTheme || 'light') === theme.id
                  }
                  type="color"
                  preferences={preferences}
                  interfaceStyles={interfaceStyles}
                  onClick={() => onColorThemeClick(theme.id)}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Menu Themes Large Cards Grid */}
              <div className="grid grid-cols-2 gap-4">
              {[
                {
                  id: 'classic',
                  label: getTranslation('menu_theme_classic_label') || 'Classic',
                  description: getTranslation('menu_theme_classic_desc') || 'Visual moderno e limpo',
                  previewBg: 'bg-gray-50 dark:bg-gray-900',
                  customStyle: {
                    border: '1px solid currentColor',
                    borderRadius: '8px'
                  },
                  fontClass: 'font-sans'
                },
                {
                  id: 'wood',
                  label: getTranslation('menu_theme_wood_label') || 'Elegant Wood',
                  description: getTranslation('menu_theme_wood_desc') || 'Textura aconchegante de madeira',
                  previewBg: 'bg-[#1e100a] text-[#f2e6dd]',
                  customStyle: {
                    border: '2px solid #8c5638',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #1a0f0a 0%, #3d1c10 100%)',
                    color: '#f0d7c5'
                  },
                  fontClass: 'font-serif'
                },
                {
                  id: 'neon',
                  label: getTranslation('menu_theme_neon_label') || 'Neon Cyberpunk',
                  description: getTranslation('menu_theme_neon_desc') || 'Estilo neon futurista brilhante',
                  previewBg: 'bg-[#030508] text-[#00f3ff]',
                  customStyle: {
                    border: '2px solid #00f3ff',
                    borderRadius: '4px',
                    boxShadow: '0 0 10px #00f3ff, inset 0 0 5px #ff007f',
                    color: '#00f3ff',
                    textShadow: '0 0 5px #00f3ff'
                  },
                  fontClass: 'font-sans uppercase tracking-widest'
                },
                {
                  id: 'retro8bit',
                  label: getTranslation('menu_theme_retro_label') || 'Retro 8-bit',
                  description: getTranslation('menu_theme_retro_desc') || 'Estilo pixel art de fliperama',
                  previewBg: 'bg-[#181824] text-[#ffffff]',
                  customStyle: {
                    border: '4px solid currentColor',
                    borderRadius: '0px',
                    boxShadow: '3px 3px 0px currentColor',
                    fontFamily: "'Press Start 2P', monospace",
                    textTransform: 'uppercase'
                  },
                  fontClass: 'font-mono'
                }
              ].map((styleOpt) => {
                const isSelected = (preferences.menuStyle || 'classic') === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    type="button"
                    onClick={() => {
                      const styleId = styleOpt.id as any;
                      const disableGlass = styleId === 'retro8bit' || styleId === 'wood';
                      const updated = {
                        ...preferences,
                        menuStyle: styleId,
                        glassEnabled: disableGlass ? false : (preferences.glassEnabled ?? false)
                      };
                      applyPreferencesTheme(updated);
                      onPreferencesChange(updated);
                    }}
                    className={`p-4 rounded-xl text-left transition-all duration-300 flex flex-col justify-between h-36 border-2 relative overflow-hidden group cursor-pointer ${
                      isSelected ? 'transform scale-[1.03] shadow-lg' : 'hover:transform hover:scale-[1.01] hover:shadow-md'
                    }`}
                    style={{
                      backgroundColor: isSelected ? interfaceStyles.backgroundColor : interfaceStyles.backgroundColor + '60',
                      borderColor: isSelected ? '#007BFF' : interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                  >
                    {isSelected && (
                      <span 
                        className="absolute top-2 right-2 bg-blue-500 text-white p-0.5 z-10 animate-fade-in flex items-center justify-center"
                        style={{ borderRadius: '9999px', width: '20px', height: '20px' }}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                    
                    <div className="space-y-1">
                      <h5 className={`font-bold text-xs ${styleOpt.fontClass}`} style={styleOpt.id === 'retro8bit' ? { fontFamily: "'Press Start 2P', monospace", fontSize: '7px' } : undefined}>
                        {styleOpt.label}
                      </h5>
                      <p className="text-[10px] opacity-75 leading-tight">
                        {styleOpt.description}
                      </p>
                    </div>
                    
                    {/* Visual Preview Box */}
                    <div 
                      className={`h-12 w-full mt-2 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner ${styleOpt.previewBg}`}
                      style={styleOpt.customStyle as any}
                    >
                      <span className="text-[9px]" style={styleOpt.id === 'retro8bit' ? { fontSize: '7px' } : undefined}>
                        {styleOpt.id === 'retro8bit' ? 'PLAY' : 'Preview'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Inputs End */}
          </>
        )}

          {/* Snow / Rain / Aurora Density Slider */}
          {(preferences.selectedColorTheme === 'snow' || preferences.selectedInterfaceTheme === 'snow' || preferences.theme === 'snow' ||
            preferences.selectedColorTheme === 'rain' || preferences.selectedInterfaceTheme === 'rain' || preferences.theme === 'rain' ||
            preferences.selectedColorTheme === 'aurora' || preferences.selectedInterfaceTheme === 'aurora' || preferences.theme === 'aurora') && (() => {
              const isRain = preferences.selectedColorTheme === 'rain' || preferences.theme === 'rain' || preferences.selectedInterfaceTheme === 'rain';
              const isAurora = preferences.selectedColorTheme === 'aurora' || preferences.theme === 'aurora' || preferences.selectedInterfaceTheme === 'aurora';
              
              const accentColor = isAurora ? '#8b5cf6' : '#0284c7';
              const bgBadgeClass = isAurora ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800';
              const accentTextClass = isAurora ? 'text-purple-700' : 'text-sky-700';
              const inputAccentClass = isAurora ? 'accent-purple-600' : 'accent-sky-600';
              const inputBgClass = isAurora ? 'bg-purple-200' : 'bg-sky-200';
              
              return (
                <div 
                  className="mt-4 p-4 rounded-xl border space-y-3 animate-in fade-in slide-in-from-top-2"
                  style={{ 
                    backgroundColor: preferences.interfaceColors?.panelSecondaryBackground || interfaceStyles.backgroundColor,
                    borderColor: interfaceStyles.borderColor
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm" style={{ color: interfaceStyles.color }}>
                        {isRain
                          ? getTranslation('rainDensity') || 'Rain Intensity'
                          : isAurora 
                            ? getTranslation('petalsDensity') || 'Petals Density'
                            : getTranslation('snowDensity')}
                      </h4>
                      <p className="text-xs opacity-70" style={{ color: interfaceStyles.color }}>
                        {isRain
                          ? getTranslation('rainDensityDescription') || 'Adjust the amount of falling rain on screen (0% to 100%)'
                          : isAurora
                            ? getTranslation('petalsDensityDescription') || 'Adjust the amount of falling flower petals on screen (0% to 100%)'
                            : getTranslation('snowDensityDescription')}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${bgBadgeClass}`}>
                      {Math.round((preferences.snowDensity ?? 100) / 2)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs opacity-60">
                      {isRain ? '🌧️ ' : isAurora ? '🌸 ' : '❄️ '} {getTranslation('min') || 'Min'}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round((preferences.snowDensity ?? 100) / 2)}
                      onChange={(e) => {
                        const uiVal = parseInt(e.target.value, 10);
                        onPreferencesChange({
                          ...preferences,
                          snowDensity: uiVal * 2
                        });
                      }}
                      className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${inputBgClass} ${inputAccentClass}`}
                    />
                    <span className="text-xs font-semibold" style={{ color: accentColor }}>
                      {isRain ? '🌧️ ' : isAurora ? '🌸 ' : '❄️ '} {getTranslation('max') || 'Max'}
                    </span>
                  </div>

                  {/* Snow / Rain / Aurora Speed Slider */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm" style={{ color: interfaceStyles.color }}>
                          {isRain
                            ? getTranslation('rainSpeed') || 'Rain Speed'
                            : isAurora
                              ? getTranslation('petalsSpeed') || 'Petals Speed'
                              : getTranslation('snowSpeed')}
                        </h4>
                        <p className="text-xs opacity-70" style={{ color: interfaceStyles.color }}>
                          {isRain
                            ? getTranslation('rainSpeedDescription') || 'Adjust the falling speed of the rain'
                            : isAurora
                              ? getTranslation('petalsSpeedDescription') || 'Adjust the falling speed of the cherry blossom petals'
                              : getTranslation('snowSpeedDescription')}
                        </p>
                      </div>
                      <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg ${bgBadgeClass}`}>
                        {preferences.snowSpeed ?? 50}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="text-xs opacity-60">🐌 {getTranslation('slow') || 'Slow'}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={preferences.snowSpeed ?? 50}
                        onChange={(e) => {
                          onPreferencesChange({
                            ...preferences,
                            snowSpeed: parseInt(e.target.value, 10)
                          });
                        }}
                        className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${inputBgClass} ${inputAccentClass}`}
                      />
                      <span className="text-xs font-semibold" style={{ color: accentColor }}>⚡ {getTranslation('fast') || 'Fast'}</span>
                    </div>
                  </div>

                  {/* Sub-Theme selection */}
                  {preferences.menuStyle !== 'retro8bit' && (
                    <div className="pt-3 border-t border-dashed" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                      <div className="space-y-1.5 w-full">
                        <label className="text-xs font-semibold uppercase tracking-wider opacity-85 block" style={{ color: interfaceStyles.color }}>
                          {getTranslation('snowSubTheme') || 'Sub-Theme'}
                        </label>
                        <div className="flex gap-1.5">
                          {(['day', 'night', 'midnight'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => {
                                  const updatedPrefs = { ...preferences, snowSubTheme: mode };
                                  const interfaceTheme = getInterfaceTheme(
                                    preferences.selectedInterfaceTheme || 'light',
                                    mode,
                                    preferences.menuStyle || 'classic',
                                    preferences.linkStyleWithTheme !== false
                                  );
                                  updatedPrefs.interfaceColors = interfaceTheme.colors;
                                  const colorTheme = getColorTheme(
                                    preferences.theme,
                                    mode
                                  );
                                  updatedPrefs.colors = colorTheme.colors;
                                  onPreferencesChange(updatedPrefs);
                                }}
                                className={`flex-1 py-1.5 px-2 text-xs rounded-lg font-medium transition-all cursor-pointer ${(preferences.snowSubTheme || 'day') === mode ? 'text-white shadow-sm' : 'border border-sky-200 dark:border-sky-800'}`}
                                style={{
                                  backgroundColor: (preferences.snowSubTheme || 'day') === mode ? accentColor : 'transparent',
                                  color: (preferences.snowSubTheme || 'day') === mode ? '#ffffff' : interfaceStyles.color,
                                  borderColor: (preferences.snowSubTheme || 'day') === mode ? accentColor : interfaceStyles.borderColor
                                }}
                              >
                                {(() => {
                                  const text = getTranslation(mode);
                                  return text.charAt(0).toUpperCase() + text.slice(1);
                                })()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}


                </div>
              );
            })()}

          {/* Custom Colors */}
          {preferences.selectedColorTheme === 'custom' && (
            <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
              <h4 className="font-medium mb-3" style={{ color: interfaceStyles.color }}>
                {getTranslation('customColors')}
              </h4>
              
              <div className="space-y-4">
                {/* Sync Toggle */}
                <div className="pb-4 border-b" style={{ borderColor: interfaceStyles.borderColor }}>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.syncInterfaceWithReading ?? true}
                        onChange={(e) => onPreferencesChange({
                          ...preferences,
                          syncInterfaceWithReading: e.target.checked
                        })}
                        className="sr-only"
                      />
                      <div className={`w-10 h-5 rounded-full transition-all duration-300 ${preferences.syncInterfaceWithReading ?? true ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`} />
                      <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.syncInterfaceWithReading ?? true ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold" style={{ color: interfaceStyles.color }}>
                        {getTranslation('syncInterfaceWithReading') || 'Sync Interface with Reading Area'}
                      </span>
                      <span className="text-[10px] opacity-60" style={{ color: interfaceStyles.color }}>
                        {getTranslation('syncInterfaceWithReadingDescription') || 'Automatically apply reading area colors to the interface.'}
                      </span>
                    </div>
                  </label>
                </div>

                {/* Reading Area Section */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: interfaceStyles.color }}>
                    {getTranslation('readingArea')}
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium min-w-0 flex-1" style={{ color: interfaceStyles.color }}>
                        {getTranslation('backgroundColor')}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCustomColorChange('reader', 'backgroundColor', '#ffffff')}
                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={getTranslation('resetToDefault') || 'Reset to default'}
                          style={{ color: interfaceStyles.color }}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <input
                          type="color"
                          value={preferences.colors.backgroundColor || '#ffffff'}
                          onChange={(e) => handleCustomColorChange('reader', 'backgroundColor', e.target.value)}
                          className="w-12 h-8 rounded border cursor-pointer"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium min-w-0 flex-1" style={{ color: interfaceStyles.color }}>
                        {getTranslation('textColor')}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCustomColorChange('reader', 'textColor', '#000000')}
                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={getTranslation('resetToDefault') || 'Reset to default'}
                          style={{ color: interfaceStyles.color }}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <input
                          type="color"
                          value={preferences.colors.textColor || '#000000'}
                          onChange={(e) => handleCustomColorChange('reader', 'textColor', e.target.value)}
                          className="w-12 h-8 rounded border cursor-pointer"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interface Section */}
                <div>
                  <h5 className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60" style={{ color: interfaceStyles.color }}>
                    {getTranslation('interface')}
                  </h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium min-w-0 flex-1" style={{ color: interfaceStyles.color }}>
                        {getTranslation('interfaceBackground')}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCustomColorChange('interface', 'background', '#ffffff')}
                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={getTranslation('resetToDefault') || 'Reset to default'}
                          style={{ color: interfaceStyles.color }}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <input
                          type="color"
                          value={preferences.interfaceColors.panelBackground || '#ffffff'}
                          onChange={(e) => handleCustomColorChange('interface', 'background', e.target.value)}
                          className="w-12 h-8 rounded border cursor-pointer"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium min-w-0 flex-1" style={{ color: interfaceStyles.color }}>
                        {getTranslation('interfaceText')}
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCustomColorChange('interface', 'text', '#1f2937')}
                          className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={getTranslation('resetToDefault') || 'Reset to default'}
                          style={{ color: interfaceStyles.color }}
                        >
                          <RotateCcw size={14} />
                        </button>
                        <input
                          type="color"
                          value={preferences.interfaceColors.panelText || '#000000'}
                          onChange={(e) => handleCustomColorChange('interface', 'text', e.target.value)}
                          className="w-12 h-8 rounded border cursor-pointer"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
