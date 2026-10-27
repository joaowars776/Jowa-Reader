import React, { useState, useEffect, useRef } from 'react';
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
  Plus, 
  Download, 
  CheckCircle, 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Type, 
  Palette, 
  ChevronRight, 
  Copy, 
  Check, 
  Edit, 
  ExternalLink 
} from 'lucide-react';
import { initDB, getPreferences, savePreferences, getBookmarks, getBook, deleteBookmark, saveBookmark, triggerAutoBackup, getUsername } from '../../utils/storage';
import { getTranslation, initializeLanguage, getCurrentLanguage } from '../../utils/translations';
import { applyInterfaceTheme, getInterfaceTheme, applyPreferencesTheme, getInterfaceThemeFromPrefs } from '../../utils/themes';
import { ReadingPreferences, Bookmark, Book } from '../../types';
import { HomePageSettings } from '../HomePageSettings';
import { SnowEffect } from '../SnowEffect';
import { RainEffect } from '../RainEffect';
import { PetalEffect } from '../PetalEffect';

// Modular Subcomponents
import { Note, NotesInterfaceStyles, NoteCardStyles } from './components/types';
import { NotesHeader } from './components/NotesHeader';
import { NotesGrid } from './components/NotesGrid';
import { NoteEditor } from './components/NoteEditor';
import { BookmarksTab } from './components/BookmarksTab';
import { TrashTab } from './components/TrashTab';

interface NotesProps {
  onClose: () => void;
  onOpenBook?: (book: Book) => void;
  preferences?: ReadingPreferences | null;
  onPreferencesChange?: (newPreferences: ReadingPreferences) => void;
}

const COLOR_PRESETS = [
  { key: 'colorWhite', name: 'Branco', value: '#ffffff', text: '#374151' },
  { key: 'colorLightRed', name: 'Vermelho Claro', value: '#fee2e2', text: '#7f1d1d' },
  { key: 'colorLightOrange', name: 'Laranja Claro', value: '#ffedd5', text: '#78350f' },
  { key: 'colorLightYellow', name: 'Amarelo Claro', value: '#fef9c3', text: '#713f12' },
  { key: 'colorLightGreen', name: 'Verde Claro', value: '#dcfce7', text: '#064e3b' },
  { key: 'colorLightTeal', name: 'Teal Claro', value: '#ccfbf1', text: '#115e59' },
  { key: 'colorLightBlue', name: 'Azul Claro', value: '#dbeafe', text: '#1e3a8a' },
  { key: 'colorLightPurple', name: 'Roxo Claro', value: '#f3e8ff', text: '#581c87' },
  { key: 'colorLightPink', name: 'Rosa Claro', value: '#fce7f3', text: '#9d174d' },
  { key: 'colorDarkSlate', name: 'Cinza Escuro', value: '#f1f5f9', text: '#334155' }
];

