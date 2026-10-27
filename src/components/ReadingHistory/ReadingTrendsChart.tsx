import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, BarChart3, Clock } from 'lucide-react';
import { getReadingTrends } from '../../utils/reading-tracker';
import { formatDuration, formatShortDuration, formatLocalizedDate } from '../../utils/time-formatter';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';
import { getInterfaceTheme } from '../../utils/themes';
import type { ReadingTrend, TimeFormat, ReadingPreferences } from '../../types';

interface ReadingTrendsChartProps {
  timeFormat: TimeFormat;
  preferences?: ReadingPreferences;
  selectedBookId?: string;
}

export const ReadingTrendsChart: React.FC<ReadingTrendsChartProps> = ({ preferences, selectedBookId }) => {
  const [trends, setTrends] = useState<ReadingTrend[]>([]);
  const [period, setPeriod] = useState<number>(30);
  const [isLoading, setIsLoading] = useState(true);

  const loadTrends = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const trendData = await getReadingTrends(period, selectedBookId);
      setTrends(trendData);
    } catch (error) {
      console.error('Error loading reading trends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [period, selectedBookId]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

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

  const maxTime = Math.max(...trends.map(t => t.totalTime), 1);
  const totalTime = trends.reduce((sum, t) => sum + t.totalTime, 0);
  const totalSessions = trends.reduce((sum, t) => sum + t.sessionsCount, 0);
  const totalChapters = trends.reduce((sum, t) => sum + t.chaptersCompleted, 0);
  const activeDays = trends.filter(t => t.totalTime > 0).length;

  const getBarHeight = (time: number) => {
    return Math.max((time / maxTime) * 100, 2);
  };

  const getBarColor = (time: number) => {
    const intensity = time / maxTime;
    if (intensity > 0.8) return 'bg-blue-600';
    if (intensity > 0.6) return 'bg-blue-500';
    if (intensity > 0.4) return 'bg-blue-400';
    if (intensity > 0.2) return 'bg-blue-300';
    if (intensity > 0) return 'bg-blue-200';
    return 'bg-gray-100';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const currentLang = getCurrentLanguage();
    const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ja' ? 'ja-JP' : currentLang;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const dayNames = [
      getTranslation('sunday'),
      getTranslation('monday'),
      getTranslation('tuesday'),
      getTranslation('wednesday'),
      getTranslation('thursday'),
      getTranslation('friday'),
      getTranslation('saturday')
    ];
    return dayNames[date.getDay()];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p style={{ color: interfaceStyles.color }}>{getTranslation('loadingReadingTrends')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: interfaceStyles.color }}>
          {getTranslation('readingTrends')}
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium" style={{ color: interfaceStyles.color }}>
            {getTranslation('period')}:
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
            style={{
              backgroundColor: interfaceStyles.panelBackground,
              borderColor: interfaceStyles.borderColor,
              color: interfaceStyles.color
            }}
          >
            <option value={7}>{getTranslation('last7Days')}</option>
            <option value={30}>{getTranslation('last30Days')}</option>
            <option value={90}>{getTranslation('last90Days')}</option>
            <option value={365}>{getTranslation('lastYear')}</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('totalTime')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {formatDuration(totalTime, 'auto')}
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
            <Calendar className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('activeDays')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {activeDays}
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
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('sessions')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {totalSessions}
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
            <BarChart3 className="w-8 h-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                {getTranslation('chaptersTotal')}
              </p>
              <p className="text-2xl font-bold" style={{ color: interfaceStyles.color }}>
                {totalChapters}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div 
        className="rounded-lg p-6 shadow-sm border"
        style={{
          backgroundColor: interfaceStyles.panelBackground,
          borderColor: interfaceStyles.borderColor
        }}
      >
        <h3 className="text-lg font-semibold mb-6" style={{ color: interfaceStyles.color }}>
          {getTranslation('dailyReadingActivity')}
        </h3>
        
        {trends.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p style={{ color: interfaceStyles.color }}>{getTranslation('noReadingDataAvailable')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Chart */}
            <div className="relative">
              <div className="flex items-end justify-between h-64 px-2">
                {trends.map((trend) => (
                  <div key={trend.date} className="flex flex-col items-center group relative">
                    {/* Bar */}
                    <div
                      className={`w-6 rounded-t transition-all duration-200 hover:opacity-80 ${getBarColor(trend.totalTime)}`}
                      style={{ height: `${getBarHeight(trend.totalTime)}%` }}
                    />
                    
                    {/* Date label */}
                    <div className="mt-2 text-xs transform -rotate-45 origin-top-left" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                      {period <= 7 ? getDayOfWeek(trend.date) : formatDate(trend.date)}
                    </div>

                    {/* Tooltip */}
                    <div 
                      className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 text-white text-xs rounded py-2 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                      style={{ backgroundColor: '#1f2937' }}
                    >
                      <div className="font-medium">{formatLocalizedDate(trend.date)}</div>
                      <div>{getTranslation('time')}: {formatShortDuration(trend.totalTime)}</div>
                      <div>{getTranslation('sessions')}: {trend.sessionsCount}</div>
                      <div>{getTranslation('chaptersTotal')}: {trend.chaptersCompleted}</div>
                      <div>{getTranslation('books')}: {trend.booksRead.length}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-600 rounded"></div>
                <span>{getTranslation('highActivity')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded"></div>
                <span>{getTranslation('mediumActivity')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-200 rounded"></div>
                <span>{getTranslation('lowActivity')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 rounded"></div>
                <span>{getTranslation('noActivity')}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weekly Summary (for longer periods) */}
      {period >= 30 && trends.length > 0 && (
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <h3 className="text-lg font-semibold mb-6" style={{ color: interfaceStyles.color }}>
            {getTranslation('weeklyBreakdown')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { key: 'monday', dayIndex: 1 },
              { key: 'tuesday', dayIndex: 2 },
              { key: 'wednesday', dayIndex: 3 },
              { key: 'thursday', dayIndex: 4 },
              { key: 'friday', dayIndex: 5 },
              { key: 'saturday', dayIndex: 6 },
              { key: 'sunday', dayIndex: 0 }
            ].map(({ key, dayIndex }) => {
              const dayTrends = trends.filter(trend => {
                const date = new Date(trend.date);
                return date.getDay() === dayIndex;
              });
              
              const avgTime = dayTrends.reduce((sum, t) => sum + t.totalTime, 0) / Math.max(dayTrends.length, 1);
              
              return (
                <div 
                  key={key} 
                  className="text-center p-4 rounded-lg"
                  style={{ backgroundColor: interfaceStyles.panelSecondaryBackground }}
                >
                  <div className="text-sm font-medium mb-2" style={{ color: interfaceStyles.color }}>
                    {getTranslation(key)}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatShortDuration(avgTime)}
                  </div>
                  <div className="text-xs" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                    {getTranslation('avgPerDay')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
