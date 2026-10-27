import React from 'react';
import { RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from '../../../hooks/useTranslations';
import type { ReadingPreferences } from '../../../types';

interface SpacingSettingsProps {
  preferences: ReadingPreferences;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
  handleSliderChange: (key: keyof ReadingPreferences, value: number) => void;
}

const DefaultIndicator: React.FC<{ isDefault: boolean }> = ({ isDefault }) => {
  const { getTranslation } = useTranslations();
  return isDefault ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-2">
      {getTranslation('default')}
    </span>
  ) : null;
};

export const SpacingSettings: React.FC<SpacingSettingsProps> = ({
  preferences,
  interfaceStyles,
  isDefault,
  handleSliderChange,
}) => {
  const { getTranslation } = useTranslations();

  const rawMarginSize = typeof preferences.marginSize === 'number' && !isNaN(preferences.marginSize)
    ? preferences.marginSize
    : (typeof preferences.marginSize === 'string' ? (parseFloat(preferences.marginSize) || 0.5) : 0.5);
  const safeMarginSize = Math.max(0.5, Math.min(10, rawMarginSize));
  const displayWidth = 10 - safeMarginSize;

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Line Height Slider */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('lineHeight')}
            <DefaultIndicator isDefault={isDefault('lineHeight', preferences.lineHeight)} />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSliderChange('lineHeight', 1.6)}
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
              {preferences.lineHeight}
            </span>
          </div>
        </div>
        <input
          type="range"
          min="1.2"
          max="2.5"
          step="0.1"
          value={preferences.lineHeight}
          onChange={(e) => handleSliderChange('lineHeight', parseFloat(e.target.value))}
          className="slider w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${preferences.interfaceColors?.accent || '#007BFF'} 0%, ${preferences.interfaceColors?.accent || '#007BFF'} ${((preferences.lineHeight - 1.2) / (2.5 - 1.2)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} ${((preferences.lineHeight - 1.2) / (2.5 - 1.2)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} 100%)`
          }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
          <span>1.2</span>
          <span>2.5</span>
        </div>
      </div>

      {/* Paragraph Spacing Slider */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('paragraphSpacing')}
            <DefaultIndicator isDefault={isDefault('paragraphSpacing', preferences.paragraphSpacing)} />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSliderChange('paragraphSpacing', 1.5)}
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
              {preferences.paragraphSpacing}
            </span>
          </div>
        </div>
        <input
          type="range"
          min="1"
          max="4"
          step="0.1"
          value={preferences.paragraphSpacing}
          onChange={(e) => handleSliderChange('paragraphSpacing', parseFloat(e.target.value))}
          className="slider w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${preferences.interfaceColors?.accent || '#007BFF'} 0%, ${preferences.interfaceColors?.accent || '#007BFF'} ${((preferences.paragraphSpacing - 1) / (4 - 1)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} ${((preferences.paragraphSpacing - 1) / (4 - 1)) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} 100%)`
          }}
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
          <span>1.0</span>
          <span>4.0</span>
        </div>
      </div>

      {/* Max Width */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-base font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('maxWidth')}
            <DefaultIndicator isDefault={isDefault('marginSize', preferences.marginSize)} />
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSliderChange('marginSize', 0.5)}
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
              {displayWidth.toFixed(1)}em
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleSliderChange('marginSize', Math.min(10, safeMarginSize + 0.5))}
            className="p-2 rounded-lg border hover:bg-gray-100 hover:bg-opacity-20 transition-all cursor-pointer"
            style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <input
            type="range"
            min="0"
            max="9.5"
            step="0.1"
            value={displayWidth}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              handleSliderChange('marginSize', 10 - (isNaN(val) ? 9.5 : val));
            }}
            className="slider flex-1 h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${preferences.interfaceColors?.accent || '#007BFF'} 0%, ${preferences.interfaceColors?.accent || '#007BFF'} ${(displayWidth / 9.5) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} ${(displayWidth / 9.5) * 100}%, ${preferences.interfaceColors?.panelSecondaryBackground || '#e5e7eb'} 100%)`
            }}
          />
          
          <button
            onClick={() => handleSliderChange('marginSize', Math.max(0.5, safeMarginSize - 0.5))}
            className="p-2 rounded-lg border hover:bg-gray-100 hover:bg-opacity-20 transition-all cursor-pointer"
            style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex justify-between text-xs mt-1" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
          <span>0em</span>
          <span>9.5em</span>
        </div>
        <p className="text-xs mt-2 opacity-70" style={{ color: interfaceStyles.color }}>
          {getTranslation('customWidthDescription')}
        </p>
      </div>
    </div>
  );
};
