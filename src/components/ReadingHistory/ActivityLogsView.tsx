import React, { useState, useEffect } from 'react';
import { FileText, RotateCcw, Clock, BookOpen, Bookmark, Trash2, Settings, Languages, PlusCircle, Check } from 'lucide-react';
import { getActivityLogs, revertSettingActivity, translateLog, type ActivityLog } from '../../utils/activity-logger';
import { getPreferences, savePreferences } from '../../utils/storage';
import { getCurrentLanguage, getTranslation } from '../../utils/translations';
import { getInterfaceThemeFromPrefs } from '../../utils/themes';
import type { ReadingPreferences } from '../../types';

interface ActivityLogsViewProps {
  preferences: ReadingPreferences | null;
  onPreferencesChange?: (prefs: ReadingPreferences) => void;
}

export const ActivityLogsView: React.FC<ActivityLogsViewProps> = ({ preferences, onPreferencesChange }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [revertedId, setRevertedId] = useState<string | null>(null);

  const lang = getCurrentLanguage();
  const isPt = lang === 'pt';

  const loadLogs = () => {
    setLogs(getActivityLogs());
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('activity_logs_updated', loadLogs);
    return () => {
      window.removeEventListener('activity_logs_updated', loadLogs);
    };
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'read_chapter':
        return <BookOpen className="w-4 h-4 text-emerald-500" />;
      case 'create_bookmark':
        return <Bookmark className="w-4 h-4 text-amber-500" />;
      case 'delete_bookmark':
        return <Trash2 className="w-4 h-4 text-red-400" />;
      case 'change_setting':
        return <Settings className="w-4 h-4 text-blue-500" />;
      case 'translate_book':
        return <Languages className="w-4 h-4 text-purple-500" />;
      case 'add_book':
        return <PlusCircle className="w-4 h-4 text-teal-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const handleRevert = async (log: ActivityLog) => {
    if (log.type !== 'change_setting') return;
    setRevertingId(log.id);
    try {
      const success = await revertSettingActivity(log);
      if (success) {
        setRevertedId(log.id);
        // Load updated preferences and update parent
        const updatedPrefs = await getPreferences();
        if (onPreferencesChange && updatedPrefs) {
          onPreferencesChange(updatedPrefs);
        }
        setTimeout(() => setRevertedId(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRevertingId(null);
    }
  };

  const theme = getInterfaceThemeFromPrefs(preferences);
  const colors = theme.colors;

  const cardBg = colors.panelBackground || '#ffffff';
  const borderCol = colors.headerBorder || '#e5e7eb';
  const textColor = colors.headerText || '#1f2937';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: textColor }}>
            <FileText className="w-5 h-5 text-blue-500" />
            {getTranslation('siteActivityLog')}
          </h2>
          <p className="text-xs opacity-70" style={{ color: textColor }}>
            {getTranslation('siteActivityLogDesc')}
          </p>
        </div>
        
        {logs.length > 0 && (
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                const username = localStorage.getItem('novel_reader_username') || 'default';
                localStorage.removeItem(`activity_logs_${username}`);
                window.dispatchEvent(new Event('activity_logs_updated'));
              }
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border hover:bg-red-50 hover:bg-opacity-10 text-red-500 transition-all duration-300 cursor-pointer flex items-center gap-1.5"
            style={{ borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {getTranslation('clearLog')}
          </button>
        )}
      </div>

      {logs.length === 0 ? (
        <div 
          className="p-12 text-center rounded-2xl border flex flex-col items-center justify-center gap-3 select-none"
          style={{ backgroundColor: cardBg, borderColor: borderCol }}
        >
          <FileText className="w-12 h-12 opacity-35 text-gray-400 animate-pulse" />
          <p className="font-semibold opacity-70" style={{ color: textColor }}>
            {getTranslation('noActivitiesRecorded')}
          </p>
          <p className="text-xs opacity-50 max-w-sm" style={{ color: textColor }}>
            {getTranslation('noActivitiesRecordedDesc')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-2 scrollbar-none">
          {logs.map((log) => {
            const localeMap: Record<string, string> = {
              pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
              ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN',
              tr: 'tr-TR', sw: 'sw-KE', bn: 'bn-BD', id: 'id-ID', yo: 'yo-NG', nl: 'nl-NL',
              th: 'th-TH', ur: 'ur-PK'
            };
            const activeLocale = localeMap[lang] || lang || 'en-US';
            const dateObj = new Date(log.timestamp);
            const dateStr = dateObj.toLocaleDateString(activeLocale, {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });
            const timeStr = dateObj.toLocaleTimeString(activeLocale, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });

            const isSetting = log.type === 'change_setting';

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl border flex items-start justify-between gap-4 transition-all duration-200 hover:translate-x-0.5"
                style={{ 
                  backgroundColor: cardBg, 
                  borderColor: borderCol,
                  color: textColor
                }}
              >
                <div className="flex items-start gap-3.5">
                  <div 
                    className="p-2 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.accent}12` }}
                  >
                    {getLogIcon(log.type)}
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-semibold leading-snug">
                      {translateLog(log, lang)}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] opacity-50 font-bold uppercase tracking-wider">
                      <Clock className="w-3 h-3" />
                      <span>{dateStr}</span>
                      <span>•</span>
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>

                {isSetting && (
                  <button
                    onClick={() => handleRevert(log)}
                    disabled={revertingId === log.id || revertedId === log.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex-shrink-0 ${
                      revertedId === log.id
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 border opacity-90 hover:opacity-100 cursor-pointer'
                    }`}
                    style={{ 
                      borderColor: revertedId === log.id ? undefined : borderCol,
                      color: revertedId === log.id ? undefined : colors.accent
                    }}
                  >
                    {revertedId === log.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{getTranslation('reverted')}</span>
                      </>
                    ) : revertingId === log.id ? (
                      <span className="animate-spin w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{getTranslation('revert')}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
