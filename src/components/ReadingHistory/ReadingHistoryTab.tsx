import React, { useState, useEffect, useCallback } from 'react';
import { Clock, BookOpen, TrendingUp, Search, BarChart3, Home, Globe, Settings, FileText, X } from 'lucide-react';
import { ChapterHistoryView } from './ChapterHistoryView';
import { BookHistoryView } from './BookHistoryView';
import { OverallStatsView } from './OverallStatsView';
import { ReadingTrendsChart } from './ReadingTrendsChart';
import { ActivityLogsView } from './ActivityLogsView';
import { LanguageSelector } from '../LanguageSelector';
import { HomePageSettings } from '../HomePageSettings';
import { SnowEffect } from '../SnowEffect';
import { RainEffect } from '../RainEffect';
import { PetalEffect } from '../PetalEffect';
import { getReadingHistoryStats, getBookHistory } from '../../utils/reading-tracker';
import { getPreferences, savePreferences, getCachedPreferences } from '../../utils/storage';
import { formatDuration } from '../../utils/time-formatter';
import { getTranslation, initializeLanguage, getCurrentLanguage } from '../../utils/translations';
import { applyInterfaceTheme, getInterfaceTheme, applyPreferencesTheme, getInterfaceThemeFromPrefs, isHexColorDark } from '../../utils/themes';
import type { ReadingHistoryStats, TimeFormat, SortOption, FilterOption, ReadingPreferences } from '../../types';

interface ReadingHistoryTabProps {
  onClose?: () => void;
  preferences?: ReadingPreferences;
  onPreferencesChange?: (preferences: ReadingPreferences) => void;
  initialTab?: 'chapters' | 'books' | 'stats' | 'trends' | 'logs';
}

type ViewMode = 'chapters' | 'books' | 'stats' | 'trends' | 'logs';

