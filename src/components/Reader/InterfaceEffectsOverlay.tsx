import React from 'react';
import { SnowEffect } from '../SnowEffect';
import { RainEffect } from '../RainEffect';
import { PetalEffect } from '../PetalEffect';
import type { ReadingPreferences } from '../../types';

interface InterfaceEffectsOverlayProps {
  preferences?: ReadingPreferences | null;
  target: 'interface' | 'reader' | 'universal' | 'auto';
  className?: string;
}

export const InterfaceEffectsOverlay: React.FC<InterfaceEffectsOverlayProps> = ({
  preferences,
  target,
  className = ''
}) => {
  if (!preferences) return null;

  // Compute active states and modes for each effect
  const snowActive = 
    preferences.interfaceSnowyEnabled ||
    preferences.selectedInterfaceTheme === 'snow' ||
    (preferences.glassEnabled && preferences.menuSubTheme === 'snowy') ||
    preferences.selectedColorTheme === 'snow';

  const snowMode: 'interface' | 'reader' | 'both' = 
    preferences.interfaceSnowyEnabled
      ? (preferences.interfaceSnowyMode || 'interface')
      : (preferences.selectedInterfaceTheme === 'snow' || (preferences.glassEnabled && preferences.menuSubTheme === 'snowy'))
        ? 'interface'
        : 'reader';

  const rainActive = 
    preferences.interfaceRainEnabled ||
    preferences.selectedInterfaceTheme === 'rain' ||
    preferences.selectedColorTheme === 'rain';

  const rainMode: 'interface' | 'reader' | 'both' =
    preferences.interfaceRainEnabled
      ? (preferences.interfaceRainMode || 'interface')
      : preferences.selectedInterfaceTheme === 'rain'
        ? 'interface'
        : 'reader';

  const petalsActive = 
    preferences.interfacePetalsEnabled ||
    preferences.selectedInterfaceTheme === 'aurora' ||
    preferences.selectedColorTheme === 'aurora';

  const petalsMode: 'interface' | 'reader' | 'both' =
    preferences.interfacePetalsEnabled
      ? (preferences.interfacePetalsMode || 'interface')
      : preferences.selectedInterfaceTheme === 'aurora'
        ? 'interface'
        : 'reader';

  // 1. AUTO / UNIVERSAL (renders when mode is 'both' or 'reader')
  // CRITICAL: When mode is 'interface', the full-screen canvas is completely deactivated so petals/rain/snow NEVER leak into the Reader area.
  // When mode is 'reader', the canvas dynamically restricts particles strictly to the Reader reading area below the header.
  if (target === 'auto' || target === 'universal') {
    const showUniversalSnow = snowActive && (snowMode === 'both' || snowMode === 'reader');
    const showUniversalRain = rainActive && (rainMode === 'both' || rainMode === 'reader');
    const showUniversalPetals = petalsActive && (petalsMode === 'both' || petalsMode === 'reader');

    if (!showUniversalSnow && !showUniversalRain && !showUniversalPetals) {
      return null;
    }

    // Optimization: If both are active, prioritize one effect to save performance instead of layering multiples
    const activeEffect = showUniversalPetals ? 'petals' : (showUniversalSnow ? 'snow' : 'rain');

    return (
      <>
        {activeEffect === 'snow' && (
          <SnowEffect
            mode={snowMode}
            density={preferences.interfaceSnowyAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceSnowySpeed ?? preferences.snowSpeed ?? 50}
            position="fixed"
          />
        )}
        {activeEffect === 'rain' && (
          <RainEffect
            mode={rainMode}
            density={preferences.interfaceRainAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceRainSpeed ?? preferences.snowSpeed ?? 50}
            position="fixed"
          />
        )}
        {activeEffect === 'petals' && (
          <PetalEffect
            mode={petalsMode}
            density={preferences.interfacePetalsAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfacePetalsSpeed ?? preferences.snowSpeed ?? 50}
            position="fixed"
          />
        )}
      </>
    );
  }

  // 2. INTERFACE (renders ONLY inside interface containers: top-bar header, TOC, Settings, Bookmarks, Search, Translate)
  // When mode is 'interface', this local overlay renders inside each active interface panel with position="absolute" and overflow-hidden.
  if (target === 'interface') {
    const showInterfaceSnow = snowActive && snowMode === 'interface';
    const showInterfaceRain = rainActive && rainMode === 'interface';
    const showInterfacePetals = petalsActive && petalsMode === 'interface';

    if (!showInterfaceSnow && !showInterfaceRain && !showInterfacePetals) {
      return null;
    }

    return (
      <div 
        className={`absolute inset-0 pointer-events-none overflow-hidden z-10 ${className}`} 
        data-interface-effect="true"
      >
        {showInterfaceSnow && (
          <SnowEffect
            density={preferences.interfaceSnowyAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceSnowySpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
        {showInterfaceRain && (
          <RainEffect
            density={preferences.interfaceRainAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceRainSpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
        {showInterfacePetals && (
          <PetalEffect
            density={preferences.interfacePetalsAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfacePetalsSpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
      </div>
    );
  }

  // 3. READER (renders ONLY inside reading text container, NEVER in interfaces)
  if (target === 'reader') {
    const showReaderSnow = snowActive && snowMode === 'reader';
    const showReaderRain = rainActive && rainMode === 'reader';
    const showReaderPetals = petalsActive && petalsMode === 'reader';

    if (!showReaderSnow && !showReaderRain && !showReaderPetals) {
      return null;
    }

    return (
      <div 
        className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`} 
        data-reader-effect="true"
      >
        {showReaderSnow && (
          <SnowEffect
            density={preferences.interfaceSnowyAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceSnowySpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
        {showReaderRain && (
          <RainEffect
            density={preferences.interfaceRainAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfaceRainSpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
        {showReaderPetals && (
          <PetalEffect
            density={preferences.interfacePetalsAmount ?? preferences.snowDensity ?? 15}
            speed={preferences.interfacePetalsSpeed ?? preferences.snowSpeed ?? 50}
            position="absolute"
          />
        )}
      </div>
    );
  }

  return null;
};
