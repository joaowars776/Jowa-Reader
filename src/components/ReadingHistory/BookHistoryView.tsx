import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Calendar, TrendingUp, ChevronRight } from 'lucide-react';
import { getBookHistory } from '../../utils/reading-tracker';
import { formatDuration, formatRelativeTime, getReadingTimeMessage, formatLocalizedDate } from '../../utils/time-formatter';
import { getTranslation } from '../../utils/translations';
import type { BookHistory, TimeFormat, SortOption, FilterOption, ReadingPreferences } from '../../types';
import { getInterfaceTheme } from '../../utils/themes';

interface BookHistoryViewProps {
  timeFormat: TimeFormat;
  sortBy: SortOption;
  filterBy: FilterOption;
  fileTypeFilter?: 'all' | 'epub' | 'pdf' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  genreFilter?: string;
  searchQuery: string;
  preferences?: ReadingPreferences;
  selectedBookId?: string;
  onSelectBook?: (bookId: string) => void;
}

export const BookHistoryView: React.FC<BookHistoryViewProps> = ({
  timeFormat,
  sortBy,
  filterBy,
  fileTypeFilter = 'all',
  genreFilter = 'all',
  searchQuery,
  preferences,
  selectedBookId,
  onSelectBook
}) => {
  const [books, setBooks] = useState<BookHistory[]>([]);
  const [expandedBook, setExpandedBook] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBookHistory();
  }, []);

  const loadBookHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getBookHistory();
      setBooks(history);
    } catch (error) {
      console.error('Error loading book history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get interface theme styles
  const getInterfaceStyles = () => {
    const themeId = preferences?.selectedInterfaceTheme || 'light';
    const subTheme = preferences?.snowSubTheme || 'day';
    const menuStyle = preferences?.menuStyle || 'classic';
    const theme = getInterfaceTheme(themeId, subTheme, menuStyle);
    
    const colors = themeId === 'custom' && preferences?.interfaceColors 
      ? preferences.interfaceColors 
      : theme.colors;

    return {
      backgroundColor: colors.headerBackground || '#ffffff',
      color: colors.headerText || '#1f2937',
      borderColor: colors.headerBorder || '#e5e7eb',
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || '#f9fafb',
      accent: colors.accent || '#007BFF'
    };
  };

  const interfaceStyles = getInterfaceStyles();

  const filteredAndSortedBooks = React.useMemo(() => {
    let filtered = books;

    // Apply specific book filter if selected
    if (selectedBookId && selectedBookId !== 'all') {
      filtered = filtered.filter(book => book.bookId === selectedBookId);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(book =>
        book.bookTitle.toLowerCase().includes(query) ||
        book.bookAuthor.toLowerCase().includes(query)
      );
    }

    // Apply time-based filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'today':
        filtered = filtered.filter(book => book.lastRead >= today);
        break;
      case 'week':
        filtered = filtered.filter(book => book.lastRead >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(book => book.lastRead >= monthAgo);
        break;
      case 'completed':
        filtered = filtered.filter(book => book.completionPercentage >= 100);
        break;
      case 'in-progress':
        filtered = filtered.filter(book => book.completionPercentage < 100);
        break;
    }

    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(book => book.fileType === fileTypeFilter);
    }

    // Apply genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(book => book.tags?.includes(genreFilter));
    }

    // Apply sorting
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => b.lastRead.getTime() - a.lastRead.getTime());
        break;
      case 'duration':
        filtered.sort((a, b) => b.totalTime - a.totalTime);
        break;
      case 'book':
        filtered.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
        break;
    }

    return filtered;
  }, [books, searchQuery, filterBy, sortBy, fileTypeFilter, genreFilter, selectedBookId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p style={{ color: interfaceStyles.color }}>{getTranslation('loadingReadingHistory')}</p>
        </div>
      </div>
    );
  }

  if (filteredAndSortedBooks.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium mb-2" style={{ color: interfaceStyles.color }}>
          {getTranslation('noBooksFound')}
        </h3>
        <p style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {searchQuery.trim() || filterBy !== 'all'
            ? getTranslation('tryAdjustingSearch')
            : 'Start reading to see your book history here'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('booksStarted')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {filteredAndSortedBooks.length}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('complete')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {filteredAndSortedBooks.filter(b => b.completionPercentage >= 100).length}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('totalTime')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {formatDuration(
                  filteredAndSortedBooks.reduce((sum, b) => sum + b.totalTime, 0),
                  'auto'
                )}
              </p>
            </div>
          </div>
        </div>

        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('avgPerBook')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {formatDuration(
                  filteredAndSortedBooks.reduce((sum, b) => sum + b.totalTime, 0) / filteredAndSortedBooks.length,
                  'auto'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Book List */}
      <div 
        className="rounded-lg shadow-sm border overflow-hidden"
        style={{
          backgroundColor: interfaceStyles.panelBackground,
          borderColor: interfaceStyles.borderColor
        }}
      >
        <div className="divide-y" style={{ borderColor: interfaceStyles.borderColor }}>
          {filteredAndSortedBooks.map((book) => {
            return (
              <div key={book.bookId} className="transition-colors">
                <div 
                  className="p-6 hover:bg-gray-50 hover:bg-opacity-20 cursor-pointer"
                  onClick={() => setExpandedBook(expandedBook === book.bookId ? null : book.bookId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <ChevronRight 
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            expandedBook === book.bookId ? 'rotate-90' : ''
                          }`} 
                        />
                        <h3 className="text-lg font-semibold truncate" style={{ color: interfaceStyles.color }}>
                          {book.bookTitle}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <p style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                          by {book.bookAuthor}
                        </p>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-blue-600 font-medium">
                          {getReadingTimeMessage(book.totalTime)}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(book.totalTime, timeFormat)}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{getTranslation('lastRead')} {formatRelativeTime(book.lastRead)}</span>
                        </div>
                        
                        <span>{book.chaptersRead} {getTranslation('chaptersTotal')} {getTranslation('read')}</span>
                        
                        {book.completionPercentage > 0 && (
                          <span>{Math.round(book.completionPercentage)}% {getTranslation('complete')}</span>
                        )}
                      </div>

                      {/* Metadata / Tags Display */}
                      {(book.fileType || (book.tags && book.tags.length > 0)) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {book.fileType && (
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                              style={{ 
                                backgroundColor: `${interfaceStyles.accent}20`,
                                color: interfaceStyles.accent,
                                border: `1px solid ${interfaceStyles.accent}40`
                              }}
                            >
                              {book.fileType}
                            </span>
                          )}
                          {book.tags?.map(tag => (
                            <span 
                              key={tag}
                              className="px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: interfaceStyles.panelSecondaryBackground,
                                color: interfaceStyles.color,
                                opacity: 0.8,
                                border: `1px solid ${interfaceStyles.borderColor}`
                              }}
                            >
                              {getTranslation(tag.toLowerCase()) || tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ml-4 text-right flex flex-col items-end">
                      <div className="text-sm mb-1" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                        {getTranslation('firstRead')}
                      </div>
                      <div className="text-sm font-medium" style={{ color: interfaceStyles.color }}>
                        {formatLocalizedDate(book.firstRead)}
                      </div>
                      {onSelectBook && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBook(book.bookId);
                          }}
                          className="mt-2.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all hover:scale-105 cursor-pointer shadow-xs flex items-center gap-1.5"
                          style={{
                            backgroundColor: selectedBookId === book.bookId ? `${interfaceStyles.accent}25` : interfaceStyles.panelBackground,
                            borderColor: selectedBookId === book.bookId ? interfaceStyles.accent : interfaceStyles.borderColor,
                            color: selectedBookId === book.bookId ? interfaceStyles.accent : interfaceStyles.color
                          }}
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{selectedBookId === book.bookId ? 'Filtro Ativo' : 'Ver Capítulos'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Sessions */}
                {expandedBook === book.bookId && (
                  <div 
                    className="px-6 pb-6"
                    style={{ backgroundColor: interfaceStyles.panelSecondaryBackground }}
                  >
                    <h4 className="text-sm font-medium mb-3" style={{ color: interfaceStyles.color }}>
                      {getTranslation('readingSessions')}
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {book.sessions
                        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
                        .map((session) => (
                          <div 
                            key={session.id} 
                            className="flex items-center justify-between py-2 px-3 rounded border"
                            style={{
                              backgroundColor: interfaceStyles.panelBackground,
                              borderColor: interfaceStyles.borderColor
                            }}
                          >
                            <div className="flex-1">
                              <div className="text-sm font-medium" style={{ color: interfaceStyles.color }}>
                                {session.chapterTitle}
                              </div>
                              <div className="text-xs" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                                {formatLocalizedDate(session.startTime)} • {formatDuration(session.duration, timeFormat)}
                              </div>
                            </div>
                            {session.completed && (
                              <div className="text-xs text-green-600 font-medium">{getTranslation('complete')}</div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
