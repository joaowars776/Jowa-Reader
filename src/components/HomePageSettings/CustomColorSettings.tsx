import React from 'react';
import type { ReadingPreferences } from '../../types';

interface CustomColorSettingsProps {
  preferences: ReadingPreferences;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  getTranslation: (key: string) => string;
  onCustomInterfaceColorChange: (colorKey: 'background' | 'text', value: string) => void;
}

export const CustomColorSettings: React.FC<CustomColorSettingsProps> = ({
  preferences,
  interfaceStyles,
  getTranslation,
  onCustomInterfaceColorChange,
}) => {
  if (preferences.selectedInterfaceTheme !== 'custom') return null;

  return (
    <div 
      className="mt-6 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2"
      style={{ 
        backgroundColor: preferences.interfaceColors?.panelSecondaryBackground || interfaceStyles.backgroundColor,
        borderColor: interfaceStyles.borderColor
      }}
    >
      <h4 className="font-semibold text-sm" style={{ color: interfaceStyles.color }}>
        {getTranslation('customColors') || 'Custom Colors'}
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium" style={{ color: interfaceStyles.color }}>
            {getTranslation('backgroundColor') || 'Background Color'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={preferences.customInterfaceColors?.panelBackground || '#ffffff'}
              onChange={(e) => onCustomInterfaceColorChange('background', e.target.value)}
              className="w-12 h-8 rounded border cursor-pointer"
              style={{ borderColor: interfaceStyles.borderColor }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label className="text-xs font-medium" style={{ color: interfaceStyles.color }}>
            {getTranslation('textColor') || 'Text Color'}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={preferences.customInterfaceColors?.panelText || '#1f2937'}
              onChange={(e) => onCustomInterfaceColorChange('text', e.target.value)}
              className="w-12 h-8 rounded border cursor-pointer"
              style={{ borderColor: interfaceStyles.borderColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
