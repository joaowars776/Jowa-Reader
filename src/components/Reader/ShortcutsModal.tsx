import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { X, Keyboard, RotateCcw } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { getInterfaceThemeFromPrefs } from '../../utils/themes';
import type { ReadingPreferences } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface ShortcutsModalProps {
  onClose: () => void;
  preferences?: ReadingPreferences;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ onClose, preferences }) => {
  const { getTranslation } = useTranslations();
  const modalRef = useRef<HTMLDivElement>(null);

  const isDarkTheme = useMemo(() => {
    const themeId = preferences?.selectedInterfaceTheme || 'light';
    const subTheme = preferences?.snowSubTheme || 'day';
    return themeId === 'dark' || themeId === 'midnight' || themeId === 'highcontrast' || themeId === 'aurora' || (themeId === 'snow' && subTheme !== 'day') || (themeId === 'rain' && subTheme !== 'day');
  }, [preferences?.selectedInterfaceTheme, preferences?.snowSubTheme]);

  const glassEnabled = useMemo(() => {
    return (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);
  }, [preferences?.glassEnabled, preferences?.glassReaderAreaOnly]);

  // Memoize interface styles to prevent recalculation
  const interfaceStyles = useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;

    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      color: colors.panelText || '#1f2937',
      borderColor: colors.borderColor || '#e5e7eb'
    };
  }, [preferences]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Close modal with Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const [recording, setRecording] = useState<{ action: string; index: number } | null>(null);

  const handlePreferencesChange = useCallback((newPrefs: Partial<ReadingPreferences>) => {
    if (preferences && (window as any).onPreferencesChange) {
      (window as any).onPreferencesChange({ ...preferences, ...newPrefs });
    }
  }, [preferences]);

  const handleRecord = (actionKey: string, index: number) => {
    setRecording({ action: actionKey, index });
  };

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore modifier keys alone
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

      let keyStr = e.key;
      if (e.ctrlKey || e.metaKey) keyStr = `Ctrl + ${keyStr}`;
      if (e.shiftKey) keyStr = `Shift + ${keyStr}`;
      if (e.altKey) keyStr = `Alt + ${keyStr}`;

      const currentShortcuts = preferences?.shortcuts || {};
      const actionShortcuts = [...(currentShortcuts[recording.action] || [])];
      
      // Ensure we have at least 2 slots
      while (actionShortcuts.length < 2) actionShortcuts.push('');
      
      actionShortcuts[recording.index] = keyStr;
      
      handlePreferencesChange({
        shortcuts: {
          ...currentShortcuts,
          [recording.action]: actionShortcuts
        }
      });

      setRecording(null);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [recording, preferences, handlePreferencesChange]);

  const shortcutDefinitions = [
    { id: 'nextChapter', action: getTranslation('nextChapter'), defaultKeys: ['ArrowRight'] },
    { id: 'previousChapter', action: getTranslation('previousChapter'), defaultKeys: ['ArrowLeft'] },
    { id: 'toggleMenu', action: getTranslation('toggleMenu'), defaultKeys: ['m'] },
    { id: 'toggleSettings', action: getTranslation('toggleSettings'), defaultKeys: ['s'] },
    { id: 'toggleFullscreen', action: getTranslation('toggleFullscreen'), defaultKeys: ['F11'] },
    { id: 'search', action: getTranslation('search'), defaultKeys: ['/'] },
    { id: 'increaseFontSize', action: getTranslation('increaseFontSize'), defaultKeys: ['='] },
    { id: 'decreaseFontSize', action: getTranslation('decreaseFontSize'), defaultKeys: ['-'] },
  ];

  const handleReset = (actionId: string) => {
    const def = shortcutDefinitions.find(d => d.id === actionId);
    if (!def) return;

    const currentShortcuts = preferences?.shortcuts || {};
    handlePreferencesChange({
      shortcuts: {
        ...currentShortcuts,
        [actionId]: def.defaultKeys
      }
    });
  };

  const isModified = (actionId: string, index: number, currentKey: string) => {
    const def = shortcutDefinitions.find(d => d.id === actionId);
    if (!def) return false;
    const defaultKey = def.defaultKeys[index] || '';
    return currentKey !== '' && currentKey !== defaultKey;
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center pt-20 animate-fade-in backdrop-blur-sm transition-all duration-300 ${glassEnabled && !isDarkTheme ? 'bg-white/20' : 'bg-black/50'}`}>
      <div 
        ref={modalRef} 
        className="themed-panel modal-content glass-surface rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden animate-scale-in"
        style={{
          backgroundColor: interfaceStyles.backgroundColor,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
             'Georgia, serif') : undefined
        }}
      >
        <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b gap-2 min-w-0 relative z-20"
          style={{ borderColor: interfaceStyles.borderColor }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Keyboard className="w-5 h-5 shrink-0" style={{ color: interfaceStyles.color, opacity: 0.6 }} />
            <h3 className="text-lg font-semibold truncate" style={{ color: interfaceStyles.color }} title={getTranslation('shortcuts')}>
              {getTranslation('shortcuts')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 shrink-0"
            style={{ color: interfaceStyles.color }}
            aria-label={getTranslation('close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-600 dark:text-blue-400">
            {getTranslation('shortcutsInstruction') || 'Click on a shortcut to change it. You can have up to 2 keys for each action.'}
          </div>
          <table className="w-full text-left table-auto">
            <thead>
              <tr>
                <th className="pb-2 text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                  {getTranslation('action')}
                </th>
                <th className="pb-2 text-sm font-medium text-right" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                  {getTranslation('shortcut')} 1
                </th>
                <th className="pb-2 text-sm font-medium text-right" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                  {getTranslation('shortcut')} 2
                </th>
              </tr>
            </thead>
            <tbody>
              {shortcutDefinitions.map((def) => {
                const userKeys = preferences?.shortcuts?.[def.id] || [];
                const keys = [
                  userKeys[0] !== undefined ? userKeys[0] : (def.defaultKeys[0] || ''),
                  userKeys[1] !== undefined ? userKeys[1] : (def.defaultKeys[1] || '')
                ];

                return (
                  <tr key={def.id} className="border-t" style={{ borderColor: interfaceStyles.borderColor }}>
                    <td className="py-3" style={{ color: interfaceStyles.color }}>
                      <div className="flex items-center gap-2">
                        {def.action}
                        <button
                          onClick={() => handleReset(def.id)}
                          className="p-1 hover:bg-gray-100 hover:bg-opacity-20 rounded transition-all opacity-40 hover:opacity-100"
                          title={getTranslation('resetShortcut')}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    {[0, 1].map((idx) => {
                      const modified = isModified(def.id, idx, keys[idx]);
                      return (
                        <td key={idx} className="py-3 text-right">
                          <button
                            onClick={() => handleRecord(def.id, idx)}
                            className={`px-2 py-1 text-xs font-mono rounded border transition-all duration-200 min-w-[60px] text-center ${
                              recording?.action === def.id && recording?.index === idx
                                ? 'bg-blue-500 text-white border-blue-600 animate-pulse'
                                : modified
                                  ? 'bg-amber-100 dark:bg-amber-900/30 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-300'
                                  : 'bg-gray-100 bg-opacity-20 hover:bg-opacity-40'
                            }`}
                            style={{ 
                              color: recording?.action === def.id && recording?.index === idx 
                                ? '#ffffff' 
                                : modified 
                                  ? undefined 
                                  : interfaceStyles.color,
                              borderColor: recording?.action === def.id && recording?.index === idx 
                                ? undefined 
                                : modified 
                                  ? undefined 
                                  : interfaceStyles.borderColor
                            }}
                          >
                            {recording?.action === def.id && recording?.index === idx 
                              ? '...' 
                              : (keys[idx] || (idx === 0 ? 'None' : 'Empty'))}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
