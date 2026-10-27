import React from 'react';
import { Search, FileText, Plus, Download, Trash2 } from 'lucide-react';
import { Note, NotesInterfaceStyles, NoteCardStyles } from './types';
import { getTranslation } from '../../../utils/translations';
import { formatLocalizedDate } from '../../../utils/time-formatter';

interface NotesGridProps {
  filteredNotes: Note[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleAddNote: () => void;
  isEditorOpen: boolean;
  selectedNote: Note | null;
  viewMode: 'grid' | 'list';
  interfaceStyles: NotesInterfaceStyles;
  getNoteCardStyle: (color: string) => NoteCardStyles;
  getNoteFontClass: (fontFamily: string | undefined) => string;
  getNotePreviewText: (htmlContent: string) => string;
  handleOpenEditor: (note: Note) => void;
  handleDownloadNoteHTML: (note: Note) => void;
  handleDeleteNote: (id: string, e?: React.MouseEvent) => void;
}

export const NotesGrid: React.FC<NotesGridProps> = ({
  filteredNotes,
  searchQuery,
  setSearchQuery,
  handleAddNote,
  isEditorOpen,
  selectedNote,
  viewMode,
  interfaceStyles,
  getNoteCardStyle,
  getNoteFontClass,
  getNotePreviewText,
  handleOpenEditor,
  handleDownloadNoteHTML,
  handleDeleteNote
}) => {
  return (
    <div className={`flex flex-col gap-4 transition-all duration-300 ${isEditorOpen ? 'hidden md:flex md:w-1/3' : 'w-full'}`}>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder={getTranslation('searchNotes') || "Pesquisar..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-xs"
            style={{
              backgroundColor: interfaceStyles.panelBackground,
              borderColor: interfaceStyles.borderColor,
              color: interfaceStyles.color
            }}
          />
        </div>
        <button
          onClick={handleAddNote}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{getTranslation('addNote')}</span>
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-2xl flex flex-col items-center justify-center p-6" style={{ borderColor: interfaceStyles.borderColor }}>
          <FileText className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm opacity-60 font-medium" style={{ color: interfaceStyles.color }}>{getTranslation('noNotesFound') || "Nenhuma nota encontrada."}</p>
          <button 
            onClick={handleAddNote}
            className="mt-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-full font-bold transition-all"
          >
            {getTranslation('createFirstNote') || "Criar Primeira Nota"}
          </button>
        </div>
      ) : (
        <div className={`overflow-y-auto max-h-[calc(100vh-250px)] p-2 grid gap-4 ${viewMode === 'grid' && !isEditorOpen ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'}`}>
          {filteredNotes.map((note) => {
            const cardStyles = getNoteCardStyle(note.color || '#ffffff');
            return (
              <div
                key={note.id}
                onClick={() => handleOpenEditor(note)}
                className={`group rounded-xl p-4 shadow-sm border cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex flex-col relative min-h-[140px] overflow-hidden m-0.5`}
                style={{
                  backgroundColor: cardStyles.backgroundColor,
                  borderColor: selectedNote?.id === note.id ? '#3b82f6' : cardStyles.borderColor,
                  borderWidth: selectedNote?.id === note.id ? '2px' : '1px'
                }}
              >
                {/* Note controls hover visible */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadNoteHTML(note);
                    }}
                    className="p-1 hover:bg-black/10 rounded-md transition"
                    style={{ color: cardStyles.mutedColor }}
                    title="Baixar HTML"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteNote(note.id, e)}
                    className="p-1 hover:bg-red-50 hover:text-red-700 rounded-md transition"
                    style={{ color: cardStyles.mutedColor }}
                    title={getTranslation('deleteNote')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="font-bold pr-12 line-clamp-1 mb-1.5 text-base" style={{ color: cardStyles.titleColor }}>
                  {note.title || getTranslation('untitledNote') || 'Sem título'}
                </h3>
                
                {/* Formatted HTML preview stripped / loaded */}
                <p className={`text-xs leading-relaxed flex-1 line-clamp-3 ${getNoteFontClass(note.fontFamily)}`} style={{ color: cardStyles.color }}>
                  {getNotePreviewText(note.content)}
                </p>

                <div className="mt-3 flex items-center justify-between text-[10px] font-semibold border-t pt-2" style={{ borderColor: cardStyles.borderColor, color: cardStyles.mutedColor }}>
                  <span>{formatLocalizedDate(note.updatedAt)}</span>
                  {note.fontFamily && (
                    <span className="uppercase tracking-wider px-1.5 py-0.5 bg-black/5 rounded">{note.fontFamily}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
