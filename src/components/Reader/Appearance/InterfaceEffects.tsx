import React from 'react';
import { Layers, CloudSnow, CloudRain, Sparkles, ChevronUp, ChevronDown, Check, Zap } from 'lucide-react';
import { useTranslations } from '../../../hooks/useTranslations';
import type { ReadingPreferences } from '../../../types';
import { applyPreferencesTheme } from '../../../utils/themes';
import { logActivity } from '../../../utils/activity-logger';

interface InterfaceEffectsProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
}

export const InterfaceEffects: React.FC<InterfaceEffectsProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
}) => {
  const { getTranslation } = useTranslations();
  const isMinimized = preferences.interfaceEffectsMinimized ?? false;

  const toggleMinimized = () => {
    const next = !isMinimized;
    const updated = {
      ...preferences,
      interfaceEffectsMinimized: next
    };
    onPreferencesChange(updated);
  };

  const updatePreference = <K extends keyof ReadingPreferences>(key: K, value: ReadingPreferences[K]) => {
    const prev = preferences[key];
    const updated = {
      ...preferences,
      [key]: value
    };
    applyPreferencesTheme(updated);
    onPreferencesChange(updated);
    logActivity({
      type: 'change_setting',
      settingKey: key,
      settingPrevValue: prev,
      settingNewValue: value
    });
  };

  // Helper to dynamically calculate colored track fill for sliders following thumb
  const getSliderTrackStyle = (val: number, min: number, max: number) => {
    const clampedVal = Math.max(min, Math.min(max, val));
    const percent = ((clampedVal - min) / (max - min)) * 100;
    const accent = preferences.interfaceColors?.accent || '#3b82f6';
    const trackBg = preferences.interfaceColors?.panelSecondaryBackground || 'rgba(156, 163, 175, 0.25)';
    return {
      background: `linear-gradient(to right, ${accent} 0%, ${accent} ${percent}%, ${trackBg} ${percent}%, ${trackBg} 100%)`
    };
  };

  // Compute active effects list for minimized summary badges
  const activeBadges: string[] = [];
  if (preferences.sideBordersEnabled) activeBadges.push(getTranslation('sideBordersEnabled') || 'Side Margins');
  if (preferences.interfaceSnowyEnabled) activeBadges.push(getTranslation('snow') || 'Snow');
  if (preferences.interfaceRainEnabled) activeBadges.push(getTranslation('rain') || 'Rain');
  if (preferences.interfacePetalsEnabled) activeBadges.push('Petals');
  if (preferences.glassEnabled) activeBadges.push(getTranslation('glass') || 'Glass');

  return (
    <div 
      className="p-3 rounded-xl border space-y-2.5 shadow-sm my-2.5 transition-all duration-300" 
      style={{ borderColor: interfaceStyles.borderColor }}
    >
      {/* Header with Collapsible Toggle Button */}
      <div 
        className="flex items-center justify-between cursor-pointer select-none group"
        onClick={toggleMinimized}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <span className="font-bold text-base" style={{ color: interfaceStyles.color }}>
            {getTranslation('interfaceEffects') || 'Interface Effects'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isMinimized && (
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {activeBadges.length > 0 ? (
                activeBadges.map((b) => (
                  <span 
                    key={b}
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400"
                  >
                    {b}
                  </span>
                ))
              ) : (
                <span className="text-[11px] opacity-60 font-medium px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-800">
                  {getTranslation('disabled') || 'Disabled'}
                </span>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimized();
            }}
            className="p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            title={isMinimized ? (getTranslation('expand') || 'Expand') : (getTranslation('minimize') || 'Minimize')}
          >
            {isMinimized ? (
              <ChevronDown className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
            ) : (
              <ChevronUp className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.color }} />
            )}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          {/* 1. Colored Side Margins (Page-Style Margins) */}
          <div className="p-2.5 rounded-lg border space-y-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold" style={{ color: interfaceStyles.color }}>
                  {getTranslation('sideBordersEnabled')}
                </span>
                <p className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
                  {getTranslation('sideBordersDescription')}
                </p>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.sideBordersEnabled ?? false}
                  onChange={(e) => updatePreference('sideBordersEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${preferences.sideBordersEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.sideBordersEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>

            {preferences.sideBordersEnabled && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                {/* Border Width Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('borderThickness') || 'Border Thickness'}</span>
                    <span className="font-mono">{preferences.sideBordersWidth ?? 40}px</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    step="5"
                    value={preferences.sideBordersWidth ?? 40}
                    onChange={(e) => updatePreference('sideBordersWidth', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.sideBordersWidth ?? 40, 10, 120)}
                  />
                </div>

                {/* Side Margin Color Presets & Picker */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('selectBorderColor') || 'Color'}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updatePreference('sideBordersColor', 'original')}
                      className={`text-xs px-2.5 py-1 rounded-md border font-medium transition-all ${
                        preferences.sideBordersColor === 'original'
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {getTranslation('originalReaderColor') || 'Original'}
                    </button>
                    {['#f4ecd8', '#1e293b', '#0f172a', '#18181b', '#f8fafc', '#3b82f6', '#10b981', '#a855f7'].map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => updatePreference('sideBordersColor', hex)}
                        className={`w-6 h-6 rounded-full border border-black/20 relative flex items-center justify-center transition-transform hover:scale-110 ${
                          preferences.sideBordersColor === hex ? 'ring-2 ring-blue-500 ring-offset-1 scale-105' : ''
                        }`}
                        style={{ backgroundColor: hex }}
                      >
                        {preferences.sideBordersColor === hex && <Check className="w-3 h-3 text-white drop-shadow" />}
                      </button>
                    ))}
                    <label className="flex items-center gap-1.5 cursor-pointer ml-1">
                      <input
                        type="color"
                        value={preferences.sideBordersColor?.startsWith('#') ? preferences.sideBordersColor : '#3b82f6'}
                        onChange={(e) => updatePreference('sideBordersColor', e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-black/20 p-0"
                      />
                      <span className="text-xs opacity-75" style={{ color: interfaceStyles.color }}>
                        {getTranslation('customColor') || 'Custom'}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Effect on Side Margins */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('sideBordersEffect') || 'Effect on Side Margins'}
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {[
                      { id: 'none', label: getTranslation('none') || 'None' },
                      { id: 'pulse', label: 'Jowa 🌨️' },
                      { id: 'snow', label: 'Snow ❄️' },
                      { id: 'rain', label: 'Rain 🌧️' },
                      { id: 'thunder', label: 'Storm ⚡' },
                      { id: 'sand', label: 'Sand 🏜️' },
                    ].map((eff) => (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => updatePreference('sideBordersEffect', eff.id as any)}
                        className={`text-xs py-1.5 px-1 rounded border text-center font-medium transition-all ${
                          (preferences.sideBordersEffect || 'none') === eff.id
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {eff.label}
                      </button>
                    ))}
                  </div>

                  {preferences.sideBordersEffect === 'pulse' && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-xs mb-1" style={{ color: interfaceStyles.color }}>
                        <span>{getTranslation('sideBordersPulseAmount') || 'Pulse Speed'}</span>
                        <span className="font-mono">{preferences.sideBordersPulseAmount ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={preferences.sideBordersPulseAmount ?? 50}
                        onChange={(e) => updatePreference('sideBordersPulseAmount', parseInt(e.target.value, 10))}
                        className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={getSliderTrackStyle(preferences.sideBordersPulseAmount ?? 50, 10, 100)}
                      />
                    </div>
                  )}

                  {preferences.sideBordersEffect === 'thunder' && (
                    <div className="mt-2.5">
                      <div className="flex justify-between text-xs mb-1" style={{ color: interfaceStyles.color }}>
                        <span>{getTranslation('sideBordersThunderAmount') || 'Lightning Frequency'}</span>
                        <span className="font-mono">{preferences.sideBordersThunderAmount ?? 20}%</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={preferences.sideBordersThunderAmount ?? 20}
                        onChange={(e) => updatePreference('sideBordersThunderAmount', parseInt(e.target.value, 10))}
                        className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={getSliderTrackStyle(preferences.sideBordersThunderAmount ?? 20, 5, 100)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. Snowy Effect */}
          <div className="p-2.5 rounded-lg border space-y-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                  <CloudSnow className="w-4 h-4 text-sky-400" />
                  {getTranslation('interfaceSnowyEnabled') || 'Snow Effect ❄️'}
                </span>
                <p className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
                  {getTranslation('interfaceSnowyDescription') || 'Falling snow across interface or reader'}
                </p>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.interfaceSnowyEnabled ?? false}
                  onChange={(e) => updatePreference('interfaceSnowyEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${preferences.interfaceSnowyEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.interfaceSnowyEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>

            {preferences.interfaceSnowyEnabled && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                {/* Effect Area */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('effectArea') || 'Effect Area'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'reader' as const, label: getTranslation('snowyReader') || 'Reader' },
                      { mode: 'interface' as const, label: getTranslation('snowyInterface') || 'Interface' },
                      { mode: 'both' as const, label: getTranslation('snowyBoth') || 'Both' }
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => updatePreference('interfaceSnowyMode', opt.mode)}
                        className={`text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                          (preferences.interfaceSnowyMode || 'interface') === opt.mode
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('density') || 'Density'}</span>
                    <span className="font-mono">{preferences.interfaceSnowyAmount ?? 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={preferences.interfaceSnowyAmount ?? 15}
                    onChange={(e) => updatePreference('interfaceSnowyAmount', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfaceSnowyAmount ?? 15, 5, 100)}
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('speed') || 'Speed'}</span>
                    <span className="font-mono">{preferences.interfaceSnowySpeed ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={preferences.interfaceSnowySpeed ?? 50}
                    onChange={(e) => updatePreference('interfaceSnowySpeed', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfaceSnowySpeed ?? 50, 10, 100)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Rain Effect */}
          <div className="p-2.5 rounded-lg border space-y-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                  <CloudRain className="w-4 h-4 text-cyan-500" />
                  {getTranslation('rainEffect') || 'Rain Effect 🌧️'}
                </span>
                <p className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
                  {getTranslation('rainEffectDescription') || 'Falling raindrops across interface or reader'}
                </p>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.interfaceRainEnabled ?? false}
                  onChange={(e) => updatePreference('interfaceRainEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${preferences.interfaceRainEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.interfaceRainEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>

            {preferences.interfaceRainEnabled && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                {/* Effect Area */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('effectArea') || 'Effect Area'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'reader' as const, label: getTranslation('snowyReader') || 'Reader' },
                      { mode: 'interface' as const, label: getTranslation('snowyInterface') || 'Interface' },
                      { mode: 'both' as const, label: getTranslation('snowyBoth') || 'Both' }
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => updatePreference('interfaceRainMode', opt.mode)}
                        className={`text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                          (preferences.interfaceRainMode || 'interface') === opt.mode
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('density') || 'Density'}</span>
                    <span className="font-mono">{preferences.interfaceRainAmount ?? 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={preferences.interfaceRainAmount ?? 15}
                    onChange={(e) => updatePreference('interfaceRainAmount', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfaceRainAmount ?? 15, 5, 100)}
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('speed') || 'Speed'}</span>
                    <span className="font-mono">{preferences.interfaceRainSpeed ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={preferences.interfaceRainSpeed ?? 50}
                    onChange={(e) => updatePreference('interfaceRainSpeed', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfaceRainSpeed ?? 50, 10, 100)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Petals Effect */}
          <div className="p-2.5 rounded-lg border space-y-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                  <Sparkles className="w-4 h-4 text-pink-400" />
                  {getTranslation('petalsEffect') || 'Petals Effect 🌸'}
                </span>
                <p className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
                  {getTranslation('petalsEffectDescription') || 'Falling flower petals across interface or reader'}
                </p>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.interfacePetalsEnabled ?? false}
                  onChange={(e) => updatePreference('interfacePetalsEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${preferences.interfacePetalsEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.interfacePetalsEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>

            {preferences.interfacePetalsEnabled && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                {/* Effect Area */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('effectArea') || 'Effect Area'}
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { mode: 'reader' as const, label: getTranslation('snowyReader') || 'Reader' },
                      { mode: 'interface' as const, label: getTranslation('snowyInterface') || 'Interface' },
                      { mode: 'both' as const, label: getTranslation('snowyBoth') || 'Both' }
                    ].map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => updatePreference('interfacePetalsMode', opt.mode)}
                        className={`text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                          (preferences.interfacePetalsMode || 'interface') === opt.mode
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Density */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('density') || 'Density'}</span>
                    <span className="font-mono">{preferences.interfacePetalsAmount ?? 15}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={preferences.interfacePetalsAmount ?? 15}
                    onChange={(e) => updatePreference('interfacePetalsAmount', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfacePetalsAmount ?? 15, 5, 100)}
                  />
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('speed') || 'Speed'}</span>
                    <span className="font-mono">{preferences.interfacePetalsSpeed ?? 50}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={preferences.interfacePetalsSpeed ?? 50}
                    onChange={(e) => updatePreference('interfacePetalsSpeed', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.interfacePetalsSpeed ?? 50, 10, 100)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 5. Glass Effect (Translucent Glassmorphism) */}
          <div className="p-2.5 rounded-lg border space-y-2" style={{ borderColor: interfaceStyles.borderColor + '40' }}>
            <label className="flex items-center justify-between cursor-pointer">
              <div className="space-y-0.5 pr-2">
                <span className="text-sm font-semibold flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                  <Layers className="w-4 h-4 text-indigo-400" />
                  {getTranslation('glassEnabled') || 'Glass Effect 💎'}
                </span>
                <p className="text-xs opacity-60" style={{ color: interfaceStyles.color }}>
                  {getTranslation('glassDescription') || 'Semi-transparent frosted glass backdrop over all panels'}
                </p>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  checked={preferences.glassEnabled ?? false}
                  onChange={(e) => updatePreference('glassEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 rounded-full transition-all duration-300 ${preferences.glassEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <div className={`absolute left-0.5 top-[2px] w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${preferences.glassEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            </label>

            {preferences.glassEnabled && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor + '30' }}>
                {/* Glass Sub-Theme Variations */}
                <div>
                  <span className="text-xs font-semibold block mb-1.5" style={{ color: interfaceStyles.color }}>
                    {getTranslation('glassBackdropVariation') || 'Glass Variation'}
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {[
                      { id: 'default', label: getTranslation('clearGlass') || 'Clear Glass' },
                      { id: 'snowy', label: getTranslation('glassSnowy') || 'Snowy ❄️' },
                      { id: 'aurora', label: getTranslation('glassAurora') || 'Aurora 🌌' },
                      { id: 'tinted', label: getTranslation('glassTinted') || 'Tinted 🎨' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => updatePreference('menuSubTheme', v.id)}
                        className={`text-xs py-1.5 px-2 rounded border font-medium transition-all ${
                          (preferences.menuSubTheme || 'default') === v.id
                            ? 'border-blue-500 bg-blue-500 text-white shadow-sm'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glass Opacity */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('opacity') || 'Opacity'}</span>
                    <span className="font-mono">{preferences.glassOpacity ?? 65}%</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="100"
                    step="5"
                    value={preferences.glassOpacity ?? 65}
                    onChange={(e) => updatePreference('glassOpacity', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.glassOpacity ?? 65, 15, 100)}
                  />
                </div>

                {/* Glass Blur */}
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium" style={{ color: interfaceStyles.color }}>
                    <span>{getTranslation('blur') || 'Blur'}</span>
                    <span className="font-mono">{preferences.glassBlur ?? 12}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    step="2"
                    value={preferences.glassBlur ?? 12}
                    onChange={(e) => updatePreference('glassBlur', parseInt(e.target.value, 10))}
                    className="slider w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                    style={getSliderTrackStyle(preferences.glassBlur ?? 12, 0, 30)}
                  />
                </div>

                {/* Glass in Reader Area */}
                <label className="flex items-center justify-between cursor-pointer pt-1">
                  <div>
                    <span className="text-xs font-semibold block" style={{ color: interfaceStyles.color }}>
                      {getTranslation('glassReaderArea') || 'Glass in Reader Area'}
                    </span>
                    <span className="text-[11px] opacity-60" style={{ color: interfaceStyles.color }}>
                      {getTranslation('glassReaderAreaDescription') || 'Glass backdrop for the text container'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.glassReaderArea ?? false}
                    onChange={(e) => updatePreference('glassReaderArea', e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
