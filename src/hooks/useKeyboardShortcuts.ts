import { useEffect, useRef } from 'react';
import type { ReadingPreferences } from '../types';

interface KeyboardShortcuts {
  onNextChapter?: () => void;
  onPreviousChapter?: () => void;
  onToggleMenu?: () => void;
  onToggleSettings?: () => void;
  onToggleFullscreen?: () => void;
  onSearch?: () => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcuts, preferences?: ReadingPreferences) => {
  // Keep shortcuts and preferences in refs so that the event listener is registered ONLY ONCE
  // and doesn't get re-bound on every render due to new object/callback identities!
  const shortcutsRef = useRef<KeyboardShortcuts>(shortcuts);
  const preferencesRef = useRef<ReadingPreferences | undefined>(preferences);

  // Update refs on every render
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { key } = event;
      
      // Helper to format key string for comparison
      const formatKey = (e: KeyboardEvent) => {
        let keyStr = e.key;
        if (e.ctrlKey || e.metaKey) keyStr = `Ctrl + ${keyStr}`;
        if (e.shiftKey) keyStr = `Shift + ${keyStr}`;
        if (e.altKey) keyStr = `Alt + ${keyStr}`;
        return keyStr.toLowerCase();
      };

      const pressedKey = formatKey(event);

      // Helper to check if a key matches any of the allowed keys for an action
      const matches = (actionId: string, defaultKeys: string[]) => {
        const userKeys = preferencesRef.current?.shortcuts?.[actionId] || [];
        const allowedKeys = [
          ...userKeys.filter(k => k !== ''),
          ...(userKeys.length === 0 ? defaultKeys : [])
        ].map(k => k.toLowerCase());

        return allowedKeys.includes(pressedKey) || allowedKeys.includes(key.toLowerCase());
      };

      const currentShortcuts = shortcutsRef.current;

      if (matches('nextChapter', ['ArrowRight'])) {
        event.preventDefault();
        currentShortcuts.onNextChapter?.();
      } else if (matches('previousChapter', ['ArrowLeft'])) {
        event.preventDefault();
        currentShortcuts.onPreviousChapter?.();
      } else if (matches('toggleMenu', ['m'])) {
        event.preventDefault();
        currentShortcuts.onToggleMenu?.();
      } else if (matches('toggleSettings', ['s'])) {
        event.preventDefault();
        currentShortcuts.onToggleSettings?.();
      } else if (matches('toggleFullscreen', ['F11'])) {
        event.preventDefault();
        currentShortcuts.onToggleFullscreen?.();
      } else if (matches('search', ['/'])) {
        event.preventDefault();
        currentShortcuts.onSearch?.();
      } else if (matches('increaseFontSize', ['='])) {
        event.preventDefault();
        currentShortcuts.onIncreaseFontSize?.();
      } else if (matches('decreaseFontSize', ['-'])) {
        event.preventDefault();
        currentShortcuts.onDecreaseFontSize?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // Run ONLY once! Absolutely stable.
};
