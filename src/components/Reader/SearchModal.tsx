import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ArrowRight, BookOpen, FileText } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { getInterfaceTheme } from '../../utils/themes';
import type { SearchResult, ReadingPreferences } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface SearchModalProps {
  onSearch: (query: string, searchScope: 'chapter' | 'book') => void;
  searchResults: SearchResult[];
  onResultClick: (result: SearchResult) => void;
  onClose: () => void;
  preferences?: ReadingPreferences;
  currentChapterTitle?: string;
}

const RESULTS_PER_PAGE = 50;
const MAX_VISIBLE_RESULTS = 1000; // Limit visible results for performance

export const SearchModal: React.FC<SearchModalProps> = ({
  onSearch,
  searchResults,
  onResultClick,
  onClose,
  preferences,
  currentChapterTitle = 'Current Chapter'
}) => {
  const { getTranslation } = useTranslations();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchScope, setSearchScope] = useState<'chapter' | 'book'>('chapter');
  const [visibleResults, setVisibleResults] = useState(RESULTS_PER_PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Memoize interface styles to prevent recalculation
  const interfaceStyles = useMemo(() => {
    const themeId = preferences?.selectedInterfaceTheme || 'light';
    const subTheme = preferences?.snowSubTheme || 'day';
    const menuStyle = preferences?.menuStyle || 'classic';
    const linkStyle = preferences?.linkStyleWithTheme !== false;
    const menuSubTheme = preferences?.menuSubTheme || 'default';
    const neonCustomColor = preferences?.neonCustomColor;
    const glassEnabled = (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);
    const glassTintColor = preferences?.glassTintColor;

    const theme = getInterfaceTheme(
      themeId,
      subTheme,
      menuStyle,
      linkStyle,
      menuSubTheme,
      neonCustomColor,
      glassEnabled,
      glassTintColor
    );
    
    let colors = theme.colors;
    if (themeId === 'custom' && preferences?.interfaceColors) {
      colors = preferences.interfaceColors;
    }

    return {
      backgroundColor: colors.panelBackground || colors.headerBackground || '#ffffff',
      color: colors.panelText || colors.headerText || '#1f2937',
      borderColor: colors.panelBorder || colors.headerBorder || '#e5e7eb'
    };
  }, [
    preferences?.selectedInterfaceTheme,
    preferences?.snowSubTheme,
    preferences?.menuStyle,
    preferences?.linkStyleWithTheme,
    preferences?.interfaceColors,
    preferences?.menuSubTheme,
    preferences?.neonCustomColor,
    preferences?.glassEnabled,
    preferences?.glassReaderAreaOnly,
    preferences?.glassTintColor
  ]);

  const isDarkTheme = useMemo(() => {
    const themeId = preferences?.selectedInterfaceTheme || 'light';
    const subTheme = preferences?.snowSubTheme || 'day';
    return themeId === 'dark' || themeId === 'midnight' || themeId === 'highcontrast' || themeId === 'aurora' || (themeId === 'snow' && subTheme !== 'day') || (themeId === 'rain' && subTheme !== 'day');
  }, [preferences?.selectedInterfaceTheme, preferences?.snowSubTheme]);

  const glassEnabled = useMemo(() => {
    return (preferences?.glassEnabled ?? false) && !(preferences?.glassReaderAreaOnly ?? false);
  }, [preferences?.glassEnabled, preferences?.glassReaderAreaOnly]);

  // Memoize displayed results for performance
  const displayedResults = useMemo(() => {
    return searchResults.slice(0, visibleResults);
  }, [searchResults, visibleResults]);
  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset visible results when search results change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setVisibleResults(RESULTS_PER_PAGE);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [searchResults]);

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

  // Infinite scroll for large result sets
  useEffect(() => {
    const container = resultsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      
      if (isNearBottom && visibleResults < Math.min(searchResults.length, MAX_VISIBLE_RESULTS)) {
        setVisibleResults(prev => Math.min(prev + RESULTS_PER_PAGE, MAX_VISIBLE_RESULTS));
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [visibleResults, searchResults.length]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      onSearch('', searchScope);
      return;
    }

    const startTimeoutId = setTimeout(() => {
      setIsSearching(true);
    }, 0);

    const timeoutId = setTimeout(() => {
      onSearch(query, searchScope);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(startTimeoutId);
      clearTimeout(timeoutId);
    };
  }, [query, searchScope, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query, searchScope);
    }
  };

  const handleScopeChange = (newScope: 'chapter' | 'book') => {
    setSearchScope(newScope);
    setVisibleResults(RESULTS_PER_PAGE); // Reset pagination
    
    // Trigger search immediately if there's a query
    if (query.trim()) {
      setIsSearching(true);
      onSearch(query, newScope);
      const timeoutId = setTimeout(() => setIsSearching(false), 300);
      return () => clearTimeout(timeoutId);
    }
  };

  const highlightMatch = useMemo(() => (text: string, start: number, end: number) => {
    return (
      <>
        {text.slice(0, start)}
        <mark className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {text.slice(start, end)}
        </mark>
        {text.slice(end)}
      </>
    );
  }, []);

  // Memoize results count text
  const resultsCountText = useMemo(() => {
    const total = searchResults.length;
    const showing = Math.min(visibleResults, total);
    
    if (total === 0) return '';
    if (total <= MAX_VISIBLE_RESULTS) {
      return `${getTranslation('foundResults').replace('{count}', total.toString()).replace('{plural}', total === 1 ? getTranslation('result') : getTranslation('results')).replace('"{query}"', '')}`;
    }
    
    return `${getTranslation('foundResults').replace('{count}', total + '+').replace('{plural}', getTranslation('results')).replace('"{query}"', '')} (${getTranslation('showingFirstResults')} ${showing})`;
  }, [searchResults.length, visibleResults, getTranslation]);

  // Memoize scope results text
  const scopeResultsText = useMemo(() => {
    if (searchScope === 'chapter') {
      return getTranslation('searchIn').toLowerCase() + ' ' + getTranslation('currentChapter').toLowerCase();
    }
    return getTranslation('searchIn').toLowerCase() + ' ' + getTranslation('entireBook').toLowerCase();
  }, [searchScope, getTranslation]);

  return createPortal(
    <div className={`fixed inset-0 z-[100] flex items-start justify-center pt-20 animate-fade-in backdrop-blur-sm transition-all duration-300 ${glassEnabled && !isDarkTheme ? 'bg-white/20' : 'bg-black/50'}`}>
      <div 
        ref={modalRef} 
        className="relative rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden animate-scale-in"
        style={{
          backgroundColor: interfaceStyles.backgroundColor,
          fontFamily: preferences?.applyFontGlobally ? 
            (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
             preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
             'Georgia, serif') : undefined
        }}
      >
        <InterfaceEffectsOverlay preferences={preferences} target="interface" />
        {/* Search Header */}
        <div 
          className="flex items-center gap-4 p-4 border-b"
          style={{ borderColor: interfaceStyles.borderColor }}
        >
          <Search className="w-5 h-5 shrink-0" style={{ color: interfaceStyles.color, opacity: 0.6 }} />
          <form onSubmit={handleSubmit} className="flex-1 min-w-0">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchScope === 'chapter' ? getTranslation('searchInCurrentChapter') : getTranslation('searchInEntireBook')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full text-lg border-none outline-none placeholder-gray-400 transition-all duration-300 bg-transparent"
              style={{ color: interfaceStyles.color }}
            />
          </form>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 hover:bg-opacity-20 rounded-lg transition-all duration-300 shrink-0"
            style={{ color: interfaceStyles.color }}
            aria-label={getTranslation('search')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Scope Toggle */}
        <div 
          className="p-4 border-b"
          style={{ borderColor: interfaceStyles.borderColor }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium" style={{ color: interfaceStyles.color }}>
              {getTranslation('searchIn')}
            </span>
            
            <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: interfaceStyles.borderColor }}>
              <button
                onClick={() => handleScopeChange('chapter')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  searchScope === 'chapter' 
                    ? 'transform scale-105' 
                    : 'hover:bg-gray-100 hover:bg-opacity-20'
                }`}
                style={{
                  backgroundColor: searchScope === 'chapter' ? '#007BFF' : 'transparent',
                  color: searchScope === 'chapter' ? '#ffffff' : interfaceStyles.color
                }}
              >
                <FileText className="w-4 h-4" />
                {getTranslation('currentChapter')}
              </button>
              
              <button
                onClick={() => handleScopeChange('book')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-300 ${
                  searchScope === 'book' 
                    ? 'transform scale-105' 
                    : 'hover:bg-gray-100 hover:bg-opacity-20'
                }`}
                style={{
                  backgroundColor: searchScope === 'book' ? '#007BFF' : 'transparent',
                  color: searchScope === 'book' ? '#ffffff' : interfaceStyles.color
                }}
              >
                <BookOpen className="w-4 h-4" />
                {getTranslation('entireBook')}
              </button>
            </div>
          </div>

          {/* Current Chapter Info */}
          {searchScope === 'chapter' && (
            <div className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
              {getTranslation('currentlySearchingIn')} <span className="font-medium">{currentChapterTitle}</span>
            </div>
          )}
        </div>

        {/* Search Results */}
        <div 
          ref={resultsContainerRef}
          className="max-h-96 overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          {!query.trim() ? (
            <div className="p-8 text-center" style={{ color: interfaceStyles.color }}>
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: interfaceStyles.color, opacity: 0.3 }} />
              <p className="mb-2">{getTranslation('enterSearchTerm')} {searchScope === 'chapter' ? getTranslation('currentChapter').toLowerCase() : getTranslation('entireBook').toLowerCase()}</p>
              <div className="mt-4 text-sm">
                <p className="mb-1">{getTranslation('tips')}</p>
                <ul className="text-left inline-block space-y-1" style={{ opacity: 0.7 }}>
                  <li>{getTranslation('searchIsCaseInsensitive')}</li>
                  <li>{getTranslation('useSpecificWords')}</li>
                  <li>{getTranslation('clickResultsToJump')}</li>
                  <li>{getTranslation('switchBetweenSearch')}</li>
                </ul>
              </div>
            </div>
          ) : isSearching ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" style={{ borderColor: '#007BFF' }}></div>
              <p style={{ color: interfaceStyles.color }}>{getTranslation('searchingIn')} {scopeResultsText}...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center" style={{ color: interfaceStyles.color }}>
              <Search className="w-12 h-12 mx-auto mb-3" style={{ color: interfaceStyles.color, opacity: 0.3 }} />
              <p className="text-lg font-medium mb-2">{getTranslation('noResultsFound')}</p>
              <p style={{ opacity: 0.7 }}>
                {getTranslation('noMatchesFor')} "{query}" {scopeResultsText}
              </p>
              <div className="mt-4 text-sm" style={{ opacity: 0.6 }}>
                <p>{getTranslation('tryDifferentKeywords').split('•')[0]}</p>
                <ul className="text-left inline-block space-y-1 mt-2">
                  <li>{getTranslation('tryDifferentKeywords')}</li>
                  <li>{getTranslation('searchingInstead')} {searchScope === 'chapter' ? getTranslation('entireBook').toLowerCase() : getTranslation('currentChapter').toLowerCase()} {getTranslation('instead')}</li>
                  <li>{getTranslation('usingBroaderTerms')}</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="divide-y" style={{ borderColor: interfaceStyles.borderColor }}>
                {displayedResults.map((result, index) => (
                  <button
                    key={`${result.chapterIndex}-${result.position}-${index}`}
                    onClick={() => onResultClick(result)}
                    className="w-full text-left p-4 hover:bg-gray-50 hover:bg-opacity-20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium" style={{ color: '#007BFF' }}>
                            {result.chapterTitle}
                          </span>
                          {searchScope === 'book' && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                              Chapter {result.chapterIndex + 1}
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed text-sm" style={{ color: interfaceStyles.color }}>
                          {highlightMatch(result.text, result.matchStart, result.matchEnd)}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: interfaceStyles.color, opacity: 0.4 }} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Load More Indicator */}
              {visibleResults < Math.min(searchResults.length, MAX_VISIBLE_RESULTS) && (
                <div className="p-4 text-center border-t" style={{ borderColor: interfaceStyles.borderColor }}>
                  <div className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('scrollDownToLoad')}
                  </div>
                </div>
              )}

              {/* Performance Warning for Large Result Sets */}
              {searchResults.length > MAX_VISIBLE_RESULTS && (
                <div className="p-4 text-center border-t bg-yellow-50" style={{ borderColor: interfaceStyles.borderColor }}>
                  <div className="text-sm text-yellow-800">
                    <strong>{getTranslation('largeResultSet')}</strong> {getTranslation('showingFirstResults')} {MAX_VISIBLE_RESULTS} {getTranslation('resultsForOptimal')}
                    <br />
                    {getTranslation('tryMoreSpecific')}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Search Footer */}
        {searchResults.length > 0 && (
          <div 
            className="p-4 border-t"
            style={{ 
              borderColor: interfaceStyles.borderColor,
              backgroundColor: interfaceStyles.backgroundColor,
              opacity: 0.8
            }}
          >
            <p className="text-sm text-center" style={{ color: interfaceStyles.color }}>
              {resultsCountText} {getTranslation('foundResultsFor')} "{query}" {scopeResultsText}
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
