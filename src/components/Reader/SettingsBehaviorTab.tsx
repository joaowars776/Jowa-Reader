import React from 'react';
import { useTranslations } from '../../hooks/useTranslations';
import type { ReadingPreferences } from '../../types';

interface SettingsBehaviorTabProps {
  preferences: ReadingPreferences;
  onPreferencesChange: (preferences: ReadingPreferences) => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  isDefault: (key: string, value: unknown) => boolean;
}

const DefaultIndicator: React.FC<{ isDefault: boolean }> = ({ isDefault }) => {
  const { getTranslation } = useTranslations();
  return isDefault ? (
    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 ml-2">
      {getTranslation('default')}
    </span>
  ) : null;
};

export const SettingsBehaviorTab: React.FC<SettingsBehaviorTabProps> = ({
  preferences,
  onPreferencesChange,
  interfaceStyles,
  isDefault
}) => {
  const { getTranslation } = useTranslations();
  return (
    <div className="space-y-4">
      {/* Corner Navigation */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('cornerNavigationVisible')}
            <DefaultIndicator isDefault={isDefault('cornerNavigation', preferences.cornerNavigation)} />
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.cornerNavigation?.visible ?? false}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                cornerNavigation: { ...(preferences.cornerNavigation || { visible: false }), visible: e.target.checked }
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('cornerNavigationDescription')}
        </p>
      </div>

      {/* Show Top Bar in Full Screen */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('showTopBarInFullScreen')}
            <DefaultIndicator isDefault={preferences.showTopBarInFullScreen === false} />
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.showTopBarInFullScreen}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                showTopBarInFullScreen: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('showTopBarInFullScreenDescription')}
        </p>
      </div>

      {/* Fixed Top Bar */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('fixedTopBar')}
            <DefaultIndicator isDefault={isDefault('fixedTopBar', preferences.fixedTopBar)} />
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.fixedTopBar ?? true}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                fixedTopBar: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('fixedTopBarDescription')}
        </p>
      </div>

      {/* Mark Read Text */}
      <div className="p-4 rounded-lg border" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium flex items-center" style={{ color: interfaceStyles.color }}>
            {getTranslation('markReadText')}
            <DefaultIndicator isDefault={isDefault('markReadText', preferences.markReadText || false)} />
          </span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.markReadText || false}
              onChange={(e) => onPreferencesChange({
                ...preferences,
                markReadText: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <p className="text-sm mb-2" style={{ color: interfaceStyles.color, opacity: 0.7 }}>
          {getTranslation('markReadTextDescription')}
        </p>

        {preferences.markReadText && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
            <span className="block text-sm font-medium mb-2" style={{ color: interfaceStyles.color }}>
              {getTranslation('markReadStyle')}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { id: 'underline', label: getTranslation('markReadStyleUnderline') },
                { id: 'strike', label: getTranslation('markReadStyleStrike') },
                { id: 'highlight', label: getTranslation('markReadStyleHighlight') },
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => onPreferencesChange({
                    ...preferences,
                    markReadStyle: style.id as any
                  })}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center cursor-pointer transition-all ${
                    (preferences.markReadStyle || 'underline') === style.id
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  style={{
                    color: (preferences.markReadStyle || 'underline') === style.id ? '#ffffff' : interfaceStyles.color,
                    borderColor: (preferences.markReadStyle || 'underline') === style.id ? '#2563eb' : interfaceStyles.borderColor
                  }}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
