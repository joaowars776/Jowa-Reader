import React from 'react';
import { SnowEffect } from '../SnowEffect';
import { RainEffect } from '../RainEffect';
import { PetalEffect } from '../PetalEffect';
import type { InterfaceTheme } from '../../types';

interface ThemePreviewProps {
  theme: InterfaceTheme;
  isSelected: boolean;
  onSelect: (themeId: string) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  getTranslation: (key: string) => string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  theme,
  isSelected,
  onSelect,
  interfaceStyles,
  getTranslation,
}) => {
  const isCustomThemeActive = theme.id === 'custom' && isSelected;
  const activeBorderColor = isCustomThemeActive ? (theme.colors.panelText || '#007BFF') : '#007BFF';
  const activeBgColor = isCustomThemeActive 
    ? (theme.colors.panelText ? `${theme.colors.panelText}25` : 'rgba(0, 123, 255, 0.15)') 
    : 'rgba(0, 123, 255, 0.15)';
  const activeShadow = isCustomThemeActive 
    ? `0 0 12px ${theme.colors.panelText || '#007BFF'}40` 
    : '0 0 12px rgba(0, 123, 255, 0.25)';

  return (
    <div
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${
        isSelected ? 'transform scale-105 shadow-xl' : 'hover:transform hover:scale-102 hover:shadow-lg'
      }`}
      style={{
        borderColor: isSelected ? activeBorderColor : interfaceStyles.borderColor,
        backgroundColor: isSelected ? activeBgColor : 'transparent',
        boxShadow: isSelected ? activeShadow : undefined
      }}
      onClick={() => onSelect(theme.id)}
    >
      {/* Verified checkmark badge with high z-index - styled as a span to protect from retro 8-bit div.rounded-full override */}
      {isSelected && (
        <span 
          className="absolute top-2 right-2 z-30 text-white p-1.5 shadow-md flex items-center justify-center"
          style={{ 
            borderRadius: '9999px', 
            width: '24px', 
            height: '24px',
            backgroundColor: isCustomThemeActive ? (theme.colors.panelText || '#007BFF') : '#007BFF'
          }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" stroke="white" />
          </svg>
        </span>
      )}

      {/* Theme Preview Panel */}
      <div 
        className="w-full h-24 rounded-lg mb-3 border overflow-hidden relative"
        style={{ 
          backgroundColor: theme.colors.panelBackground,
          borderColor: theme.colors.panelBorder
        }}
      >
        {theme.id === 'snow' && <SnowEffect position="absolute" density={35} />}
        {theme.id === 'rain' && <RainEffect position="absolute" density={35} />}
        {theme.id === 'aurora' && <PetalEffect position="absolute" density={35} />}
        {/* Header Bar */}
        <div 
          className="h-6 w-full flex items-center px-2 border-b relative z-10"
          style={{ 
            backgroundColor: theme.colors.headerBackground,
            borderColor: theme.colors.headerBorder
          }}
        >
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-red-400" style={{ borderRadius: '9999px' }}></span>
            <span className="w-2 h-2 bg-yellow-400" style={{ borderRadius: '9999px' }}></span>
            <span className="w-2 h-2 bg-green-400" style={{ borderRadius: '9999px' }}></span>
          </div>
          <div 
            className="ml-2 text-xs font-medium"
            style={{ color: theme.colors.headerText }}
          >
            {getTranslation('homePagePreview')}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="p-2 h-full relative z-10">
          <div 
            className="text-xs font-semibold mb-1"
            style={{ color: theme.colors.textPrimary }}
          >
            {getTranslation('sampleTitle')}
          </div>
          <div 
            className="text-xs leading-relaxed"
            style={{ color: theme.colors.textSecondary }}
          >
            {getTranslation('sampleContent')}
          </div>
          
          {/* Sample Button */}
          <div 
            className="mt-2 px-2 py-1 rounded text-xs font-medium inline-block"
            style={{ 
              backgroundColor: theme.colors.buttonPrimary,
              color: theme.colors.buttonPrimaryText
            }}
          >
            {getTranslation('sampleButton')}
          </div>
        </div>
      </div>

      {/* Theme Info */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold text-sm flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
            {getTranslation(`theme${theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}`)}
            {theme.id === 'light' && (
              <span className="text-xs text-gray-500 ml-1">({getTranslation('default')})</span>
            )}
            {(theme.id === 'snow' || theme.id === 'rain' || theme.id === 'aurora') && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white animate-pulse" style={{ animationDuration: '0.8s' }}>
                Jowa
              </span>
            )}
          </h4>
          <p className="text-xs mt-1" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
            {getTranslation(`theme${theme.id.charAt(0).toUpperCase() + theme.id.slice(1)}Description`)}
          </p>
        </div>
        {isSelected && (
          <span className="flex-shrink-0">
            <span 
              className="w-5 h-5 flex items-center justify-center"
              style={{ backgroundColor: '#007BFF', borderRadius: '9999px' }}
            >
              <span className="w-2 h-2 bg-white" style={{ borderRadius: '9999px' }}></span>
            </span>
          </span>
        )}
      </div>

      {/* Color Palette */}
      <div className="flex gap-1 mb-2">
        <div 
          className="w-4 h-4 rounded border"
          style={{ 
            backgroundColor: theme.colors.headerBackground,
            borderColor: interfaceStyles.borderColor
          }}
          title={getTranslation('headerColor')}
        />
        <div 
          className="w-4 h-4 rounded border"
          style={{ 
            backgroundColor: theme.colors.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
          title={getTranslation('panelColor')}
        />
        <div 
          className="w-4 h-4 rounded border"
          style={{ 
            backgroundColor: theme.colors.buttonPrimary,
            borderColor: interfaceStyles.borderColor
          }}
          title={getTranslation('accentColor')}
        />
        <div 
          className="w-4 h-4 rounded border"
          style={{ 
            backgroundColor: theme.colors.textPrimary,
            borderColor: interfaceStyles.borderColor
          }}
          title={getTranslation('textColor')}
        />
      </div>
    </div>
  );
};
