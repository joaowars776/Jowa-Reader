import React, { useMemo, useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Languages, Square, Play, Copy, Check, FileDown, RefreshCw, Cpu } from 'lucide-react';
import { getTranslation, AVAILABLE_LANGUAGES, getCurrentLanguage } from '../../utils/translations';
import { getInterfaceThemeFromPrefs } from '../../utils/themes';
import type { ReadingPreferences } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface LibreTranslateModalProps {
  onClose: () => void;
  preferences?: ReadingPreferences;
  isBackendOnline: boolean;
  isAutoTranslateActive: boolean;
  onToggleAutoTranslate: () => void;
  sourceLanguage: string;
  onSourceLanguageChange: (lang: string) => void;
  targetLanguage: string;
  onTargetLanguageChange: (lang: string) => void;
  lastDetectedLanguage: string | null;
  onCheckBackend: () => Promise<boolean>;
}

export const LibreTranslateModal: React.FC<LibreTranslateModalProps> = ({
  onClose,
  preferences,
  isBackendOnline,
  isAutoTranslateActive,
  onToggleAutoTranslate,
  sourceLanguage,
  onSourceLanguageChange,
  targetLanguage,
  onTargetLanguageChange,
  lastDetectedLanguage,
  onCheckBackend
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Translation Engine selection state ('libretranslate' | 'ollama')
  const [translationEngine, setTranslationEngine] = useState<'libretranslate' | 'ollama'>(() => {
    return (localStorage.getItem('translation_engine') as 'libretranslate' | 'ollama') || 'libretranslate';
  });
  const [ollamaUrl, setOllamaUrl] = useState(() => {
    return localStorage.getItem('ollama_url') || 'http://127.0.0.1:11434';
  });
  const [selectedOllamaModel, setSelectedOllamaModel] = useState(() => {
    return localStorage.getItem('ollama_model') || '';
  });
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [isOllamaChecking, setIsOllamaChecking] = useState(false);

  const checkOllamaAndFetchModels = useCallback(async (urlToCheck?: string) => {
    const targetUrl = urlToCheck || ollamaUrl;
    setIsOllamaChecking(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const cleanUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
      const res = await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      if (res.ok) {
        const d = await res.json();
        if (d && Array.isArray(d.models)) {
          const names = d.models.map((m: any) => m.name);
          setOllamaModels(names);
          setIsOllamaOnline(true);
          if (names.length > 0 && !selectedOllamaModel) {
            setSelectedOllamaModel(names[0]);
            localStorage.setItem('ollama_model', names[0]);
          }
          return true;
        }
      }
      setIsOllamaOnline(false);
    } catch (e: any) {
      if (e && e.name !== 'AbortError') {
        console.warn('Ollama check failed:', e);
      }
      setIsOllamaOnline(false);
    } finally {
      setIsOllamaChecking(false);
    }
    return false;
  }, [ollamaUrl, selectedOllamaModel]);

  useEffect(() => {
    if (translationEngine === 'ollama') {
      checkOllamaAndFetchModels();
    }
  }, [translationEngine, checkOllamaAndFetchModels]);

  useEffect(() => {
    localStorage.setItem('translation_engine', translationEngine);
    // Dispatch a custom event to notify ReaderContent of the engine change
    window.dispatchEvent(new CustomEvent('translationEngineChanged'));
  }, [translationEngine]);

  useEffect(() => {
    localStorage.setItem('ollama_url', ollamaUrl);
  }, [ollamaUrl]);

  useEffect(() => {
    if (selectedOllamaModel) {
      localStorage.setItem('ollama_model', selectedOllamaModel);
    }
  }, [selectedOllamaModel]);

  // Automatically check translation backend on mount
  useEffect(() => {
    onCheckBackend();
  }, [onCheckBackend]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const interfaceStyles = useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;

    return {
      backgroundColor: colors.panelBackground || colors.headerBackground || '#ffffff',
      color: colors.panelText || colors.headerText || '#1f2937',
      borderColor: colors.panelBorder || colors.headerBorder || '#e5e7eb',
      panelSecondaryBackground: colors.panelSecondaryBackground || '#f3f4f6',
      inputBackground: colors.inputBackground || '#ffffff',
      inputText: colors.inputText || '#1f2937',
      inputBorder: colors.inputBorder || '#d1d5db',
      buttonPrimary: colors.buttonPrimary || '#3b82f6',
      buttonPrimaryText: colors.buttonPrimaryText || '#ffffff'
    };
  }, [preferences]);

  const getLanguageName = (code: string) => {
    if (code === 'auto') return getTranslation('autoDetect');
    const found = AVAILABLE_LANGUAGES.find(l => l.code === code);
    return found ? found.name : code;
  };

  const detectedLanguageLabel = useMemo(() => {
    if (!lastDetectedLanguage) return '';
    return ` (${getLanguageName(lastDetectedLanguage)})`;
  }, [lastDetectedLanguage]);

  const loadOnlyCode = useMemo(() => {
    const src = sourceLanguage === 'auto' ? (lastDetectedLanguage || 'en') : sourceLanguage;
    return `${src},${targetLanguage}`;
  }, [sourceLanguage, lastDetectedLanguage, targetLanguage]);

  const startCommand = useMemo(() => {
    return `libretranslate --port 5000 --load-only ${loadOnlyCode}`;
  }, [loadOnlyCode]);

  const handleCopy = () => {
    navigator.clipboard.writeText(startCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLauncherBat = () => {
    const batContent = `@echo off
title LibreTranslate Launcher (Custom - Reader)
echo ===================================================
echo   LibreTranslate Custom Launcher for Reader
echo ===================================================
echo.
echo [INFO] Iniciando o LibreTranslate...
echo [INFO] Idiomas carregados: ${loadOnlyCode}
echo.
libretranslate --port 5000 --load-only ${loadOnlyCode}
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar. Certifique-se de que o LibreTranslate esta instalado.
    echo Execute Install.bat para instalar se ainda nao o fez.
)
pause
`;
    const blob = new Blob([batContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Start-LibreTranslate.bat';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isDarkTheme = preferences?.selectedInterfaceTheme === 'dark' || 
                      preferences?.selectedInterfaceTheme === 'ocean' || 
                      (preferences?.selectedInterfaceTheme === 'aurora' && preferences?.snowSubTheme !== 'day') || 
                      preferences?.selectedInterfaceTheme === 'highcontrast' || 
                      preferences?.snowSubTheme === 'night' || 
                      preferences?.snowSubTheme === 'midnight';
  const glassEnabled = (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);

  const activeEffect = preferences?.selectedInterfaceTheme || preferences?.selectedColorTheme || preferences?.theme || 'light';
  const isEffectsActive = activeEffect === 'snow' || activeEffect === 'rain' || activeEffect === 'aurora';

  const overlayBg = (() => {
    const bg = interfaceStyles.backgroundColor || '#ffffff';
    let r = 255, g = 255, b = 255;
    if (bg.startsWith('#')) {
      const hex = bg.substring(1);
      if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      } else if (hex.length === 3) {
        r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
        g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
        b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
      }
    }
    const opacity = glassEnabled && !isEffectsActive ? 0.15 : (isDarkTheme ? 0.65 : 0.45);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  })();

  const backdropFilterVal = glassEnabled && !isEffectsActive ? 'blur(var(--interface-glass-blur, 14px))' : 'none';

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      style={{
        backgroundColor: glassEnabled ? overlayBg : 'rgba(0,0,0,0.5)',
        backdropFilter: backdropFilterVal !== 'none' ? backdropFilterVal : 'blur(4px)',
        WebkitBackdropFilter: backdropFilterVal !== 'none' ? backdropFilterVal : 'blur(4px)',
      }}
    >
      <div 
        ref={panelRef}
        className="relative w-full max-w-md rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in border max-h-[90vh]"
        style={{ 
          backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor, 
          color: interfaceStyles.color,
          borderColor: interfaceStyles.borderColor,
          backdropFilter: glassEnabled ? 'blur(10px)' : undefined,
          WebkitBackdropFilter: glassEnabled ? 'blur(10px)' : undefined,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
             'Georgia, serif') : undefined
        }}
      >
        <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b flex-shrink-0 gap-2 min-w-0 relative z-20" 
          style={{ borderColor: interfaceStyles.borderColor }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Languages className="w-5 h-5 text-blue-500 shrink-0" />
            <h2 className="text-lg font-bold tracking-tight truncate" title={getTranslation('offlineTranslateTitle')}>
              {getTranslation('offlineTranslateTitle')}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
            style={{ color: interfaceStyles.color }}
            aria-label={getTranslation('close') || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Connection Diagnostics Info & Status */}
          <div 
            className="p-4 rounded-2xl flex items-center justify-between text-sm font-medium"
            style={{ backgroundColor: interfaceStyles.panelSecondaryBackground }}
          >
            <span className="opacity-80">{getTranslation('backendStatusLabel') || 'Backend Status'}:</span>
            <div className="flex items-center gap-2">
              <span 
                className={`w-2.5 h-2.5 rounded-full ${isBackendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} 
              />
              <span className={isBackendOnline ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-red-500 dark:text-red-400 font-semibold'}>
                {isBackendOnline ? getTranslation('online') : getTranslation('offline')}
              </span>
            </div>
          </div>

          {/* Translation Engine Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">
              {getTranslation('translationEngine')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTranslationEngine('libretranslate')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer text-xs ${
                  translationEngine === 'libretranslate'
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: translationEngine === 'libretranslate' ? 'rgba(59, 130, 246, 0.05)' : interfaceStyles.backgroundColor,
                  borderColor: translationEngine === 'libretranslate' ? '#3b82f6' : interfaceStyles.borderColor,
                  color: interfaceStyles.color
                }}
              >
                <span className="font-bold flex items-center gap-1">
                  <Languages className="w-3.5 h-3.5 text-blue-500" />
                  {getTranslation('libreTranslate')}
                </span>
                <span className="text-[9px] opacity-65">
                  {getTranslation('fastLocalOffline')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTranslationEngine('ollama');
                  checkOllamaAndFetchModels();
                }}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer text-xs ${
                  translationEngine === 'ollama'
                    ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  backgroundColor: translationEngine === 'ollama' ? 'rgba(59, 130, 246, 0.05)' : interfaceStyles.backgroundColor,
                  borderColor: translationEngine === 'ollama' ? '#3b82f6' : interfaceStyles.borderColor,
                  color: interfaceStyles.color
                }}
              >
                <span className="font-bold flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-blue-500" />
                  {getTranslation('ollamaLlm')}
                </span>
                <span className="text-[9px] opacity-65">
                  {getTranslation('advancedAiTranslator')}
                </span>
              </button>
            </div>
          </div>

          {/* Ollama Settings configuration */}
          {translationEngine === 'ollama' && (
            <div className="p-4 rounded-2xl border space-y-3 text-xs" style={{ borderColor: interfaceStyles.borderColor, backgroundColor: interfaceStyles.panelSecondaryBackground }}>
              <div className="flex items-center justify-between font-bold uppercase opacity-75">
                <span>Ollama Settings</span>
                <button
                  type="button"
                  onClick={() => checkOllamaAndFetchModels()}
                  disabled={isOllamaChecking}
                  className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all text-blue-500"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isOllamaChecking ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold opacity-60">Ollama API URL</span>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  onBlur={() => checkOllamaAndFetchModels()}
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                  style={{ backgroundColor: interfaceStyles.inputBackground, color: interfaceStyles.inputText, borderColor: interfaceStyles.inputBorder }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold opacity-60">Select Model</span>
                {ollamaModels.length > 0 ? (
                  <select
                    value={selectedOllamaModel}
                    onChange={(e) => setSelectedOllamaModel(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border text-xs outline-none"
                    style={{ backgroundColor: interfaceStyles.inputBackground, color: interfaceStyles.inputText, borderColor: interfaceStyles.inputBorder }}
                  >
                    {ollamaModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-[10px] text-red-500 font-medium">
                    No models found. Make sure Ollama is running and has models downloaded.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[10px]">
                <div className={`w-2 h-2 rounded-full ${isOllamaOnline === true ? 'bg-emerald-500' : isOllamaOnline === false ? 'bg-rose-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className="opacity-75">
                  {isOllamaOnline === true ? 'Ollama connected' : isOllamaOnline === false ? 'Ollama offline' : 'Checking Ollama...'}
                </span>
              </div>
            </div>
          )}

          {/* Source Language Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">{getTranslation('sourceLanguage')}</label>
            <select 
              value={sourceLanguage}
              onChange={(e) => onSourceLanguageChange(e.target.value)}
              className="w-full p-3 rounded-xl border outline-none text-sm transition-all focus:ring-2 focus:ring-blue-500/20"
              style={{ 
                backgroundColor: interfaceStyles.inputBackground, 
                color: interfaceStyles.inputText,
                borderColor: interfaceStyles.inputBorder
              }}
            >
              <option value="auto">{getTranslation('autoDetect')}{detectedLanguageLabel}</option>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Target Language Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-60">{getTranslation('targetLanguage')}</label>
            <select 
              value={targetLanguage}
              onChange={(e) => onTargetLanguageChange(e.target.value)}
              className="w-full p-3 rounded-xl border outline-none text-sm transition-all focus:ring-2 focus:ring-blue-500/20"
              style={{ 
                backgroundColor: interfaceStyles.inputBackground, 
                color: interfaceStyles.inputText,
                borderColor: interfaceStyles.inputBorder
              }}
            >
              {AVAILABLE_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* Startup CLI Command Section - Only visible for LibreTranslate */}
          {translationEngine === 'libretranslate' && (
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs font-semibold uppercase tracking-wider opacity-60">{getTranslation('startupCliCommand') || 'Startup CLI Command:'}</label>
              <div 
                className="flex items-center gap-1.5 rounded-xl p-3 font-mono text-[11px] select-all border relative group"
                style={{ 
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor
                }}
              >
                <span className="pr-8 truncate block w-full opacity-90">{startCommand}</span>
                <button
                  onClick={handleCopy}
                  className="absolute right-2.5 top-2.5 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-blue-500 transition-colors"
                  title="Copy command"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              {/* Download batch script action */}
              <button
                onClick={handleDownloadLauncherBat}
                className="w-full mt-1.5 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border hover:bg-black/5 dark:hover:bg-white/5 transition-all"
                style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
              >
                <FileDown className="w-4 h-4 text-emerald-500" />
                {getTranslation('downloadCustomStartBat') || 'Download Custom Start BAT File'}
              </button>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div 
          className="p-4 border-t flex-shrink-0"
          style={{ 
            borderColor: interfaceStyles.borderColor,
            backgroundColor: interfaceStyles.backgroundColor 
          }}
        >
          {/* Start / Stop Button - Expanded to full width */}
          <button
            onClick={onToggleAutoTranslate}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
            style={{ 
              backgroundColor: isAutoTranslateActive ? '#ef4444' : '#3b82f6',
              color: '#ffffff'
            }}
          >
            {isAutoTranslateActive ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                {getTranslation('stopButton')}
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {getTranslation('startButton')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
