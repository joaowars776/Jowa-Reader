import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ReaderHeader } from './ReaderHeader';
import { ReaderContent } from './ReaderContent';
import { TableOfContents } from './TableOfContents';
import { ReaderSettings } from './ReaderSettings';
import { SearchModal } from './SearchModal';
import { LibreTranslateModal } from './LibreTranslateModal';
import { getCurrentLanguage, AVAILABLE_LANGUAGES } from '../../utils/translations';
import { BookmarksPanel } from './BookmarksPanel';
import { CornerNavigation } from './CornerNavigation';
import { useReadingProgress } from '../../hooks/useReadingProgress';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { getPreferences, savePreferences, saveNavigationState, logError, getHeaderButtonPosition, saveHeaderButtonPosition, getCachedPreferences, DEFAULT_PREFERENCES, ensurePreferencesDefaults, getBook, saveBook, getUsername } from '../../utils/storage';
import { applyInterfaceTheme, getInterfaceTheme, COLOR_THEMES, applyPreferencesTheme, getColorTheme, INTERFACE_THEMES } from '../../utils/themes';
import { createParserForFile } from '../../utils/file-parser';
import { EpubParser } from '../../utils/epub-parser';
import { PdfParser } from '../../utils/pdf-parser';
import { MobiParser } from '../../utils/mobi-parser';
import { KfxParser } from '../../utils/kfx-parser';
import { startReadingSession, endReadingSession, changeChapter, updateReadingActivity } from '../../utils/reading-tracker';
import { SnowEffect } from '../SnowEffect';
import { RainEffect } from '../RainEffect';
import { PetalEffect } from '../PetalEffect';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';
import { getBookCache, setBookCache } from '../../utils/book-cache';
import type { Book, Chapter, ReadingPreferences, SearchResult } from '../../types';

interface ReaderContainerProps {
  book: Book;
  onBackToLibrary: () => void;
  preferences: ReadingPreferences | null;
  onPreferencesChange: (newPrefs: ReadingPreferences) => void;
}

