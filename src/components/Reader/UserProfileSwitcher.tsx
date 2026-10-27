import React, { useState, useRef, useEffect } from 'react';
import { User, ChevronDown, Check, Plus, Loader2, Edit2, X } from 'lucide-react';
import { switchUserSession, getUsername, getUsedUsernames, renameUserProfile, getProfilesList, isReservedUsername } from '../../utils/storage';
import { getTranslation } from '../../utils/translations';
import { isHexColorDark } from '../../utils/themes';
import type { ReadingPreferences } from '../../types';
import { InterfaceEffectsOverlay } from './InterfaceEffectsOverlay';

interface UserProfileSwitcherProps {
  interfaceStyles?: {
    backgroundColor?: string;
    color?: string;
    borderColor?: string;
    panelBackground?: string;
    panelSecondaryBackground?: string;
    accent?: string;
    textSecondary?: string;
    inputBackground?: string;
    inputText?: string;
    isDark?: boolean;
  };
  preferences?: ReadingPreferences;
  className?: string;
}

export const UserProfileSwitcher: React.FC<UserProfileSwitcherProps> = ({ interfaceStyles, preferences, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [profiles, setProfiles] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeUser = typeof window !== 'undefined' ? getUsername() : 'default';
  const usedUsers = (profiles.length > 0 
    ? profiles 
    : (typeof window !== 'undefined' ? getUsedUsernames() : [activeUser]))
    .filter(u => u && !isReservedUsername(u));
  const otherUsers = usedUsers.filter((u: string) => u && u !== activeUser && !isReservedUsername(u));

  // Load server profiles
  useEffect(() => {
    let isMounted = true;
    const loadProfiles = async () => {
      try {
        const list = await getProfilesList();
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setProfiles(list);
        }
      } catch (err) {
        console.error('Failed to load profiles in UserProfileSwitcher:', err);
      }
    };
    loadProfiles();
    return () => { isMounted = false; };
  }, [isOpen]);

  const panelBg = interfaceStyles?.panelBackground || 'var(--interface-panelBackground, #ffffff)';
  const secondaryBg = interfaceStyles?.panelSecondaryBackground || 'var(--interface-panelSecondaryBackground, #f3f4f6)';
  const borderColor = interfaceStyles?.borderColor || 'var(--interface-borderColor, #e5e7eb)';
  const textColor = interfaceStyles?.color || 'var(--interface-color, #1f2937)';
  const textSecColor = interfaceStyles?.textSecondary || 'var(--interface-textSecondary, #6b7280)';
  const accentColor = interfaceStyles?.accent || 'var(--interface-accent, #007BFF)';
  const inputBg = interfaceStyles?.inputBackground || 'var(--interface-inputBackground, #ffffff)';
  const inputText = interfaceStyles?.inputText || 'var(--interface-inputText, #1f2937)';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSwitch = async (targetUser: string) => {
    if (!targetUser || targetUser === activeUser || isSwitching) return;
    try {
      setIsSwitching(true);
      await switchUserSession(targetUser);
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch user:', err);
      setIsSwitching(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === activeUser || isSwitching) {
      setIsRenaming(false);
      return;
    }
    if (isReservedUsername(trimmed)) {
      alert('Nome reservado pelo sistema');
      setIsRenaming(false);
      return;
    }
    try {
      setIsSwitching(true);
      await renameUserProfile(activeUser, trimmed);
      window.location.reload();
    } catch (err: any) {
      console.error('Failed to rename user:', err);
      alert(err.message || 'Erro ao renomear usuário');
      setIsSwitching(false);
    }
  };

  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed || isSwitching) return;
    if (isReservedUsername(trimmed)) {
      alert('Nome reservado pelo sistema');
      return;
    }
    try {
      setIsSwitching(true);
      await switchUserSession(trimmed);
      window.location.reload();
    } catch (err) {
      console.error('Failed to create and switch user:', err);
      setIsSwitching(false);
    }
  };

  const isDark = textColor === '#ffffff' || textColor === '#f9fafb' || (typeof interfaceStyles?.backgroundColor === 'string' && interfaceStyles.backgroundColor.startsWith('#') && isHexColorDark(interfaceStyles.backgroundColor));

  return (
    <div className={`relative inline-flex items-center shrink-0 user-profile-switcher-container ${className}`} ref={dropdownRef}>
      {/* Pill button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className="user-profile-switcher-btn flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all duration-200 select-none shadow-xs hover:scale-105 active:scale-95 shrink-0 hover:bg-black/10 dark:hover:bg-white/10"
        style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
          borderColor: borderColor,
          color: textColor
        }}
        title={`${getTranslation('switchUser')} (${activeUser})`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
        <User className="w-3.5 h-3.5 opacity-70 shrink-0" style={{ color: accentColor }} />
        <span className="max-w-[70px] sm:max-w-[100px] truncate">{activeUser}</span>
        <ChevronDown className={`w-3 h-3 opacity-60 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Solid High-Contrast Dropdown Menu */}
      {isOpen && (
        <div 
          className="user-profile-switcher-popup absolute left-0 top-full mt-2 w-64 rounded-xl p-3 shadow-2xl z-50 animate-fade-in border box-border overflow-hidden"
          data-no-glass="true"
          style={{ 
            backgroundColor: panelBg,
            borderColor: borderColor,
            color: textColor,
            opacity: 1 
          }}
        >
          <InterfaceEffectsOverlay preferences={preferences} target="interface" />
          <div className="relative z-10">
            {/* Header */}
            <div 
              className="px-1 py-1 text-[10px] font-black uppercase tracking-wider border-b pb-1.5 mb-2 flex items-center justify-between"
              style={{ 
                color: textSecColor,
                borderColor: borderColor
              }}
            >
              <span>{getTranslation('switchUser')}</span>
              {isSwitching && <Loader2 className="w-3 h-3 animate-spin" style={{ color: accentColor }} />}
            </div>

            {/* Current Active User Item & Rename */}
            {isRenaming ? (
              <form onSubmit={handleRename} className="flex items-center gap-1.5 mb-2">
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder="Novo nome..."
                  className="flex-1 min-w-0 px-2 py-1 text-xs rounded-lg border outline-none font-semibold"
                  style={{
                    backgroundColor: inputBg,
                    borderColor: accentColor,
                    color: inputText
                  }}
                />
                <button
                  type="submit"
                  disabled={isSwitching || !renameValue.trim() || renameValue.trim() === activeUser}
                  className="p-1.5 rounded-lg text-white font-bold text-xs cursor-pointer disabled:opacity-40 shrink-0"
                  style={{ backgroundColor: accentColor }}
                  title={getTranslation('save') || "Salvar"}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer shrink-0"
                  style={{ color: textSecColor }}
                  title={getTranslation('cancel') || "Cancelar"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <div 
                className="px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center justify-between mb-2 border"
                style={{
                  backgroundColor: `${accentColor}20`,
                  borderColor: `${accentColor}40`,
                  color: accentColor
                }}
              >
                <span className="truncate max-w-[150px]">{activeUser}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setRenameValue(activeUser);
                      setIsRenaming(true);
                    }}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors"
                    title={getTranslation('renameProfile') || "Renomear perfil"}
                  >
                    <Edit2 className="w-3 h-3 opacity-75 hover:opacity-100" />
                  </button>
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
            )}

            {/* Other Users List */}
            <div className="max-h-36 overflow-y-auto space-y-1">
              {otherUsers.length === 0 ? (
                <div className="px-2 py-1.5 text-xs italic" style={{ color: textSecColor }}>
                  {getTranslation('noOtherProfiles')}
                </div>
              ) : (
                otherUsers.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => handleSwitch(u)}
                    disabled={isSwitching}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium hover:opacity-85 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer truncate"
                    style={{ color: textColor }}
                  >
                    <span className="truncate">{u}</span>
                  </button>
                ))
              )}
            </div>

            {/* Add New User Form */}
            <form 
              onSubmit={handleCreateNewUser} 
              className="mt-2 pt-2 border-t flex items-center gap-1.5 w-full box-border"
              style={{ borderColor: borderColor }}
            >
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder={getTranslation('newUser')}
                disabled={isSwitching}
                className="flex-1 min-w-0 px-2.5 py-1 text-xs rounded-lg border outline-none font-semibold transition-colors"
                style={{
                  backgroundColor: inputBg,
                  borderColor: borderColor,
                  color: inputText
                }}
              />
              <button
                type="submit"
                disabled={!newUsername.trim() || isSwitching}
                className="p-1.5 rounded-lg text-xs font-bold text-white disabled:opacity-40 transition-opacity flex items-center justify-center cursor-pointer shrink-0"
                style={{ backgroundColor: accentColor }}
                title={getTranslation('switchUser')}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
