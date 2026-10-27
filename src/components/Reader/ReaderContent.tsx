import React, { useEffect, useRef, useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Bookmark as BookmarkIcon, Trash2, Edit2, Languages, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ScrollButtons } from './ScrollButtons';
import { ReaderSelectionMenu } from './ReaderSelectionMenu';
import { TranslationErrorPopup } from './TranslationErrorPopup';
import { processChapterHtml, wrapReadingUnits } from './utils/contentProcessor';
import type { Chapter, ReadingPreferences, Bookmark } from '../../types';
import { useTranslations } from '../../hooks/useTranslations';
import { saveBookmark, getBookmarks, deleteBookmark } from '../../utils/storage';
import { getCurrentLanguage } from '../../utils/translations';
import { INTERFACE_THEMES, getInterfaceTheme, getInterfaceThemeFromPrefs } from '../../utils/themes';
import { BorderEffectsCanvas } from './BorderEffectsCanvas';

interface ReaderContentProps {
  bookId: string;
  chapter?: Chapter;
  chapterIndex: number;
  preferences: ReadingPreferences;
  onNextChapter: () => void;
  onPreviousChapter: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  onContentClick?: () => void;
  pdfMode?: boolean;
  file?: File;
  isHeaderMinimized?: boolean;
  searchHighlight?: { text: string, position: number } | null;
  isBackendOnline?: boolean;
  isAutoTranslateActive?: boolean;
  sourceLanguage?: string;
  targetLanguage?: string;
  onLastDetectedLanguageChange?: (lang: string | null) => void;
  onTranslatingChange?: (isTranslating: boolean) => void;
  onTranslatedTitleChange?: (title: string | null) => void;
}