export const ReaderContainer: React.FC<ReaderContainerProps> = ({ 
  book, 
  onBackToLibrary, 
  preferences: propPreferences, 
  onPreferencesChange 
}) => {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const setChaptersAndCache = useCallback((updater: Chapter[] | ((prev: Chapter[]) => Chapter[])) => {
    setChapters(prev => {
      const updated = typeof updater === 'function' ? updater(prev) : updater;
      const cached = getBookCache(book.id);
      if (cached) {
        cached.toc = updated;
      }
      return updated;
    });
  }, [book.id]);

  const [currentChapterIndex, setCurrentChapterIndex] = useState(book.currentChapter);
  const preferences = useMemo(() => {
    return ensurePreferencesDefaults(propPreferences || getCachedPreferences() || DEFAULT_PREFERENCES);
  }, [propPreferences]);
  const preferencesRef = React.useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    setTranslatedChapterTitle(null);
  }, [currentChapterIndex]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'appearance' | 'behavior' | 'advanced'>('appearance');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullscreenReading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [parser, setParser] = useState<EpubParser | PdfParser | MobiParser | KfxParser | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [pdfMode, setPdfMode] = useState(false);
  const [isHeaderMinimized, setIsHeaderMinimized] = useState(false);
  const [buttonX, setButtonX] = useState(50);
  const [highlightBookmarkId, setHighlightBookmarkId] = useState<string | null>(null);
  const [searchHighlight, setSearchHighlight] = useState<{ text: string, position: number } | null>(null);

  // LibreTranslate states
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isTranslateModalOpen, setIsTranslateModalOpen] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState(() => {
    try {
      return localStorage.getItem('libretranslate_source') || 'auto';
    } catch {
      return 'auto';
    }
  });
  const [targetLanguage, setTargetLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('libretranslate_target');
      if (saved && AVAILABLE_LANGUAGES.some(l => l.code === saved)) {
        return saved;
      }
    } catch (err) {
      console.warn('Could not read target language:', err);
    }
    const browserLang = navigator.language.split('-')[0];
    const isSupported = AVAILABLE_LANGUAGES.some(l => l.code === browserLang);
    return isSupported ? browserLang : 'en';
  });
  const [lastDetectedLanguage, setLastDetectedLanguage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedChapterTitle, setTranslatedChapterTitle] = useState<string | null>(null);

  const [isAutoTranslateActive, setIsAutoTranslateActive] = useState(() => {
    try {
      return localStorage.getItem('libretranslate_auto_active') === 'true';
    } catch {
      return false;
    }
  });

  const checkTranslationBackend = useCallback(async () => {
    const engine = typeof window !== 'undefined' ? (localStorage.getItem('translation_engine') || 'libretranslate') : 'libretranslate';

    if (engine === 'ollama') {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const url = localStorage.getItem('ollama_url') || 'http://127.0.0.1:11434';
        const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
        const res = await fetch(`${cleanUrl}/api/tags`, {
          method: 'GET',
          signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
          setIsBackendOnline(true);
          return true;
        }
      } catch {
        setIsBackendOnline(false);
        return false;
      }
      setIsBackendOnline(false);
      return false;
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);

      // Try languages endpoint first
      const response = await fetch('http://127.0.0.1:5000/languages', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(id);
      if (response.ok) {
        setIsBackendOnline(true);
        return true;
      }
    } catch {
      // Fallback to pinging root with no-cors
    }

    try {
      const rootController = new AbortController();
      const rootId = setTimeout(() => rootController.abort(), 1000);
      await fetch('http://127.0.0.1:5000/', {
        method: 'GET',
        signal: rootController.signal,
        mode: 'no-cors'
      });
      clearTimeout(rootId);
      setIsBackendOnline(true);
      return true;
    } catch {
      setIsBackendOnline(false);
      return false;
    }
  }, []);

  // Unified helper for isolating particles to interface (top bar & side margins) vs reader area
  const getEffectContainers = useCallback((mode: 'reader' | 'interface' | 'both', prefix: string) => {
    if (!preferences) return [];
    const borderWidth = preferences.sideBordersEnabled ? (preferences.sideBordersWidth ?? 40) : 0;
    const maxWidth = preferences.maxWidth || 'custom';
    
    let sideWidthCSS = '0px';
    if (maxWidth === 'phone') {
      sideWidthCSS = borderWidth > 0 ? `max(${borderWidth}px, calc(50vw - 192px))` : `max(0px, calc(50vw - 192px))`;
    } else if (maxWidth === 'normal') {
      sideWidthCSS = borderWidth > 0 ? `max(${borderWidth}px, calc(50vw - 448px))` : `max(0px, calc(50vw - 448px))`;
    } else {
      sideWidthCSS = borderWidth > 0 ? `${borderWidth}px` : '0px';
    }

    const headerHeight = isHeaderMinimized ? '4px' : '64px';
    const list: Array<{ key: string; style: React.CSSProperties }> = [];

    if (mode === 'reader' || mode === 'both') {
      list.push({
        key: `${prefix}-reader`,
        style: {
          position: 'fixed' as const,
          top: headerHeight,
          bottom: 0,
          left: sideWidthCSS,
          right: sideWidthCSS,
          pointerEvents: 'none' as const,
          overflow: 'hidden' as const,
          zIndex: 40
        }
      });
    }

    if (mode === 'interface' || mode === 'both') {
      list.push(
        {
          key: `${prefix}-top-bar`,
          style: {
            position: 'fixed' as const,
            top: 0,
            height: headerHeight,
            left: 0,
            right: 0,
            pointerEvents: 'none' as const,
            overflow: 'hidden' as const,
            zIndex: 999
          }
        },
        {
          key: `${prefix}-left-border`,
          style: {
            position: 'fixed' as const,
            top: headerHeight,
            bottom: 0,
            left: 0,
            width: sideWidthCSS,
            pointerEvents: 'none' as const,
            overflow: 'hidden' as const,
            zIndex: 999
          }
        },
        {
          key: `${prefix}-right-border`,
          style: {
            position: 'fixed' as const,
            top: headerHeight,
            bottom: 0,
            right: 0,
            width: sideWidthCSS,
            pointerEvents: 'none' as const,
            overflow: 'hidden' as const,
            zIndex: 999
          }
        }
      );
    }

    return list;
  }, [preferences, isHeaderMinimized]);

  // Initial check on mount & listen to engine changes
  useEffect(() => {
    checkTranslationBackend();

    const handleEngineChange = () => {
      checkTranslationBackend();
    };
    window.addEventListener('translationEngineChanged', handleEngineChange);
    return () => window.removeEventListener('translationEngineChanged', handleEngineChange);
  }, [checkTranslationBackend]);

  // Poll translation backend online status ONLY when translation modal is open
  useEffect(() => {
    if (!isTranslateModalOpen) return;

    checkTranslationBackend();
    const interval = setInterval(checkTranslationBackend, 10000);
    return () => clearInterval(interval);
  }, [isTranslateModalOpen, checkTranslationBackend]);

  const handleToggleAutoTranslate = useCallback(() => {
    setIsAutoTranslateActive(prev => {
      const nextValue = !prev;
      try {
        localStorage.setItem('libretranslate_auto_active', String(nextValue));
      } catch (err) {
        console.warn('Could not save auto translate setting:', err);
      }
      return nextValue;
    });
    // Re-check backend status immediately on toggle for quick UI feedback
    checkTranslationBackend();
  }, [checkTranslationBackend]);

  const handleSourceLanguageChange = useCallback((lang: string) => {
    setSourceLanguage(lang);
    try {
      localStorage.setItem('libretranslate_source', lang);
    } catch (err) {
      console.warn('Could not save source language:', err);
    }
  }, []);

  const handleTargetLanguageChange = useCallback((lang: string) => {
    setTargetLanguage(lang);
    try {
      localStorage.setItem('libretranslate_target', lang);
    } catch (err) {
      console.warn('Could not save target language:', err);
    }
  }, []);

  const { updateProgress } = useReadingProgress(book.id, book);

  // Load persisted button position
  useEffect(() => {
    const loadButtonPosition = async () => {
      const x = await getHeaderButtonPosition();
      setButtonX(x);
    };
    loadButtonPosition();
  }, []);

  // Persist button position when it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveHeaderButtonPosition(buttonX);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [buttonX]);

  // Memoize URL-friendly title generation
  const urlFriendlyTitle = useMemo(() => {
    return book.title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }, [book.title]);

  // Memoize current chapter
  const currentChapter = useMemo(() => {
    if (chapters.length === 0 || currentChapterIndex < 0 || currentChapterIndex >= chapters.length) {
      return undefined;
    }
    return chapters[currentChapterIndex];
  }, [chapters, currentChapterIndex]);

  const updateURLTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const updateURL = useCallback((chapterIndex: number) => {
    if (updateURLTimeoutRef.current) clearTimeout(updateURLTimeoutRef.current);
    updateURLTimeoutRef.current = setTimeout(() => {
      if (chapters.length > 0) {
        const newUrl = `/${urlFriendlyTitle}/chapter/${chapterIndex + 1}`;
        window.history.replaceState(
          { bookId: book.id, chapterIndex },
          `${book.title} - Chapter ${chapterIndex + 1}`,
          newUrl
        );
        saveNavigationState(book.id, chapterIndex, window.scrollY);
      }
    }, 100);
  }, [chapters.length, urlFriendlyTitle, book.id, book.title]);

  // Update URL when chapter changes
  useEffect(() => {
    updateURL(currentChapterIndex);
  }, [currentChapterIndex, updateURL]);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.bookId === book.id) {
        setCurrentChapterIndex(event.state.chapterIndex);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [book.id]);

  // Initialize parser and load chapters
  useEffect(() => {
    let isMounted = true;
    let currentParser: EpubParser | PdfParser | null = null;

    const initializeReader = async () => {
      try {
        // Apply current preferences theme immediately on mount to prevent flashes
        const currentPrefs = preferencesRef.current;
        if (currentPrefs && currentPrefs.selectedInterfaceTheme) {
          applyPreferencesTheme(currentPrefs);
        }

        // Check memory cache for instant render
        const cached = getBookCache(book.id);
        if (cached) {
          console.log('Serving book from cache instantly');
          setChapters(cached.toc);
          setParser(cached.parser);
          currentParser = cached.parser;
          if (isMounted) {
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        
        let bookFile = book.file;
        if (!bookFile || (typeof (bookFile as any).size === 'number' && (bookFile as any).size === 0) || (typeof (bookFile as any).arrayBuffer !== 'function' && typeof (bookFile as any).slice !== 'function')) {
          try {
            console.log(`Reader: book.file missing or invalid for "${book.title}". Fetching from server fallback...`);
            const u = getUsername() || 'default';
            const res = await fetch(`/api/book-file/${encodeURIComponent(book.id)}?username=${encodeURIComponent(u)}`, {
              headers: { 'X-Username': u }
            });
            if (res.ok) {
              const blob = await res.blob();
              const ext = book.fileType === 'pdf' ? '.pdf' : '.epub';
              const mime = book.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip';
              bookFile = new File([blob], `${book.title}${ext}`, { type: mime });
              book.file = bookFile;
              // Cache in local DB so next open is instant
              saveBook({ ...book, file: bookFile }, true).catch(() => {});
            }
          } catch (fetchErr) {
            console.warn('Reader fallback file fetch failed:', fetchErr);
          }
        }

        if (!bookFile || (typeof (bookFile as any).size === 'number' && (bookFile as any).size === 0)) {
          throw new Error('Invalid or corrupted file');
        }

        const fileParser = createParserForFile(bookFile, book.fileType);
        await fileParser.initialize();
        currentParser = fileParser;
        
        if (!isMounted) {
          fileParser.destroy();
          return;
        }
        
        // Optimize: Only get TOC first for faster initial load
        const toc = await fileParser.getTableOfContents();
        
        if (!isMounted) {
          fileParser.destroy();
          return;
        }
        
        if (!toc || toc.length === 0) {
          throw new Error('No chapters found in file');
        }

        // Cache count in localStorage & persist in UserData
        try {
          localStorage.setItem(`novel_reader_chapters_count_${book.id}`, String(toc.length));
        } catch (err) {
          // Ignore storage errors
        }

        if (!book.metadata?.chaptersCount || Number(book.metadata.chaptersCount) !== toc.length) {
          getBook(book.id).then(currentB => {
            const b = currentB || book;
            saveBook({
              ...b,
              totalPages: toc.length,
              metadata: {
                ...(b.metadata || {}),
                chaptersCount: toc.length
              }
            }, true).then(() => {
              window.dispatchEvent(new CustomEvent('booksChanged', { detail: { bookId: book.id } }));
            }).catch(() => {});
          }).catch(() => {});
        }
        
        setChaptersAndCache(toc);
        setParser(fileParser);

        // Load current chapter content immediately
        const initialChapterIndex = book.currentChapter;
        let content = '';
        if (toc[initialChapterIndex]) {
          content = await fileParser.getChapterContent(toc[initialChapterIndex].href);
          if (isMounted) {
            setChaptersAndCache(prev => {
              const updated = [...prev];
              if (updated[initialChapterIndex]) {
                updated[initialChapterIndex] = { ...updated[initialChapterIndex], content };
              }
              return updated;
            });
          }
        }

        // Cache the parsed book details for instant loads in future
        setBookCache(book.id, {
          toc,
          parser: fileParser,
          chaptersContent: { [toc[initialChapterIndex]?.href || '']: content }
        });

        console.log('Reader initialized successfully');
      } catch (error) {
        if (!isMounted) return;
        
        console.error('Error initializing reader:', error);
        logError('READER_INIT_FAILED', error, { 
          bookId: book.id, 
          fileSize: book.file?.size,
          fileName: book.file?.name,
          fileType: book.fileType 
        });
        
        alert('Failed to load the book. The file may be corrupted or invalid. Returning to library.');
        onBackToLibrary();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeReader();

    return () => {
      isMounted = false;
      endReadingSession();
      
      // Only destroy parser if it is NOT cached
      if (currentParser && !getBookCache(book.id)) {
        try {
          currentParser.destroy();
        } catch (error) {
          console.warn('Error destroying parser:', error);
        }
      }
    };
  }, [book, setChaptersAndCache, onBackToLibrary]);

  // Start/update reading session when book or chapter changes
  useEffect(() => {
    if (chapters.length > 0 && chapters[currentChapterIndex]) {
      const currentCh = chapters[currentChapterIndex];
      startReadingSession(
        book.id,
        book.title,
        book.author,
        currentChapterIndex,
        currentCh.title,
        book.fileType,
        book.metadata?.tags
      );
    }
  }, [book.id, book.title, book.author, book.fileType, book.metadata?.tags, currentChapterIndex, chapters]);

  // Load chapter content when index changes
  useEffect(() => {
    if (!parser || !chapters || chapters.length === 0 || !chapters[currentChapterIndex] || chapters[currentChapterIndex].content) return;

    let isCurrent = true;

    const loadChapter = async () => {
      try {
        if (parser.isDestroyed) return;
        const chapterToLoad = chapters[currentChapterIndex];
        if (!chapterToLoad) return;
        
        const content = await parser.getChapterContent(chapterToLoad.href);
        if (!isCurrent || parser.isDestroyed) return;
        
        setChaptersAndCache(prev => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          if (updated[currentChapterIndex]) {
            updated[currentChapterIndex] = { ...updated[currentChapterIndex], content };
          }
          return updated;
        });
      } catch (err) {
        console.error('Error loading chapter:', err);
      }
    };

    loadChapter();
    return () => { isCurrent = false; };
  }, [currentChapterIndex, parser, chapters, setChaptersAndCache]);

  // Preload next chapter
  useEffect(() => {
    const nextIndex = currentChapterIndex + 1;
    if (!parser || !chapters || chapters.length === 0 || !chapters[nextIndex] || chapters[nextIndex].content) return;

    let isCurrent = true;

    const preloadNext = async () => {
      try {
        if (parser.isDestroyed) return;
        const chapterToPreload = chapters[nextIndex];
        if (!chapterToPreload) return;
        
        const content = await parser.getChapterContent(chapterToPreload.href);
        if (!isCurrent || parser.isDestroyed) return;
        
        setChaptersAndCache(prev => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          if (updated[nextIndex]) {
            updated[nextIndex] = { ...updated[nextIndex], content };
          }
          return updated;
        });
      } catch {
        // Silent fail for preloading
      }
    };

    // Delay preloading to prioritize current chapter
    const timeoutId = setTimeout(preloadNext, 2000);
    return () => {
      isCurrent = false;
      clearTimeout(timeoutId);
    };
  }, [currentChapterIndex, parser, chapters, setChaptersAndCache]);

  // Optimized progress update with debouncing
  useEffect(() => {
    if (currentChapterIndex === book.currentChapter) return;
    
    const timeoutId = setTimeout(() => {
      updateProgress({
        currentChapter: currentChapterIndex,
        progress: currentChapterIndex / Math.max(chapters.length - 1, 1)
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [currentChapterIndex, chapters, book.currentChapter, updateProgress]);

  // Throttled activity tracking
  useEffect(() => {
    let lastActivity = 0;
    const throttleDelay = 1000; // 1 second throttle

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastActivity > throttleDelay) {
        updateReadingActivity();
        lastActivity = now;
      }
    };

    const events = ['scroll', 'click', 'keydown'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Immediate chapter persistence helper
  const persistChapterProgress = useCallback(async (newIndex: number) => {
    const newProgress = chapters.length > 0 ? newIndex / Math.max(chapters.length - 1, 1) : 0;
    updateProgress({
      currentChapter: newIndex,
      progress: newProgress
    });
    try {
      const currentB = await getBook(book.id) || book;
      await saveBook({
        ...currentB,
        currentChapter: newIndex,
        progress: newProgress,
        lastRead: new Date()
      }, true);
      window.dispatchEvent(new CustomEvent('booksChanged', { detail: { bookId: book.id } }));
    } catch (err) {
      console.warn('Error persisting chapter progress:', err);
    }
  }, [book, chapters.length, updateProgress]);

  // Optimized chapter navigation handlers
  const handleNextChapter = useCallback(async () => {
    if (currentChapterIndex >= chapters.length - 1) return;
    
    const newChapterIndex = currentChapterIndex + 1;
    const newChapter = chapters[newChapterIndex];
    
    setCurrentChapterIndex(newChapterIndex);
    persistChapterProgress(newChapterIndex);
    await changeChapter(newChapterIndex, newChapter.title, true);
  }, [currentChapterIndex, chapters, persistChapterProgress]);

  const handlePreviousChapter = useCallback(async () => {
    if (currentChapterIndex <= 0) return;
    
    const newChapterIndex = currentChapterIndex - 1;
    const newChapter = chapters[newChapterIndex];
    
    setCurrentChapterIndex(newChapterIndex);
    persistChapterProgress(newChapterIndex);
    await changeChapter(newChapterIndex, newChapter.title, false);
  }, [currentChapterIndex, chapters, persistChapterProgress]);

  const handleChapterSelect = useCallback(async (index: number) => {
    if (index === currentChapterIndex || !chapters[index]) return;
    
    const newChapter = chapters[index];
    setCurrentChapterIndex(index);
    setIsMenuOpen(false);
    persistChapterProgress(index);
    await changeChapter(index, newChapter.title, false);
  }, [currentChapterIndex, chapters, persistChapterProgress]);

  const handleExitToLibrary = useCallback(() => {
    if (preferencesTimeoutRef.current) {
      clearTimeout(preferencesTimeoutRef.current);
      preferencesTimeoutRef.current = null;
    }
    savePreferences(preferences).catch(e => console.warn('Error saving preferences on exit:', e));

    try {
      endReadingSession();
    } catch (e) {
      console.warn('Error ending reading session:', e);
    }
    onBackToLibrary();
  }, [preferences, onBackToLibrary]);

  const preferencesTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const handlePreferencesChange = useCallback(async (newPreferences: ReadingPreferences) => {
    // Propagate preference changes to parent App immediately so other views (like Library background effects) stay in sync!
    onPreferencesChange(newPreferences);
    
    // Apply interface theme immediately
    if (newPreferences.selectedInterfaceTheme) {
      applyPreferencesTheme(newPreferences);
    }
    
    // Debounce save operation
    if (preferencesTimeoutRef.current) clearTimeout(preferencesTimeoutRef.current);
    preferencesTimeoutRef.current = setTimeout(async () => {
      try {
        await savePreferences(newPreferences);
      } catch (error) {
        console.error('Error saving preferences:', error);
        logError('SAVE_PREFERENCES_FAILED', error);
      }
    }, 300);
  }, [onPreferencesChange]);

  // Expose to window for components that might need it (like ShortcutsModal)
  useEffect(() => {
    (window as any).onPreferencesChange = handlePreferencesChange;
  }, [handlePreferencesChange]);

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const searchCacheRef = React.useRef(new Map<string, SearchResult[]>());
  
  const handleSearch = useCallback(async (query: string, searchScope: 'chapter' | 'book' = 'chapter') => {
    if (!parser || !query.trim()) {
      setSearchResults([]);
      return;
    }

    const cacheKey = `${query}-${searchScope}-${currentChapterIndex}`;
    
    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      setSearchResults(searchCacheRef.current.get(cacheKey)!);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results;
        
        if (searchScope === 'chapter') {
          if (!currentChapter) {
            setSearchResults([]);
            return;
          }
          
          results = await parser.searchText(query, currentChapterIndex);
        } else {
          results = await parser.searchText(query);
        }

        const formattedResults: SearchResult[] = results.flatMap(({ chapterIndex, matches }) =>
          matches.map(match => ({
            chapterIndex,
            chapterTitle: chapters[chapterIndex]?.title || `Chapter ${chapterIndex + 1}`,
            text: match.text,
            position: match.position,
            matchStart: match.start,
            matchEnd: match.end
          }))
        );

        // Cache results (limit cache size)
        if (searchCacheRef.current.size > 20) {
          const firstKey = searchCacheRef.current.keys().next().value;
          searchCacheRef.current.delete(firstKey);
        }
        searchCacheRef.current.set(cacheKey, formattedResults);
        
        setSearchResults(formattedResults);
      } catch (error) {
        console.error('Error searching:', error);
        logError('SEARCH_FAILED', error, { query, searchScope });
        setSearchResults([]);
      }
    }, 300);
  }, [parser, chapters, currentChapterIndex, currentChapter]);

  const handleSearchResultClick = useCallback(async (result: SearchResult) => {
    const newChapter = chapters[result.chapterIndex];
    if (!newChapter) return;
    
    setCurrentChapterIndex(result.chapterIndex);
    setIsSearchOpen(false);
    setSearchHighlight({ text: result.text, position: result.position });
    await changeChapter(result.chapterIndex, newChapter.title, false);
    
    // Optimized scroll to position
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('scrollToSearchResult', { detail: result }));
      }, 300);
    });
  }, [chapters]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  }, []);

  // Optimized font size handlers
  const increaseFontSize = useCallback(() => {
    if (!preferences || preferences.fontSize >= 64) return;
    
    handlePreferencesChange({
      ...preferences,
      fontSize: Math.min(64, preferences.fontSize + 2)
    });
  }, [preferences, handlePreferencesChange]);

  const decreaseFontSize = useCallback(() => {
    if (!preferences || preferences.fontSize <= 12) return;
    
    handlePreferencesChange({
      ...preferences,
      fontSize: Math.max(12, preferences.fontSize - 2)
    });
  }, [preferences, handlePreferencesChange]);

  // Optimized panel close handler
  const handleContentClick = useCallback(() => {
    setIsMenuOpen(false);
    setIsSettingsOpen(false);
    setIsSearchOpen(false);
    setIsBookmarksOpen(false);
  }, []);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNextChapter: pdfMode ? () => {} : handleNextChapter,
    onPreviousChapter: pdfMode ? () => {} : handlePreviousChapter,
    onToggleMenu: () => setIsMenuOpen(prev => !prev),
    onToggleSettings: () => setIsSettingsOpen(prev => !prev),
    onToggleFullscreen: toggleFullscreen,
    onSearch: () => setIsSearchOpen(true),
    onIncreaseFontSize: increaseFontSize,
    onDecreaseFontSize: decreaseFontSize
  }, preferences);

  // Handle fullscreen change (including F11 browser fullscreen)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isDocFs = !!document.fullscreenElement;
      const isWindowFs = typeof window !== 'undefined' && (
        (window.innerHeight >= screen.height - 4 && window.innerWidth >= screen.width - 4) ||
        (window.outerHeight >= screen.height - 4 && window.outerWidth >= screen.width - 4)
      );
      setIsFullscreen(isDocFs || isWindowFs);
    };

    const handleOpenBookmarkSettings = () => {
      setSettingsInitialTab('advanced');
      setIsSettingsOpen(true);
    };

    const handleOpenBookmarkWithHighlight = (event: any) => {
      const { bookmarkId } = event.detail;
      setHighlightBookmarkId(bookmarkId);
      setIsBookmarksOpen(true);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleFullscreenChange);
    window.addEventListener('openBookmarkSettings', handleOpenBookmarkSettings);
    window.addEventListener('openBookmarkWithHighlight' as any, handleOpenBookmarkWithHighlight);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleFullscreenChange);
      window.removeEventListener('openBookmarkSettings', handleOpenBookmarkSettings);
      window.removeEventListener('openBookmarkWithHighlight' as any, handleOpenBookmarkWithHighlight);
    };
  }, []);

  // Memoized navigation state
  const navigationState = useMemo(() => ({
    canGoNext: currentChapterIndex < chapters.length - 1,
    canGoPrevious: currentChapterIndex > 0
  }), [currentChapterIndex, chapters.length]);

  if (isLoading || !preferences) {
    const cachedPrefs = preferences || getCachedPreferences();
    const loadingColors = cachedPrefs
      ? getInterfaceTheme(
          cachedPrefs.selectedInterfaceTheme || 'light',
          cachedPrefs.snowSubTheme || 'night',
          cachedPrefs.menuStyle || 'classic'
        ).colors
      : null;

    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-colors duration-300"
        style={{
          backgroundColor: loadingColors?.panelBackground || '#f3f4f6',
          color: loadingColors?.textPrimary || '#4b5563'
        }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: loadingColors?.accent || '#2563eb' }}
          ></div>
          <p style={{ color: loadingColors?.textPrimary || '#4b5563' }}>Loading book...</p>
        </div>
      </div>
    );
  }

  const isAnyMenuOpen = isMenuOpen || isSettingsOpen || isSearchOpen || isBookmarksOpen || isTranslateModalOpen;

  return (
    <div 
      className="min-h-screen relative overflow-hidden reader-container"
      style={{ 
        backgroundColor: preferences.menuSubTheme === 'tinted'
          ? 'var(--reader-bg)'
          : preferences.sideBordersEnabled
            ? (() => {
                const themeId = (preferences.selectedColorTheme === 'highcontrast' || preferences.theme === 'highcontrast')
                  ? 'highcontrast'
                  : (preferences.selectedInterfaceTheme || preferences.selectedColorTheme || preferences.theme || 'light');
                const subTheme = preferences.snowSubTheme || 'night';
                const menuStyle = preferences.menuStyle || 'classic';
                const themeObj = getInterfaceTheme(themeId, subTheme, menuStyle);
                return themeObj.colors.panelSecondaryBackground || 'rgba(0,0,0,0.03)';
              })()
            : ((preferences.selectedColorTheme === 'snow' || preferences.theme === 'snow') ? (preferences.colors?.backgroundColor || '#f0f9ff') : (preferences.colors?.backgroundColor || '#ffffff'))
      }}
    >
      {/* Unified Single Effects Overlay (Universal / Interface / Reader with GPU-accelerated clipping) */}
      <InterfaceEffectsOverlay preferences={preferences} target="auto" />

      <ReaderHeader
        book={book}
        currentChapter={currentChapter}
        chapterProgress={currentChapterIndex + 1}
        totalChapters={chapters.length}
        onBackToLibrary={handleExitToLibrary}
        onToggleMenu={() => setIsMenuOpen(prev => !prev)}
        onToggleSettings={() => setIsSettingsOpen(prev => !prev)}
        onToggleSearch={() => setIsSearchOpen(prev => !prev)}
        onToggleBookmarks={() => setIsBookmarksOpen(prev => !prev)}
        onToggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen || isFullscreenReading}
        preferences={preferences}
        onPreferencesChange={handlePreferencesChange}
        pdfMode={pdfMode}
        onTogglePdfMode={() => setPdfMode(prev => !prev)}
        isMinimized={isHeaderMinimized}
        onToggleMinimize={() => setIsHeaderMinimized(prev => !prev)}
        buttonX={buttonX}
        onButtonXChange={setButtonX}
        isBackendOnline={isBackendOnline}
        isAutoTranslateActive={isAutoTranslateActive}
        onToggleTranslateModal={() => setIsTranslateModalOpen(prev => !prev)}
        isTranslating={isTranslating}
        translatedChapterTitle={translatedChapterTitle}
      />

      <div 
        className="reader-content overflow-hidden relative"
      >
        <ReaderContent
          bookId={book.id}
          chapter={currentChapter}
          chapterIndex={currentChapterIndex}
          preferences={preferences}
          onNextChapter={handleNextChapter}
          onPreviousChapter={handlePreviousChapter}
          canGoNext={navigationState.canGoNext}
          canGoPrevious={navigationState.canGoPrevious}
          onContentClick={handleContentClick}
          pdfMode={pdfMode}
          file={book.file}
          isHeaderMinimized={isHeaderMinimized}
          searchHighlight={searchHighlight}
          isBackendOnline={isBackendOnline}
          isAutoTranslateActive={isAutoTranslateActive}
          sourceLanguage={sourceLanguage}
          targetLanguage={targetLanguage}
          onLastDetectedLanguageChange={setLastDetectedLanguage}
          onTranslatingChange={setIsTranslating}
          onTranslatedTitleChange={setTranslatedChapterTitle}
        />
      </div>

      {/* Corner Navigation */}
      {preferences.cornerNavigation?.visible && !isFullscreenReading && (
        <CornerNavigation
          onNextChapter={handleNextChapter}
          onPreviousChapter={handlePreviousChapter}
          canGoNext={navigationState.canGoNext}
          canGoPrevious={navigationState.canGoPrevious}
          preferences={preferences}
        />
      )}

      {/* Fullscreen Reading Mode Indicator */}
      {isFullscreenReading && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-75 text-white px-4 py-2 rounded-lg text-sm z-50 animate-fade-in">
          Fullscreen Reading Mode - Double tap to exit
        </div>
      )}

      {/* Conditional rendering for panels to prevent unnecessary renders */}
      {isMenuOpen && !isFullscreenReading && (
        <TableOfContents
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          onChapterSelect={handleChapterSelect}
          onClose={() => setIsMenuOpen(false)}
          preferences={preferences}
          bookId={book.id}
        />
      )}

      {isSettingsOpen && !isFullscreenReading && (
        <ReaderSettings
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setIsSettingsOpen(false)}
          pdfMode={pdfMode}
          initialTab={settingsInitialTab}
        />
      )}

      {isSearchOpen && !isFullscreenReading && (
        <SearchModal
          onSearch={handleSearch}
          searchResults={searchResults}
          onResultClick={handleSearchResultClick}
          onClose={() => setIsSearchOpen(false)}
          preferences={preferences}
          currentChapterTitle={currentChapter?.title}
        />
      )}

      {isBookmarksOpen && !isFullscreenReading && (
        <BookmarksPanel
          bookId={book.id}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          onBookmarkClick={(chapterIndex, bookmark) => {
            setIsBookmarksOpen(false);
            if (bookmark) {
              try {
                sessionStorage.setItem('novel_reader_pending_bookmark', JSON.stringify(bookmark));
              } catch (e) {
                console.warn('Could not store pending bookmark:', e);
              }
              window.dispatchEvent(new CustomEvent('scrollToBookmark', { detail: bookmark }));
            }
            handleChapterSelect(chapterIndex);
          }}
          onClose={() => {
            setIsBookmarksOpen(false);
            setHighlightBookmarkId(null);
          }}
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          highlightBookmarkId={highlightBookmarkId || undefined}
        />
      )}

      {isTranslateModalOpen && (
        <LibreTranslateModal
          onClose={() => setIsTranslateModalOpen(false)}
          preferences={preferences}
          isBackendOnline={isBackendOnline}
          isAutoTranslateActive={isAutoTranslateActive}
          onToggleAutoTranslate={handleToggleAutoTranslate}
          sourceLanguage={sourceLanguage}
          onSourceLanguageChange={handleSourceLanguageChange}
          targetLanguage={targetLanguage}
          onTargetLanguageChange={handleTargetLanguageChange}
          lastDetectedLanguage={lastDetectedLanguage}
          onCheckBackend={checkTranslationBackend}
        />
      )}
    </div>
  );
};
