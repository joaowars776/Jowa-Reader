import React from 'react';
import { SnowEffect } from '../../SnowEffect';
import { RainEffect } from '../../RainEffect';
import { PetalEffect } from '../../PetalEffect';
import { useTranslations } from '../../../hooks/useTranslations';
import type { ReadingPreferences, ColorTheme, InterfaceTheme } from '../../../types';

interface ThemePreviewProps {
  theme: ColorTheme | InterfaceTheme;
  isSelected: boolean;
  type: 'color' | 'interface';
  preferences: ReadingPreferences;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  onClick: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  isSelected,
  type,
  preferences,
  interfaceStyles,
  onClick,
}) => {
  const { getTranslation } = useTranslations();
  // For custom theme, use the colors from preferences
  const displayColors = theme.id === 'custom' 
    ? (type === 'color' ? preferences.colors : preferences.interfaceColors)
    : theme.colors;

  const customTextColor = type === 'color' 
    ? (displayColors as any).textColor 
    : (displayColors as any).panelText;
  const isCustomThemeActive = theme.id === 'custom' && isSelected;
  const activeBorderColor = isCustomThemeActive ? (customTextColor || '#007BFF') : '#007BFF';
  const activeBgColor = isCustomThemeActive 
    ? (customTextColor ? `${customTextColor}25` : 'rgba(0, 123, 255, 0.15)') 
    : 'rgba(0, 123, 255, 0.15)';
  const activeShadow = isCustomThemeActive 
    ? `0 0 10px ${customTextColor || '#007BFF'}40` 
    : '0 0 10px rgba(0, 123, 255, 0.2)';

  return (
    <div
      className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-300 ${
        isSelected ? 'transform scale-105 shadow-lg' : 'hover:transform hover:scale-102'
      }`}
      style={{
        borderColor: isSelected ? activeBorderColor : interfaceStyles.borderColor,
        backgroundColor: isSelected ? activeBgColor : 'transparent',
        boxShadow: isSelected ? activeShadow : undefined
      }}
      onClick={onClick}
    >
      {/* Theme Preview Panel */}
      <div 
        className="w-full h-16 rounded-lg mb-3 border overflow-hidden relative theme-preview-box"
        style={{ 
          backgroundColor: type === 'color' 
            ? (displayColors as any).backgroundColor 
            : (displayColors as any).panelBackground,
          borderColor: type === 'color'
            ? (displayColors as any).textColor + '20' // Subtle border for color themes
            : (displayColors as any).borderColor
        }}
      >
        {theme.id === 'snow' && <SnowEffect position="absolute" density={35} />}
        {theme.id === 'rain' && <RainEffect position="absolute" density={35} />}
        {theme.id === 'aurora' && <PetalEffect position="absolute" density={35} />}
        <div className="p-2 h-full flex flex-col justify-between relative z-10">
          <div 
            className="text-xs font-bold"
            style={{ 
              color: type === 'color' 
                ? (displayColors as any).textColor 
                : (displayColors as any).textPrimary
            }}
          >
            {getTranslation('sampleTitle')}
          </div>
          <div 
            className="text-[10px]"
            style={{ 
              color: type === 'color' 
                ? (displayColors as any).textColor 
                : (displayColors as any).textSecondary,
              opacity: 0.85
            }}
          >
            {getTranslation('sampleTextContent')}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-sm flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
          {getTranslation(theme.id)}
          {theme.id === 'light' && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-1">{getTranslation('default')}</span>}
          {(theme.id === 'aurora' || theme.id === 'snow' || theme.id === 'rain') && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-600 text-white animate-pulse" style={{ animationDuration: '1.2s' }}>
              JOWA
            </span>
          )}
        </h4>
        {isSelected && (
          <span 
            className="w-4 h-4 flex items-center justify-center"
            style={{ backgroundColor: '#007BFF', borderRadius: '9999px' }}
          >
            <span className="w-1.5 h-1.5 bg-white" style={{ borderRadius: '9999px' }} />
          </span>
        )}
      </div>
      
      <p className="text-xs mb-3" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
        {getTranslation(`${theme.id}Description`)}
      </p>

      {/* Color Swatches */}
      <div className="flex gap-1">
        {type === 'color' ? (
          <>
            <div 
              className="w-4 h-4 rounded border theme-color-swatch"
              style={{ 
                backgroundColor: (displayColors as any).backgroundColor,
                borderColor: (displayColors as any).textColor + '20'
              }}
              title="Background"
            />
            <div 
              className="w-4 h-4 rounded border theme-color-swatch"
              style={{ 
                backgroundColor: (displayColors as any).textColor,
                borderColor: (displayColors as any).textColor + '20'
              }}
              title="Text"
            />
          </>
        ) : (
          <>
            <div 
              className="w-4 h-4 rounded border theme-color-swatch"
              style={{ 
                backgroundColor: (displayColors as any).headerBackground,
                borderColor: (displayColors as any).borderColor
              }}
              title="Header"
            />
            <div 
              className="w-4 h-4 rounded border theme-color-swatch"
              style={{ 
                backgroundColor: (displayColors as any).panelBackground,
                borderColor: (displayColors as any).borderColor
              }}
              title="Panel"
            />
          </>
        )}
      </div>
    </div>
  );
};
