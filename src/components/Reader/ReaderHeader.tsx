import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Menu, Settings, Search, Bookmark, Share2, Maximize, Heart, Volume2, Keyboard, Eye, ChevronUp, ChevronDown, Trash2, Edit2, X, Languages, Loader2, Sliders } from 'lucide-react';
import { getInterfaceTheme } from '../../utils/themes';
import { saveBookmark, getBookmarks, deleteBookmark, switchUserSession } from '../../utils/storage';
import { useTranslations } from '../../hooks/useTranslations';
import { otherUsersBooksTranslations } from '../../utils/translations/other-users-books';
import { getCurrentLanguage } from '../../utils/translations';
import type { Book, Chapter, ReadingPreferences, Bookmark as BookmarkType } from '../../types';
import { ShortcutsModal } from './ShortcutsModal'; // Import the new ShortcutsModal
import { UserProfileSwitcher } from './UserProfileSwitcher';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface ReaderHeaderProps {
  book: Book;
  currentChapter?: Chapter;
  chapterProgress: number;
  totalChapters: number;
  onBackToLibrary: () => void;
  onToggleMenu: () => void;
  onToggleSettings: () => void;
  onToggleSearch: () => void;
  onToggleBookmarks: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
  preferences?: ReadingPreferences;
  onPreferencesChange?: (prefs: ReadingPreferences) => void;
  pdfMode?: boolean;
  onTogglePdfMode?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  buttonX?: number;
  onButtonXChange?: (x: number) => void;
  isBackendOnline?: boolean;
  isAutoTranslateActive?: boolean;
  onToggleTranslateModal?: () => void;
  isTranslating?: boolean;
  translatedChapterTitle?: string | null;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  book,
  currentChapter,
  chapterProgress,
  totalChapters,
  onBackToLibrary,
  onToggleMenu,
  onToggleSettings,
  onToggleSearch,
  onToggleBookmarks,
  onToggleFullscreen,
  isFullscreen,
  preferences,
  onPreferencesChange,
  pdfMode = false,
  onTogglePdfMode,
  isMinimized = false,
  onToggleMinimize,
  buttonX = 50,
  onButtonXChange,
  isBackendOnline = false,
  isAutoTranslateActive = false,
  onToggleTranslateModal,
  isTranslating = false,
  translatedChapterTitle
}) => {
  const { getTranslation } = useTranslations();
  const [showImageSettingsPopover, setShowImageSettingsPopover] = useState(false);
  const getLocalTranslation = (key: string) => {
    const lang = getCurrentLanguage();
    const dict = otherUsersBooksTranslations;
    return dict[lang]?.[key] || dict['en']?.[key] || getTranslation(key);
  };
  const [isAddingFavorite, setIsAddingFavorite] = useState(false);
  const [isEditingFavorite, setIsEditingFavorite] = useState(false);
  const [favoriteLabel, setFavoriteLabel] = useState('');
  const [existingFavorite, setExistingFavorite] = useState<BookmarkType | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const hasMovedRef = React.useRef(false);

  // TTS parameters
  const [showTtsMenu, setShowTtsMenu] = useState(false);
  const [ttsRate, setTtsRate] = useState(1);
  const [ttsLang, setTtsLang] = useState('pt-BR');
  const [ttsVoiceURI, setTtsVoiceURI] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const ttsHeartbeatRef = useRef<any>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsIndexRef = useRef<number>(0);
  const isSpeakingRef = useRef<boolean>(false);
  const ttsContainerRef = useRef<HTMLDivElement>(null);

  // Close TTS menu on click outside (including clicking into reading area)
  useEffect(() => {
    if (!showTtsMenu) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (ttsContainerRef.current && !ttsContainerRef.current.contains(e.target as Node)) {
        setShowTtsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [showTtsMenu]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (ttsHeartbeatRef.current) {
      clearInterval(ttsHeartbeatRef.current);
      ttsHeartbeatRef.current = null;
    }
    ttsQueueRef.current = [];
    ttsIndexRef.current = 0;
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  React.useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, [stopSpeaking]);

  React.useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      }
    };
    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Auto detect language on chapter change
  React.useEffect(() => {
    if (currentChapter && currentChapter.content) {
      const stripped = currentChapter.content.replace(/<[^>]*>/g, '').substring(0, 3000);
      const textLower = stripped.toLowerCase();
      
      const enCount = (textLower.match(/\b(the|and|of|to|for|with|that)\b/g) || []).length;
      const ptCount = (textLower.match(/\b(o|e|a|os|as|que|para|com|uma|um|do|da|em)\b/g) || []).length;
      const esCount = (textLower.match(/\b(el|y|la|los|las|que|para|con|una|un|del|en)\b/g) || []).length;

      if (ptCount > enCount && ptCount > esCount) {
        setTtsLang('pt-BR');
      } else if (esCount > enCount && esCount > ptCount) {
        setTtsLang('es-ES');
      } else {
        setTtsLang('en-US');
      }
    }
  }, [currentChapter]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    hasMovedRef.current = false;
    e.stopPropagation();
  };

  const handleDrag = React.useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !onButtonXChange) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const percentage = (clientX / window.innerWidth) * 100;
    const clampedPercentage = Math.max(5, Math.min(95, percentage));
    
    if (Math.abs(clampedPercentage - buttonX) > 0.5) {
      hasMovedRef.current = true;
    }
    
    onButtonXChange(clampedPercentage);
  }, [isDragging, onButtonXChange, buttonX]);

  const handleDragEnd = React.useCallback(() => {
    // Small delay to ensure click handler can check hasMovedRef
    setTimeout(() => {
      setIsDragging(false);
    }, 10); // Reduced delay
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

  const progressPercentage = (chapterProgress / totalChapters) * 100;

  // Get icon visibility settings with safe key-level defaults
  const rawIconVisibility = preferences?.iconVisibility || {};
  const defaultIconVisibility = {
    showSearchIcon: true,
    showBookmarkIcon: true,
    showFavoriteIcon: true,
    showShareIcon: false,
    showFullscreenIcon: false,
    showShortcutsIcon: false,
    showTranslateIcon: true
  };
  const iconVisibility = {
    showSearchIcon: rawIconVisibility.showSearchIcon !== undefined ? rawIconVisibility.showSearchIcon : defaultIconVisibility.showSearchIcon,
    showBookmarkIcon: rawIconVisibility.showBookmarkIcon !== undefined ? rawIconVisibility.showBookmarkIcon : defaultIconVisibility.showBookmarkIcon,
    showFavoriteIcon: rawIconVisibility.showFavoriteIcon !== undefined ? rawIconVisibility.showFavoriteIcon : defaultIconVisibility.showFavoriteIcon,
    showShareIcon: rawIconVisibility.showShareIcon !== undefined ? rawIconVisibility.showShareIcon : defaultIconVisibility.showShareIcon,
    showFullscreenIcon: rawIconVisibility.showFullscreenIcon !== undefined ? rawIconVisibility.showFullscreenIcon : defaultIconVisibility.showFullscreenIcon,
    showShortcutsIcon: rawIconVisibility.showShortcutsIcon !== undefined ? rawIconVisibility.showShortcutsIcon : defaultIconVisibility.showShortcutsIcon,
    showTranslateIcon: rawIconVisibility.showTranslateIcon !== undefined ? rawIconVisibility.showTranslateIcon : defaultIconVisibility.showTranslateIcon,
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: book.title,
          text: `Reading "${book.title}" by ${book.author}`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Check if current chapter is favorited
  React.useEffect(() => {
    const checkFavorite = async () => {
      if (!book.id || chapterProgress === undefined) return;
      
      try {
        const bookmarks = await getBookmarks(book.id);
        const favorite = bookmarks.find(b => 
          b.chapterIndex === chapterProgress - 1 && b.type === 'favorite'
        );
        setExistingFavorite(favorite || null);
      } catch (error) {
        console.error('Error checking favorite:', error);
      }
    };

    checkFavorite();
    
    // Listen for bookmark changes to update state
    window.addEventListener('bookmarkAdded', checkFavorite);
    window.addEventListener('bookmarkDeleted', checkFavorite);
    return () => {
      window.removeEventListener('bookmarkAdded', checkFavorite);
      window.removeEventListener('bookmarkDeleted', checkFavorite);
    };
  }, [book.id, chapterProgress]);

  const handleFavoriteClick = () => {
    if (existingFavorite) {
      // Already favorited - show edit/delete options
      setIsEditingFavorite(true);
      setFavoriteLabel(existingFavorite.label || '');
    } else {
      if (preferences?.enableFastFavorite && preferences?.fastFavoriteName) {
        // Fast favorite - save immediately with default name
        handleSaveFavorite(preferences.fastFavoriteName);
      } else {
        // Regular favorite - show input dialog
        setIsAddingFavorite(true);
        setFavoriteLabel('');
      }
    }
  };

  const handleSaveFavorite = async (label: string) => {
    if (!currentChapter || !label.trim()) return;

    const bookmark: BookmarkType = {
      id: existingFavorite?.id || `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId: book.id,
      chapterIndex: chapterProgress - 1,
      position: window.scrollY,
      text: `Chapter: ${currentChapter.title}`,
      label: label.trim(),
      createdAt: existingFavorite?.createdAt || new Date(),
      type: 'favorite'
    };

    try {
      await saveBookmark(bookmark);
      setIsAddingFavorite(false);
      setIsEditingFavorite(false);
      setFavoriteLabel('');
      
      // Trigger update
      window.dispatchEvent(new CustomEvent('bookmarkAdded'));
      
      // Show success feedback
      const button = document.querySelector('[data-favorite-button]') as HTMLElement;
      if (button) {
        button.style.transform = 'scale(1.2)';
        setTimeout(() => {
          button.style.transform = 'scale(1)';
        }, 200);
      }
    } catch (error) {
      console.error('Error saving favorite:', error);
      alert('Failed to save favorite. Please try again.');
    }
  };

  const handleDeleteFavorite = async () => {
    if (!existingFavorite) return;

    try {
      await deleteBookmark(existingFavorite.id);
      setIsEditingFavorite(false);
      setExistingFavorite(null);
      
      // Trigger update
      window.dispatchEvent(new CustomEvent('bookmarkDeleted'));
    } catch (error) {
      console.error('Error deleting favorite:', error);
      alert('Failed to delete favorite.');
    }
  };

  const handleTextToSpeech = () => {
    if (!currentChapter || !preferences?.enableTextToSpeech) return;

    if (isSpeaking) {
      stopSpeaking();
    } else {
      stopSpeaking();
      const content = currentChapter.content || '';
      const text = content.replace(/<[^>]*>/g, '').trim();
      if (!text) return;

      // Segment text into natural sentence chunks (120-250 characters) to prevent Chromium freeze
      const rawSentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
      const chunks: string[] = [];
      let currentChunk = '';

      for (const sentence of rawSentences) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;
        if ((currentChunk + ' ' + trimmed).length > 200 && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = trimmed;
        } else {
          currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
        }
      }
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      if (chunks.length === 0) return;

      ttsQueueRef.current = chunks;
      ttsIndexRef.current = 0;
      isSpeakingRef.current = true;
      setIsSpeaking(true);

      const speakNextChunk = () => {
        if (!isSpeakingRef.current) return;
        if (ttsIndexRef.current >= ttsQueueRef.current.length) {
          stopSpeaking();
          return;
        }

        const chunkText = ttsQueueRef.current[ttsIndexRef.current];
        const utterance = new SpeechSynthesisUtterance(chunkText);
        utterance.rate = ttsRate;
        utterance.lang = ttsLang;

        if (ttsVoiceURI) {
          const foundVoice = availableVoices.find(v => v.voiceURI === ttsVoiceURI);
          if (foundVoice) utterance.voice = foundVoice;
        } else {
          const langVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(ttsLang.substring(0, 2).toLowerCase()));
          if (langVoice) utterance.voice = langVoice;
        }

        utterance.onend = () => {
          if (!isSpeakingRef.current) return;
          ttsIndexRef.current++;
          speakNextChunk();
        };

        utterance.onerror = (err) => {
          console.warn('TTS utterance playback error:', err);
          if (!isSpeakingRef.current) return;
          ttsIndexRef.current++;
          if (ttsIndexRef.current < ttsQueueRef.current.length) {
            speakNextChunk();
          } else {
            stopSpeaking();
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      // Heartbeat: pause and resume every 10 seconds to prevent Chromium's silent speech termination
      if (ttsHeartbeatRef.current) clearInterval(ttsHeartbeatRef.current);
      ttsHeartbeatRef.current = setInterval(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      speakNextChunk();
    }
  };

  // Get interface theme styles
  const getInterfaceStyles = () => {
    if (!preferences?.selectedInterfaceTheme) {
      return {
        backgroundColor: '#ffffff',
        color: '#1f2937',
        borderColor: '#e5e7eb'
      };
    }

    const theme = getInterfaceTheme(
      preferences.selectedInterfaceTheme,
      preferences.snowSubTheme || 'day',
      preferences.menuStyle || 'classic',
      preferences.linkStyleWithTheme !== false
    );
    
    let colors = theme.colors;
    if (preferences.selectedInterfaceTheme === 'custom' && preferences.interfaceColors) {
      colors = preferences.interfaceColors;
    }

    return {
      backgroundColor: colors.headerBackground,
      color: colors.headerText,
      borderColor: colors.headerBorder
    };
  };

  const getTranslationButtonColor = () => {
    if (isBackendOnline) {
      return isAutoTranslateActive ? '#3b82f6' : '#10b981'; // Blue if active, Green if inactive
    } else {
      return isAutoTranslateActive ? '#8b5cf6' : '#ef4444'; // Purple if active (but offline), Red if inactive
    }
  };

  const getTranslationButtonTooltip = () => {
    if (isBackendOnline) {
      return isAutoTranslateActive 
        ? getTranslation('offlineTranslateActive') 
        : getTranslation('offlineTranslateInactive');
    } else {
      return isAutoTranslateActive 
        ? getTranslation('offlineTranslateWarning') 
        : getTranslation('offlineTranslateOffline');
    }
  };

  if (isFullscreen && !preferences?.showTopBarInFullScreen) {
    return null;
  }

  const isDarkTheme = preferences?.selectedInterfaceTheme === 'dark' || 
                      preferences?.selectedInterfaceTheme === 'ocean' || 
                      (preferences?.selectedInterfaceTheme === 'aurora' && preferences?.snowSubTheme !== 'day') || 
                      preferences?.selectedInterfaceTheme === 'highcontrast' || 
                      preferences?.snowSubTheme === 'night' || 
                      preferences?.snowSubTheme === 'midnight';
  const glassEnabled = (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);

  const interfaceStyles = getInterfaceStyles();

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

  return (
    <> {/* Use a React Fragment to return multiple top-level elements */}
      <header 
        className={`${
          preferences?.fixedTopBar ?? true ? 'fixed' : 'absolute'
        } top-0 left-0 right-0 z-50 transition-all duration-200 ease-in-out ${
          isMinimized ? '-translate-y-[calc(100%-4px)] border-b-0 shadow-none' : 'translate-y-0 border-b shadow-sm'
        }`}
        style={{
          backgroundColor: interfaceStyles.backgroundColor,
          borderColor: interfaceStyles.borderColor,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
             'Georgia, serif') : undefined
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        </div>
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
          <div className="flex items-center justify-between h-16">
            {/* Left section */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBackToLibrary}
                className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                style={{ color: interfaceStyles.color }}
                aria-label={getTranslation('backToLibrary')}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={onToggleMenu}
                className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                style={{ color: interfaceStyles.color }}
                aria-label={getTranslation('tableOfContents')}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* User Profile Switcher on Top-Bar */}
              <UserProfileSwitcher interfaceStyles={interfaceStyles} preferences={preferences} />

              {/* Text-to-Speech Button & Control Menu */}
              {preferences?.enableTextToSpeech && (
                <div className="relative" ref={ttsContainerRef}>
                  <button
                    onClick={() => setShowTtsMenu(!showTtsMenu)}
                    className={`p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors ${
                      isSpeaking || showTtsMenu ? 'bg-blue-100 bg-opacity-20' : ''
                    }`}
                    style={{ color: isSpeaking ? '#3b82f6' : interfaceStyles.color }}
                    aria-label="Text to speech settings"
                  >
                    <Volume2 className="w-5 h-5" />
                  </button>

                  {showTtsMenu && (
                    <div 
                      className="tts-menu-container absolute top-full left-0 mt-2 w-72 rounded-xl shadow-xl border p-4 z-50 animate-fade-in text-xs relative overflow-hidden"
                      data-modal="true"
                      style={{
                        backgroundColor: interfaceStyles.backgroundColor,
                        borderColor: interfaceStyles.borderColor,
                        color: interfaceStyles.color
                      }}
                    >
                      <InterfaceEffectsOverlay preferences={preferences} target="interface" />
                      <div className="relative z-10 flex flex-col gap-3.5">
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: interfaceStyles.borderColor }}>
                        <span className="font-bold text-sm">{getTranslation('ttsTitle') || 'Leitura por Voz (TTS)'}</span>
                        <button 
                          onClick={() => setShowTtsMenu(false)}
                          className="hover:opacity-75 p-0.5 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Speed Slider */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold opacity-80">{getTranslation('ttsSpeed') || 'Velocidade'}:</span>
                          <span className="font-mono font-bold text-blue-500">{ttsRate.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={ttsRate}
                          onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>

                      {/* Language Selector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold opacity-80">{getTranslation('ttsLanguage') || 'Idioma'}:</span>
                        <select
                          value={ttsLang}
                          onChange={(e) => {
                            setTtsLang(e.target.value);
                            setTtsVoiceURI(''); // reset selected voice when lang changes
                          }}
                          className="w-full p-2 border rounded-lg bg-transparent text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        >
                          <option value="pt-BR" className="bg-white text-gray-900">Português (Brasil)</option>
                          <option value="en-US" className="bg-white text-gray-900">English (USA)</option>
                          <option value="es-ES" className="bg-white text-gray-900">Español (España)</option>
                        </select>
                      </div>

                      {/* Voice Selector */}
                      <div className="flex flex-col gap-1.5">
                        <span className="font-semibold opacity-80">{getTranslation('ttsVoice') || 'Voz'}:</span>
                        <select
                          value={ttsVoiceURI}
                          onChange={(e) => setTtsVoiceURI(e.target.value)}
                          className="w-full p-2 border rounded-lg bg-transparent text-xs outline-none focus:ring-1 focus:ring-blue-500"
                          style={{ borderColor: interfaceStyles.borderColor }}
                        >
                          <option value="" className="bg-white text-gray-900">{getTranslation('ttsDefaultVoice') || 'Voz Padrão do Sistema'}</option>
                          {availableVoices
                            .filter(v => v.lang.toLowerCase().startsWith(ttsLang.substring(0, 2).toLowerCase()))
                            .map(voice => (
                              <option key={voice.voiceURI} value={voice.voiceURI} className="bg-white text-gray-900">
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Play/Stop Button inside the TTS Menu */}
                      <button
                        onClick={() => {
                          handleTextToSpeech();
                        }}
                        className={`w-full py-2.5 px-4 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 text-white shadow ${
                          isSpeaking 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        <Volume2 className="w-4 h-4" />
                        {isSpeaking ? (getTranslation('ttsStopReading') || 'Parar Leitura') : (getTranslation('ttsStartReading') || 'Iniciar Leitura')}
                      </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Shortcuts Icon */}
              {iconVisibility.showShortcutsIcon && (
                <button
                  onClick={() => setShowShortcutsModal(true)}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('shortcuts')}
                >
                  <Keyboard className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Center section - Book info */}
            <div className="flex-1 min-w-0 mx-4 flex flex-col items-center">
              <div className="flex items-center gap-3 max-w-full">
                <div className="text-center min-w-0">
                  <h1 className="text-sm sm:text-base font-semibold truncate" style={{ color: interfaceStyles.color }}>
                    {translatedChapterTitle || currentChapter?.title || book.title}
                  </h1>
                  <p className="text-[10px] sm:text-xs truncate font-medium" style={{ color: interfaceStyles.color, opacity: 0.85 }}>
                    {book.author ? `${book.author} • ` : ''}{getTranslation('chapter')} {chapterProgress} {getTranslation('of')} {totalChapters}
                  </p>
                </div>

                {/* PDF Mode Toggle */}
                {book.fileType === 'pdf' && onTogglePdfMode && (
                  <button
                    onClick={onTogglePdfMode}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold transition-all duration-300 shrink-0 border-2 ${
                      pdfMode 
                        ? 'bg-red-600 border-red-700 text-white shadow-lg scale-105' 
                        : 'bg-gray-100 bg-opacity-20 border-transparent hover:border-red-500 hover:bg-opacity-30'
                    }`}
                    style={{ 
                      color: pdfMode ? '#ffffff' : interfaceStyles.color,
                      backgroundColor: pdfMode ? '#dc2626' : undefined
                    }}
                    title={pdfMode ? 'Switch to Text Mode' : 'Switch to Original PDF Mode'}
                  >
                    <div className="flex items-center gap-1">
                      <span className="bg-white text-red-600 px-1 rounded-[2px] text-[8px] font-black leading-none py-0.5">PDF</span>
                      <Eye className="w-3 h-3" />
                      <span className="hidden sm:inline uppercase tracking-wider">{pdfMode ? getTranslation('pdfOriginal') : getTranslation('pdfText')}</span>
                    </div>
                  </button>
                )}

                {/* Fast Image Settings Quick Icon Button for PDF and image-enabled books */}
                {(book.fileType === 'pdf' || book.fileType === 'cbz' || book.fileType === 'cbr') && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowImageSettingsPopover(prev => !prev)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold transition-all duration-200 shrink-0 border cursor-pointer ${
                        showImageSettingsPopover
                          ? 'border-blue-500 shadow-md scale-105'
                          : 'border-transparent hover:border-blue-400/50 bg-black/5 dark:bg-white/10'
                      }`}
                      style={{
                        backgroundColor: showImageSettingsPopover ? `${interfaceStyles.accent}25` : undefined,
                        color: interfaceStyles.color
                      }}
                      title={getLocalTranslation('imageSettings')}
                    >
                      <span 
                        className="px-1 rounded-[2px] text-[8px] font-black leading-none py-0.5 text-white"
                        style={{ backgroundColor: interfaceStyles.accent }}
                      >
                        IMG
                      </span>
                      <Sliders className="w-3 h-3" />
                      <span className="hidden md:inline uppercase tracking-wider text-[9px] font-black">
                        {preferences?.imageScale ? `${preferences.imageScale}%` : '100%'}
                      </span>
                    </button>

                    {/* Popover */}
                    {showImageSettingsPopover && (
                      <div 
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-72 sm:w-80 rounded-2xl shadow-2xl border p-4 z-50 animate-scale-in text-left backdrop-blur-md"
                        style={{
                          backgroundColor: interfaceStyles.panelBackground || interfaceStyles.backgroundColor,
                          color: interfaceStyles.color,
                          borderColor: interfaceStyles.borderColor || 'rgba(0,0,0,0.15)',
                          boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.35)'
                        }}
                      >
                        <div className="flex items-center justify-between pb-2 mb-3 border-b" style={{ borderColor: interfaceStyles.borderColor }}>
                          <div className="flex items-center gap-2">
                            <Sliders className="w-4 h-4" style={{ color: interfaceStyles.accent }} />
                            <span className="text-xs font-black uppercase tracking-wider">
                              {getLocalTranslation('imageSettings')}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowImageSettingsPopover(false)}
                            className="p-1 rounded-lg hover:opacity-75 transition-opacity cursor-pointer"
                            style={{ color: interfaceStyles.color }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Image Size / Scale Slider */}
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span>{getLocalTranslation('imageScale')}</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded font-black" style={{ backgroundColor: `${interfaceStyles.accent}20`, color: interfaceStyles.accent }}>
                              {preferences?.imageScale ?? 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="160"
                            step="5"
                            value={preferences?.imageScale ?? 100}
                            onChange={(e) => {
                              if (onPreferencesChange && preferences) {
                                onPreferencesChange({
                                  ...preferences,
                                  imageScale: Number(e.target.value)
                                });
                              }
                            }}
                            className="w-full accent-blue-600 h-1.5 rounded-lg cursor-pointer"
                          />
                          <div className="flex items-center justify-between gap-1 pt-1">
                            {[50, 75, 100, 125, 150].map((scaleVal) => (
                              <button
                                key={scaleVal}
                                type="button"
                                onClick={() => {
                                  if (onPreferencesChange && preferences) {
                                    onPreferencesChange({
                                      ...preferences,
                                      imageScale: scaleVal
                                    });
                                  }
                                }}
                                className={`flex-1 py-1 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                                  (preferences?.imageScale ?? 100) === scaleVal
                                    ? 'border-blue-500 font-black'
                                    : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                                style={{
                                  backgroundColor: (preferences?.imageScale ?? 100) === scaleVal ? `${interfaceStyles.accent}25` : 'rgba(0,0,0,0.05)',
                                  color: interfaceStyles.color
                                }}
                              >
                                {scaleVal}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Reading Flow Mode: Continuous vs Paginated */}
                        <div className="space-y-1.5 mb-4">
                          <label className="text-xs font-bold block mb-1">
                            {getLocalTranslation('readingMode')}
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onPreferencesChange && preferences) {
                                  onPreferencesChange({
                                    ...preferences,
                                    imageReadingMode: 'continuous'
                                  });
                                }
                              }}
                              className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                (preferences?.imageReadingMode ?? 'continuous') === 'continuous'
                                  ? 'border-blue-500 shadow-xs font-black'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: (preferences?.imageReadingMode ?? 'continuous') === 'continuous' ? `${interfaceStyles.accent}20` : 'rgba(0,0,0,0.04)',
                                borderColor: (preferences?.imageReadingMode ?? 'continuous') === 'continuous' ? interfaceStyles.accent : interfaceStyles.borderColor,
                                color: interfaceStyles.color
                              }}
                            >
                              <span>{getLocalTranslation('continuousScroll')}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (onPreferencesChange && preferences) {
                                  onPreferencesChange({
                                    ...preferences,
                                    imageReadingMode: 'paginated'
                                  });
                                }
                              }}
                              className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                                preferences?.imageReadingMode === 'paginated'
                                  ? 'border-blue-500 shadow-xs font-black'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                              style={{
                                backgroundColor: preferences?.imageReadingMode === 'paginated' ? `${interfaceStyles.accent}20` : 'rgba(0,0,0,0.04)',
                                borderColor: preferences?.imageReadingMode === 'paginated' ? interfaceStyles.accent : interfaceStyles.borderColor,
                                color: interfaceStyles.color
                              }}
                            >
                              <span>{getLocalTranslation('paginatedMode')}</span>
                            </button>
                          </div>
                        </div>

                        {/* Show/Hide PDF Visual Images in Text Mode */}
                        <div className="pt-2 border-t flex items-center justify-between" style={{ borderColor: interfaceStyles.borderColor }}>
                          <div>
                            <span className="text-xs font-bold block">
                              {getLocalTranslation('showPdfImages')}
                            </span>
                            <span className="text-[9px] opacity-60 block leading-tight">
                              {getLocalTranslation('showPdfImagesDesc')}
                            </span>
                          </div>
                          <input
                            type="checkbox"
                            checked={preferences?.showPdfImages ?? true}
                            onChange={(e) => {
                              if (onPreferencesChange && preferences) {
                                onPreferencesChange({
                                  ...preferences,
                                  showPdfImages: e.target.checked
                                });
                              }
                            }}
                            className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
                <div
                  className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%`, backgroundColor: '#007BFF' }}
                />
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2">
              {/* Search Icon */}
              {iconVisibility.showSearchIcon && (
                <button
                  onClick={onToggleSearch}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('search')}
                >
                  <Search className="w-5 h-5" />
                </button>
              )}

              {/* Bookmark Icon */}
              {iconVisibility.showBookmarkIcon && (
                <button
                  onClick={onToggleBookmarks}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('bookmarks')}
                >
                  <Bookmark className="w-5 h-5" />
                </button>
              )}

              {/* Favorite Icon */}
              {iconVisibility.showFavoriteIcon && (
                <button
                  onClick={handleFavoriteClick}
                  className={`p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 ${
                    existingFavorite ? 'scale-110' : ''
                  }`}
                  style={{ 
                    color: existingFavorite ? '#ef4444' : interfaceStyles.color 
                  }}
                  aria-label={getTranslation('addToFavorites')}
                  data-favorite-button
                >
                  <Heart className={`w-5 h-5 ${existingFavorite ? 'fill-current' : ''}`} />
                </button>
              )}

              {/* Share Icon */}
              {iconVisibility.showShareIcon && (
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('share')}
                >
                  <Share2 className="w-5 h-5" />
                </button>
              )}

              {/* LibreTranslate Offline Translation Icon */}
              {iconVisibility.showTranslateIcon !== false && onToggleTranslateModal && (
                <button
                  onClick={onToggleTranslateModal}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 relative group flex items-center justify-center cursor-pointer"
                  style={{ color: getTranslationButtonColor() }}
                  title={getTranslationButtonTooltip()}
                  aria-label="Offline Translation"
                >
                  {isTranslating ? (
                    <Loader2 className="w-5 h-5 relative z-10 animate-spin" />
                  ) : (
                    <Languages className="w-5 h-5 relative z-10 hover:scale-110 transition-transform duration-300" />
                  )}
                </button>
              )}

              {/* Settings Icon */}
              <button
                onClick={onToggleSettings}
                className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 relative group"
                style={{ color: interfaceStyles.color }}
                aria-label={getTranslation('settings')}
              >
                <Settings className="w-5 h-5 relative z-10 group-hover:rotate-45 transition-transform duration-200" />
              </button>

              {/* Fullscreen Icon */}
              {iconVisibility.showFullscreenIcon && (
                <button
                  onClick={onToggleFullscreen}
                  className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-colors"
                  style={{ color: interfaceStyles.color }}
                  aria-label={getTranslation('fullscreen')}
                >
                  <Maximize className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Minimize/Maximize Toggle Button - Only visible in fullscreen if Top-Bar Fixed is active */}
        {(!isFullscreen || (preferences?.fixedTopBar ?? true)) && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // If we didn't move much, it's a click
              if (!hasMovedRef.current) {
                onToggleMinimize?.();
              }
            }}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className={`absolute bottom-0 translate-y-full px-3 py-0.5 rounded-b-lg shadow-sm border-x border-b opacity-50 hover:opacity-100 transition-all duration-300 hover:pb-1 group cursor-grab active:cursor-grabbing z-50 ${
              isDragging ? 'scale-105 shadow-md z-[60] opacity-100' : ''
            }`}
            style={{ 
              backgroundColor: interfaceStyles.backgroundColor,
              borderColor: interfaceStyles.borderColor,
              borderStyle: preferences?.selectedInterfaceTheme === 'light' ? 'dashed' : undefined,
              color: interfaceStyles.color,
              left: `${buttonX}%`,
              transform: `translateX(-50%) translateY(100%)`
            }}
            aria-label={isMinimized ? "Show header" : "Hide header"}
          >
            {isMinimized ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
            )}
          </button>
        )}
      </header>

      {/* Favorite Input Modal */}
      {isAddingFavorite && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            setIsAddingFavorite(false);
            setFavoriteLabel('');
          }}
          style={{
            backgroundColor: overlayBg,
            backdropFilter: backdropFilterVal,
            WebkitBackdropFilter: backdropFilterVal,
          }}
        >
          <div 
            className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in border relative overflow-hidden"
            data-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor,
              color: interfaceStyles.color,
              borderColor: interfaceStyles.borderColor,
              backdropFilter: glassEnabled ? 'blur(10px)' : undefined,
              WebkitBackdropFilter: glassEnabled ? 'blur(10px)' : undefined,
            }}
          >
            <InterfaceEffectsOverlay preferences={preferences} target="interface" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <Heart className="w-6 h-6 text-red-500 fill-current" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{getTranslation('saveCurrentChapter')}</h3>
                  <p className="text-xs opacity-60">{getTranslation('favoriteDescription')}</p>
                </div>
              </div>

              <input
                type="text"
                placeholder={getTranslation('enterBookmarkName')}
                value={favoriteLabel}
                onChange={(e) => setFavoriteLabel(e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6 transition-all"
                style={{
                  backgroundColor: glassEnabled ? 'rgba(0, 0, 0, 0.05)' : interfaceStyles.backgroundColor,
                  color: interfaceStyles.color,
                  borderColor: interfaceStyles.borderColor
                }}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && favoriteLabel.trim()) {
                    handleSaveFavorite(favoriteLabel);
                  }
                }}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => favoriteLabel.trim() && handleSaveFavorite(favoriteLabel)}
                  disabled={!favoriteLabel.trim()}
                  className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {getTranslation('save')}
                </button>
                <button
                  onClick={() => {
                    setIsAddingFavorite(false);
                    setFavoriteLabel('');
                  }}
                  className="px-6 py-3 border rounded-xl font-medium hover:bg-gray-50 hover:bg-opacity-10 transition-all duration-300 cursor-pointer"
                  style={{ 
                    borderColor: interfaceStyles.borderColor,
                    color: interfaceStyles.color
                  }}
                >
                  {getTranslation('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Delete Favorite Modal */}
      {isEditingFavorite && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsEditingFavorite(false)}
          style={{
            backgroundColor: overlayBg,
            backdropFilter: backdropFilterVal,
            WebkitBackdropFilter: backdropFilterVal,
          }}
        >
          <div 
            className="rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-scale-in border relative overflow-hidden"
            data-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor,
              color: interfaceStyles.color,
              borderColor: interfaceStyles.borderColor,
              backdropFilter: glassEnabled ? 'blur(10px)' : undefined,
              WebkitBackdropFilter: glassEnabled ? 'blur(10px)' : undefined,
            }}
          >
            <InterfaceEffectsOverlay preferences={preferences} target="interface" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-500" />
                  {getTranslation('editFavorite')}
                </h3>
                <button 
                  onClick={() => setIsEditingFavorite(false)}
                  className="p-1 hover:bg-gray-100 hover:bg-opacity-10 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium opacity-60 px-1">
                    {getTranslation('bookmarkLabel')}
                  </label>
                  <input
                    type="text"
                    value={favoriteLabel}
                    onChange={(e) => setFavoriteLabel(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{
                      backgroundColor: glassEnabled ? 'rgba(0, 0, 0, 0.05)' : interfaceStyles.backgroundColor,
                      color: interfaceStyles.color,
                      borderColor: interfaceStyles.borderColor
                    }}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => handleSaveFavorite(favoriteLabel)}
                    disabled={!favoriteLabel.trim() || favoriteLabel === existingFavorite?.label}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-blue-500/20 cursor-pointer"
                  >
                    {getTranslation('save')}
                  </button>
                  
                  <button
                    onClick={handleDeleteFavorite}
                    className="w-full py-3 px-4 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    {getTranslation('deleteFavorite')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Modal */}
      {showShortcutsModal && (
        <ShortcutsModal 
          onClose={() => setShowShortcutsModal(false)} 
          preferences={preferences} 
        />
      )}
    </>
  );
};
