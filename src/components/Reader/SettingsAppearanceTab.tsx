import React from 'react';
import { FontSettings } from './Appearance/FontSettings';
import { SpacingSettings } from './Appearance/SpacingSettings';
import { InterfaceEffects } from './Appearance/InterfaceEffects';
import { ThemeSelector } from './Appearance/ThemeSelector';
import type { ReadingPreferences } from '../../types';

interface SettingsAppearanceTabProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
  handleSliderChange: (key: keyof ReadingPreferences, value: number) => void;
  handleColorThemeChange: (themeId: string) => void;
  handleInterfaceThemeChange: (themeId: string) => void;
  handleCustomColorChange: (type: 'reader' | 'interface', colorKey: string, value: string) => void;
  isFontFamilyExpanded: boolean;
  setIsFontFamilyExpanded: (expanded: boolean) => void;
  isColorThemeExpanded: boolean;
  setIsColorThemeExpanded: (expanded: boolean) => void;
  themeApplyMode: 'both' | 'interface' | 'reader';
  setThemeApplyMode: (mode: 'both' | 'interface' | 'reader') => void;
  activeThemeTab: 'color' | 'menu';
  setActiveThemeTab: (tab: 'color' | 'menu') => void;
}

export const SettingsAppearanceTab: React.FC<SettingsAppearanceTabProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
  isDefault,
  handleSliderChange,
  handleColorThemeChange,
  handleInterfaceThemeChange,
  handleCustomColorChange,
  isFontFamilyExpanded,
  setIsFontFamilyExpanded,
  isColorThemeExpanded,
  setIsColorThemeExpanded,
  themeApplyMode,
  setThemeApplyMode,
  activeThemeTab,
  setActiveThemeTab
}) => {
  return (
    <div className="space-y-6">
      {/* FontSizing and Font Selection Panel */}
      <FontSettings
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        interfaceStyles={interfaceStyles}
        isDefault={isDefault}
        handleSliderChange={handleSliderChange}
        isFontFamilyExpanded={isFontFamilyExpanded}
        setIsFontFamilyExpanded={setIsFontFamilyExpanded}
      />

      {/* Spacing, Height, and Width Panel */}
      <SpacingSettings
        preferences={preferences}
        interfaceStyles={interfaceStyles}
        isDefault={isDefault}
        handleSliderChange={handleSliderChange}
      />

      {/* Interface Borders & Glass Panel */}
      <InterfaceEffects
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        interfaceStyles={interfaceStyles}
      />

      {/* Themes, Colors & Theme Sync Settings Panel */}
      <ThemeSelector
        preferences={preferences}
        onPreferencesChange={onPreferencesChange}
        interfaceStyles={interfaceStyles}
        isDefault={isDefault}
        handleColorThemeChange={handleColorThemeChange}
        handleInterfaceThemeChange={handleInterfaceThemeChange}
        handleCustomColorChange={handleCustomColorChange}
        isColorThemeExpanded={isColorThemeExpanded}
        setIsColorThemeExpanded={setIsColorThemeExpanded}
        themeApplyMode={themeApplyMode}
        setThemeApplyMode={setThemeApplyMode}
        activeThemeTab={activeThemeTab}
        setActiveThemeTab={setActiveThemeTab}
      />
    </div>
  );
};
