import React from 'react';
import { 
  Search, 
  BookOpen, 
  ChevronRight, 
  Copy, 
  Check, 
  Edit, 
  Trash2, 
  ExternalLink 
} from 'lucide-react';
import { Bookmark } from '../../../types';
import { NotesInterfaceStyles } from './types';
import { getTranslation, getCurrentLanguage } from '../../../utils/translations';
import { formatLocalizedDate } from '../../../utils/time-formatter';

interface BookmarksTabProps {
  bookmarkSearch: string;
  setBookmarkSearch: (search: string) => void;
  filteredBookmarks: Bookmark[];
  bookTitles: Record<string, string>;
  editingBookmarkId: string | null;
  setEditingBookmarkId: (id: string | null) => void;
  editBookmarkLabel: string;
  setEditBookmarkLabel: (label: string) => void;
  expandedBookmarkIds: Record<string, boolean>;
  setExpandedBookmarkIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  copiedBookmarkId: string | null;
  interfaceStyles: NotesInterfaceStyles;
  handleEditBookmarkLabel: (id: string) => void;
  handleCopyBookmark: (bookmark: Bookmark) => void;
  handleDeleteBookmark: (id: string) => void;
  handleGoToChapter: (bookmark: Bookmark) => void;
}

export const BookmarksTab: React.FC<BookmarksTabProps> = ({
  bookmarkSearch,
  setBookmarkSearch,
  filteredBookmarks,
  bookTitles,
  editingBookmarkId,
  setEditingBookmarkId,
  editBookmarkLabel,
  setEditBookmarkLabel,
  expandedBookmarkIds,
  setExpandedBookmarkIds,
  copiedBookmarkId,
  interfaceStyles,
  handleEditBookmarkLabel,
  handleCopyBookmark,
  handleDeleteBookmark,
  handleGoToChapter
}) => {
  return (
    <div 
      className="flex-1 rounded-2xl p-6 shadow-sm border transition-all duration-300 w-full h-full flex flex-col min-h-0 overflow-hidden"
      style={{
        backgroundColor: interfaceStyles.panelBackground,
        borderColor: interfaceStyles.borderColor
      }}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 pb-4 border-b flex-shrink-0" style={{ borderColor: interfaceStyles.borderColor }}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: interfaceStyles.color }}>
            <BookOpen className="w-5 h-5 text-blue-500 animate-pulse" />
            {getTranslation('mySavedBookmarks')}
          </h2>
          <p className="text-xs opacity-60 mt-0.5" style={{ color: interfaceStyles.color }}>
            {getTranslation('bookmarksSubtitle')}
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={getTranslation('searchBookmarks')}
            value={bookmarkSearch}
            onChange={(e) => setBookmarkSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-xs"
            style={{
              backgroundColor: interfaceStyles.panelSecondaryBackground,
              borderColor: interfaceStyles.borderColor,
              color: interfaceStyles.color
            }}
          />
        </div>
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center p-6">
          <BookOpen className="w-16 h-16 text-gray-200 mb-4" />
          <p className="text-sm font-semibold opacity-60" style={{ color: interfaceStyles.color }}>{getTranslation('noBookmarksFound')}</p>
          <p className="text-xs opacity-50 mt-1 max-w-sm" style={{ color: interfaceStyles.color }}>
            {getTranslation('addBookmarksInstruction')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 overflow-y-auto flex-1 min-h-0 pr-1">
          {filteredBookmarks.map((bookmark) => {
            const isEditing = editingBookmarkId === bookmark.id;
            
            return (
              <div
                key={bookmark.id}
                className="rounded-xl border shadow-sm p-5 hover:shadow-md transition-all flex flex-col gap-3 group"
                style={{
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2.5 border-black/5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-blue-600 text-sm">
                      {bookTitles[bookmark.bookId] || getTranslation('loadingBook')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-100">
                      {getTranslation('chapterNumberLabel', { number: bookmark.chapterIndex + 1 })}
                    </span>
                    {bookmark.type && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-black/5 rounded text-gray-600">
                        {bookmark.type === 'text' ? getTranslation('phrase') : bookmark.type === 'chapter' ? getTranslation('chapter') : bookmark.type}
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-gray-400 font-medium">
                    {formatLocalizedDate(bookmark.createdAt)}
                  </span>
                </div>

                {/* Display Label editing */}
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editBookmarkLabel}
                      onChange={(e) => setEditBookmarkLabel(e.target.value)}
                      placeholder={getTranslation('bookmarkLabel')}
                      className="flex-1 px-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      style={{
                        backgroundColor: interfaceStyles.panelSecondaryBackground,
                        color: interfaceStyles.color,
                        borderColor: interfaceStyles.borderColor
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleEditBookmarkLabel(bookmark.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                    >
                      {getTranslation('save')}
                    </button>
                    <button
                      onClick={() => setEditingBookmarkId(null)}
                      className="bg-gray-250 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs border"
                    >
                      {getTranslation('cancel')}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {bookmark.label ? (
                        <p className="text-sm font-bold flex items-center gap-1.5 mb-1.5" style={{ color: interfaceStyles.color }}>
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          {bookmark.label}
                        </p>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingBookmarkId(bookmark.id);
                            setEditBookmarkLabel('');
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700 font-bold underline mb-1.5 block"
                        >
                          + {getTranslation('bookmarkLabel')}
                        </button>
                      )}

                      {bookmark.text && (
                        <div 
                          className="bg-black/5 border-l-4 border-blue-500 p-3.5 rounded-r-lg text-xs font-serif leading-relaxed mt-1.5 shadow-inner"
                          style={{ color: interfaceStyles.color }}
                        >
                          <p className={expandedBookmarkIds[bookmark.id] ? "whitespace-pre-wrap max-h-96 overflow-y-auto pr-1" : "line-clamp-4"}>
                            "{bookmark.text}"
                          </p>
                          {bookmark.text.length > 300 && (
                            <button
                              onClick={() => setExpandedBookmarkIds(prev => ({ ...prev, [bookmark.id]: !prev[bookmark.id] }))}
                              className="mt-1.5 text-[10px] text-blue-500 hover:text-blue-700 font-bold uppercase tracking-wider block"
                            >
                              {expandedBookmarkIds[bookmark.id] ? (
                                getCurrentLanguage() === 'pt' ? 'Ler menos' :
                                getCurrentLanguage() === 'es' ? 'Leer menos' :
                                getCurrentLanguage() === 'fr' ? 'Lire moins' :
                                getCurrentLanguage() === 'it' ? 'Leggi meno' :
                                getCurrentLanguage() === 'de' ? 'Weniger anzeigen' :
                                'Read less'
                              ) : (
                                getCurrentLanguage() === 'pt' ? 'Ler mais' :
                                getCurrentLanguage() === 'es' ? 'Leer más' :
                                getCurrentLanguage() === 'fr' ? 'Lire plus' :
                                getCurrentLanguage() === 'it' ? 'Leggi di più' :
                                getCurrentLanguage() === 'de' ? 'Mehr anzeigen' :
                                'Read more'
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => handleCopyBookmark(bookmark)}
                            className={`p-1.5 rounded-lg transition-all ${
                              copiedBookmarkId === bookmark.id
                                ? 'bg-green-50 text-green-600'
                                : 'hover:bg-black/5 text-gray-500 hover:text-gray-900'
                            }`}
                            title={getTranslation('copyButton')}
                          >
                            {copiedBookmarkId === bookmark.id ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setEditingBookmarkId(bookmark.id);
                              setEditBookmarkLabel(bookmark.label || '');
                            }}
                            className="p-1.5 hover:bg-black/5 rounded-lg text-gray-500 hover:text-gray-900"
                            title={getTranslation('editBookmark')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg"
                        title={getTranslation('deleteBookmark')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => handleGoToChapter(bookmark)}
                    className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {getTranslation('goToChapter')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
