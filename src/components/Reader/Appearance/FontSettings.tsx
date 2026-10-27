import React from 'react';
import { ChevronUp, ChevronDown, RotateCcw, Upload } from 'lucide-react';
import { useTranslations } from '../../../hooks/useTranslations';
import type { ReadingPreferences } from '../../../types';

interface FontSettingsProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
  handleSliderChange: (key: keyof ReadingPreferences, value: number) => void;
  isFontFamilyExpanded: boolean;
  setIsFontFamilyExpanded: (expanded: boolean) => void;
}

const DefaultIndicator: React.FC<{ isDefault: boolean }> = ({ isDefault }) => {
  const { getTranslation } = useTranslations();
  return isDefault ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-2">
      {getTranslation('default')}
    </span>
  ) : null;
};

export const FontSettings: React.FC<FontSettingsProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
  isDefault,
  handleSliderChange,
  isFontFamilyExpanded,
  setIsFontFamilyExpanded,
}) => {
  const { getTranslation } = useTranslations();
  const previewText = getTranslation('fontPreviewText');

  const getFontStyle = (fontFamily: string) => {
    if (fontFamily === 'Custom' && preferences.customFontName) {
      return `"${preferences.customFontName}", sans-serif`;
    }
    const fontMap = {
      'Arial': 'Arial, Helvetica, sans-serif',
      'Inter': 'Inter, sans-serif',
      'Georgia': 'Georgia, serif',
    };
    return fontMap[fontFamily as keyof typeof fontMap] || fontMap.Arial;
  };

  return (
    <div className="space-y-4">
      {/* Font Size Slider */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('fontSize')}
            <DefaultIndicator isDefault={isDefault('fontSize', preferences.fontSize)} />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSliderChange('fontSize', 38)}
              className="p-1.5 rounded-lg border hover:bg-gray-100 hover:bg-opacity-20 transition-all opacity-60 hover:opacity-100 cursor-pointer"
              style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
              title={getTranslation('resetToDefault')}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-mono px-2 py-1 rounded" style={{ 
              color: interfaceStyles.color, 
              backgroundColor: interfaceStyles.borderColor + '40'
            }}>
              {preferences.fontSize}px
            </span>
          </div>
        </div>
        <input
          type="range"
          min="12"
          max="64"
          step="2"
          value={preferences.fontSize}
          onChange={(e) => handleSliderChange('fontSize', parseInt(e.target.value))}
          className="slider w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${preferences.interfaceColors?.accent || '#007BFF'} 0%, ${preferences.interfaceColors?.accent || '#007BFF'} ${((preferences.fontSize - 12) / (64 - 12)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} ${((preferences.fontSize - 12) / (64 - 12)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} 100%)`
          }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
          <span>12px</span>
          <span>64px</span>
        </div>
      </div>

      {/* Retro 8-bit Font Option */}
      {preferences.menuStyle === 'retro8bit' && (
        <div className="p-4 rounded-lg border flex items-center justify-between" style={{ borderColor: interfaceStyles.borderColor }}>
          <div className="flex flex-col gap-0.5">
            <label className="text-sm font-semibold flex items-center" style={{ color: interfaceStyles.color }}>
              {getTranslation('applyRetroFontToReader')}
            </label>
            <span className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
              {getTranslation('applyRetroFontToReaderDesc')}
            </span>
          </div>
          <button
            onClick={() => onPreferencesChange({ ...preferences, applyRetroFont: !preferences.applyRetroFont })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${preferences.applyRetroFont ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'}`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${preferences.applyRetroFont ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
      )}

      {/* Font Family */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div 
          className="flex items-center justify-between cursor-pointer group"
          onClick={() => setIsFontFamilyExpanded(!isFontFamilyExpanded)}
        >
          <label className="text-base font-medium flex items-center cursor-pointer" style={{ color: interfaceStyles.color }}>
            {getTranslation('fontFamily')}
            <DefaultIndicator isDefault={isDefault('fontFamily', preferences.fontFamily)} />
          </label>
          <div className="flex items-center gap-2">
            {!isFontFamilyExpanded && (
              <span className="text-xs font-medium px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                {preferences.fontFamily === 'Custom' ? getTranslation('custom') : preferences.fontFamily}
              </span>
            )}
            {isFontFamilyExpanded ? (
              <ChevronUp className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
            ) : (
              <ChevronDown className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
            )}
          </div>
        </div>
        
        {isFontFamilyExpanded && (
          <div className="space-y-3 mt-4 animate-fade-in">
            {['Arial', 'Inter', 'Georgia', 'Custom'].map((font) => (
              <div key={font} className="space-y-2">
                <div
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
                    preferences.fontFamily === font ? 'transform scale-105' : 'hover:transform hover:scale-102'
                  }`}
                  style={{
                    borderColor: preferences.fontFamily === font ? '#007BFF' : interfaceStyles.borderColor,
                    backgroundColor: preferences.fontFamily === font ? '#007BFF10' : 'transparent'
                  }}
                  onClick={() => onPreferencesChange({ ...preferences, fontFamily: font as any })}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm" style={{ color: interfaceStyles.color }}>
                      {font === 'Custom' ? getTranslation('custom') : font}
                      {font === 'Arial' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-1">{getTranslation('default')}</span>}
                    </span>
                    {preferences.fontFamily === font && (
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: '#007BFF' }}
                      />
                    )}
                  </div>
                  <div 
                    className="text-sm leading-relaxed"
                    style={{ 
                      fontFamily: getFontStyle(font),
                      color: interfaceStyles.color,
                      opacity: 0.8
                    }}
                  >
                    {previewText}
                  </div>
                </div>

                {/* Custom Font Inputs */}
                {font === 'Custom' && preferences.fontFamily === 'Custom' && (
                  <div className="p-3 rounded-lg bg-black bg-opacity-5 space-y-3 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-xs font-medium opacity-70" style={{ color: interfaceStyles.color }}>
                        {getTranslation('customFontUrl')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={preferences.customFontUrl || ''}
                          onChange={(e) => onPreferencesChange({ ...preferences, customFontUrl: e.target.value, customFontName: 'Custom' })}
                          placeholder="https://example.com/font.ttf"
                          className="flex-1 p-2 text-sm rounded border bg-transparent"
                          style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
                        />
                        <button
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.ttf,.otf,.woff,.woff2';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const dataUrl = event.target?.result as string;
                                  onPreferencesChange({
                                    ...preferences,
                                    customFontUrl: dataUrl,
                                    customFontName: 'Custom'
                                  });
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="p-2 rounded border hover:bg-black hover:bg-opacity-5 transition-colors cursor-pointer"
                          style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
                          title={getTranslation('customFontUpload')}
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
