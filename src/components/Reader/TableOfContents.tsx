import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Bookmark, CheckCircle2 } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { getBookmarks, getNavigationHistory } from '../../utils/storage';
import { getInterfaceThemeFromPrefs } from '../../utils/themes';
import type { Chapter, ReadingPreferences, Bookmark as BookmarkType } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface TableOfContentsProps {
  chapters: Chapter[];
  currentChapterIndex: number;
  onChapterSelect: (index: number) => void;
  onClose: () => void;
  preferences?: ReadingPreferences;
  bookId?: string; // Add bookId prop to fetch bookmarks
}

interface ChapterItemProps {
  chapter: Chapter;
  index: number;
  isCurrentChapter: boolean;
  bookmarkInfo: { hasChapter: boolean; hasText: boolean };
  chapterIsVisited: boolean;
  onChapterSelect: (index: number) => void;
  interfaceStyles: any;
  isLoadingBookmarks: boolean;
  activeChapterRef: React.RefObject<HTMLButtonElement>;
}

const ChapterItem = React.memo(({
  chapter,
  index,
  isCurrentChapter,
  bookmarkInfo,
  chapterIsVisited,
  onChapterSelect,
  interfaceStyles,
  isLoadingBookmarks,
  activeChapterRef
}: ChapterItemProps) => {
  const { getTranslation } = useTranslations();
  return (
    <button
      ref={isCurrentChapter ? activeChapterRef : null}
      onClick={() => onChapterSelect(index)}
      className={`w-full text-left p-3 rounded-lg mb-1 transition-all duration-200 relative group/item
        ${isCurrentChapter
          ? 'shadow-md border border-black/5 dark:border-white/5'
          : 'hover:bg-gray-100 hover:bg-opacity-10'
        }`}
      style={{
        backgroundColor: isCurrentChapter 
          ? (interfaceStyles.color === '#1f2937' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.08)') 
          : 'transparent',
        borderLeft: isCurrentChapter ? `5px solid ${interfaceStyles.accent}` : '5px solid transparent',
        color: interfaceStyles.color,
        boxShadow: isCurrentChapter ? `0 4px 12px rgba(0, 0, 0, 0.08)` : 'none'
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 mt-1">
          {chapterIsVisited && !isCurrentChapter && (
            <CheckCircle2 className="w-5 h-5 text-green-500 opacity-80" />
          )}
          {!chapterIsVisited && !isCurrentChapter && (
            <div className="w-5 h-5 rounded-full border-2 border-current opacity-20" />
          )}
          {isCurrentChapter && (
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: interfaceStyles.accent }}
            >
              <div className="w-2 h-2 bg-white rounded-full" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`${isCurrentChapter ? 'font-bold' : 'font-medium'} mb-1 break-words flex-1`}
              style={{ 
                color: interfaceStyles.color,
                opacity: 1
              }}
            >
              {chapter.title}
            </h3>
            
            <div className="flex items-center gap-1.5">
              {!isLoadingBookmarks && (
                <>
                  {bookmarkInfo.hasChapter && (
                    <div 
                      className="flex-shrink-0"
                      style={{ color: '#f59e0b', opacity: 0.9 }}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </div>
                  )}
                  {bookmarkInfo.hasText && (
                    <div 
                      className="flex-shrink-0"
                      style={{ color: interfaceStyles.accent, opacity: 0.9 }}
                    >
                      <Bookmark className="w-4 h-4 fill-current" />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {isCurrentChapter && (
            <div className="flex items-center justify-between mt-1.5">
              <span 
                className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm border" 
                style={{ 
                  backgroundColor: interfaceStyles.color === '#1f2937' ? '#1f2937' : '#f8fafc', 
                  color: interfaceStyles.color === '#1f2937' ? '#ffffff' : '#1f2937',
                  borderColor: interfaceStyles.accent
                }}
              >
                {getTranslation('currentlyReading')}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
});

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  chapters,
  currentChapterIndex,
  onChapterSelect,
  onClose,
  preferences,
  bookId
}) => {
  const { getTranslation } = useTranslations();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeChapterRef = useRef<HTMLButtonElement>(null);
  const [bookmarkTypesByChapter, setBookmarkTypesByChapter] = useState<Record<number, { hasChapter: boolean; hasText: boolean }>>({});
  const [visitedChapters, setVisitedChapters] = useState<Set<number>>(new Set());
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);

  // Progressive rendered window state [start, end]
  const [renderedRange, setRenderedRange] = useState<[number, number]>(() => {
    const start = Math.max(0, currentChapterIndex - 25);
    const end = Math.min(chapters.length, currentChapterIndex + 25);
    return [start, end];
  });

  // Scroll active element into view on mount
  useEffect(() => {
    if (chapters.length === 0) return;
    
    // Stagger slightly to ensure element is rendered and aligned
    const timer = setTimeout(() => {
      if (activeChapterRef.current) {
        activeChapterRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [chapters.length, currentChapterIndex]);

  // Failsafe reactive scroll expansion
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 150;
    const isNearTop = target.scrollTop <= 150;

    if (isNearBottom || isNearTop) {
      setRenderedRange(([start, end]) => {
        if (start === 0 && end >= chapters.length) return [start, end];
        const nextStart = isNearTop ? Math.max(0, start - 25) : start;
        const nextEnd = isNearBottom ? Math.min(chapters.length, end + 25) : end;
        return [nextStart, nextEnd];
      });
    }
  }, [chapters.length]);

  // Memoize interface styles
  const interfaceStyles = useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;

    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      color: colors.textPrimary || colors.panelText || '#1f2937',
      borderColor: colors.panelBorder || colors.borderColor || '#e5e7eb',
      accent: colors.accent || '#3b82f6',
      accentHover: colors.accentHover || '#2563eb',
      panelSecondaryBackground: colors.panelSecondaryBackground || 'rgba(0,0,0,0.05)',
      textSecondary: colors.textSecondary || '#6b7280'
    };
  }, [preferences]);

  // Load bookmarks and history in parallel
  useEffect(() => {
    if (!bookId) {
      setIsLoadingBookmarks(false);
      return;
    }

    let isMounted = true;

    const loadData = async () => {
      try {
        setIsLoadingBookmarks(true);
        const [bookmarks, history] = await Promise.all([
          getBookmarks(bookId),
          getNavigationHistory(bookId)
        ]);
        
        if (!isMounted) return;

        const typesByChapter: Record<number, { hasChapter: boolean; hasText: boolean }> = {};
        bookmarks.forEach((bookmark: BookmarkType) => {
          if (!typesByChapter[bookmark.chapterIndex]) {
            typesByChapter[bookmark.chapterIndex] = { hasChapter: false, hasText: false };
          }
          if (bookmark.type === 'text') {
            typesByChapter[bookmark.chapterIndex].hasText = true;
          } else {
            typesByChapter[bookmark.chapterIndex].hasChapter = true;
          }
        });
        
        const visitedIndices = new Set<number>();
        history.forEach((entry: { chapterIndex: number }) => {
          visitedIndices.add(entry.chapterIndex);
        });

        setBookmarkTypesByChapter(typesByChapter);
        setVisitedChapters(visitedIndices);
      } catch (error) {
        console.error('Error loading TOC data:', error);
      } finally {
        if (isMounted) setIsLoadingBookmarks(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [bookId]);

  // Listen for bookmark changes
  useEffect(() => {
    let isMounted = true;
    const handleBookmarkChange = async () => {
      if (bookId) {
        try {
          const bookmarks = await getBookmarks(bookId);
          if (!isMounted) return;
          
          const typesByChapter: Record<number, { hasChapter: boolean; hasText: boolean }> = {};
          bookmarks.forEach((bookmark: BookmarkType) => {
            if (!typesByChapter[bookmark.chapterIndex]) {
              typesByChapter[bookmark.chapterIndex] = { hasChapter: false, hasText: false };
            }
            if (bookmark.type === 'text') {
              typesByChapter[bookmark.chapterIndex].hasText = true;
            } else {
              typesByChapter[bookmark.chapterIndex].hasChapter = true;
            }
          });
          setBookmarkTypesByChapter(typesByChapter);
        } catch (error) {
          console.error('Error reloading bookmarks for TOC:', error);
        }
      }
    };

    window.addEventListener('bookmarkAdded', handleBookmarkChange);
    window.addEventListener('bookmarkDeleted', handleBookmarkChange);
    return () => {
      isMounted = false;
      window.removeEventListener('bookmarkAdded', handleBookmarkChange);
      window.removeEventListener('bookmarkDeleted', handleBookmarkChange);
    };
  }, [bookId]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const totalProgress = useMemo(() => {
    if (chapters.length === 0) return 0;
    return Math.round(((currentChapterIndex + 1) / chapters.length) * 100);
  }, [currentChapterIndex, chapters.length]);

  const renderedChapters = useMemo(() => {
    const [start, end] = renderedRange;
    return chapters.slice(start, end).map((chapter, relativeIndex) => ({
      chapter,
      actualIndex: start + relativeIndex
    }));
  }, [chapters, renderedRange]);

  const glassEnabled = (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);
  const activeEffect = preferences?.selectedInterfaceTheme || preferences?.selectedColorTheme || preferences?.theme || 'light';
  const isEffectsActive = activeEffect === 'snow' || activeEffect === 'rain' || activeEffect === 'aurora';

  const isDarkTheme = preferences?.selectedInterfaceTheme === 'dark' || 
                      preferences?.selectedInterfaceTheme === 'ocean' || 
                      (preferences?.selectedInterfaceTheme === 'aurora' && preferences?.snowSubTheme !== 'day') || 
                      preferences?.selectedInterfaceTheme === 'highcontrast' || 
                      preferences?.snowSubTheme === 'night' || 
                      preferences?.snowSubTheme === 'midnight';

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
    // Sightly higher opacity overlay if effects are active to maintain high-contrast readability without requiring blur filter
    const opacity = glassEnabled && !isEffectsActive ? 0.15 : (isDarkTheme ? 0.65 : 0.45);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  })();

  const backdropFilterVal = glassEnabled && !isEffectsActive ? 'blur(var(--interface-glass-blur, 14px))' : 'none';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex">
      {/* Backdrop overlay background with filter */}
      <div 
        className="absolute inset-0 animate-fade-in"
        style={{
          backgroundColor: overlayBg,
          backdropFilter: backdropFilterVal,
          WebkitBackdropFilter: backdropFilterVal,
        }}
        onClick={onClose}
      />

      {/* Table of Contents panel in the foreground (z-10) */}
      <div 
        ref={sidebarRef} 
        className="toc-panel relative w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-left overflow-hidden z-10"
        style={{
          backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
             'Georgia, serif') : undefined
        }}
      >
        <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        <div 
          className="toc-header flex items-center justify-between p-4 border-b flex-shrink-0 gap-2 min-w-0 relative z-20" 
          style={{ 
            borderColor: interfaceStyles.borderColor,
            backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor
          }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <BookOpen className="w-6 h-6 shrink-0" style={{ color: interfaceStyles.accent }} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold truncate" style={{ color: interfaceStyles.color }} title={getTranslation('tableOfContents')}>
                {getTranslation('tableOfContents')}
              </h2>
              {chapters.length > 0 && (
                <p className="text-xs truncate font-medium" style={{ color: interfaceStyles.color, opacity: 0.75 }}>
                  {getTranslation('chapter')} {currentChapterIndex + 1} {getTranslation('of')} {chapters.length}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors shrink-0" style={{ color: interfaceStyles.color }} aria-label={getTranslation('close') || 'Close'}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {chapters.length === 0 ? (
            <div className="p-12 text-center opacity-60" style={{ color: interfaceStyles.color }}>
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>{getTranslation('noChaptersAvailable')}</p>
            </div>
          ) : (
            <div className="p-2">
              {renderedChapters.map(({ chapter, actualIndex }) => (
                <ChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  index={actualIndex}
                  isCurrentChapter={actualIndex === currentChapterIndex}
                  bookmarkInfo={bookmarkTypesByChapter[actualIndex] || { hasChapter: false, hasText: false }}
                  chapterIsVisited={visitedChapters.has(actualIndex)}
                  onChapterSelect={onChapterSelect}
                  interfaceStyles={interfaceStyles}
                  isLoadingBookmarks={isLoadingBookmarks}
                  activeChapterRef={activeChapterRef}
                />
              ))}
              {renderedRange[1] < chapters.length && (
                <div className="p-4 text-center opacity-50 text-sm" style={{ color: interfaceStyles.color }}>
                  {getTranslation('loading')}...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reading progress in TOC */}
        <div 
          className="toc-footer p-4 border-t flex-shrink-0"
          style={{ 
            borderColor: interfaceStyles.borderColor,
            backgroundColor: glassEnabled ? 'var(--interface-glass-bg, rgba(255, 255, 255, 0.45))' : interfaceStyles.backgroundColor 
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-medium" style={{ color: interfaceStyles.color }}>
              <span className="opacity-75">{getTranslation('totalProgress')}</span>
              <span className="font-bold" style={{ color: interfaceStyles.accent }}>{totalProgress}%</span>
            </div>
            <div 
              className="w-full h-3 rounded-full overflow-hidden relative border shadow-inner"
              style={{ 
                backgroundColor: interfaceStyles.color === '#1f2937' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                borderColor: interfaceStyles.color === '#1f2937' ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.25)'
              }}
            >
              <div 
                className="h-full transition-all duration-500 ease-out rounded-full" 
                style={{ 
                  width: `${totalProgress}%`, 
                  backgroundImage: `linear-gradient(90deg, ${interfaceStyles.accent}, ${interfaceStyles.accentHover || interfaceStyles.accent})`,
                  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.3), 0 0 6px ${interfaceStyles.accent}50`,
                  border: '1px solid rgba(0, 0, 0, 0.1)'
                }} 
              />
            </div>
            <div className="flex items-center justify-between text-[10px] opacity-75 font-medium" style={{ color: interfaceStyles.color }}>
              <span>{getTranslation('chapter')} {currentChapterIndex + 1} {getTranslation('of')} {chapters.length}</span>
              <span>{chapters.length} {getTranslation('chaptersTotal')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
