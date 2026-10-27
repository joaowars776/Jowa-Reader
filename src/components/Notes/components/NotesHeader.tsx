import React from 'react';
import { 
  FileText, 
  ArrowLeft, 
  FolderOpen, 
  Settings, 
  Globe, 
  BookOpen, 
  Trash2, 
  List, 
  Grid, 
  Plus 
} from 'lucide-react';
import { LanguageSelector } from '../../LanguageSelector';
import { NotesInterfaceStyles, Note } from './types';
import { ReadingPreferences } from '../../../types';
import { getTranslation } from '../../../utils/translations';

interface NotesHeaderProps {
  onClose: () => void;
  activeTab: 'notes' | 'bookmarks' | 'trash';
  setActiveTab: (tab: 'notes' | 'bookmarks' | 'trash') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  handleAddNote: () => void;
  showHomePageSettings: boolean;
  setShowHomePageSettings: (show: boolean) => void;
  showLanguageSelector: boolean;
  setShowLanguageSelector: (show: boolean) => void;
  trashNotes: Note[];
  interfaceStyles: NotesInterfaceStyles;
  preferences: ReadingPreferences | null;
}

export const NotesHeader: React.FC<NotesHeaderProps> = ({
  onClose,
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  handleAddNote,
  showHomePageSettings,
  setShowHomePageSettings,
  showLanguageSelector,
  setShowLanguageSelector,
  trashNotes,
  interfaceStyles,
  preferences
}) => {
  return (
    <header 
      className="shadow-sm border-b transition-all duration-300 sticky top-0 z-30"
      style={{
        backgroundColor: interfaceStyles.backgroundColor,
        borderColor: interfaceStyles.borderColor
      }}
    >
      <div className="max-w-full mx-auto px-4 sm:px-8 lg:px-12 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: interfaceStyles.color }}>
                <FileText className="w-6 h-6 text-blue-500 animate-pulse" />
                {getTranslation('notes')}
              </h1>
              <p className="text-xs opacity-70 mt-0.5" style={{ color: interfaceStyles.color }}>
                {getTranslation('notesSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-4 flex items-center justify-between border-b" style={{ borderColor: interfaceStyles.borderColor }}>
          <nav className="flex space-x-8 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{
                borderColor: activeTab === 'notes' ? '#007BFF' : 'transparent',
                color: activeTab === 'notes' ? '#007BFF' : interfaceStyles.color
              }}
            >
              <FileText className="w-4 h-4" />
              {getTranslation('notesTab')}
            </button>

            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === 'bookmarks'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{
                borderColor: activeTab === 'bookmarks' ? '#007BFF' : 'transparent',
                color: activeTab === 'bookmarks' ? '#007BFF' : interfaceStyles.color
              }}
            >
              <BookOpen className="w-4 h-4" />
              {getTranslation('bookmarksTab')}
            </button>

            <button
              onClick={() => setActiveTab('trash')}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition-all duration-300 rounded-t-lg whitespace-nowrap ${
                activeTab === 'trash'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent hover:border-gray-300'
              }`}
              style={{
                borderColor: activeTab === 'trash' ? '#007BFF' : 'transparent',
                color: activeTab === 'trash' ? '#007BFF' : interfaceStyles.color
              }}
            >
              <Trash2 className="w-4 h-4" />
              {getTranslation('trashTab')}
              {trashNotes.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {trashNotes.length}
                </span>
              )}
            </button>
          </nav>

          <div className="flex items-center gap-3 mb-2">
            {activeTab === 'notes' && (
              <>
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-1.5 hover:bg-gray-100 rounded-lg"
                  style={{ color: interfaceStyles.color }}
                  title={viewMode === 'grid' ? (getTranslation('listView') || 'Visualização em Lista') : (getTranslation('coverView') || getTranslation('gridView') || 'Visualização em Grade')}
                >
                  {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
                </button>

                <button
                  onClick={handleAddNote}
                  className="flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {getTranslation('addNote')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
