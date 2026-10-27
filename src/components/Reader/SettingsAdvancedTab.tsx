import React from 'react';
import { Volume2, EyeOff, Database, Download, Upload, User } from 'lucide-react';
import { useTranslations } from '../../hooks/useTranslations';
import { UserProfileSwitcher } from './UserProfileSwitcher';
import type { ReadingPreferences } from '../../types';

interface SettingsAdvancedTabProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
  DEFAULT_VALUES: {
    iconVisibility: Record<string, boolean>;
  };
  handleIconVisibilityChange: (key: string, visible: boolean) => void;
  handleExportData: () => void;
  setShowImportModal: (show: boolean) => void;
}

const DefaultIndicator: React.FC<{ isDefault: boolean }> = ({ isDefault }) => {
  const { getTranslation } = useTranslations();
  return isDefault ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-2">
      {getTranslation('default')}
    </span>
  ) : null;
};

export const SettingsAdvancedTab: React.FC<SettingsAdvancedTabProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
  isDefault,
  DEFAULT_VALUES,
  handleIconVisibilityChange,
  handleExportData,
  setShowImportModal
}) => {
  const { getTranslation } = useTranslations();
  return (
    <div className="space-y-4">
      {/* Text-to-Speech */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="w-5 h-5" style={{ color: '#955fffff' }} />
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: interfaceStyles.color }}>
            {getTranslation('textToSpeech')}
            <span className="text-xs font-normal px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
              {getTranslation('experimental')}
            </span>
          </h3>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('enableTextToSpeech')}
            <DefaultIndicator isDefault={isDefault('enableTextToSpeech', preferences.enableTextToSpeech)} />
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.enableTextToSpeech}
              onChange={(e) => onPreferencesChange({ ...preferences, enableTextToSpeech: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('enableTextToSpeechDescription')}
        </p>
      </div>

      {/* Icon Visibility Controls */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2 mb-4">
          <EyeOff className="w-5 h-5" style={{ color: '#007BFF' }} />
          <h3 className="text-lg font-semibold" style={{ color: interfaceStyles.color }}>
            {getTranslation('iconVisibility')}
          </h3>
        </div>
        
        <p className="text-sm mb-4" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('iconVisibilityDescription')}
        </p>

        <div className="space-y-3">
          {[
            { key: 'showSearchIcon', label: getTranslation('showSearchIcon') },
            { key: 'showBookmarkIcon', label: getTranslation('showBookmarkIcon') },
            { key: 'showFavoriteIcon', label: getTranslation('showFavoriteIcon') },
            { key: 'showShareIcon', label: getTranslation('showShareIcon') },
            { key: 'showFullscreenIcon', label: getTranslation('showFullscreenIcon') },
            { key: 'showShortcutsIcon', label: getTranslation('showShortcutsIcon') },
            { key: 'showTranslateIcon', label: getTranslation('showTranslateIcon') }
          ].map(({ key, label }) => {
            const currentIconVisibility = preferences.iconVisibility || DEFAULT_VALUES.iconVisibility;
            const isVisible = currentIconVisibility[key as keyof typeof currentIconVisibility] !== undefined
              ? currentIconVisibility[key as keyof typeof currentIconVisibility]
              : DEFAULT_VALUES.iconVisibility[key as keyof typeof DEFAULT_VALUES.iconVisibility];
            const isDefaultForIcon = DEFAULT_VALUES.iconVisibility[key as keyof typeof DEFAULT_VALUES.iconVisibility] === isVisible;
            
            return (
              <div key={key} className="flex items-center justify-between">
                <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
                  {label}
                  <DefaultIndicator isDefault={isDefaultForIcon} />
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => handleIconVisibilityChange(key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            );
          })}
        </div>

        {/* Settings Icon Notice */}
        <div 
          className="mt-4 p-3 rounded-lg border-l-4 animate-in fade-in"
          style={{ 
            backgroundColor: '#fef3c7',
            borderColor: '#f59e0b'
          }}
        >
          <p className="text-sm text-yellow-800">
            <strong>{getTranslation('note')}:</strong> {getTranslation('settingsIconAlwaysVisible')}
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-emerald-500" />
          <h3 className="text-lg font-semibold" style={{ color: interfaceStyles.color }}>
            {getTranslation('dataManagement')}
          </h3>
        </div>
        
        <p className="text-sm mb-4" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('dataManagementDescription')}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleExportData}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {getTranslation('exportData')}
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 rounded-lg transition-all duration-300 shadow-sm cursor-pointer"
            style={{ 
              borderColor: '#10b981',
              color: '#10b981',
              backgroundColor: 'transparent'
            }}
          >
            <Upload className="w-4 h-4" />
            {getTranslation('importData')}
          </button>
        </div>
      </div>

      {/* Active User Profile Section */}
      <div className="p-4 rounded-lg border flex items-center justify-between gap-3 min-w-0" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <User className="w-5 h-5 text-blue-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate" style={{ color: interfaceStyles.color }}>
              {getTranslation('switchUser')}
            </h3>
            <p className="text-xs opacity-70 truncate" style={{ color: interfaceStyles.color }}>
              {getTranslation('switchUserDescription') || 'Perfil ativo e gerenciamento de contas'}
            </p>
          </div>
        </div>
        <UserProfileSwitcher interfaceStyles={interfaceStyles} />
      </div>
    </div>
  );
};