export const ReaderContent: React.FC<ReaderContentProps> = ({
  bookId,
  chapter,
  chapterIndex,
  preferences,
  onNextChapter,
  onPreviousChapter,
  canGoNext,
  canGoPrevious,
  onContentClick,
  pdfMode = false,
  file,
  isHeaderMinimized = false,
  searchHighlight,
  isBackendOnline = false,
  isAutoTranslateActive = false,
  sourceLanguage = 'auto',
  targetLanguage,
  onLastDetectedLanguageChange,
  onTranslatingChange,
  onTranslatedTitleChange
}) => {
  const { getTranslation } = useTranslations();
  const currentHeaderHeight = isHeaderMinimized ? 4 : 64;

  const getSideBorderColor = useCallback(() => {
    if (preferences.sideBordersColor === 'original') {
      let bg = preferences.colors?.backgroundColor || '#ffffff';
      const isDark = preferences.theme === 'dark' || 
                     preferences.theme === 'ocean' || 
                     preferences.theme === 'rain' || 
                     preferences.theme === 'highcontrast' ||
                     (preferences.theme === 'aurora' && preferences.snowSubTheme !== 'day') || 
                     (preferences.theme === 'snow' && preferences.snowSubTheme !== 'day') ||
                     preferences.selectedColorTheme === 'dark' ||
                     preferences.selectedColorTheme === 'ocean' ||
                     preferences.selectedColorTheme === 'rain' ||
                     preferences.selectedColorTheme === 'highcontrast' ||
                     (preferences.selectedColorTheme === 'aurora' && preferences.snowSubTheme !== 'day');
      
      if (preferences.menuSubTheme === 'tinted') {
        const tintHex = preferences.glassTintColor || '#3b82f6';
        const hex = tintHex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 59;
        const g = parseInt(hex.substring(2, 4), 16) || 130;
        const b = parseInt(hex.substring(4, 6), 16) || 246;
        
        const glassOpacityVal = preferences.glassReaderOpacity !== undefined ? (preferences.glassReaderOpacity / 100) : 0.65;
        const baseBgHex = preferences.colors?.backgroundColor || (isDark ? '#0f172a' : '#ffffff');
        const baseHex = baseBgHex.replace('#', '');
        const br = parseInt(baseHex.substring(0, 2), 16) || (isDark ? 15 : 255);
        const bgVal = parseInt(baseHex.substring(2, 4), 16) || (isDark ? 23 : 255);
        const bb = parseInt(baseHex.substring(4, 6), 16) || (isDark ? 42 : 255);
        
        const bgR = Math.round(r * glassOpacityVal + br * (1 - glassOpacityVal));
        const bgG = Math.round(g * glassOpacityVal + bgVal * (1 - glassOpacityVal));
        const bgB = Math.round(b * glassOpacityVal + bb * (1 - glassOpacityVal));
        
        bg = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;
      } else if (preferences.glassReaderArea) {
        if (preferences.theme === 'highcontrast' || preferences.selectedColorTheme === 'highcontrast') {
          bg = '#000000';
        } else if (preferences.menuSubTheme === 'aurora') {
          bg = isDark ? '#1e1b4b' : '#f5f3ff';
        } else {
          bg = isDark ? '#0f172a' : '#ffffff';
        }
      } else if (preferences.theme === 'snow' || preferences.selectedColorTheme === 'snow') {
        bg = preferences.colors?.backgroundColor || '#f0f9ff';
      }
      return bg;
    }

    if (preferences.sideBordersColor && preferences.sideBordersColor !== 'original') {
      return preferences.sideBordersColor;
    }
    
    // Base background color calculation based on glass and tint preferences
    let bg = preferences.colors?.backgroundColor || '#ffffff';
    
    if (preferences.glassReaderArea) {
      const isDark = preferences.theme === 'dark' || 
                     preferences.theme === 'ocean' || 
                     preferences.theme === 'rain' || 
                     preferences.theme === 'highcontrast' ||
                     (preferences.theme === 'aurora' && preferences.snowSubTheme !== 'day') || 
                     (preferences.theme === 'snow' && preferences.snowSubTheme !== 'day') ||
                     preferences.selectedColorTheme === 'dark' ||
                     preferences.selectedColorTheme === 'ocean' ||
                     preferences.selectedColorTheme === 'rain' ||
                     preferences.selectedColorTheme === 'highcontrast' ||
                     (preferences.selectedColorTheme === 'aurora' && preferences.snowSubTheme !== 'day');
      
      const glassOpacityVal = preferences.glassReaderOpacity !== undefined ? (preferences.glassReaderOpacity / 100) : 0.65;
      
      if (preferences.theme === 'highcontrast' || preferences.selectedColorTheme === 'highcontrast') {
        bg = '#000000';
      } else if (preferences.menuSubTheme === 'tinted') {
        const tintHex = preferences.glassTintColor || '#3b82f6';
        const hex = tintHex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 59;
        const g = parseInt(hex.substring(2, 4), 16) || 130;
        const b = parseInt(hex.substring(4, 6), 16) || 246;
        
        // Blend tinted background with white/black to get solid RGB reference for luma
        const factor = glassOpacityVal;
        const bgR = Math.round(r * factor + (isDark ? 15 : 255) * (1 - factor));
        const bgG = Math.round(g * factor + (isDark ? 23 : 255) * (1 - factor));
        const bgB = Math.round(b * factor + (isDark ? 42 : 255) * (1 - factor));
        
        bg = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;
      } else if (preferences.menuSubTheme === 'aurora') {
        bg = isDark ? '#1e1b4b' : '#f5f3ff';
      } else {
        bg = isDark ? '#0f172a' : '#ffffff';
      }
    } else if (preferences.menuSubTheme === 'tinted') {
      const tintHex = preferences.glassTintColor || '#3b82f6';
      bg = tintHex;
    }

    try {
      const hex = bg.replace('#', '');
      let r = parseInt(hex.substring(0, 2), 16);
      let g = parseInt(hex.substring(2, 4), 16);
      let b = parseInt(hex.substring(4, 6), 16);
      
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return bg;
      }
      
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      // Elegant, visible contrast that adapts perfectly to different reader backgrounds
      const amount = luma < 128 ? 24 : 18;
      
      if (luma < 128) {
        // Dark background: slightly lighter margins
        r = Math.min(255, r + amount);
        g = Math.min(255, g + amount);
        b = Math.min(255, b + amount);
      } else {
        // Light background: slightly darker margins
        r = Math.max(0, r - amount);
        g = Math.max(0, g - amount);
        b = Math.max(0, b - amount);
      }
      
      const rHex = r.toString(16).padStart(2, '0');
      const gHex = g.toString(16).padStart(2, '0');
      const bHex = b.toString(16).padStart(2, '0');
      return `#${rHex}${gHex}${bHex}`;
    } catch {
      return bg;
    }
  }, [
    preferences.sideBordersColor, 
    preferences.colors, 
    preferences.glassReaderArea, 
    preferences.theme, 
    preferences.snowSubTheme, 
    preferences.selectedColorTheme, 
    preferences.menuSubTheme, 
    preferences.glassTintColor, 
    preferences.glassReaderOpacity
  ]);

  const getPulseAnimation = useCallback(() => {
    if (preferences.sideBordersEffect !== 'pulse') return undefined;
    const pulseAmount = preferences.sideBordersPulseAmount !== undefined ? preferences.sideBordersPulseAmount : 50;
    if (pulseAmount === 0) return undefined;
    
    // Map 1-100 to 10s-0.4s
    const duration = 10 - (pulseAmount * 0.096);
    return `borderPulse ${duration}s ease-in-out infinite`;
  }, [preferences.sideBordersEffect, preferences.sideBordersPulseAmount]);


  const contentRef = useRef<HTMLDivElement>(null);

  const lastLayoutPrefsRef = useRef({
    paragraphSpacing: preferences.paragraphSpacing,
    fontSize: preferences.fontSize,
    lineHeight: preferences.lineHeight,
    maxWidth: preferences.maxWidth,
    marginSize: preferences.marginSize,
  });

  const savedTargetRef = useRef<{
    index: number;
    offsetTop: number;
  } | null>(null);

  // Synchronous layout check on render to capture position BEFORE styles update
  const currentLayoutHash = `${preferences.paragraphSpacing}-${preferences.fontSize}-${preferences.lineHeight}-${preferences.maxWidth}-${preferences.marginSize}`;
  const lastLayoutHash = `${lastLayoutPrefsRef.current.paragraphSpacing}-${lastLayoutPrefsRef.current.fontSize}-${lastLayoutPrefsRef.current.lineHeight}-${lastLayoutPrefsRef.current.maxWidth}-${lastLayoutPrefsRef.current.marginSize}`;

  if (currentLayoutHash !== lastLayoutHash) {
    if (contentRef.current) {
      const anchorY = window.innerHeight / 3; // Use 1/3 of screen height as our anchoring target point
      const elements = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div'));
      // Filter elements to get text leaves (no other block elements inside)
      const textElements = elements.filter(el => {
        if (!el.textContent || !el.textContent.trim()) return false;
        return !el.querySelector('p, li, h1, h2, h3, h4, h5, h6');
      });

      let bestAnchor: Element | null = null;
      let minDistance = Infinity;
      let bestIndex = -1;

      for (let i = 0; i < textElements.length; i++) {
        const el = textElements[i];
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - anchorY);
        if (dist < minDistance) {
          minDistance = dist;
          bestAnchor = el;
          bestIndex = i;
        }
      }

      if (bestAnchor && bestIndex !== -1) {
        const rect = bestAnchor.getBoundingClientRect();
        savedTargetRef.current = {
          index: bestIndex,
          offsetTop: rect.top - anchorY,
        };
      }
    }
    lastLayoutPrefsRef.current = {
      paragraphSpacing: preferences.paragraphSpacing,
      fontSize: preferences.fontSize,
      lineHeight: preferences.lineHeight,
      maxWidth: preferences.maxWidth,
      marginSize: preferences.marginSize,
    };
  }

  // Restore the scroll position after the DOM layout/styles have been applied
  useLayoutEffect(() => {
    if (savedTargetRef.current && contentRef.current) {
      const saved = savedTargetRef.current;
      const elements = Array.from(contentRef.current.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, div'));
      const textElements = elements.filter(el => {
        if (!el.textContent || !el.textContent.trim()) return false;
        return !el.querySelector('p, li, h1, h2, h3, h4, h5, h6');
      });

      const targetElement = textElements[saved.index];
      
      if (targetElement) {
        const anchorY = window.innerHeight / 3;
        const rect = targetElement.getBoundingClientRect();
        const currentScrollY = window.scrollY;
        const targetTop = anchorY + saved.offsetTop;
        const difference = rect.top - targetTop;
        
        window.scrollTo(0, currentScrollY + difference);
      }
      savedTargetRef.current = null;
    }
  });

  const translationRunId = useRef<number>(0);
  const translationCacheRef = useRef<Map<string, string>>(new Map());
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string, existingBookmarkId?: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isChapterChanging, setIsChapterChanging] = useState(false);
  const isInitialMount = useRef(true);

  // LibreTranslate translation states
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);
  const [translatedTitle, setTranslatedTitle] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const markedReadIdsRef = useRef<Set<string>>(new Set());
  const activeChapterTrackerRef = useRef<string>('');

  // Reset marked read units ONLY when genuinely switching chapters or books
  useEffect(() => {
    const currentKey = `${bookId}_ch_${chapterIndex}`;
    if (activeChapterTrackerRef.current !== currentKey) {
      activeChapterTrackerRef.current = currentKey;
      markedReadIdsRef.current.clear();
    }
  }, [bookId, chapterIndex]);

  const setTranslatingState = useCallback((val: boolean) => {
    setIsTranslating(val);
    if (onTranslatingChange) {
      onTranslatingChange(val);
    }
  }, [onTranslatingChange]);

  const loadBookmarks = useCallback(async () => {
    try {
      const allBookmarks = await getBookmarks(bookId);
      setBookmarks(prev => {
        const map = new Map<string, Bookmark>();
        allBookmarks.forEach(b => map.set(b.id, b));
        const now = Date.now();
        prev.forEach(b => {
          if (!map.has(b.id)) {
            const created = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            if (now - created < 5000) {
              map.set(b.id, b);
            }
          }
        });
        return Array.from(map.values());
      });
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  }, [bookId]);

  useEffect(() => {
    let isMounted = true;
    const fetchInitialBookmarks = async () => {
      try {
        const allBookmarks = await getBookmarks(bookId);
        if (isMounted) {
          setBookmarks(allBookmarks);
        }
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    };
    fetchInitialBookmarks();
    return () => { isMounted = false; };
  }, [bookId, chapterIndex]);

  useEffect(() => {
    const handleBookmarkChange = () => {
      loadBookmarks();
    };

    window.addEventListener('bookmarkAdded', handleBookmarkChange);
    window.addEventListener('bookmarkDeleted', handleBookmarkChange);
    
    return () => {
      window.removeEventListener('bookmarkAdded', handleBookmarkChange);
      window.removeEventListener('bookmarkDeleted', handleBookmarkChange);
    };
  }, [loadBookmarks]);

  useEffect(() => {
    const scrollToBookmarkItem = (bookmark: Bookmark) => {
      setTimeout(() => {
        if (bookmark.type === 'text' && bookmark.text) {
          const spans = contentRef.current?.querySelectorAll('span');
          const targetSpan = Array.from(spans || []).find(span => 
            span.textContent?.trim() === bookmark.text?.trim()
          );

          if (targetSpan) {
            targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetSpan.classList.add('bookmark-pulse');
            setTimeout(() => {
              targetSpan.classList.remove('bookmark-pulse');
            }, 3000);
            return;
          }
        }
        if (typeof bookmark.position === 'number' && bookmark.position >= 0) {
          window.scrollTo({ top: bookmark.position, behavior: 'smooth' });
        }
      }, 350);
    };

    const handleScrollToBookmark = (event: CustomEvent<Bookmark>) => {
      const bookmark = event.detail;
      if (bookmark.chapterIndex === chapterIndex) {
        scrollToBookmarkItem(bookmark);
      }
    };

    // Check if there was a pending bookmark waiting for this chapter to load
    try {
      const pendingRaw = sessionStorage.getItem('novel_reader_pending_bookmark');
      if (pendingRaw) {
        const pending = JSON.parse(pendingRaw);
        if (pending.chapterIndex === chapterIndex) {
          sessionStorage.removeItem('novel_reader_pending_bookmark');
          scrollToBookmarkItem(pending);
        }
      }
    } catch (e) {
      sessionStorage.removeItem('novel_reader_pending_bookmark');
    }

    window.addEventListener('scrollToBookmark' as any, handleScrollToBookmark as any);
    return () => window.removeEventListener('scrollToBookmark' as any, handleScrollToBookmark as any);
  }, [chapterIndex, chapter?.content]);

  useEffect(() => {
    const handleScrollToSearchResult = (event: CustomEvent) => {
      const result = event.detail;
      if (result.chapterIndex === chapterIndex) {
        setTimeout(() => {
          const element = contentRef.current?.querySelector(`[data-search-position="${result.position}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('search-pulse');
            setTimeout(() => {
              element.classList.remove('search-pulse');
            }, 3000);
          }
        }, 300);
      }
    };

    window.addEventListener('scrollToSearchResult' as any, handleScrollToSearchResult as any);
    return () => window.removeEventListener('scrollToSearchResult' as any, handleScrollToSearchResult as any);
  }, [chapterIndex]);

  // Use refs for frequently updated variables in event listeners to avoid rebinding the mouseup event
  const bookmarksRef = useRef(bookmarks);
  const chapterIndexRef = useRef(chapterIndex);
  const pdfModeRef = useRef(pdfMode);

  useEffect(() => {
    bookmarksRef.current = bookmarks;
  }, [bookmarks]);

  useEffect(() => {
    chapterIndexRef.current = chapterIndex;
  }, [chapterIndex]);

  useEffect(() => {
    pdfModeRef.current = pdfMode;
  }, [pdfMode]);

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    if (pdfModeRef.current) return;
    
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const selectedText = selection.toString().trim();
      
      // Check if this selection matches an existing bookmark
      const existingBookmark = bookmarksRef.current.find(b => 
        b.type === 'text' && 
        Number(b.chapterIndex) === Number(chapterIndexRef.current) && 
        b.text?.trim() === selectedText
      );
      
      setSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY,
        text: selectedText,
        existingBookmarkId: existingBookmark?.id
      });
    } else {
      setSelectionMenu(null);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const handleSaveTextBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectionMenu) return;

    const newBookmark: Bookmark = {
      id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId,
      chapterIndex,
      position: window.scrollY,
      text: selectionMenu.text,
      createdAt: new Date(),
      type: 'text',
      color: preferences.bookmarkHighlight?.color || '#fef08a',
      style: preferences.bookmarkHighlight?.style || 'highlight'
    };

    try {
      await saveBookmark(newBookmark);
      setBookmarks(prev => [...prev.filter(b => b.id !== newBookmark.id), newBookmark]);
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
      setTranslatedHtml(null);
      // Notify other components
      window.dispatchEvent(new CustomEvent('bookmarkAdded', { detail: { bookId, chapterIndex } }));
    } catch (error) {
      console.error('Error saving text bookmark:', error);
    }
  };

  const handleDeleteTextBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectionMenu?.existingBookmarkId) return;
    const bookmarkIdToDelete = selectionMenu.existingBookmarkId;

    try {
      await deleteBookmark(bookmarkIdToDelete);
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkIdToDelete));
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
      setTranslatedHtml(null);
      // Notify other components
      window.dispatchEvent(new CustomEvent('bookmarkDeleted', { detail: { bookId, chapterIndex } }));
    } catch (error) {
      console.error('Error deleting text bookmark:', error);
    }
  };

  const handleEditBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionMenu?.existingBookmarkId) {
      window.dispatchEvent(new CustomEvent('openBookmarkWithHighlight', { 
        detail: { bookmarkId: selectionMenu.existingBookmarkId } 
      }));
    }
    setSelectionMenu(null);
  };

  // Handle PDF URL creation and cleanup
  useEffect(() => {
    if (pdfMode && file) {
      const url = URL.createObjectURL(file);
      const timeoutId = setTimeout(() => {
        setPdfUrl(url);
      }, 0);
      return () => {
        clearTimeout(timeoutId);
        URL.revokeObjectURL(url);
        setPdfUrl(null);
      };
    }
  }, [pdfMode, file]);

  // Apply theme styles
  const getThemeStyles = useCallback(() => {
    const isInterfaceOnly = (preferences.themeApplyMode === 'interface');
    const isGlassReader = preferences.glassEnabled && (preferences.glassReaderAreaOnly || preferences.glassReaderArea) && !isInterfaceOnly;

    if (isGlassReader) {
      return {
        backgroundColor: 'transparent',
        color: preferences.colors?.textColor || '#000000',
      };
    }
    const bg = (preferences.sideBordersEnabled && !isInterfaceOnly)
      ? (() => {
          const themeId = (preferences.selectedColorTheme === 'highcontrast' || preferences.theme === 'highcontrast')
            ? 'highcontrast'
            : (preferences.selectedColorTheme || preferences.theme || 'light');
          const subTheme = preferences.snowSubTheme || 'day';
          const menuStyle = preferences.menuStyle || 'classic';
          const themeObj = getInterfaceThemeFromPrefs({
            ...preferences,
            selectedInterfaceTheme: themeId,
            snowSubTheme: subTheme,
            menuStyle: menuStyle
          });
          return themeObj.colors.panelSecondaryBackground || 'rgba(0,0,0,0.03)';
        })()
      : (preferences.theme === 'snow' ? 'transparent' : (preferences.colors?.backgroundColor || '#ffffff'));
      
    return {
      backgroundColor: bg,
      color: preferences.colors?.textColor || '#000000',
    };
  }, [preferences]);

  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Update window width for responsive calculations with debouncing to prevent excessive re-renders during resize
  useEffect(() => {
    let timeoutId: any;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    setScrollY(window.scrollY);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Calculate responsive font size multiplier
  const fontSizeMultiplier = useMemo(() => {
    if (windowWidth <= 480) return 0.7;
    if (windowWidth <= 768) return 0.8;
    if (windowWidth <= 1024) return 0.9;
    return 1.0;
  }, [windowWidth]);

  const getFontFamily = useCallback(() => {
    if (preferences.fontFamily === 'Custom') {
      return '"Custom", sans-serif';
    }
    const fonts: Record<string, string> = {
      'Georgia': 'Georgia, serif',
      'Inter': 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      'Arial': 'Arial, Helvetica, sans-serif',
      'Custom': 'sans-serif'
    };
    return fonts[preferences.fontFamily] || fonts.Arial;
  }, [preferences.fontFamily]);

  const getMaxWidth = useCallback(() => {
    if (preferences.sideBordersEnabled) {
      return '100%';
    }
    const widths = {
      phone: '100%',
      normal: '75ch',
      full: '100%',
      custom: '100%'
    };
    return widths[preferences.maxWidth] || widths.full;
  }, [preferences.maxWidth, preferences.sideBordersEnabled]);

  const getContainerClass = () => {
    if (preferences.sideBordersEnabled) {
      return 'w-full max-w-full px-0 mx-0';
    }
    let baseClass = '';
    if (preferences.maxWidth === 'phone') {
      baseClass = 'w-full px-4 max-w-sm mx-auto';
    } else if (preferences.maxWidth === 'full') {
      baseClass = 'w-full px-4 sm:px-6 lg:px-8';
    } else if (preferences.maxWidth === 'custom') {
      baseClass = 'w-full';
    } else {
      baseClass = 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8';
    }
    return baseClass;
  };

  const contentStyles = useMemo(() => {
    const responsiveFontSize = Math.round(Math.max(12, preferences.fontSize * fontSizeMultiplier));
    const isMobile = windowWidth <= 768;
    
    const marginHorizontal = (preferences.sideBordersEnabled)
      ? '0px'
      : ((preferences.maxWidth === 'full' || preferences.maxWidth === 'custom') ? '0px' : 'auto');
    let marginTopVal = '0px';
    let marginBottomVal = '1.5rem';
    
    // Top padding matches 80px and the responsive font size to keep text below the Top-Bar with generous spacing even with huge fonts (note: header height offset is now handled by container margin/padding)
    const topPaddingVal = `${80 + Math.max(16, responsiveFontSize)}px`;

    // Default paddingVal for card mode
    const cardHorizontalPadding = preferences.maxWidth === 'custom' ? `${Math.max(0.5, preferences.marginSize || 1.5)}em` : '1.5rem';
    let paddingVal = `${topPaddingVal} ${cardHorizontalPadding} 2.5rem ${cardHorizontalPadding}`;

    const styles: any = {
      ...getThemeStyles(),
      '--reader-font-size': `${responsiveFontSize}px`,
      '--reader-line-height': preferences.lineHeight,
      '--reader-font-family': getFontFamily(),
      fontSize: 'var(--reader-font-size)',
      fontFamily: 'var(--reader-font-family)',
      lineHeight: 'var(--reader-line-height)',
      maxWidth: getMaxWidth(),
      marginLeft: marginHorizontal,
      marginRight: marginHorizontal,
      '--paragraph-spacing': `${preferences.paragraphSpacing !== undefined ? preferences.paragraphSpacing : 1.5}em`
    };

    if (preferences.sideBordersEnabled) {
      styles.backgroundColor = preferences.colors?.backgroundColor || '#ffffff';
      styles.minHeight = '100vh'; // Ensure the book background color covers the entire screen height
      styles.borderRadius = '0px';
      styles.boxShadow = 'none';
      styles.borderLeftWidth = '0px';
      styles.borderRightWidth = '0px';
      styles.borderTopWidth = '0px';
      styles.borderBottomWidth = '0px';
      styles.borderLeftStyle = 'none';
      styles.borderRightStyle = 'none';
      styles.borderTopStyle = 'none';
      styles.borderBottomStyle = 'none';
      
      const horizontalPadding = isMobile 
        ? '1.25rem' 
        : `${Math.max(1, preferences.marginSize || 3)}em`;
      
      paddingVal = isMobile 
        ? `${topPaddingVal} 1.25rem 2.5rem 1.25rem` 
        : `${topPaddingVal} ${horizontalPadding} 2.5rem ${horizontalPadding}`;
      marginTopVal = '0px';
      marginBottomVal = '0px';
    }

    styles.padding = paddingVal;
    styles.marginTop = marginTopVal;
    styles.marginBottom = marginBottomVal;

    const shouldApplyGlassReader = preferences.glassEnabled && (preferences.glassReaderAreaOnly || preferences.glassReaderArea);
    if (shouldApplyGlassReader && preferences.themeApplyMode !== 'interface') {
      const readerTheme = preferences.selectedColorTheme || 'light';
      const isDark = readerTheme === 'dark' || 
                     readerTheme === 'ocean' || 
                     readerTheme === 'rain' || 
                     readerTheme === 'highcontrast' ||
                     (readerTheme === 'aurora' && preferences.snowSubTheme !== 'day') || 
                     (readerTheme === 'snow' && preferences.snowSubTheme !== 'day');
      
      const glassBlurVal = preferences.glassReaderBlur !== undefined ? preferences.glassReaderBlur : 16;
      const glassOpacityVal = preferences.glassReaderOpacity !== undefined ? (preferences.glassReaderOpacity / 100) : 0.65;

      if (readerTheme === 'highcontrast') {
        styles.backgroundColor = '#000000';
      } else if (preferences.menuSubTheme === 'tinted') {
        const tintHex = preferences.glassTintColor || '#3b82f6';
        const hex = tintHex.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 59;
        const g = parseInt(hex.substring(2, 4), 16) || 130;
        const b = parseInt(hex.substring(4, 6), 16) || 246;
        styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${glassOpacityVal})`;
      } else if (preferences.menuSubTheme === 'aurora') {
        styles.backgroundColor = isDark 
          ? `rgba(30, 27, 75, ${glassOpacityVal})` 
          : `rgba(245, 243, 255, ${glassOpacityVal})`;
      } else {
        styles.backgroundColor = isDark 
          ? `rgba(15, 23, 42, ${glassOpacityVal})` 
          : `rgba(255, 255, 255, ${glassOpacityVal})`;
      }
      styles.backdropFilter = `blur(${glassBlurVal}px)`;
      styles.WebkitBackdropFilter = `blur(${glassBlurVal}px)`;
      
      // Use explicit sub-properties for border to avoid mixed shorthand warnings
      styles.borderLeftStyle = 'solid';
      styles.borderRightStyle = 'solid';
      styles.borderTopStyle = 'solid';
      styles.borderBottomStyle = 'solid';
      styles.borderLeftWidth = '1px';
      styles.borderRightWidth = '1px';
      styles.borderTopWidth = '1px';
      styles.borderBottomWidth = '1px';
      const borderColorVal = (readerTheme === 'highcontrast')
        ? '#ffffff'
        : preferences.menuSubTheme === 'tinted'
          ? (preferences.glassTintColor ? `${preferences.glassTintColor}40` : 'rgba(59, 130, 246, 0.25)')
          : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)');
      styles.borderLeftColor = borderColorVal;
      styles.borderRightColor = borderColorVal;
      styles.borderTopColor = borderColorVal;
      styles.borderBottomColor = borderColorVal;

      styles.boxShadow = '0 8px 32px 0 rgba(0, 0, 0, 0.12)';
      
      // We do NOT override padding, marginTop, or marginBottom here so that
      // Glassy Window Mode preserves the exact shape, area, and width slider padding of standard mode.

      // Layer position to sit on top of background snow/rain layer at z-10
      styles.position = 'relative';
      styles.zIndex = 90;

      if (!preferences.sideBordersEnabled) {
        styles.borderRadius = '12px';
      }
    }

    return styles;
  }, [preferences.fontSize, preferences.lineHeight, preferences.maxWidth, preferences.marginSize, preferences.paragraphSpacing, preferences.sideBordersEnabled, preferences.colors, fontSizeMultiplier, getThemeStyles, getFontFamily, getMaxWidth, windowWidth, preferences.glassReaderArea, preferences.glassEnabled, preferences.glassReaderAreaOnly, preferences.selectedColorTheme, preferences.snowSubTheme, preferences.glassReaderBlur, preferences.glassReaderOpacity, preferences.glassTintColor, preferences.menuSubTheme, preferences.themeApplyMode]);

  // Handle scroll position saving
  useEffect(() => {
    const handleScroll = () => {
      // Save scroll position logic would go here
      // This would be integrated with the useReadingProgress hook
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll to top and show quick loader when chapter changes
  useEffect(() => {
    window.scrollTo(0, 0);
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    setIsChapterChanging(true);
    const timer = setTimeout(() => {
      setIsChapterChanging(false);
    }, 400); // 400ms quick loading simulation
    
    return () => clearTimeout(timer);
  }, [chapter?.id]);

  // Inject custom font if selected
  useEffect(() => {
    if (preferences.fontFamily === 'Custom' && preferences.customFontUrl) {
      const styleId = 'custom-font-style';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      styleElement.textContent = `
        @font-face {
          font-family: "Custom";
          src: url("${preferences.customFontUrl}");
          font-display: swap;
        }
      `;
    }
  }, [preferences.fontFamily, preferences.customFontUrl]);

  const handleNextChapter = () => {
    onNextChapter();
  };

  const handlePreviousChapter = () => {
    onPreviousChapter();
  };

  // Memoize processed content to avoid expensive DOM operations on every render
  const processedHtml = useMemo(() => {
    return processChapterHtml({
      chapter,
      bookmarks,
      chapterIndex,
      searchHighlight,
      preferences,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    chapter,
    bookmarks,
    chapterIndex,
    searchHighlight,
    preferences.bookmarkHighlight?.style,
    preferences.bookmarkHighlight?.color,
    preferences.syncAllBookmarks
  ]);

  // Detect if the chapter title is already embedded in the processed content
  const hasTitleInContent = useMemo(() => {
    // We now robustly strip any duplicate title headings from the book content itself (via contentProcessor.ts),
    // which allows us to always render the beautifully styled, custom-font React chapter-title-notice.
    return false;
  }, []);

  // Handle "Mark Read Text" logic
  useEffect(() => {
    const clearElementStyle = (el: HTMLElement) => {
      el.style.opacity = '';
      el.style.textDecoration = '';
      el.style.textDecorationColor = '';
      el.style.textDecorationThickness = '';
      el.style.backgroundColor = '';
      el.style.borderRadius = '';
      el.style.paddingLeft = '';
      el.style.paddingRight = '';
      el.style.transition = '';
      el.style.boxDecorationBreak = '';
      (el.style as any).webkitBoxDecorationBreak = '';
    };

    if (!contentRef.current) return;

    // Query all readable reading units (spans) or fallback to paragraph elements
    const unitElements = Array.from(contentRef.current.querySelectorAll('.read-unit')) as HTMLElement[];
    let elements: HTMLElement[] = unitElements;

    if (elements.length === 0) {
      // Fallback to block level elements if no .read-unit exists
      const rawElements = contentRef.current.querySelectorAll('p, li, blockquote, dd, dt, .reading-paragraph, div');
      elements = Array.from(rawElements).filter(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.tagName === 'DIV' && htmlEl.querySelector('p, li, blockquote, dd, dt, div')) {
          return false;
        }
        if (!htmlEl.textContent || !htmlEl.textContent.trim()) {
          return false;
        }
        return !(
          htmlEl.classList.contains('chapter-title-notice') || 
          htmlEl.closest('.chapter-title-notice') ||
          htmlEl.closest('h1, h2, h3, h4, h5, h6')
        );
      }) as HTMLElement[];
    }

    if (!preferences?.markReadText) {
      elements.forEach(htmlEl => {
        htmlEl.removeAttribute('data-read');
        clearElementStyle(htmlEl);
      });
      return;
    }

    const styleType = preferences.markReadStyle || 'underline';

    const getMarkColor = () => {
      const theme = preferences.theme || 'light';
      const textColor = preferences.colors?.textColor || (theme === 'dark' || theme === 'ocean' || theme === 'highcontrast' ? '#ffffff' : '#000000');
      
      if (styleType === 'underline' || styleType === 'strike') {
        // Underline and strikethrough must use the exact reading text color for maximum fidelity
        return textColor;
      }

      const isDarkTheme = theme === 'dark' || 
                          theme === 'ocean' || 
                          theme === 'rain' || 
                          theme === 'thunder' || 
                          theme === 'highcontrast' || 
                          (theme === 'aurora' && preferences.snowSubTheme !== 'day') || 
                          (theme === 'snow' && preferences.snowSubTheme !== 'day');

      if (isDarkTheme) {
        return styleType === 'highlight' 
          ? 'rgba(76, 29, 149, 0.45)' // Noticeably dark purple/violet, eye-safe and premium
          : textColor;
      } else if (theme === 'sepia') {
        return styleType === 'highlight'
          ? 'rgba(180, 110, 40, 0.15)'
          : textColor;
      } else { // light or other themes
        return styleType === 'highlight'
          ? 'rgba(253, 224, 71, 0.35)' // Soft sunny yellow highlight
          : textColor;
      }
    };

    const applyMarkStyle = (htmlEl: HTMLElement) => {
      clearElementStyle(htmlEl);
      htmlEl.style.transition = 'all 0.4s ease-in-out';
      
      if (styleType === 'opacity') {
        htmlEl.style.opacity = '0.5';
      } else if (styleType === 'underline') {
        htmlEl.style.textDecoration = 'underline';
        htmlEl.style.textDecorationColor = getMarkColor();
        htmlEl.style.textDecorationThickness = '2px';
      } else if (styleType === 'strike') {
        htmlEl.style.textDecoration = 'line-through';
        htmlEl.style.textDecorationColor = getMarkColor();
        htmlEl.style.textDecorationThickness = '2px';
      } else if (styleType === 'highlight') {
        htmlEl.style.backgroundColor = getMarkColor();
        htmlEl.style.borderRadius = '3px';
        htmlEl.style.paddingLeft = '2px';
        htmlEl.style.paddingRight = '2px';
        htmlEl.style.boxDecorationBreak = 'clone';
        (htmlEl.style as any).webkitBoxDecorationBreak = 'clone';
      }
    };

    // 1. Instantly re-apply style to all elements that have been marked as read or are stored in markedReadIdsRef
    elements.forEach((htmlEl, idx) => {
      const unitId = htmlEl.getAttribute('data-unit-id') || `elem_${idx}`;
      if (markedReadIdsRef.current.has(unitId) || htmlEl.getAttribute('data-read') === 'true') {
        htmlEl.setAttribute('data-read', 'true');
        markedReadIdsRef.current.add(unitId);
        applyMarkStyle(htmlEl);
      } else {
        clearElementStyle(htmlEl);
      }
    });

    // 2. Setup scroll tracking and timer detection with zero idle CPU overhead
    const timers = new Map<Element, number>();
    const headerHeight = isHeaderMinimized ? 4 : 64;
    let scheduledTimer: any = null;
    let rafId: number | null = null;

    const scheduleNextCheck = () => {
      if (scheduledTimer) clearTimeout(scheduledTimer);
      if (timers.size === 0) return;

      const now = Date.now();
      let minWait = 3000;
      timers.forEach((entryTime) => {
        const remaining = Math.max(50, 3000 - (now - entryTime));
        if (remaining < minWait) minWait = remaining;
      });

      scheduledTimer = setTimeout(() => {
        checkElements();
      }, minWait);
    };

    const checkElements = () => {
      const now = Date.now();
      let hasPending = false;

      elements.forEach((htmlEl, idx) => {
        const unitId = htmlEl.getAttribute('data-unit-id') || `elem_${idx}`;
        if (markedReadIdsRef.current.has(unitId) || htmlEl.getAttribute('data-read') === 'true') {
          timers.delete(htmlEl);
          return;
        }

        const rect = htmlEl.getBoundingClientRect();
        // Guard against unmeasured, zero-size, or unattached elements before browser layout settles
        if (rect.height <= 0 || rect.width <= 0) {
          return;
        }

        // The line/unit has passed TOTALMENTE (completely) above the bottom edge of the top bar
        // rect.bottom <= headerHeight ensures the whole line has scrolled fully past into the header margin
        const isPast = rect.bottom <= headerHeight;

        if (isPast) {
          if (!timers.has(htmlEl)) {
            timers.set(htmlEl, now);
            hasPending = true;
          } else {
            const entryTime = timers.get(htmlEl)!;
            if (now - entryTime >= 3000) {
              htmlEl.setAttribute('data-read', 'true');
              markedReadIdsRef.current.add(unitId);
              applyMarkStyle(htmlEl);
              timers.delete(htmlEl);
            } else {
              hasPending = true;
            }
          }
        } else {
          // If the user scrolls back down so any part of the line becomes visible, cancel pending timer
          timers.delete(htmlEl);
        }
      });

      if (hasPending || timers.size > 0) {
        scheduleNextCheck();
      }
    };

    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        checkElements();
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check delayed slightly (100ms) to ensure layout and fonts are fully settled
    const initialCheckTimer = setTimeout(() => {
      checkElements();
    }, 100);

    return () => {
      clearTimeout(initialCheckTimer);
      if (scheduledTimer) clearTimeout(scheduledTimer);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [
    preferences?.markReadText,
    preferences?.markReadStyle,
    preferences?.theme,
    preferences?.snowSubTheme,
    preferences?.colors?.textColor,
    isHeaderMinimized,
    translatedHtml,
    processedHtml,
    chapterIndex,
    bookId
  ]);

  // Reset translation state when page/chapter changes
  useEffect(() => {
    translationRunId.current += 1;
    setTranslatedHtml(null);
    setTranslatedTitle(null);
    onTranslatedTitleChange?.(null);
    setTranslationError(null);
    setTranslatingState(false);
  }, [chapter?.id, setTranslatingState, onTranslatedTitleChange]);

  const translatePageContent = useCallback(async () => {
    if (!processedHtml) return;
    
    const runId = ++translationRunId.current;
    setTranslatingState(true);
    setTranslationError(null);
    
    try {
      const targetLang = targetLanguage || getCurrentLanguage();
      let activeSource = sourceLanguage;
      let detectedLangSaved = false;

      const translateTextDirectly = async (textToTranslate: string, currentActiveSource: string): Promise<string> => {
        if (runId !== translationRunId.current || !isAutoTranslateActive) {
          throw new Error('Aborted');
        }
        
        const engine = localStorage.getItem('translation_engine') || 'libretranslate';
        const cacheKey = `${engine}:${currentActiveSource}:${targetLang}:${textToTranslate}`;
        if (translationCacheRef.current.has(cacheKey)) {
          return translationCacheRef.current.get(cacheKey)!;
        }
        
        if (engine === 'ollama') {
          const url = localStorage.getItem('ollama_url') || 'http://127.0.0.1:11434';
          const model = localStorage.getItem('ollama_model') || '';
          
          if (!model) {
            throw new Error('No Ollama model selected. Please configure it in Translation settings.');
          }
          
          const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
          const prompt = `Translate this text from ${currentActiveSource === 'auto' ? 'auto-detected language' : currentActiveSource} to ${targetLang}. Do not write any introduction, commentary, explanations, or quotes. Only return the final translated text, preserving HTML tags like <b>, <i>, <span> if present:\n\n${textToTranslate}`;
          
          const response = await fetch(`${cleanUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model,
              prompt: prompt,
              stream: false,
              options: {
                temperature: 0.3
              }
            })
          });
          
          if (!response.ok) {
            throw new Error(`Ollama returned status ${response.status}`);
          }
          
          const data = await response.json();
          if (runId !== translationRunId.current || !isAutoTranslateActive) {
            throw new Error('Aborted');
          }
          
          if (data && data.response) {
            let res = data.response.trim();
            if (res.startsWith('```') && res.endsWith('```')) {
              res = res.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim();
            }
            translationCacheRef.current.set(cacheKey, res);
            return res;
          }
          return textToTranslate;
        } else {
          const response = await fetch('http://127.0.0.1:5000/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              q: textToTranslate,
              source: currentActiveSource,
              target: targetLang,
              format: 'html'
            })
          });

          if (!response.ok) {
            throw new Error(`LibreTranslate returned status ${response.status}`);
          }

          const data = await response.json();
          if (runId !== translationRunId.current || !isAutoTranslateActive) {
            throw new Error('Aborted');
          }

          if (data && data.translatedText) {
            // Save detected language if source is set to auto-detect
            if (!detectedLangSaved && sourceLanguage === 'auto' && data.detectedLanguage) {
              const detLang = data.detectedLanguage.language || (Array.isArray(data.detectedLanguage) ? data.detectedLanguage[0]?.language : null);
              if (detLang) {
                activeSource = detLang;
                if (onLastDetectedLanguageChange) {
                  onLastDetectedLanguageChange(detLang);
                }
                detectedLangSaved = true;
              }
            }
            translationCacheRef.current.set(cacheKey, data.translatedText);
            return data.translatedText;
          }
          return textToTranslate;
        }
      };

      // 0. Translate the Chapter Title first if it exists
      if (chapter?.title) {
        try {
          const transTitle = await translateTextDirectly(chapter.title, activeSource);
          if (runId === translationRunId.current) {
            setTranslatedTitle(transTitle);
            onTranslatedTitleChange?.(transTitle);
          }
        } catch (titleErr: any) {
          if (titleErr.message === 'Aborted') return;
          console.warn('[ReaderTranslator] Chapter title translation failed:', titleErr);
        }
      }

      // 1. Create a temporary container to parse processedHtml
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = processedHtml;
      
      // 2. Query all translatable elements inside the div using standard tags, with a fallback for divs
      const elements: Element[] = Array.from(tempDiv.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th'));
      
      if (elements.length === 0) {
        // Fallback for non-standard books where paragraphs are represented as divs directly
        const divs = Array.from(tempDiv.querySelectorAll('div'));
        divs.forEach(div => {
          const hasBlockChildren = div.querySelector('div, p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th, ul, ol');
          if (!hasBlockChildren && div.textContent?.trim()) {
            elements.push(div);
          }
        });
      }
      
      // Filter out empty/whitespace-only elements and prepare the batch list
      const translatableTexts: string[] = [];
      const elementMap: number[] = []; // maps index in translatableTexts to index in elements
      
      elements.forEach((el, index) => {
        const htmlContent = el.innerHTML.trim();
        if (htmlContent && el.textContent?.trim()) {
          translatableTexts.push(htmlContent);
          elementMap.push(index);
        }
      });
      
      if (translatableTexts.length === 0) {
        setTranslatedHtml(processedHtml);
        setTranslatingState(false);
        return;
      }

      // Translate a single element, preserving breaks inside it
      const translateElement = async (el: Element, text: string) => {
        const parts = text.split(/(<br\s*\/?>|\n)/gi);
        
        const translatedParts = await Promise.all(
          parts.map(async (part) => {
            const isTagOrNewline = /^(<br\s*\/?>|\n)$/i.test(part);
            if (isTagOrNewline) return part;
            const trimmed = part.trim();
            if (!trimmed) return part;
            if (!/[a-zA-Z0-9à-úÀ-Ú]/i.test(trimmed)) return part;
            return await translateTextDirectly(part, activeSource);
          })
        );

        el.innerHTML = translatedParts.join('');
        
        // Update the translated HTML state with reading units for real-time paragraph-by-paragraph rendering!
        const cloneDiv = tempDiv.cloneNode(true) as HTMLElement;
        wrapReadingUnits(cloneDiv);
        setTranslatedHtml(cloneDiv.innerHTML);

        // Yield to the event loop so that React updates the DOM and the browser renders it in real-time
        await new Promise((resolve) => setTimeout(resolve, 20));
      };

      // 1. Prioritize and translate the very first paragraph immediately for near-instant user feedback
      if (translatableTexts.length > 0) {
        const firstOriginalIdx = elementMap[0];
        const firstEl = elements[firstOriginalIdx];
        const firstText = translatableTexts[0];
        if (firstEl && firstText) {
          try {
            await translateElement(firstEl, firstText);
          } catch (err: any) {
            if (err.message === 'Aborted') return;
            console.warn('[ReaderTranslator] First element translation failed:', err);
          }
        }
      }

      // 2. Translate remaining paragraphs with 5 parallel workers
      const concurrencyLimit = 5;
      const pool: Promise<void>[] = [];
      let elementIdx = 1; // Start from the second element (index 1)

      const worker = async () => {
        while (elementIdx < translatableTexts.length) {
          if (runId !== translationRunId.current || !isAutoTranslateActive) {
            return;
          }
          const idx = elementIdx++;
          const originalElementIdx = elementMap[idx];
          const el = elements[originalElementIdx];
          const text = translatableTexts[idx];
          
          if (el && text) {
            try {
              await translateElement(el, text);
            } catch (err: any) {
              if (err.message === 'Aborted') return;
              console.warn('[ReaderTranslator] Element translation failed:', err);
            }
          }
        }
      };

      // Start parallel workers
      for (let w = 0; w < Math.min(concurrencyLimit, translatableTexts.length - 1); w++) {
        pool.push(worker());
      }

      await Promise.all(pool);
    } catch (err: any) {
      console.error('LibreTranslate error:', err);
      if (runId === translationRunId.current) {
        setTranslationError(err.message || 'Translation failed');
      }
    } finally {
      if (runId === translationRunId.current) {
        setTranslatingState(false);
      }
    }
  }, [processedHtml, sourceLanguage, targetLanguage, onLastDetectedLanguageChange, isAutoTranslateActive, setTranslatingState, chapter, onTranslatedTitleChange]);

  // Handle translation triggering - stay active independent of isBackendOnline flapping
  useEffect(() => {
    // Immediately clear previous translation state on any page/preference change to avoid old text flashing
    setTranslatedHtml(null);
    
    if (isAutoTranslateActive && processedHtml) {
      const timer = setTimeout(() => {
        translatePageContent();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [processedHtml, isAutoTranslateActive, translatePageContent, sourceLanguage, targetLanguage]);

  useEffect(() => {
    const handleEngineChange = () => {
      if (isAutoTranslateActive && processedHtml) {
        setTranslatedHtml(null);
        translatePageContent();
      }
    };
    window.addEventListener('translationEngineChanged', handleEngineChange);
    return () => window.removeEventListener('translationEngineChanged', handleEngineChange);
  }, [isAutoTranslateActive, processedHtml, translatePageContent]);

  if (pdfMode && file && pdfUrl) {
    const pageNumber = chapter?.pageNumber || 1;
    const headerHeight = isHeaderMinimized ? 4 : 64;
    return (
      <div 
        className="w-full transition-all duration-200 bg-gray-100 flex flex-col" 
        style={{ 
          height: `calc(100vh - ${headerHeight}px)`,
          marginTop: `${headerHeight}px`
        }}
      >
        <iframe
          src={`${pdfUrl}#page=${pageNumber}&toolbar=1&view=FitH`}
          className="w-full h-full border-none"
          title="PDF Viewer"
          key={`${pdfUrl}-${pageNumber}`} // Force reload when page changes
        />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">No chapter content available</p>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative" 
      style={{ 
        ...getThemeStyles(),
        paddingTop: isHeaderMinimized ? '4px' : '64px'
      }}
    >
      {preferences.sideBordersEnabled && typeof document !== 'undefined' && createPortal(
        <>
          {/* Left Flanking Border Panel */}
          <div 
            className="fixed top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
            style={{ 
              width: `${preferences.sideBordersWidth !== undefined ? preferences.sideBordersWidth : 40}px`,
              backgroundColor: getSideBorderColor(),
              zIndex: 10,
              boxShadow: 'inset -5px 0 10px rgba(0,0,0,0.05)'
            }}
          />

          {/* Right Flanking Border Panel */}
          <div 
            className="fixed top-0 bottom-0 right-0 overflow-hidden pointer-events-none"
            style={{ 
              width: `${preferences.sideBordersWidth !== undefined ? preferences.sideBordersWidth : 40}px`,
              backgroundColor: getSideBorderColor(),
              zIndex: 10,
              boxShadow: 'inset 5px 0 10px rgba(0,0,0,0.05)'
            }}
          />

          {preferences.sideBordersEffect && preferences.sideBordersEffect !== 'none' && (
            <div 
              className="fixed inset-0 pointer-events-none overflow-hidden" 
              style={{ 
                zIndex: 11
              }}
            >
              <BorderEffectsCanvas
                effect={preferences.sideBordersEffect}
                width={window.innerWidth}
                sideBordersWidth={preferences.sideBordersWidth !== undefined ? preferences.sideBordersWidth : 40}
                snowAmount={preferences.sideBordersSnowAmount !== undefined ? preferences.sideBordersSnowAmount : 15}
                thunderAmount={preferences.sideBordersThunderAmount !== undefined ? preferences.sideBordersThunderAmount : 20}
                speed={preferences.sideBordersSpeed ?? preferences.interfaceSnowySpeed ?? preferences.snowSpeed ?? 50}
                side="both"
                isAuroraTheme={
                  preferences.selectedInterfaceTheme === 'aurora' || 
                  preferences.selectedColorTheme === 'aurora' || 
                  preferences.theme === 'aurora'
                }
                isSnowTheme={
                  preferences.selectedInterfaceTheme === 'snow' || 
                  preferences.selectedColorTheme === 'snow' || 
                  preferences.theme === 'snow' ||
                  preferences.interfaceSnowyEnabled ||
                  (preferences.glassEnabled && preferences.menuSubTheme === 'snowy')
                }
                isRainTheme={
                  preferences.selectedInterfaceTheme === 'rain' || 
                  preferences.selectedColorTheme === 'rain' || 
                  preferences.theme === 'rain'
                }
                isThunderTheme={
                  preferences.selectedInterfaceTheme === 'thunder' || 
                  preferences.selectedColorTheme === 'thunder' || 
                  preferences.theme === 'thunder'
                }
              />
            </div>
          )}
        </>,
        document.body
      )}

      {/* Translation Backend Error Popup Overlay */}
      <TranslationErrorPopup
        translationError={translationError}
        onClose={() => setTranslationError(null)}
      />
      <main 
        className={getContainerClass()} 
        onClick={onContentClick}
        style={preferences.sideBordersEnabled ? {
          backgroundColor: 'transparent',
          minHeight: '100vh',
          paddingTop: '0px',
          paddingBottom: '0px',
          paddingLeft: `${preferences.sideBordersWidth !== undefined ? preferences.sideBordersWidth : 40}px`,
          paddingRight: `${preferences.sideBordersWidth !== undefined ? preferences.sideBordersWidth : 40}px`
        } : undefined}
      >
        {/* Chapter content */}
        <article
          ref={contentRef}
          className="chapter-content reader"
          data-reader-area="true"
          style={contentStyles}
        >
          {/* Dynamic Image & Reading Layout Styles */}
          <style>{`
            .pdf-page-visual-container {
              display: ${preferences.showPdfImages === false ? 'none' : 'block'};
              text-align: center;
              margin: 1.5rem auto;
              width: 100%;
              max-width: 100%;
            }
            .pdf-page-image, .chapter-content img {
              max-width: 100% !important;
              width: ${preferences.imageScale ? `${preferences.imageScale}%` : '100%'};
              height: auto !important;
              object-fit: contain;
              margin: 0 auto;
              display: block;
              border-radius: 0.75rem;
              transition: width 0.2s ease, max-width 0.2s ease;
            }
            ${preferences.imageReadingMode === 'paginated' ? `
            .pdf-page-visual-container {
              page-break-after: always;
              min-height: 80vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            ` : ''}
          `}</style>

          {/* Blank line spacer so the top-bar minimize button never overlaps chapter text */}
          <div className="h-6 w-full shrink-0" aria-hidden="true" />

          {/* Chapter Title notice - same font and size, just bold and small margin */}
          {!hasTitleInContent && (
            <p className="font-bold mt-8 mb-4 chapter-title-notice pt-2" style={{ color: preferences.colors?.textColor || '#000000' }}>
              {translatedTitle || chapter.title}
            </p>
          )}

          <div
            dangerouslySetInnerHTML={{ __html: translatedHtml || processedHtml }}
            data-custom-font="true"
            style={{ fontSize: 'inherit' }}
            className="transition-all duration-300 opacity-100"
          />
        </article>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center py-8 px-4">
          <button
            onClick={handlePreviousChapter}
            disabled={!canGoPrevious}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
              canGoPrevious
                ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            {getTranslation('previousChapter')}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-500 transition-colors duration-300" style={{ color: preferences.theme === 'dark' ? '#9ca3af' : '#6b7280' }}>
              {getTranslation('scrollToRead')}
            </p>
          </div>

          <button
            onClick={handleNextChapter}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 ${
              canGoNext
                ? 'bg-blue-600 text-white hover:bg-blue-700 transform hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {getTranslation('nextChapter')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </main>

      {/* Text Selection Menu */}
      <ReaderSelectionMenu
        selectionMenu={selectionMenu}
        preferences={preferences}
        getTranslation={getTranslation}
        onEditBookmark={handleEditBookmark}
        onDeleteTextBookmark={handleDeleteTextBookmark}
        onSaveTextBookmark={handleSaveTextBookmark}
      />

      {/* Scroll Buttons */}
      <ScrollButtons preferences={preferences} />
    </div>
  );
};
