import React from 'react';
import { Trash2 } from 'lucide-react';
import { Note, NotesInterfaceStyles, NoteCardStyles } from './types';
import { Bookmark } from '../../../types';
import { getTranslation } from '../../../utils/translations';
import { formatLocalizedDate } from '../../../utils/time-formatter';

interface TrashTabProps {
  trashNotes: Note[];
  trashBookmarks: Bookmark[];
  interfaceStyles: NotesInterfaceStyles;
  getNoteCardStyle: (color: string) => NoteCardStyles;
  getNotePreviewText: (htmlContent: string) => string;
  handleRestoreNote: (id: string) => void;
  handleDeleteNotePermanently: (id: string) => void;
  handleRestoreBookmark: (id: string) => void;
  handleDeleteBookmarkPermanently: (id: string) => void;
  handleEmptyTrash: () => void;
  bookTitles: Record<string, string>;
}

export const TrashTab: React.FC<TrashTabProps> = ({
  trashNotes,
  trashBookmarks,
  interfaceStyles,
  getNoteCardStyle,
  getNotePreviewText,
  handleRestoreNote,
  handleDeleteNotePermanently,
  handleRestoreBookmark,
  handleDeleteBookmarkPermanently,
  handleEmptyTrash,
  bookTitles
}) => {
  return (
    <div 
      className="flex-1 rounded-2xl p-6 shadow-sm border transition-all duration-300 flex flex-col gap-6 w-full h-full min-h-0 overflow-hidden"
      style={{
        backgroundColor: interfaceStyles.panelBackground,
        borderColor: interfaceStyles.borderColor
      }}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-4 border-b flex-shrink-0" style={{ borderColor: interfaceStyles.borderColor }}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: interfaceStyles.color }}>
            <Trash2 className="w-5 h-5 text-red-500 animate-pulse" />
            {getTranslation('trashTitle') || 'Lixeira'}
          </h2>
          <p className="text-xs opacity-60 mt-0.5" style={{ color: interfaceStyles.color }}>
            {getTranslation('trashSubtitleWithRetention') || getTranslation('trashSubtitle') || 'Restaure notas e marcadores apagados ou exclua-os definitivamente. Itens na lixeira são limpos após 30 dias.'}
          </p>
        </div>

        {(trashNotes.length > 0 || trashBookmarks.length > 0) && (
          <button
            onClick={handleEmptyTrash}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-extrabold px-4 py-2 rounded-lg text-xs shadow-sm transition-all whitespace-nowrap self-start md:self-center"
          >
            <Trash2 className="w-4 h-4" />
            {getTranslation('emptyTrashButton') || 'Esvaziar Lixeira'}
          </button>
        )}
      </div>

      {trashNotes.length === 0 && trashBookmarks.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center justify-center p-6 border border-dashed rounded-2xl" style={{ borderColor: interfaceStyles.borderColor }}>
          <Trash2 className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-sm font-semibold opacity-60" style={{ color: interfaceStyles.color }}>
            {getTranslation('emptyTrashState') || 'A lixeira está vazia.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-8 overflow-y-auto min-h-0 pr-1">
          {/* Notes Section */}
          {trashNotes.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4 opacity-75" style={{ color: interfaceStyles.color }}>
                {(getTranslation('deletedNotesCount') || 'Notas Excluídas ({count})').replace('{count}', trashNotes.length.toString())}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {trashNotes.map((note) => {
                  const cardStyles = getNoteCardStyle(note.color || '#ffffff');
                  return (
                    <div
                      key={note.id}
                      className="rounded-xl p-4 shadow-sm border flex flex-col relative min-h-[140px] overflow-hidden"
                      style={{
                        backgroundColor: cardStyles.backgroundColor,
                        borderColor: cardStyles.borderColor,
                        color: cardStyles.color
                      }}
                    >
                      <h4 className="font-bold pr-20 line-clamp-1 mb-1.5 text-base" style={{ color: cardStyles.titleColor }}>
                        {note.title || getTranslation('untitledNote') || 'Sem título'}
                      </h4>
                      
                      <p className="text-xs leading-relaxed flex-1 line-clamp-3" style={{ color: cardStyles.color }}>
                        {getNotePreviewText(note.content)}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[10px] font-semibold border-t pt-2 border-black/5" style={{ borderColor: cardStyles.borderColor }}>
                        <span style={{ color: cardStyles.mutedColor }}>{formatLocalizedDate(note.updatedAt)}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRestoreNote(note.id)}
                            className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded font-bold text-[10px] transition dark:bg-green-950/45 dark:text-green-300 dark:border-green-900"
                            title={getTranslation('restoreButton') || 'Restaurar'}
                          >
                            {getTranslation('restoreButton') || 'Restaurar'}
                          </button>
                          <button
                            onClick={() => handleDeleteNotePermanently(note.id)}
                            className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition"
                            style={{ color: cardStyles.mutedColor }}
                            title={getTranslation('deletePermanently') || 'Excluir definitivamente'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bookmarks Section */}
          {trashBookmarks.length > 0 && (
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider mb-4 opacity-75" style={{ color: interfaceStyles.color }}>
                {(getTranslation('deletedBookmarksCount') || 'Marcadores Excluídos ({count})').replace('{count}', trashBookmarks.length.toString())}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trashBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="rounded-xl border shadow-sm p-4 flex flex-col gap-3"
                    style={{
                      backgroundColor: interfaceStyles.panelSecondaryBackground,
                      borderColor: interfaceStyles.borderColor
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2 border-black/5">
                      <span className="font-extrabold text-blue-600 text-xs">
                        {bookTitles[bookmark.bookId] || getTranslation('loadingBook')}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatLocalizedDate(bookmark.createdAt)}
                      </span>
                    </div>

                    {bookmark.text && (
                      <p className="text-xs italic bg-black/5 p-2 rounded-lg line-clamp-3" style={{ color: interfaceStyles.color }}>
                        "{bookmark.text}"
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2 border-t pt-2 border-black/5">
                      <button
                        onClick={() => handleRestoreBookmark(bookmark.id)}
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded font-bold text-[10px] transition dark:bg-green-950/45 dark:text-green-300 dark:border-green-900"
                        title={getTranslation('restoreButton') || 'Restaurar'}
                      >
                        {getTranslation('restoreButton') || 'Restaurar'}
                      </button>
                      <button
                        onClick={() => handleDeleteBookmarkPermanently(bookmark.id)}
                        className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition text-gray-400"
                        title={getTranslation('deletePermanently') || 'Excluir definitivamente'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