export const Notes: React.FC<NotesProps> = ({
  onClose,
  onOpenBook,
  preferences: externalPreferences,
  onPreferencesChange: externalOnPreferencesChange
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'bookmarks' | 'trash'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Slide-overs and widgets
  const [showHomePageSettings, setShowHomePageSettings] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);

  // Local state for bookmarks
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [trashNotes, setTrashNotes] = useState<Note[]>([]);
  const [preferences, setPreferences] = useState<ReadingPreferences | null>(externalPreferences || null);

  const [bookmarkSearch, setBookmarkSearch] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(null);
  const [editBookmarkLabel, setEditBookmarkLabel] = useState('');

  // Rich text editor ref and controls
  const editorRef = useRef<HTMLDivElement>(null);
  const savedSelectionRangeRef = useRef<Range | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [noteBgColor, setNoteBgColor] = useState('#ffffff');
  const [noteFontFamily, setNoteFontFamily] = useState<string>('sans');
  const [noteFontSize, setNoteFontSize] = useState<number>(16);
  const [saveStatus, setSaveStatus] = useState(false);
  const [trashBookmarks, setTrashBookmarks] = useState<Bookmark[]>([]);
  const [customNoteFontUrl, setCustomNoteFontUrl] = useState<string>('');
  const [copiedBookmarkId, setCopiedBookmarkId] = useState<string | null>(null);
  const [expandedBookmarkIds, setExpandedBookmarkIds] = useState<Record<string, boolean>>({});
  const [backupError, setBackupError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'note' | 'bookmark' | 'note-permanent' | 'bookmark-permanent' | 'empty-trash';
    id: string;
  } | null>(null);

  const interfaceStyles = React.useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;

    return {
      backgroundColor: colors.headerBackground || '#ffffff',
      color: colors.headerText || '#1f2937',
      borderColor: colors.headerBorder || '#e5e7eb',
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || '#f9fafb',
      accent: colors.accent || '#007BFF'
    };
  }, [preferences]);

  // Initialize language on component mount
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Use external preferences or load from storage
  useEffect(() => {
    if (externalPreferences) {
      setPreferences(externalPreferences);
      if (externalPreferences.customFontUrl) {
        setCustomNoteFontUrl(externalPreferences.customFontUrl);
      }
    } else {
      loadPreferences();
    }
  }, [externalPreferences]);

  // Load notes, bookmarks and directory handle on mount
  useEffect(() => {
    loadNotes();
    loadTrashNotes();
    loadTrashBookmarks();
    loadAllBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPreferences = async () => {
    try {
      const userPrefs = await getPreferences();
      setPreferences(userPrefs);
      if (userPrefs && userPrefs.customFontUrl) {
        setCustomNoteFontUrl(userPrefs.customFontUrl);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handlePreferencesChange = async (newPreferences: ReadingPreferences) => {
    setPreferences(newPreferences);
    applyPreferencesTheme(newPreferences);
    try {
      await savePreferences(newPreferences);
      if (externalOnPreferencesChange) {
        externalOnPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Keys for active user isolation with seamless fallback
  const getNotesKey = () => {
    const user = getUsername();
    return user ? `novel_reader_notes_${user}` : 'novel_reader_notes';
  };
  const getTrashNotesKey = () => {
    const user = getUsername();
    return user ? `novel_reader_trash_notes_${user}` : 'novel_reader_trash_notes';
  };
  const getTrashBookmarksKey = () => {
    const user = getUsername();
    return user ? `novel_reader_trash_bookmarks_${user}` : 'novel_reader_trash_bookmarks';
  };

  // Notes persistence
  const loadNotes = () => {
    try {
      const key = getNotesKey();
      let savedNotes = localStorage.getItem(key);
      if (!savedNotes && key !== 'novel_reader_notes') {
        savedNotes = localStorage.getItem('novel_reader_notes');
      }
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        const filtered = Array.isArray(parsed) ? parsed.filter((n: any) => n && n.id !== 'welcome-note') : [];
        setNotes(filtered);
        localStorage.setItem(key, JSON.stringify(filtered));
      } else {
        setNotes([]);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotes([]);
    }
  };

  const saveNotesList = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    const key = getNotesKey();
    localStorage.setItem(key, JSON.stringify(updatedNotes));
    localStorage.setItem('novel_reader_notes', JSON.stringify(updatedNotes));
    triggerAutoBackup();

    // Instant sync to dedicated notes.json on server
    const user = getUsername();
    if (user) {
      fetch(`/api/notes?username=${encodeURIComponent(user)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': user
        },
        body: JSON.stringify({ notes: updatedNotes })
      }).catch(err => console.warn('Sync notes failed:', err));
    }
  };

  // Trash Notes list persistence with automatic 30-day cleanup
  const loadTrashNotes = () => {
    try {
      const key = getTrashNotesKey();
      let stored = localStorage.getItem(key);
      if (!stored && key !== 'novel_reader_trash_notes') {
        stored = localStorage.getItem('novel_reader_trash_notes');
      }
      if (stored) {
        const parsed: (Note & { deletedAt?: string })[] = JSON.parse(stored);
        
        // Filter out items older than 30 days
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const cleaned = Array.isArray(parsed) ? parsed.filter(n => {
          if (!n || !n.deletedAt) return true;
          const deletedTime = new Date(n.deletedAt).getTime();
          return now - deletedTime <= thirtyDaysMs;
        }) : [];

        localStorage.setItem(key, JSON.stringify(cleaned));
        setTrashNotes(cleaned);
      } else {
        setTrashNotes([]);
      }
    } catch (e) {
      console.error('Error loading trash notes:', e);
      setTrashNotes([]);
    }
  };

  const saveTrashList = (updatedTrash: Note[]) => {
    setTrashNotes(updatedTrash);
    const key = getTrashNotesKey();
    localStorage.setItem(key, JSON.stringify(updatedTrash));
    localStorage.setItem('novel_reader_trash_notes', JSON.stringify(updatedTrash));
    triggerAutoBackup();
  };

  // Trash Bookmarks persistence with automatic 30-day cleanup
  const loadTrashBookmarks = () => {
    try {
      const key = getTrashBookmarksKey();
      let stored = localStorage.getItem(key);
      if (!stored && key !== 'novel_reader_trash_bookmarks') {
        stored = localStorage.getItem('novel_reader_trash_bookmarks');
      }
      if (stored) {
        const parsed: (Bookmark & { deletedAt?: string })[] = JSON.parse(stored);
        
        // Filter out items older than 30 days
        const now = Date.now();
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const cleaned = Array.isArray(parsed) ? parsed.filter(b => {
          if (!b || !b.deletedAt) return true;
          const deletedTime = new Date(b.deletedAt).getTime();
          return now - deletedTime <= thirtyDaysMs;
        }) : [];

        localStorage.setItem(key, JSON.stringify(cleaned));
        setTrashBookmarks(cleaned);
      } else {
        setTrashBookmarks([]);
      }
    } catch (e) {
      console.error('Error loading trash bookmarks:', e);
      setTrashBookmarks([]);
    }
  };

  const saveTrashBookmarksList = (updatedTrash: any[]) => {
    setTrashBookmarks(updatedTrash);
    const key = getTrashBookmarksKey();
    localStorage.setItem(key, JSON.stringify(updatedTrash));
    localStorage.setItem('novel_reader_trash_bookmarks', JSON.stringify(updatedTrash));
    triggerAutoBackup();
  };

  const getNotePreviewText = (htmlContent: string) => {
    if (!htmlContent) return getTranslation('emptyNote') || 'Nota vazia';
    const stripped = htmlContent.replace(/<[^>]+>/g, ' ');
    const text = stripped.replace(/\s+/g, ' ').trim();
    if (text.length > 180) {
      return text.substring(0, 180) + '...';
    }
    return text || getTranslation('emptyNote') || 'Nota vazia';
  };

  // Load bookmarks
  const loadAllBookmarks = async () => {
    try {
      const bookmarks = await getBookmarks();
      bookmarks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllBookmarks(bookmarks);

      const titles: Record<string, string> = {};
      const uniqueBookIds = Array.from(new Set(bookmarks.map(b => b.bookId)));
      
      // Perform database fetches in parallel for high speed startup and load performance
      const bookObjects = await Promise.all(
        uniqueBookIds.map(bookId => getBook(bookId).catch(() => null))
      );
      
      uniqueBookIds.forEach((bookId, index) => {
        const bookObj = bookObjects[index];
        titles[bookId] = bookObj ? bookObj.title : 'Unknown Book';
      });
      
      setBookTitles(titles);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
    }
  };

  // File System Access directory handle loading
  // Real-time synchronization of note to folder
  // Removed local backup function in favor of server automatic sync
  const syncNoteToFolder = (note: Note) => {
    // Local backup function removed in favor of automatic database sync
  };

  const generateHTMLContent = (note: Note) => {
    const fontCSS = note.fontFamily === 'serif' ? 'Georgia, serif' : note.fontFamily === 'mono' ? '"JetBrains Mono", Courier, monospace' : 'Inter, system-ui, sans-serif';
    const bgVal = note.color || '#ffffff';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${note.title || getTranslation('untitledNote') || 'Sem título'}</title>
  <style>
    body {
      font-family: ${fontCSS};
      background-color: #f3f4f6;
      color: #111827;
      margin: 0;
      padding: 40px 16px;
      display: flex;
      justify-content: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .card {
      background-color: ${bgVal};
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(0,0,0,0.08);
      max-width: 750px;
      width: 100%;
      padding: 40px;
      box-sizing: border-box;
    }
    h1 {
      margin-top: 0;
      font-size: 2.25rem;
      border-bottom: 2px solid rgba(0,0,0,0.06);
      padding-bottom: 12px;
      margin-bottom: 8px;
    }
    .date-meta {
      font-size: 0.85rem;
      color: rgba(0,0,0,0.45);
      margin-bottom: 28px;
    }
    .content {
      font-size: ${note.fontSize || 16}px;
      line-height: 1.6;
      word-wrap: break-word;
      white-space: pre-wrap;
    }
    ul, ol {
      padding-left: 20px;
    }
    li {
      margin-bottom: 6px;
    }
    code {
      background-color: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: "JetBrains Mono", monospace;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${note.title || 'Nota sem título'}</h1>
    <div class="date-meta">Atualizado em: ${new Date(note.updatedAt).toLocaleString()}</div>
    <div class="content">${note.content}</div>
  </div>
</body>
</html>`;
  };

  const handleDownloadNoteHTML = (note: Note) => {
    const htmlContent = generateHTMLContent(note);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = note.title.trim().replace(/[/\\?%*:|"<>]/g, '-') || 'Untitled-Note';
    a.download = `${cleanName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: '',
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      color: '#ffffff',
      fontFamily: 'sans',
      fontSize: 16
    };
    const updated = [newNote, ...notes];
    saveNotesList(updated);
    handleOpenEditor(newNote);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({
      isOpen: true,
      type: 'note',
      id
    });
  };

  const getNoteCardStyle = React.useCallback((noteColor: string) => {
    let isDark = preferences?.interfaceTheme === 'dark' || 
                 preferences?.interfaceTheme === 'highcontrast' || 
                 preferences?.interfaceTheme === 'ocean' ||
                 (preferences?.interfaceTheme === 'aurora' && preferences?.snowSubTheme !== 'day') ||
                 preferences?.selectedInterfaceTheme === 'dark' ||
                 preferences?.selectedInterfaceTheme === 'highcontrast' ||
                 preferences?.selectedInterfaceTheme === 'ocean' ||
                 (preferences?.selectedInterfaceTheme === 'aurora' && preferences?.snowSubTheme !== 'day') ||
                 ((preferences?.interfaceTheme === 'snow' || preferences?.selectedInterfaceTheme === 'snow' || preferences?.interfaceTheme === 'rain' || preferences?.selectedInterfaceTheme === 'rain') && 
                  (preferences?.snowSubTheme === 'night' || preferences?.snowSubTheme === 'midnight'));
                 
    if ((preferences?.interfaceTheme === 'custom' || preferences?.selectedInterfaceTheme === 'custom') && preferences?.interfaceColors?.panelBackground) {
      const bg = preferences.interfaceColors.panelBackground.toLowerCase();
      if (bg.startsWith('#')) {
        const hex = bg.substring(1);
        if (hex.length === 6) {
          const r = parseInt(hex.substring(0, 2), 16);
          const g = parseInt(hex.substring(2, 4), 16);
          const b = parseInt(hex.substring(4, 6), 16);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          isDark = luma < 140;
        } else if (hex.length === 3) {
          const r = parseInt(hex.substring(0, 1) + hex.substring(0, 1), 16);
          const g = parseInt(hex.substring(1, 2) + hex.substring(1, 2), 16);
          const b = parseInt(hex.substring(2, 3) + hex.substring(2, 3), 16);
          const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          isDark = luma < 140;
        }
      }
    }
    
    if (isDark) {
      let bg = '#1e293b';
      if (noteColor) {
        switch (noteColor.toLowerCase()) {
          case '#ffffff': bg = '#1e293b'; break;
          case '#fee2e2': bg = '#7f1d1d'; break;
          case '#ffedd5': bg = '#78350f'; break;
          case '#fef9c3': bg = '#713f12'; break;
          case '#dcfce7': bg = '#064e3b'; break;
          case '#ccfbf1': bg = '#115e59'; break;
          case '#dbeafe': bg = '#1e3a8a'; break;
          case '#f3e8ff': bg = '#581c87'; break;
          case '#fce7f3': bg = '#9d174d'; break;
          case '#f1f5f9': bg = '#334155'; break;
          default: bg = noteColor;
        }
      } else {
        bg = interfaceStyles.panelBackground;
      }
      return {
        backgroundColor: bg,
        color: '#e2e8f0',
        titleColor: '#ffffff',
        mutedColor: '#94a3b8',
        borderColor: 'rgba(255,255,255,0.1)'
      };
    } else {
      return {
        backgroundColor: noteColor || '#ffffff',
        color: '#374151',
        titleColor: '#111827',
        mutedColor: '#6b7280',
        borderColor: 'rgba(0,0,0,0.08)'
      };
    }
  }, [preferences, interfaceStyles]);

  const handleOpenEditor = (note: Note) => {
    setSelectedNote(note);
    setEditorTitle(note.title);
    setNoteBgColor(note.color || '#ffffff');
    setNoteFontFamily(note.fontFamily || 'sans');
    setNoteFontSize(note.fontSize || 16);
    setIsEditorOpen(true);
    
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content;
      }
    }, 50);
  };

  const handleSaveEditorChanges = () => {
    if (!selectedNote) return;

    const editorHtml = editorRef.current?.innerHTML || '';
    const titleInput = document.getElementById('note-editor-title-input') as HTMLInputElement | null;
    const currentTitle = titleInput ? titleInput.value : editorTitle;
    
    const updatedNote: Note = {
      ...selectedNote,
      title: currentTitle,
      content: editorHtml,
      color: noteBgColor,
      fontFamily: noteFontFamily,
      fontSize: noteFontSize,
      updatedAt: new Date().toISOString()
    };

    const updatedNotes = notes.map(n => n.id === selectedNote.id ? updatedNote : n);
    saveNotesList(updatedNotes);
    setSelectedNote(updatedNote);
    
    syncNoteToFolder(updatedNote);

    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 1500);
  };

  // Trash CRUD operations
  const handleRestoreNote = (id: string) => {
    const noteToRestore = trashNotes.find(n => n.id === id);
    if (noteToRestore) {
      const updatedTrash = trashNotes.filter(n => n.id !== id);
      saveTrashList(updatedTrash);
      const updatedNotes = [noteToRestore, ...notes];
      saveNotesList(updatedNotes);
    }
  };

  const handleDeleteNotePermanently = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'note-permanent',
      id
    });
  };

  const handleRestoreBookmark = async (id: string) => {
    const bookmarkToRestore = trashBookmarks.find(b => b.id === id);
    if (bookmarkToRestore) {
      try {
        const { deletedAt, ...cleanBookmark } = bookmarkToRestore as any;
        await saveBookmark(cleanBookmark);
        
        const updatedTrash = trashBookmarks.filter(b => b.id !== id);
        saveTrashBookmarksList(updatedTrash);
        
        await loadAllBookmarks();
        window.dispatchEvent(new CustomEvent('bookmarkAdded'));
      } catch (error) {
        console.error('Error restoring bookmark:', error);
      }
    }
  };

  const handleDeleteBookmarkPermanently = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'bookmark-permanent',
      id
    });
  };

  const handleEmptyTrash = () => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'empty-trash',
      id: ''
    });
  };

  // Bookmarks CRUD operations inside Notes
  const handleEditBookmarkLabel = async (bookmarkId: string) => {
    const bookmark = allBookmarks.find(b => b.id === bookmarkId);
    if (!bookmark) return;

    try {
      const updatedBookmark = { ...bookmark, label: editBookmarkLabel.trim() };
      await saveBookmark(updatedBookmark);
      setEditingBookmarkId(null);
      await loadAllBookmarks();
      window.dispatchEvent(new CustomEvent('bookmarkAdded'));
    } catch (e) {
      console.error('Error updating bookmark:', e);
    }
  };

  const handleDeleteBookmark = (id: string) => {
    setDeleteConfirmation({
      isOpen: true,
      type: 'bookmark',
      id
    });
  };

  // Navigates directly to the bookmarked chapter
  const handleGoToChapter = async (bookmark: Bookmark) => {
    if (!onOpenBook) return;
    try {
      const bookObj = await getBook(bookmark.bookId);
      if (bookObj) {
        onClose();
        onOpenBook({
          ...bookObj,
          currentChapter: bookmark.chapterIndex
        });
      } else {
        alert('Este livro não foi encontrado na biblioteca.');
      }
    } catch (error) {
      console.error('Failed to open book from bookmark:', error);
    }
  };

  // Inline formatting helper using system design execCommand
  const execFormat = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      handleSaveEditorChanges();
    }
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current && editorRef.current.contains(range.commonAncestorContainer)) {
        if (!range.collapsed) {
          savedSelectionRangeRef.current = range.cloneRange();
        }
      }
    }
  };

  const restoreSelection = () => {
    if (savedSelectionRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedSelectionRangeRef.current);
      }
    }
  };

  const setSelectionFontSize = (size: number) => {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    
    try {
      const selectedText = range.extractContents();
      const span = document.createElement('span');
      span.style.fontSize = `${size}px`;
      span.appendChild(selectedText);
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
      
      savedSelectionRangeRef.current = newRange.cloneRange();
      
      handleSaveEditorChanges();
      editorRef.current?.focus();
    } catch (e) {
      console.error('Error applying font size:', e);
    }
  };

  const loadCustomFont = (url: string, name: string = 'CustomNoteFont') => {
    if (!url) return;
    const styleId = `dynamic-font-${name}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.innerHTML = `
      @font-face {
        font-family: "${name}";
        src: url("${url}");
      }
    `;
  };

  const setSelectionFontFamily = (fontFamilyName: string, customUrl?: string) => {
    restoreSelection();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    let fontStyleValue = fontFamilyName;
    if (fontFamilyName === 'Custom' && customUrl) {
      loadCustomFont(customUrl, 'CustomNoteFont');
      fontStyleValue = 'CustomNoteFont, sans-serif';
    } else if (fontFamilyName === 'sans') {
      fontStyleValue = 'Inter, sans-serif';
    } else if (fontFamilyName === 'Arial') {
      fontStyleValue = 'Arial, sans-serif';
    } else if (fontFamilyName === 'serif') {
      fontStyleValue = 'Georgia, serif';
    } else if (fontFamilyName === 'mono') {
      fontStyleValue = '"JetBrains Mono", monospace';
    }
    
    try {
      const selectedText = range.extractContents();
      const span = document.createElement('span');
      span.style.fontFamily = fontStyleValue;
      span.appendChild(selectedText);
      range.insertNode(span);
      
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
      
      savedSelectionRangeRef.current = newRange.cloneRange();
      
      handleSaveEditorChanges();
      editorRef.current?.focus();
    } catch (e) {
      console.error('Error applying font family:', e);
    }
  };

  const handleCopyBookmark = (bookmark: Bookmark) => {
    const bookTitle = bookTitles[bookmark.bookId] || 'Unknown Book';
    const chapterStr = getTranslation('chapterNumberLabel', { number: bookmark.chapterIndex + 1 });
    const formattedText = `${bookTitle}, ${chapterStr}, "${bookmark.text}"`;
    
    navigator.clipboard.writeText(formattedText).then(() => {
      setCopiedBookmarkId(bookmark.id);
      setTimeout(() => setCopiedBookmarkId(null), 1500);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  // Search filter
  const filteredNotes = notes.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBookmarks = allBookmarks.filter(b => {
    const titleMatch = (bookTitles[b.bookId] || '').toLowerCase().includes(bookmarkSearch.toLowerCase());
    const labelMatch = (b.label || '').toLowerCase().includes(bookmarkSearch.toLowerCase());
    const textMatch = b.text.toLowerCase().includes(bookmarkSearch.toLowerCase());
    return titleMatch || labelMatch || textMatch;
  });

  const getNoteFontClass = (ff?: string) => {
    switch (ff) {
      case 'serif':
        return 'font-serif Georgia, serif';
      case 'mono':
        return 'font-mono "JetBrains Mono", monospace';
      default:
        return 'font-sans Inter, sans-serif';
    }
  };

  return (
    <div 
      className="notes-container min-h-screen transition-all duration-300 flex flex-col"
      style={{ 
        backgroundColor: interfaceStyles.panelSecondaryBackground,
        fontFamily: preferences?.applyFontGlobally ? 
          (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
           preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
           'Georgia, serif') : undefined
      }}
    >
      <NotesHeader 
        onClose={onClose}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleAddNote={handleAddNote}
        showHomePageSettings={showHomePageSettings}
        setShowHomePageSettings={setShowHomePageSettings}
        showLanguageSelector={showLanguageSelector}
        setShowLanguageSelector={setShowLanguageSelector}
        trashNotes={trashNotes}
        interfaceStyles={interfaceStyles}
        preferences={preferences}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full h-full p-4 sm:p-6 lg:p-8 flex flex-col overflow-hidden">
        {activeTab === 'notes' && (
          <div className="flex-1 flex flex-col md:flex-row gap-6">
            <NotesGrid 
              filteredNotes={filteredNotes}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              handleAddNote={handleAddNote}
              isEditorOpen={isEditorOpen}
              selectedNote={selectedNote}
              viewMode={viewMode}
              interfaceStyles={interfaceStyles}
              getNoteCardStyle={getNoteCardStyle}
              getNoteFontClass={getNoteFontClass}
              getNotePreviewText={getNotePreviewText}
              handleOpenEditor={handleOpenEditor}
              handleDownloadNoteHTML={handleDownloadNoteHTML}
              handleDeleteNote={handleDeleteNote}
            />

            {isEditorOpen && selectedNote && (
              <NoteEditor 
                selectedNote={selectedNote}
                setIsEditorOpen={setIsEditorOpen}
                setSelectedNote={setSelectedNote}
                editorTitle={editorTitle}
                setEditorTitle={setEditorTitle}
                noteBgColor={noteBgColor}
                setNoteBgColor={setNoteBgColor}
                noteFontFamily={noteFontFamily}
                setNoteFontFamily={setNoteFontFamily}
                noteFontSize={noteFontSize}
                setNoteFontSize={setNoteFontSize}
                customNoteFontUrl={customNoteFontUrl}
                setCustomNoteFontUrl={setCustomNoteFontUrl}
                saveStatus={saveStatus}
                notes={notes}
                saveNotesList={saveNotesList}
                syncNoteToFolder={syncNoteToFolder}
                COLOR_PRESETS={COLOR_PRESETS}
                interfaceStyles={interfaceStyles}
                editorRef={editorRef}
                getNoteCardStyle={getNoteCardStyle}
                handleSaveEditorChanges={handleSaveEditorChanges}
                handleDownloadNoteHTML={handleDownloadNoteHTML}
                handleDeleteNote={handleDeleteNote}
                execFormat={execFormat}
                setSelectionFontFamily={setSelectionFontFamily}
                setSelectionFontSize={setSelectionFontSize}
                saveSelection={saveSelection}
                preferences={preferences}
              />
            )}
          </div>
        )}

        {activeTab === 'bookmarks' && (
          <BookmarksTab 
            bookmarkSearch={bookmarkSearch}
            setBookmarkSearch={setBookmarkSearch}
            filteredBookmarks={filteredBookmarks}
            bookTitles={bookTitles}
            editingBookmarkId={editingBookmarkId}
            setEditingBookmarkId={setEditingBookmarkId}
            editBookmarkLabel={editBookmarkLabel}
            setEditBookmarkLabel={setEditBookmarkLabel}
            expandedBookmarkIds={expandedBookmarkIds}
            setExpandedBookmarkIds={setExpandedBookmarkIds}
            copiedBookmarkId={copiedBookmarkId}
            interfaceStyles={interfaceStyles}
            handleEditBookmarkLabel={handleEditBookmarkLabel}
            handleCopyBookmark={handleCopyBookmark}
            handleDeleteBookmark={handleDeleteBookmark}
            handleGoToChapter={handleGoToChapter}
          />
        )}

        {activeTab === 'trash' && (
          <TrashTab 
            trashNotes={trashNotes}
            trashBookmarks={trashBookmarks}
            interfaceStyles={interfaceStyles}
            getNoteCardStyle={getNoteCardStyle}
            getNotePreviewText={getNotePreviewText}
            handleRestoreNote={handleRestoreNote}
            handleDeleteNotePermanently={handleDeleteNotePermanently}
            handleRestoreBookmark={handleRestoreBookmark}
            handleDeleteBookmarkPermanently={handleDeleteBookmarkPermanently}
            handleEmptyTrash={handleEmptyTrash}
            bookTitles={bookTitles}
          />
        )}
      </main>

      {/* Slide-over modals */}
      {showHomePageSettings && preferences && (
        <HomePageSettings
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setShowHomePageSettings(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && deleteConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="w-full max-w-sm rounded-2xl shadow-xl border p-5 animate-scale-up text-gray-950"
            style={{
              backgroundColor: interfaceStyles.panelBackground,
              borderColor: interfaceStyles.borderColor
            }}
          >
            <div className="flex items-center gap-2 text-red-600 mb-3">
              <Trash2 className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider">
                {deleteConfirmation.type === 'empty-trash'
                  ? (getTranslation('emptyTrashButton') || 'Esvaziar Lixeira')
                  : getTranslation('confirmDeleteTitle') || 'Confirmar Exclusão'}
              </h3>
            </div>
            <p className="text-xs opacity-80 mb-5 leading-relaxed" style={{ color: interfaceStyles.color }}>
              {deleteConfirmation.type === 'empty-trash'
                ? (getTranslation('emptyTrashConfirm') || 'Tem certeza que deseja esvaziar a lixeira?')
                : deleteConfirmation.type.endsWith('-permanent')
                ? (getTranslation('confirmDeleteMessage') || 'Tem certeza que deseja excluir permanentemente este item? Esta ação não pode ser desfeita.')
                : (getTranslation('confirmDeleteMessage') || 'Tem certeza que deseja excluir este item?')}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-lg border transition hover:bg-black/5"
                style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
              >
                {getTranslation('cancel')}
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirmation.type === 'note') {
                    const noteToTrash = notes.find(n => n.id === deleteConfirmation.id);
                    if (noteToTrash) {
                      const updatedNotes = notes.filter(n => n.id !== deleteConfirmation.id);
                      saveNotesList(updatedNotes);
                      const updatedTrash = [{ ...noteToTrash, deletedAt: new Date().toISOString() }, ...trashNotes];
                      saveTrashList(updatedTrash);
                    }
                    if (selectedNote?.id === deleteConfirmation.id) {
                      setSelectedNote(null);
                      setIsEditorOpen(false);
                    }
                  } else if (deleteConfirmation.type === 'bookmark') {
                    try {
                      const bookmarkToTrash = allBookmarks.find(b => b.id === deleteConfirmation.id);
                      if (bookmarkToTrash) {
                        const updatedTrashBookmarks = [
                          { ...bookmarkToTrash, deletedAt: new Date().toISOString() },
                          ...trashBookmarks
                        ];
                        saveTrashBookmarksList(updatedTrashBookmarks);
                      }
                      await deleteBookmark(deleteConfirmation.id);
                      await loadAllBookmarks();
                      window.dispatchEvent(new CustomEvent('bookmarkDeleted'));
                    } catch (e) {
                      console.error('Error deleting bookmark:', e);
                    }
                  } else if (deleteConfirmation.type === 'note-permanent') {
                    const updatedTrash = trashNotes.filter(n => n.id !== deleteConfirmation.id);
                    saveTrashList(updatedTrash);
                  } else if (deleteConfirmation.type === 'bookmark-permanent') {
                    const updatedTrash = trashBookmarks.filter(b => b.id !== deleteConfirmation.id);
                    saveTrashBookmarksList(updatedTrash);
                  } else if (deleteConfirmation.type === 'empty-trash') {
                    saveTrashList([]);
                    saveTrashBookmarksList([]);
                  }
                  setDeleteConfirmation(null);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
              >
                {deleteConfirmation.type === 'empty-trash'
                  ? (getTranslation('emptyTrashButton') || 'Esvaziar')
                  : (getTranslation('confirmDeleteButton') || 'Excluir')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snow/Rain overlays if active for interface theme */}
      {preferences?.selectedInterfaceTheme === 'snow' && (
        <SnowEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
      {preferences?.selectedInterfaceTheme === 'rain' && (
        <RainEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
      {preferences?.selectedInterfaceTheme === 'aurora' && (
        <PetalEffect density={preferences?.snowDensity} speed={preferences?.snowSpeed} />
      )}
    </div>
  );
};
