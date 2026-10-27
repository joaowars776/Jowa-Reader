import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Calendar, CheckCircle, Circle } from 'lucide-react';
import { getChapterHistory } from '../../utils/reading-tracker';
import { formatDuration, formatRelativeTime, formatLocalizedDate } from '../../utils/time-formatter';
import { getTranslation } from '../../utils/translations';
import type { ChapterHistory, TimeFormat, SortOption, FilterOption, ReadingPreferences } from '../../types';
import { getInterfaceTheme } from '../../utils/themes';

interface ChapterHistoryViewProps {
  timeFormat: TimeFormat;
  sortBy: SortOption;
  filterBy: FilterOption;
  fileTypeFilter?: 'all' | 'epub' | 'pdf' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  genreFilter?: string;
  searchQuery: string;
  preferences?: ReadingPreferences;
  selectedBookId?: string;
}

export const ChapterHistoryView: React.FC<ChapterHistoryViewProps> = ({
  timeFormat,
  sortBy,
  filterBy,
  fileTypeFilter = 'all',
  genreFilter = 'all',
  searchQuery,
  preferences,
  selectedBookId
}) => {
  const [chapters, setChapters] = useState<ChapterHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChapterHistory();
  }, []);

  const loadChapterHistory = async () => {
    try {
      setIsLoading(true);
      const history = await getChapterHistory();
      setChapters(history);
    } catch (error) {
      console.error('Error loading chapter history:', error);
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

  const formatReadTimes = (timesRead: number) => {
    const translation = getTranslation('readXTimes');
    const plural = timesRead !== 1 ? 's' : '';
    return translation
      .replace('{count}', timesRead.toString())
      .replace('{plural}', plural);
  };

  const filteredAndSortedChapters = React.useMemo(() => {
    let filtered = chapters;

    // Apply specific book filter if selected
    if (selectedBookId && selectedBookId !== 'all') {
      filtered = filtered.filter(chapter => chapter.bookId === selectedBookId);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(chapter =>
        chapter.bookTitle.toLowerCase().includes(query) ||
        chapter.bookAuthor.toLowerCase().includes(query) ||
        chapter.chapterTitle.toLowerCase().includes(query)
      );
    }

    // Apply time-based filters
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case 'today':
        filtered = filtered.filter(chapter => chapter.lastRead >= today);
        break;
      case 'week':
        filtered = filtered.filter(chapter => chapter.lastRead >= weekAgo);
        break;
      case 'month':
        filtered = filtered.filter(chapter => chapter.lastRead >= monthAgo);
        break;
      case 'completed':
        filtered = filtered.filter(chapter => chapter.completed);
        break;
      case 'in-progress':
        filtered = filtered.filter(chapter => !chapter.completed);
        break;
    }

    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filtered = filtered.filter(chapter => chapter.fileType === fileTypeFilter);
    }

    // Apply genre filter
    if (genreFilter !== 'all') {
      filtered = filtered.filter(chapter => chapter.tags?.includes(genreFilter));
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
      case 'chapter':
        filtered.sort((a, b) => a.chapterIndex - b.chapterIndex);
        break;
    }

    return filtered;
  }, [chapters, searchQuery, filterBy, sortBy, fileTypeFilter, genreFilter, selectedBookId]);

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

  if (filteredAndSortedChapters.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-medium mb-2" style={{ color: interfaceStyles.color }}>
          {getTranslation('noBooksFound')}
        </h3>
        <p style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {searchQuery.trim() || filterBy !== 'all'
            ? getTranslation('tryAdjustingSearch')
            : 'Start reading to see your chapter history here'}
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
                {getTranslation('chaptersTotal')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {filteredAndSortedChapters.length}
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
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('completeChapters')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {filteredAndSortedChapters.filter(c => c.completed).length}
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
                  filteredAndSortedChapters.reduce((sum, c) => sum + c.totalTime, 0),
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
                {getTranslation('avgPerChapter')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {formatDuration(
                  filteredAndSortedChapters.reduce((sum, c) => sum + c.totalTime, 0) / filteredAndSortedChapters.length,
                  'auto'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chapter List */}
      <div 
        className="rounded-lg shadow-sm border overflow-hidden"
        style={{
          backgroundColor: interfaceStyles.panelBackground,
          borderColor: interfaceStyles.borderColor
        }}
      >
        <div className="divide-y" style={{ borderColor: interfaceStyles.borderColor }}>
          {filteredAndSortedChapters.map((chapter) => {
            const itemId = `${chapter.bookId}-${chapter.chapterIndex}`;
            
            return (
              <div key={itemId} className="p-6 hover:bg-gray-50 hover:bg-opacity-20 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {chapter.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                      <h3 className="text-lg font-semibold truncate" style={{ color: interfaceStyles.color }}>
                        {chapter.chapterTitle}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <p style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                        <span className="font-medium">{chapter.bookTitle}</span> by {chapter.bookAuthor}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(chapter.totalTime, timeFormat)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{getTranslation('lastRead')} {formatRelativeTime(chapter.lastRead)}</span>
                      </div>
                      
                      <span>{formatReadTimes(chapter.timesRead)}</span>
                    </div>

                    {/* Metadata / Tags Display */}
                    {(chapter.fileType || (chapter.tags && chapter.tags.length > 0)) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {chapter.fileType && (
                          <span 
                            className="px-2 py-0.5 rounded text-xs font-medium uppercase"
                            style={{ 
                              backgroundColor: `${interfaceStyles.accent}20`,
                              color: interfaceStyles.accent,
                              border: `1px solid ${interfaceStyles.accent}40`
                            }}
                          >
                            {chapter.fileType}
                          </span>
                        )}
                        {chapter.tags?.map(tag => (
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

                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold" style={{ color: interfaceStyles.color }}>
                      {getTranslation('chapter')} {chapter.chapterIndex + 1}
                    </div>
                    <div className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                      {formatLocalizedDate(chapter.firstRead)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