export const ReadingHistoryTab: React.FC<ReadingHistoryTabProps> = ({ 
  onClose, 
  preferences: externalPreferences,
  onPreferencesChange: externalOnPreferencesChange,
  initialTab
}) => {
  const [activeView, setActiveView] = useState<ViewMode>(initialTab || 'chapters');

  useEffect(() => {
    if (initialTab) {
      setActiveView(initialTab);
    }
  }, [initialTab]);
  const [stats, setStats] = useState<ReadingHistoryStats | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences | null>(() => {
    return externalPreferences || getCachedPreferences() || null;
  });
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('auto');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedFileType, setSelectedFileType] = useState<'all' | 'epub' | 'pdf' | 'mobi' | 'azw3' | 'kfx' | 'azw'>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [availableBooks, setAvailableBooks] = useState<{ id: string; title: string; author?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showHomePageSettings, setShowHomePageSettings] = useState(false);

  // Initialize language on component mount
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Use external preferences if provided, otherwise load from storage
  useEffect(() => {
    if (externalPreferences) {
      setPreferences(externalPreferences);
    } else {
      loadPreferences();
    }
  }, [externalPreferences]);

  const loadStats = useCallback(async (bookId: string = selectedBookId) => {
    try {
      setIsLoading(true);
      const historyStats = await getReadingHistoryStats(bookId);
      setStats(historyStats);
      
      // Load all history to extract unique genres and book list
      const bookHistory = await getBookHistory();
      const booksList = bookHistory.map(b => ({
        id: b.bookId,
        title: b.bookTitle,
        author: b.bookAuthor
      }));
      setAvailableBooks(booksList);

      const genres = new Set<string>();
      bookHistory.forEach(book => {
        if (book.tags) {
          book.tags.forEach(tag => genres.add(tag));
        }
      });
      setAllGenres(Array.from(genres).sort());
    } catch (error) {
      console.error('Error loading reading history stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBookId]);

  useEffect(() => {
    loadStats(selectedBookId);
  }, [loadStats, selectedBookId]);

  const loadPreferences = async () => {
    try {
      const userPrefs = await getPreferences();
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePreferencesChange = async (newPreferences: ReadingPreferences) => {
    setPreferences(newPreferences);
    applyPreferencesTheme(newPreferences);
    
    try {
      await savePreferences(newPreferences);
      
      // Propagate changes to parent component if callback is provided
      if (externalOnPreferencesChange) {
        externalOnPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Get interface theme styles
  const getInterfaceStyles = () => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;
    const isDark = isHexColorDark(colors.panelBackground || '#ffffff');

    return {
      backgroundColor: colors.headerBackground || '#ffffff',
      color: colors.headerText || colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      borderColor: colors.borderColor || colors.headerBorder || (isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb'),
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || (isDark ? '#111827' : '#f9fafb'),
      accent: colors.accent || '#007BFF',
      textPrimary: colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      textSecondary: colors.textSecondary || (isDark ? '#cbd5e1' : '#6b7280'),
      isDark
    };
  };

  const interfaceStyles = getInterfaceStyles();

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{ 
        backgroundColor: interfaceStyles.panelSecondaryBackground,
        fontFamily: preferences?.applyFontGlobally ? 
          (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
           preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
           'Georgia, serif') : undefined
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
            <p style={{ color: interfaceStyles.color }}>{getTranslation('loadingReadingHistory')}</p>
          </div>
        </div>
      ) : (
        <>
      {/* Header */}
      <header 
        className="shadow-sm border-b transition-all duration-300"
        style={{
          backgroundColor: interfaceStyles.backgroundColor,
          borderColor: interfaceStyles.borderColor
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: interfaceStyles.color }}>
                  <Clock className="w-8 h-8 text-blue-600" />
                  {getTranslation('readingHistory')}
                </h1>
                {stats && (
                  <p className="mt-1" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {formatDuration(stats.totalReadingTime)} {getTranslation('totalTime')} • {stats.totalChaptersCompleted} {getTranslation('chaptersCompleted')}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Time Format Toggle */}
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-300"
                style={{
                  backgroundColor: interfaceStyles.panelBackground,
                  borderColor: interfaceStyles.borderColor,
                  color: interfaceStyles.color
                }}
              >
                <option value="auto">{getTranslation('autoFormat')}</option>
                <option value="minutes">{getTranslation('minutes')}</option>
                <option value="hours">{getTranslation('hours')}</option>
                <option value="detailed">{getTranslation('detailed')}</option>
              </select>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 border-b" style={{ borderColor: interfaceStyles.borderColor }}>
            <nav className="flex space-x-8">
              {[
                { id: 'chapters', label: getTranslation('chapterHistory'), icon: BookOpen },
                { id: 'books', label: getTranslation('bookHistory'), icon: Clock },
                { id: 'stats', label: getTranslation('statistics'), icon: TrendingUp },
                { id: 'trends', label: getTranslation('trends'), icon: BarChart3 },
                { 
                  id: 'logs', 
                  label: (() => {
                    const l = getCurrentLanguage();
                    const labels: Record<string, string> = {
                      pt: 'Log de Atividades',
                      en: 'Activity Log',
                      es: 'Registro de Actividades',
                      fr: 'Journal d’Activité',
                      de: 'Aktivitätsprotokoll',
                      it: 'Registro Attività',
                      ru: 'Журнал активности',
                      ja: 'アクティビティログ',
                      ko: '활동 기록',
                      zh: '活动日志',
                      ar: 'سجل النشاط',
                      hi: 'गतिविधि लॉग',
                      tr: 'Etkinlik Günlüğü',
                      sw: 'Kumbukumbu ya Shughuli',
                      bn: 'কার্যকলাপ লগ',
                      id: 'Log Aktivitas',
                      yo: 'Akọọlẹ Iṣẹ',
                      nl: 'Activiteitenlogboek',
                      th: 'บันทึกกิจกรรม',
                      ur: 'سرگرمی لاگ'
                    };
                    return labels[l] || labels['en'] || 'Activity Log';
                  })(), 
                  icon: FileText 
                }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveView(tab.id as ViewMode)}
                    className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-all duration-300 rounded-t-lg ${
                      activeView === tab.id
                        ? 'border-blue-500 text-blue-600 transform scale-105'
                        : 'border-transparent hover:border-gray-300 hover:bg-gray-100 hover:bg-opacity-20'
                    }`}
                    style={{
                      color: activeView === tab.id ? '#007BFF' : interfaceStyles.color,
                      opacity: activeView === tab.id ? 1 : 0.7,
                      backgroundColor: activeView === tab.id ? `${interfaceStyles.panelBackground}20` : 'transparent'
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search, Book Filter, and Sub-filters */}
          {(activeView === 'chapters' || activeView === 'books' || activeView === 'stats' || activeView === 'trends') && (
            <div className="mt-4 flex flex-col md:flex-row flex-wrap gap-3 items-stretch">
              {/* Book Selector Filter */}
              <div className="relative min-w-[200px] flex-shrink-0">
                <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                <select
                  id="reading-history-book-filter"
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 font-bold text-xs truncate cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: interfaceStyles.panelBackground,
                    borderColor: selectedBookId !== 'all' ? (interfaceStyles.isDark ? '#60a5fa' : '#2563eb') : interfaceStyles.borderColor,
                    color: selectedBookId !== 'all' ? (interfaceStyles.isDark ? '#93c5fd' : '#1d4ed8') : interfaceStyles.color
                  }}
                  title={localStorage.getItem('novel_reader_language') === 'pt' ? 'Filtrar por livro' : 'Filter by book'}
                >
                  <option value="all">
                    {localStorage.getItem('novel_reader_language') === 'pt' ? '📚 Todos os Livros' : '📚 All Books'}
                  </option>
                  {availableBooks.map(book => (
                    <option key={book.id} value={book.id}>
                      📖 {book.title} {book.author ? `(${book.author})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {(activeView === 'chapters' || activeView === 'books') && (
                <>
                  {/* Search */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder={getTranslation('searchBooksOrChapters')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs"
                      style={{
                        backgroundColor: interfaceStyles.panelBackground,
                        borderColor: interfaceStyles.borderColor,
                        color: interfaceStyles.color
                      }}
                    />
                  </div>

                  {/* Sort */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs font-semibold"
                    style={{
                      backgroundColor: interfaceStyles.panelBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                  >
                    <option value="date">{getTranslation('sortByDate')}</option>
                    <option value="duration">{getTranslation('sortByDuration')}</option>
                    <option value="book">{getTranslation('sortByBook')}</option>
                    <option value="chapter">{getTranslation('sortByChapter')}</option>
                  </select>

                  {/* Filter */}
                  <select
                    value={filterBy}
                    onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs font-semibold"
                    style={{
                      backgroundColor: interfaceStyles.panelBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                  >
                    <option value="all">{getTranslation('allTime')}</option>
                    <option value="today">{getTranslation('today')}</option>
                    <option value="week">{getTranslation('thisWeek')}</option>
                    <option value="month">{getTranslation('thisMonth')}</option>
                    <option value="completed">{getTranslation('completedOnly')}</option>
                    <option value="in-progress">{getTranslation('inProgress')}</option>
                  </select>

                  {/* File Type Filter */}
                  <select
                    value={selectedFileType}
                    onChange={(e) => setSelectedFileType(e.target.value as any)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs font-semibold"
                    style={{
                      backgroundColor: interfaceStyles.panelBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                  >
                    <option value="all">{getTranslation('allTypes')}</option>
                    <option value="epub">{getTranslation('epub')}</option>
                    <option value="pdf">{getTranslation('pdf')}</option>
                    <option value="mobi">MOBI</option>
                    <option value="azw">AZW</option>
                    <option value="azw3">AZW3</option>
                    <option value="kfx">KFX</option>
                  </select>

                  {/* Genre Filter */}
                  <select
                    value={selectedGenre}
                    onChange={(e) => setSelectedGenre(e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-xs font-semibold"
                    style={{
                      backgroundColor: interfaceStyles.panelBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                  >
                    <option value="all">{getTranslation('allGenres')}</option>
                    {allGenres.map(genre => (
                      <option key={genre} value={genre}>
                        {getTranslation(genre.toLowerCase()) || genre}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'chapters' && (
          <ChapterHistoryView
            timeFormat={timeFormat}
            sortBy={sortBy}
            filterBy={filterBy}
            fileTypeFilter={selectedFileType}
            genreFilter={selectedGenre}
            searchQuery={searchQuery}
            preferences={preferences}
            selectedBookId={selectedBookId}
          />
        )}
        
        {activeView === 'books' && (
          <BookHistoryView
            timeFormat={timeFormat}
            sortBy={sortBy}
            filterBy={filterBy}
            fileTypeFilter={selectedFileType}
            genreFilter={selectedGenre}
            searchQuery={searchQuery}
            preferences={preferences}
            selectedBookId={selectedBookId}
            onSelectBook={(bookId) => {
              setSelectedBookId(bookId);
              setActiveView('chapters');
            }}
          />
        )}
        
        {activeView === 'stats' && stats && (
          <OverallStatsView 
            stats={stats} 
            timeFormat={timeFormat} 
            preferences={preferences}
          />
        )}
        
        {activeView === 'trends' && (
          <ReadingTrendsChart 
            timeFormat={timeFormat} 
            preferences={preferences}
            selectedBookId={selectedBookId}
          />
        )}

        {activeView === 'logs' && (
          <ActivityLogsView 
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />
        )}
      </main>

      {/* Home Page Settings Panel */}
      {showHomePageSettings && preferences && (
        <HomePageSettings
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setShowHomePageSettings(false)}
        />
      )}

      {/* Snow/Rain overlays if active for interface theme */}
      {preferences?.selectedInterfaceTheme === 'snow' && (
        <SnowEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
      {preferences?.selectedInterfaceTheme === 'rain' && (
        <RainEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
      {preferences?.selectedInterfaceTheme === 'aurora' && (
        <PetalEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
        </>
      )}
    </div>
  );
};
