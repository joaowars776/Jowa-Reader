import React from 'react';
import { Clock, BookOpen, TrendingUp, Target, Award, Calendar, Zap, BarChart3, AlertTriangle } from 'lucide-react';
import { formatDuration } from '../../utils/time-formatter';
import { getTranslation } from '../../utils/translations';
import type { ReadingHistoryStats, TimeFormat, ReadingPreferences } from '../../types';
import { getInterfaceTheme } from '../../utils/themes';

interface OverallStatsViewProps {
  stats: ReadingHistoryStats;
  timeFormat: TimeFormat;
  preferences?: ReadingPreferences;
}

export const OverallStatsView: React.FC<OverallStatsViewProps> = ({ stats, timeFormat, preferences }) => {
  // Check if user meets the 30-minute daily requirement for streak features
  const meetsStreakRequirement = stats.dailyAverage >= 30 * 60 * 1000; // 30 minutes in milliseconds

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

  const statCards = [
    {
      title: getTranslation('totalReadingTime'),
      value: formatDuration(stats.totalReadingTime, timeFormat),
      icon: Clock,
      color: 'blue',
      description: getTranslation('timeSpentReadingAcrossAllBooks')
    },
    {
      title: getTranslation('chaptersCompleted'),
      value: stats.totalChaptersCompleted.toLocaleString(),
      icon: BookOpen,
      color: 'green',
      description: getTranslation('totalChaptersFinished')
    },
    {
      title: getTranslation('booksStarted'),
      value: stats.totalBooksStarted.toLocaleString(),
      icon: TrendingUp,
      color: 'purple',
      description: getTranslation('numberOfBooksBegun')
    },
    {
      title: getTranslation('booksCompleted'),
      value: stats.totalBooksCompleted.toLocaleString(),
      icon: Target,
      color: 'orange',
      description: getTranslation('booksReadFromStartToFinish')
    },
    {
      title: getTranslation('averageSession'),
      value: formatDuration(stats.averageSessionDuration, timeFormat),
      icon: BarChart3,
      color: 'indigo',
      description: getTranslation('averageTimePerReadingSession')
    },
    {
      title: getTranslation('longestSession'),
      value: formatDuration(stats.longestSession, timeFormat),
      icon: Award,
      color: 'yellow',
      description: getTranslation('longestSingleReadingSession')
    },
    {
      title: getTranslation('currentStreak'),
      value: meetsStreakRequirement ? `${stats.currentStreak} ${getTranslation(stats.currentStreak !== 1 ? 'days' : 'day')}` : 'N/A',
      icon: Zap,
      color: 'red',
      description: getTranslation('consecutiveDaysWithReadingActivity'),
      disabled: !meetsStreakRequirement
    },
    {
      title: getTranslation('longestStreak'),
      value: meetsStreakRequirement ? `${stats.longestStreak} ${getTranslation(stats.longestStreak !== 1 ? 'days' : 'day')}` : 'N/A',
      icon: Calendar,
      color: 'teal',
      description: getTranslation('bestReadingStreakEver'),
      disabled: !meetsStreakRequirement
    }
  ];

  const averageCards = [
    {
      title: getTranslation('dailyAverage'),
      value: formatDuration(stats.dailyAverage, timeFormat),
      description: getTranslation('averageReadingTimePerDay')
    },
    {
      title: getTranslation('weeklyAverage'),
      value: formatDuration(stats.weeklyAverage, timeFormat),
      description: getTranslation('averageReadingTimePerWeek')
    },
    {
      title: getTranslation('monthlyAverage'),
      value: formatDuration(stats.monthlyAverage, timeFormat),
      description: getTranslation('averageReadingTimePerMonth')
    }
  ];

  const getColorClasses = (color: string, disabled: boolean = false) => {
    if (disabled) {
      return 'text-gray-400 bg-gray-100';
    }
    
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      orange: 'text-orange-600 bg-orange-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      red: 'text-red-600 bg-red-100',
      teal: 'text-teal-600 bg-teal-100'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const completionRate = stats.totalBooksStarted > 0 
    ? (stats.totalBooksCompleted / stats.totalBooksStarted * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-8">
      {/* Main Statistics Grid */}
      <div>
        <h2 className="text-xl font-bold mb-6" style={{ color: interfaceStyles.color }}>
          {getTranslation('readingStatistics')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            const colorClasses = getColorClasses(stat.color, stat.disabled);
            
            return (
              <div 
                key={stat.title} 
                className={`rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow ${
                  stat.disabled ? 'opacity-60' : ''
                }`}
                style={{
                  backgroundColor: interfaceStyles.panelBackground,
                  borderColor: interfaceStyles.borderColor
                }}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${colorClasses}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                      {stat.title}
                    </p>
                    <p className={`text-2xl font-bold ${stat.disabled ? 'text-gray-400' : ''}`} style={{ color: stat.disabled ? '#9ca3af' : interfaceStyles.color }}>
                      {stat.value}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                  {stat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak Requirement Notice - Positioned exactly below streak options */}
      {!meetsStreakRequirement && (
        <div 
          className="border-l-4 border-yellow-400 p-4 rounded-lg"
          style={{ backgroundColor: '#fefce8' }}
        >
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm text-yellow-800">
                <span className="font-medium">{getTranslation('note')}:</span>{' '}
                {getTranslation('streakRequirement')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reading Averages */}
      <div>
        <h2 className="text-xl font-bold mb-6" style={{ color: interfaceStyles.color }}>
          {getTranslation('readingAverages')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {averageCards.map((avg) => (
            <div 
              key={avg.title} 
              className="rounded-lg p-6 shadow-sm border"
              style={{
                backgroundColor: interfaceStyles.panelBackground,
                borderColor: interfaceStyles.borderColor
              }}
            >
              <div className="text-center">
                <p className="text-sm font-medium mb-2" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                  {avg.title}
                </p>
                <p className="text-3xl font-bold text-blue-600 mb-2">{avg.value}</p>
                <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.6 }}>
                  {avg.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Highlights */}
      <div>
        <h2 className="text-xl font-bold mb-6" style={{ color: interfaceStyles.color }}>
          {getTranslation('achievementHighlights')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Completion Rate */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">{getTranslation('completionRate')}</h3>
                <p className="text-3xl font-bold">{completionRate}%</p>
                <p className="text-blue-100 text-sm">
                  {stats.totalBooksCompleted} {getTranslation('of')} {stats.totalBooksStarted} {getTranslation('booksCompleted')}
                </p>
              </div>
              <Target className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          {/* Reading Consistency */}
          <div className={`bg-gradient-to-r rounded-lg p-6 text-white ${
            meetsStreakRequirement 
              ? 'from-green-500 to-teal-600' 
              : 'from-gray-400 to-gray-500'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">{getTranslation('readingConsistency')}</h3>
                <p className="text-3xl font-bold">
                  {meetsStreakRequirement ? stats.currentStreak : 'N/A'}
                </p>
                <p className={`text-sm ${meetsStreakRequirement ? 'text-green-100' : 'text-gray-200'}`}>
                  {meetsStreakRequirement 
                    ? `${getTranslation(stats.currentStreak !== 1 ? 'days' : 'day')} ${getTranslation('currentStreak')}`
                    : getTranslation('requires30MinDaily')
                  }
                </p>
              </div>
              <Zap className={`w-12 h-12 ${meetsStreakRequirement ? 'text-green-200' : 'text-gray-300'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Reading Insights */}
      <div>
        <h2 className="text-xl font-bold mb-6" style={{ color: interfaceStyles.color }}>
          {getTranslation('readingInsights')}
        </h2>
        <div 
          className="rounded-lg p-6 shadow-sm border"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: interfaceStyles.color }}>
                {getTranslation('readingHabits')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('averageSessionLength')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {formatDuration(stats.averageSessionDuration, 'auto')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('dailyReadingGoalProgress')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {stats.dailyAverage > 0 ? formatDuration(stats.dailyAverage, 'auto') : getTranslation('noData')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('readingConsistency')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {!meetsStreakRequirement ? getTranslation('buildDailyHabit') :
                     stats.currentStreak > 7 ? getTranslation('excellent') : 
                     stats.currentStreak > 3 ? getTranslation('good') : 
                     stats.currentStreak > 0 ? getTranslation('gettingStarted') : getTranslation('needsImprovement')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4" style={{ color: interfaceStyles.color }}>
                {getTranslation('progressSummary')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('booksInProgress')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {stats.totalBooksStarted - stats.totalBooksCompleted}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('completionRate')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {completionRate}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: interfaceStyles.color, opacity: 0.7 }}>
                    {getTranslation('bestStreak')}:
                  </span>
                  <span className="font-medium" style={{ color: interfaceStyles.color }}>
                    {meetsStreakRequirement 
                      ? `${stats.longestStreak} ${getTranslation(stats.longestStreak !== 1 ? 'days' : 'day')}`
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
