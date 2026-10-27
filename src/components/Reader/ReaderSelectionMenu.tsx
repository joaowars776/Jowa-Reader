import React, { useState } from 'react';
import { Bookmark as BookmarkIcon, Trash2, Edit2, Copy, Check } from 'lucide-react';
import type { ReadingPreferences } from '../../types';
import { getInterfaceThemeFromPrefs, isHexColorDark } from '../../utils/themes';

interface ReaderSelectionMenuProps {
  selectionMenu: { x: number; y: number; text: string; existingBookmarkId?: string } | null;
  preferences: ReadingPreferences;
  getTranslation: (key: string) => string;
  onEditBookmark: (e: React.MouseEvent) => void;
  onDeleteTextBookmark: (e: React.MouseEvent) => void;
  onSaveTextBookmark: (e: React.MouseEvent) => void;
}

export const ReaderSelectionMenu: React.FC<ReaderSelectionMenuProps> = ({
  selectionMenu,
  preferences,
  getTranslation,
  onEditBookmark,
  onDeleteTextBookmark,
  onSaveTextBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  if (!selectionMenu) return null;

  const theme = getInterfaceThemeFromPrefs(preferences);
  const colors = theme.colors;
  const isDark = isHexColorDark(colors.panelBackground || '#ffffff');
  const bgColor = colors.panelBackground || (isDark ? '#1e293b' : '#ffffff');
  const textColor = colors.panelText || colors.textPrimary || (isDark ? '#f8fafc' : '#0f172a');
  const borderColor = colors.panelBorder || colors.borderColor || (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)');
  const accentColor = colors.accent || '#3b82f6';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(selectionMenu.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy selected text:', err);
    }
  };

  return (
    <div 
      className="fixed z-[100] flex items-center gap-1 p-1.5 rounded-full shadow-2xl border animate-in fade-in zoom-in duration-200"
      style={{ 
        left: `${selectionMenu.x}px`, 
        top: `${selectionMenu.y - 52}px`,
        transform: 'translateX(-50%)',
        backgroundColor: bgColor,
        borderColor: borderColor,
        color: textColor
      }}
    >
      {selectionMenu.existingBookmarkId ? (
        <div className="flex items-center">
          <button
            onClick={onEditBookmark}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex items-center gap-1.5 px-3 cursor-pointer"
            title={getTranslation('edit')}
          >
            <Edit2 className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span className="text-xs font-semibold">{getTranslation('edit')}</span>
          </button>
          <div className="w-px h-4 mx-1" style={{ backgroundColor: borderColor }} />
          <button
            onClick={onDeleteTextBookmark}
            className="p-1.5 hover:bg-red-500/10 text-red-500 rounded-full transition-colors flex items-center gap-1.5 px-3 cursor-pointer"
            title={getTranslation('delete')}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{getTranslation('delete')}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onSaveTextBookmark}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex items-center gap-1.5 px-3 cursor-pointer"
          title={getTranslation('bookmark')}
        >
          <BookmarkIcon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          <span className="text-xs font-semibold">{getTranslation('bookmark')}</span>
        </button>
      )}

      <div className="w-px h-4 mx-0.5" style={{ backgroundColor: borderColor }} />

      {/* Copy Selected Text Button */}
      <button
        onClick={handleCopy}
        className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex items-center gap-1.5 px-3 cursor-pointer"
        title={getTranslation('copySelectedText')}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-500">{getTranslation('copied')}</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" style={{ color: accentColor }} />
            <span className="text-xs font-semibold">{getTranslation('copy')}</span>
          </>
        )}
      </button>
    </div>
  );
};
