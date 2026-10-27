import React from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  CheckCircle, 
  Download, 
  Trash2, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Type, 
  Palette 
} from 'lucide-react';
import { Note, NotesInterfaceStyles, NoteCardStyles } from './types';
import { getTranslation } from '../../../utils/translations';

interface NoteEditorProps {
  selectedNote: Note;
  setIsEditorOpen: (open: boolean) => void;
  setSelectedNote: (note: Note | null) => void;
  editorTitle: string;
  setEditorTitle: (title: string) => void;
  noteBgColor: string;
  setNoteBgColor: (color: string) => void;
  noteFontFamily: string;
  setNoteFontFamily: (family: string) => void;
  noteFontSize: number;
  setNoteFontSize: (size: number) => void;
  customNoteFontUrl: string;
  setCustomNoteFontUrl: (url: string) => void;
  saveStatus: boolean;
  notes: Note[];
  saveNotesList: (notes: Note[]) => void;
  syncNoteToFolder: (note: Note) => void;
  COLOR_PRESETS: { key?: string; name: string; value: string; text: string }[];
  interfaceStyles: NotesInterfaceStyles;
  editorRef: React.RefObject<HTMLDivElement | null>;
  getNoteCardStyle: (color: string) => NoteCardStyles;
  handleSaveEditorChanges: () => void;
  handleDownloadNoteHTML: (note: Note) => void;
  handleDeleteNote: (id: string, e?: React.MouseEvent) => void;
  execFormat: (command: string, value?: string) => void;
  setSelectionFontFamily: (family: string, url: string) => void;
  setSelectionFontSize: (size: number) => void;
  saveSelection: () => void;
  preferences: any;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({
  selectedNote,
  setIsEditorOpen,
  setSelectedNote,
  editorTitle,
  setEditorTitle,
  noteBgColor,
  setNoteBgColor,
  noteFontFamily,
  setNoteFontFamily,
  noteFontSize,
  setNoteFontSize,
  customNoteFontUrl,
  setCustomNoteFontUrl,
  saveStatus,
  notes,
  saveNotesList,
  syncNoteToFolder,
  COLOR_PRESETS,
  interfaceStyles,
  editorRef,
  getNoteCardStyle,
  handleSaveEditorChanges,
  handleDownloadNoteHTML,
  handleDeleteNote,
  execFormat,
  setSelectionFontFamily,
  setSelectionFontSize,
  saveSelection,
  preferences
}) => {
  const [clickedColorId, setClickedColorId] = React.useState<string | null>(null);
  const [clickedHighlightId, setClickedHighlightId] = React.useState<string | null>(null);
  const [textSelectionMenu, setTextSelectionMenu] = React.useState<{ x: number; y: number; text: string } | null>(null);

  const handleEditorSelection = () => {
    saveSelection();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setTextSelectionMenu(null);
      return;
    }
    
    const range = selection.getRangeAt(0);
    if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
      const rects = range.getClientRects();
      if (rects.length > 0) {
        const rect = rects[0];
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        
        setTextSelectionMenu({
          x,
          y,
          text: selection.toString()
        });
      }
    } else {
      setTextSelectionMenu(null);
    }
  };

  React.useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setTextSelectionMenu(null);
      }
    };
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const editorColors = getNoteCardStyle(noteBgColor);

  const fontSizeInputRef = React.useRef<HTMLInputElement>(null);
  const fontSizeStateRef = React.useRef({ noteFontSize, setNoteFontSize, setSelectionFontSize });

  React.useEffect(() => {
    fontSizeStateRef.current = { noteFontSize, setNoteFontSize, setSelectionFontSize };
  }, [noteFontSize, setNoteFontSize, setSelectionFontSize]);

  React.useEffect(() => {
    const inputEl = fontSizeInputRef.current;
    if (!inputEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { noteFontSize: currentSize, setNoteFontSize: setSize, setSelectionFontSize: setSelSize } = fontSizeStateRef.current;
      const delta = e.deltaY < 0 ? 1 : -1;
      const newSz = Math.min(48, Math.max(10, currentSize + delta));
      setSize(newSz);
      setSelSize(newSz);
    };

    inputEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      inputEl.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div 
      className="flex-1 rounded-2xl shadow-md border flex flex-col overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: editorColors.backgroundColor,
        borderColor: interfaceStyles.borderColor,
        color: editorColors.color
      }}
    >
      {/* Editor Action Bar */}
      <div className="px-4 py-3 border-b flex items-center justify-between bg-black/10" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              handleSaveEditorChanges();
              setIsEditorOpen(false);
              setSelectedNote(null);
            }}
            className="p-1.5 hover:bg-black/10 rounded-lg md:hidden"
            style={{ color: editorColors.color }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold uppercase tracking-wider opacity-75">{getTranslation('noteEditor')}</span>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus && (
            <span className="text-xs bg-green-100 text-green-800 dark:bg-green-950/45 dark:text-green-300 px-3 py-1 rounded-full flex items-center gap-1 font-semibold animate-fade-in">
              <CheckCircle className="w-3 h-3" />
              {getTranslation('saved')}
            </span>
          )}

          <button
            onClick={handleSaveEditorChanges}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shadow-sm transition-all"
            title={getTranslation('save')}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{getTranslation('save')}</span>
          </button>

          <button
            onClick={() => handleDownloadNoteHTML(selectedNote)}
            className="p-1.5 hover:bg-black/10 rounded-lg flex items-center gap-1.5 text-xs font-bold transition"
            style={{ color: editorColors.color }}
            title={getTranslation('exportHTML')}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{getTranslation('exportHTML')}</span>
          </button>
          
          <button
            onClick={() => handleDeleteNote(selectedNote.id)}
            className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition"
            style={{ color: editorColors.color }}
            title={getTranslation('deleteNote')}
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              handleSaveEditorChanges();
              setIsEditorOpen(false);
              setSelectedNote(null);
            }}
            className="p-1.5 hover:bg-black/10 rounded-lg flex items-center gap-1 text-xs font-extrabold transition border"
            style={{ borderColor: interfaceStyles.borderColor, color: editorColors.color }}
            title={getTranslation('closeEditor')}
          >
            <X className="w-4 h-4" />
            <span className="inline">{getTranslation('closeEditor') || 'Fechar'}</span>
          </button>
        </div>
      </div>

      {/* Note Title Input at the top */}
      <div className="px-5 py-3 border-b bg-white/5 flex items-center" style={{ borderColor: interfaceStyles.borderColor }}>
        <input
          id="note-editor-title-input"
          type="text"
          placeholder={getTranslation('noteTitlePlaceholder')}
          value={editorTitle}
          onChange={(e) => {
            setEditorTitle(e.target.value);
            setTimeout(handleSaveEditorChanges, 50);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editorRef.current?.focus();
            }
          }}
          className="w-full bg-transparent border-none text-xl font-extrabold focus:outline-none placeholder-gray-400/70"
          style={{ color: editorColors.titleColor }}
        />
      </div>

      {/* Rich Formatting Toolbar */}
      <div className="px-4 py-2 border-b flex flex-wrap items-center gap-2 bg-black/5" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-0.5 border-r pr-2" style={{ borderColor: interfaceStyles.borderColor }}>
          <button
            onClick={() => execFormat('bold')}
            className="p-1.5 hover:bg-black/10 rounded transition"
            style={{ color: editorColors.color }}
            title={getTranslation('textFormatBold')}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => execFormat('italic')}
            className="p-1.5 hover:bg-black/10 rounded transition"
            style={{ color: editorColors.color }}
            title={getTranslation('textFormatItalic')}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => execFormat('underline')}
            className="p-1.5 hover:bg-black/10 rounded transition"
            style={{ color: editorColors.color }}
            title={getTranslation('textFormatUnderline')}
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            onClick={() => execFormat('strikeThrough')}
            className="p-1.5 hover:bg-black/10 rounded transition"
            style={{ color: editorColors.color }}
            title={getTranslation('textFormatStrikethrough')}
          >
            <Strikethrough className="w-4 h-4" />
          </button>
        </div>

        {/* Text Color Picker */}
        <div className="flex items-center gap-1 border-r pr-2" style={{ borderColor: interfaceStyles.borderColor }}>
          <span className="text-[10px] font-bold uppercase mr-1 opacity-70">{getTranslation('textColor').split(' ')[0]}:</span>
          {['#1f2937', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'].map(c => (
            <button
              key={c}
              onClick={() => {
                setClickedColorId(c);
                setTimeout(() => setClickedColorId(null), 250);
                execFormat('foreColor', c);
              }}
              className={`w-4 h-4 rounded-full border border-black/10 transition-all hover:scale-110 active:scale-90 duration-200 ${clickedColorId === c ? 'scale-125 ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: c }}
              title={`${getTranslation('textColor')} ${c}`}
            />
          ))}
        </div>

        {/* Highlight Color Picker */}
        <div className="flex items-center gap-1 border-r pr-2" style={{ borderColor: interfaceStyles.borderColor }}>
          <span className="text-[10px] font-bold uppercase mr-1 opacity-70">{getTranslation('highlightColor').split(' ')[0]}:</span>
          {['transparent', '#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#e9d5ff'].map(c => (
            <button
              key={c}
              onClick={() => {
                setClickedHighlightId(c);
                setTimeout(() => setClickedHighlightId(null), 250);
                execFormat('hiliteColor', c === 'transparent' ? '#ffffff' : c);
              }}
              className={`w-4 h-4 rounded border border-black/10 transition-all hover:scale-110 active:scale-90 duration-200 ${clickedHighlightId === c ? 'scale-125 ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
              title={`${getTranslation('highlightColor')} ${c}`}
            />
          ))}
        </div>

        {/* Font Family selection */}
        <div className="flex items-center gap-1.5 border-r pr-2" style={{ borderColor: interfaceStyles.borderColor }}>
          <Type className="w-4 h-4 opacity-70" />
          <select
            value={noteFontFamily}
            onChange={(e) => {
              const ff = e.target.value;
              setNoteFontFamily(ff);
              const url = ff === 'Custom' ? (customNoteFontUrl || preferences?.customFontUrl || '') : '';
              setSelectionFontFamily(ff, url);
            }}
            className="text-xs font-bold border rounded px-1.5 py-1 outline-none transition-all cursor-pointer"
            style={{ 
              borderColor: interfaceStyles.borderColor, 
              color: interfaceStyles.color || '#111827',
              backgroundColor: interfaceStyles.panelSecondaryBackground || '#f9fafb',
              fontFamily: noteFontFamily === 'sans' ? 'Inter, sans-serif' : noteFontFamily === 'Arial' ? 'Arial, sans-serif' : noteFontFamily === 'serif' ? 'Georgia, serif' : noteFontFamily === 'mono' ? 'monospace' : 'inherit'
            }}
          >
            <option value="sans" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold', backgroundColor: interfaceStyles.panelBackground || '#ffffff', color: interfaceStyles.color || '#111827' }}>Sans-Serif (Inter)</option>
            <option value="Arial" style={{ fontFamily: 'Arial, sans-serif', fontWeight: 'bold', backgroundColor: interfaceStyles.panelBackground || '#ffffff', color: interfaceStyles.color || '#111827' }}>Arial</option>
            <option value="serif" style={{ fontFamily: 'Georgia, serif', fontWeight: 'bold', backgroundColor: interfaceStyles.panelBackground || '#ffffff', color: interfaceStyles.color || '#111827' }}>Serif (Georgia)</option>
            <option value="mono" style={{ fontFamily: 'monospace', fontWeight: 'bold', backgroundColor: interfaceStyles.panelBackground || '#ffffff', color: interfaceStyles.color || '#111827' }}>Monospace (Code)</option>
            <option value="Custom" style={{ backgroundColor: interfaceStyles.panelBackground || '#ffffff', color: interfaceStyles.color || '#111827' }}>{getTranslation('customFontOption') || 'Custom (.ttf)'}</option>
          </select>
        </div>

        {/* Custom Font URL Box inline as separate element to avoid line wrapping bugs */}
        {noteFontFamily === 'Custom' && (
          <div className="flex items-center gap-1.5 border-r pr-2 animate-fade-in" style={{ borderColor: interfaceStyles.borderColor }}>
            <input
              type="text"
              placeholder={getTranslation('customFontUrlPlaceholder') || 'Font URL (.ttf)'}
              value={customNoteFontUrl}
              onChange={(e) => {
                const url = e.target.value;
                setCustomNoteFontUrl(url);
                setSelectionFontFamily('Custom', url);
              }}
              className="text-xs px-2 py-1 border rounded w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
              style={{ 
                color: interfaceStyles.color || '#111827', 
                borderColor: interfaceStyles.borderColor,
                backgroundColor: interfaceStyles.panelSecondaryBackground || '#f9fafb'
              }}
            />
          </div>
        )}

        {/* Font Size Selector - Now updates selection only */}
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold opacity-70">{getTranslation('fontSize').split(' ')[0]}:</span>
          <input
            ref={fontSizeInputRef}
            type="number"
            min="10"
            max="48"
            value={noteFontSize}
            onChange={(e) => {
              const sz = Math.max(10, parseInt(e.target.value) || 16);
              setNoteFontSize(sz);
              setSelectionFontSize(sz);
            }}
            className="w-12 text-xs text-center font-bold border rounded py-1 cursor-ns-resize"
            title={getTranslation('scrollHint') || 'Use a roda do mouse para alterar o tamanho'}
            style={{ 
              borderColor: interfaceStyles.borderColor, 
              color: interfaceStyles.color || '#111827',
              backgroundColor: interfaceStyles.panelSecondaryBackground || '#f9fafb'
            }}
          />
          <span className="text-[10px] opacity-50">px</span>
        </div>
      </div>

      {/* Note Card Color Selection - Flex wrapped carefully */}
      <div className="px-4 py-2 border-b flex items-center gap-2 bg-white/5" style={{ borderColor: interfaceStyles.borderColor }}>
        <Palette className="w-4 h-4 opacity-70 flex-shrink-0" />
        <span className="text-xs font-bold uppercase flex-shrink-0 whitespace-nowrap opacity-75">{getTranslation('cardTheme')}</span>
        <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto scrollbar-none py-1.5 px-1">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => {
                setNoteBgColor(preset.value);
                const updatedNote = { ...selectedNote, color: preset.value };
                const updatedNotes = notes.map(n => n.id === selectedNote.id ? updatedNote : n);
                saveNotesList(updatedNotes);
                setSelectedNote(updatedNote);
                syncNoteToFolder(updatedNote);
              }}
              className={`w-6 h-6 rounded-full border border-black/10 transition-transform flex items-center justify-center flex-shrink-0 ${noteBgColor === preset.value ? 'scale-110 ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-105'}`}
              style={{ backgroundColor: getNoteCardStyle(preset.value).backgroundColor }}
              title={(preset.key && getTranslation(preset.key)) || preset.name}
            >
              {noteBgColor === preset.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* Rich contentEditable editor below options */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleSaveEditorChanges}
          onMouseUp={handleEditorSelection}
          onKeyUp={handleEditorSelection}
          placeholder={getTranslation('editorPlaceholder')}
          className="flex-1 overflow-y-auto outline-none focus:outline-none leading-relaxed min-h-[250px] editor-rich-textarea"
          style={{ fontSize: '16px', color: editorColors.color }}
        />
      </div>

      {textSelectionMenu && createPortal(
        <div 
          className="fixed z-[999] flex flex-col items-center gap-2 p-2.5 rounded-2xl shadow-2xl border animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: `${textSelectionMenu.x}px`, 
            top: `${textSelectionMenu.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: interfaceStyles.panelBackground || '#ffffff',
            borderColor: interfaceStyles.borderColor || '#e5e7eb',
            color: interfaceStyles.color || '#000000',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.15)'
          }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Compact Font Controls */}
          <div className="flex flex-col gap-2 items-center">
            {/* Font Family Selection */}
            <select
              value={noteFontFamily}
              onChange={(e) => {
                const ff = e.target.value;
                setNoteFontFamily(ff);
                const url = ff === 'Custom' ? (customNoteFontUrl || preferences?.customFontUrl || '') : '';
                setSelectionFontFamily(ff, url);
                setTimeout(handleEditorSelection, 50);
              }}
              className="text-[11px] font-bold border rounded-lg px-2 py-1 outline-none cursor-pointer bg-transparent w-full text-center"
              style={{ borderColor: interfaceStyles.borderColor }}
            >
              <option value="sans" className="dark:bg-gray-800 text-black dark:text-white">Sans-Serif</option>
              <option value="Arial" className="dark:bg-gray-800 text-black dark:text-white">Arial</option>
              <option value="serif" className="dark:bg-gray-800 text-black dark:text-white">Serif</option>
              <option value="mono" className="dark:bg-gray-800 text-black dark:text-white">Mono</option>
            </select>

            {/* Scrollable Font Size Area */}
            <div 
              className="flex flex-col items-center justify-center p-2 rounded-xl border border-dashed cursor-ns-resize select-none bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all duration-200 w-32"
              style={{ borderColor: interfaceStyles.borderColor + '80' }}
              title={getTranslation('scrollHint') || 'Use mouse scroll wheel to adjust font size'}
              onWheel={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY < 0 ? 1 : -1;
                // Capped at 40px as explicitly requested!
                const newSize = Math.min(40, Math.max(10, noteFontSize + delta));
                setNoteFontSize(newSize);
                setSelectionFontSize(newSize);
              }}
            >
              <span className="text-[9px] font-extrabold uppercase opacity-60 tracking-wider mb-0.5">
                {getTranslation('fontSize') || 'Font Size'}
              </span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-black font-mono tracking-tight text-blue-500">
                  {noteFontSize}
                </span>
                <span className="text-[10px] font-bold opacity-50">px</span>
              </div>
              <span className="text-[8px] opacity-40 mt-1 text-center leading-none">
                {getTranslation('scrollHint') || 'Scroll to resize'}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
