import React from 'react';
import { getInterfaceTheme, getColorTheme } from '../../utils/themes';
import type { ReadingPreferences } from '../../types';

interface SnowThemeSettingsProps {
  preferences: ReadingPreferences;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  getTranslation: (key: string) => string;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
}

export const SnowThemeSettings: React.FC<SnowThemeSettingsProps> = ({
  preferences,
  interfaceStyles,
  getTranslation,
  onPreferencesChange,
}) => {
  const isSnow = preferences.selectedInterfaceTheme === 'snow' || (preferences.glassEnabled && preferences.menuSubTheme === 'snowy');
  const isRain = preferences.selectedInterfaceTheme === 'rain';
  const isAurora = preferences.selectedInterfaceTheme === 'aurora';

  if (!isSnow && !isRain && !isAurora) return null;

  const accentColor = isAurora ? '#8b5cf6' : '#0284c7';
  const bgBadgeClass = isAurora ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800';
  const accentTextClass = isAurora ? 'text-purple-700' : 'text-sky-700';
  const inputAccentClass = isAurora ? 'accent-purple-600' : 'accent-sky-600';
  const inputBgClass = isAurora ? 'bg-purple-200' : 'bg-sky-200';

  return (
    <div 
      className="mt-6 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2"
      style={{ 
        backgroundColor: preferences.interfaceColors?.panelSecondaryBackground || interfaceStyles.backgroundColor,
        borderColor: interfaceStyles.borderColor
      }}
    >
      {/* Density / Intensity Slider */}
      <div>
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
            {preferences.snowDensity ?? 10}%
          </span>
        </div>
        
        <div className="flex items-center gap-4 mt-2">
          <span className="text-xs opacity-60">
            {isRain ? '🌧️ ' : isAurora ? '🌸 ' : '❄️ '} {getTranslation('min') || 'Min'}
          </span>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.snowDensity ?? 10}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              onPreferencesChange({
                ...preferences,
                snowDensity: val
              });
            }}
            className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${inputBgClass} ${inputAccentClass}`}
          />
          <span className={`text-xs font-semibold ${accentTextClass}`}>
            {isRain ? '🌧️ ' : isAurora ? '🌸 ' : '❄️ '} {getTranslation('max') || 'Max'}
          </span>
        </div>
      </div>

      {/* Speed Slider */}
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
            {preferences.snowSpeed ?? 100}%
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-xs opacity-60">🐌 {getTranslation('slow') || 'Slow'}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={preferences.snowSpeed ?? 100}
            onChange={(e) => {
              onPreferencesChange({
                ...preferences,
                snowSpeed: parseInt(e.target.value, 10)
              });
            }}
            className={`flex-1 h-2 rounded-lg appearance-none cursor-pointer ${inputBgClass} ${inputAccentClass}`}
          />
          <span className={`text-xs font-semibold ${accentTextClass}`}>⚡ {getTranslation('fast') || 'Fast'}</span>
        </div>
      </div>

      {/* Snow Sub-Theme Selection - Only for Snow theme */}
      {isSnow && (
        <div className="pt-3 border-t border-dashed" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-85" style={{ color: interfaceStyles.color }}>
              {getTranslation('snowSubTheme')}
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
                  className="flex-1 py-1.5 px-2 text-xs rounded-lg font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: (preferences.snowSubTheme || 'day') === mode ? '#0284c7' : 'transparent',
                    color: (preferences.snowSubTheme || 'day') === mode ? '#ffffff' : interfaceStyles.color,
                    borderColor: (preferences.snowSubTheme || 'day') === mode ? '#0284c7' : interfaceStyles.borderColor
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
};
