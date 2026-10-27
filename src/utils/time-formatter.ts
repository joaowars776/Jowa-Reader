import type { TimeFormat } from '../types';
import { getTranslation, getCurrentLanguage } from './translations';

export const formatDuration = (milliseconds: number, format: TimeFormat = 'auto'): string => {
  if (milliseconds === 0) return `0 ${getTranslation('minutes').toLowerCase()}`;

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const getPlural = (value: number, key: string) => {
    const translation = getTranslation(key);
    // Simple pluralization for English, others might need more complex logic
    // but we'll stick to the provided keys for now
    if (value === 1) {
      if (key === 'minutes') return getTranslation('minute').toLowerCase();
      if (key === 'hours') return getTranslation('hour').toLowerCase();
      if (key === 'days') return getTranslation('day').toLowerCase();
      if (key === 'seconds') return getTranslation('second').toLowerCase();
    }
    return translation.toLowerCase();
  };

  switch (format) {
    case 'minutes':
      return `${Math.ceil(milliseconds / (1000 * 60))} ${getPlural(Math.ceil(milliseconds / (1000 * 60)), 'minutes')}`;
    
    case 'hours': {
      const totalHours = milliseconds / (1000 * 60 * 60);
      return `${totalHours.toFixed(1)} ${getPlural(totalHours, 'hours')}`;
    }
    case 'detailed': {
      const parts: string[] = [];
      if (days > 0) parts.push(`${days} ${getPlural(days, 'days')}`);
      if (hours % 24 > 0) parts.push(`${hours % 24} ${getPlural(hours % 24, 'hours')}`);
      if (minutes % 60 > 0) parts.push(`${minutes % 60} ${getPlural(minutes % 60, 'minutes')}`);
      return parts.join(', ') || `0 ${getTranslation('minutes').toLowerCase()}`;
    }
    case 'auto':
    default:
      if (days > 0) {
        const h = hours % 24;
        return `${days} ${getPlural(days, 'days')}${h > 0 ? `${getTranslation('andConnector')}${h} ${getPlural(h, 'hours')}` : ''}`;
      } else if (hours > 0) {
        const m = minutes % 60;
        return `${hours} ${getPlural(hours, 'hours')}${m > 0 ? `${getTranslation('andConnector')}${m} ${getPlural(m, 'minutes')}` : ''}`;
      } else if (minutes > 0) {
        return `${minutes} ${getPlural(minutes, 'minutes')}`;
      } else {
        return `${seconds} ${getPlural(seconds, 'seconds')}`;
      }
  }
};

export const formatShortDuration = (milliseconds: number): string => {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}${getTranslation('unitDay')} ${hours % 24}${getTranslation('unitHour')}`;
  } else if (hours > 0) {
    return `${hours}${getTranslation('unitHour')} ${minutes % 60}${getTranslation('unitMinute')}`;
  } else {
    return `${minutes}${getTranslation('unitMinute')}`;
  }
};

export const formatTimeRange = (startTime: Date, endTime: Date): string => {
  const start = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const end = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  const startDate = startTime.toDateString();
  const endDate = endTime.toDateString();
  
  if (startDate === endDate) {
    return `${start} - ${end}`;
  } else {
    return `${formatLocalizedDate(startTime)} ${start} - ${formatLocalizedDate(endTime)} ${end}`;
  }
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return getTranslation('justNow');
  } else if (diffMinutes < 60) {
    const unit = diffMinutes === 1 ? getTranslation('minute').toLowerCase() : getTranslation('minutes').toLowerCase();
    return `${diffMinutes} ${unit} ${getTranslation('ago') || 'ago'}`;
  } else if (diffHours < 24) {
    const unit = diffHours === 1 ? getTranslation('hour').toLowerCase() : getTranslation('hours').toLowerCase();
    return `${diffHours} ${unit} ${getTranslation('ago') || 'ago'}`;
  } else if (diffDays < 7) {
    const unit = diffDays === 1 ? getTranslation('day').toLowerCase() : getTranslation('days').toLowerCase();
    return `${diffDays} ${unit} ${getTranslation('ago') || 'ago'}`;
  } else {
    const currentLang = getCurrentLanguage();
    return date.toLocaleDateString(currentLang === 'zh' ? 'zh-CN' : currentLang === 'ja' ? 'ja-JP' : currentLang);
  }
};

export const getReadingTimeMessage = (totalTime: number): string => {
  const hours = Math.floor(totalTime / (1000 * 60 * 60));
  const minutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    const hUnit = hours === 1 ? getTranslation('hour').toLowerCase() : getTranslation('hours').toLowerCase();
    const mUnit = minutes === 1 ? getTranslation('minute').toLowerCase() : getTranslation('minutes').toLowerCase();
    return `${getTranslation('youveSpent')} ${hours} ${hUnit} ${minutes > 0 ? `${minutes} ${mUnit}` : ''} ${getTranslation('readingThisBook')}`;
  } else if (minutes > 0) {
    const mUnit = minutes === 1 ? getTranslation('minute').toLowerCase() : getTranslation('minutes').toLowerCase();
    return `${getTranslation('youveSpent')} ${minutes} ${mUnit} ${getTranslation('readingThisBook')}`;
  } else {
    return getTranslation('notMuchTimeSpent');
  }
};

export const formatLocalizedDate = (dateInput: Date | string | number): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  const currentLang = getCurrentLanguage();
  const locale = currentLang === 'pt' ? 'pt-BR' : currentLang === 'zh' ? 'zh-CN' : currentLang === 'ja' ? 'ja-JP' : currentLang;
  return date.toLocaleDateString(locale);
};
