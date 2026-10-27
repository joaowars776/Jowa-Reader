import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Search, BookOpen, MoreVertical, Trash2, Globe, BarChart3, Library as LibraryIcon, Grid3X3, List, Settings, FileText, File, Languages, Sparkles, User, Users, Check, Download, LogOut, RefreshCw, ChevronDown, X, Edit, Pencil, Heart, BookmarkPlus } from 'lucide-react';
import { getBooks, getBook, saveBook, deleteBook, getCoverImage, saveCoverImage, getPreferences, savePreferences, getCachedPreferences, getUsername, setUsername, getUsedUsernames, switchUserSession, exportUserData, getProfilesList, getBookmarks, renameUserProfile, deleteUserProfile, getOtherUsersBooks, isReservedUsername, type OtherUserBook } from '../utils/storage';
import { BookUploader } from './BookUploader';
import { LanguageSelector } from './LanguageSelector';
import { ReadingHistoryTab } from './ReadingHistory/ReadingHistoryTab';
import { Notes } from './Notes/Notes';
import { HomePageSettings } from './HomePageSettings';
import { BookTranslatorModal } from './BookTranslatorModal';
import { SnowEffect } from './SnowEffect';
import { RainEffect } from './RainEffect';
import { PetalEffect } from './PetalEffect';
import { getTranslation, initializeLanguage, getCurrentLanguage } from '../utils/translations';
import { otherUsersBooksTranslations } from '../utils/translations/other-users-books';
import { getActivityLogs, revertSettingActivity, translateLog, logActivity, type ActivityLog } from '../utils/activity-logger';
import { formatLocalizedDate } from '../utils/time-formatter';
import { applyInterfaceTheme, getInterfaceTheme, applyPreferencesTheme, getInterfaceThemeFromPrefs, isHexColorDark } from '../utils/themes';
import { useDragDropController } from '../hooks/useDragDropController';
import { getSupportedFileTypes, getFileTypeDisplayName } from '../utils/file-parser';
import type { Book, ReadingPreferences } from '../types';

interface LibraryProps {
  onOpenBook: (book: Book) => void;
  preferences?: ReadingPreferences | null;
  onPreferencesChange?: (prefs: ReadingPreferences) => void;
  isActive?: boolean;
}

type ViewMode = 'cover' | 'detail';

const getBookChaptersCount = (book: any): number => {
  if (book?.metadata?.chaptersCount && Number(book.metadata.chaptersCount) > 0) {
    return Number(book.metadata.chaptersCount);
  }
  try {
    if (book?.id) {
      const cached = localStorage.getItem(`novel_reader_chapters_count_${book.id}`);
      if (cached && Number(cached) > 0) return Number(cached);
    }
  } catch (err) {
    // Ignore storage errors
  }
  if (Array.isArray(book?.metadata?.chapters) && book.metadata.chapters.length > 0) {
    return book.metadata.chapters.length;
  }
  if (book?.totalPages && Number(book.totalPages) > 1) {
    return Number(book.totalPages);
  }
  return 1;
};

export const Library: React.FC<LibraryProps> = ({ onOpenBook, preferences: propsPreferences, onPreferencesChange, isActive = true }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'mostChapters' | 'leastChapters'>('default');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [expandedMetadata, setExpandedMetadata] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showReadingHistory, setShowReadingHistory] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showHomePageSettings, setShowHomePageSettings] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cover');
  const [preferences, setPreferences] = useState<ReadingPreferences | null>(() => {
    return propsPreferences || getCachedPreferences();
  });

  const [activeUsername, setActiveUsername] = useState(() => getUsername());
  const [usedUsernames, setUsedUsernames] = useState<string[]>(() => getUsedUsernames());
  const [currentLang, setCurrentLang] = useState(() => getCurrentLanguage());
  const [isResolvingInitialProfile, setIsResolvingInitialProfile] = useState(() => !getUsername());
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newProfileInput, setNewProfileInput] = useState('');
  const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);

  // Keep language reactive
  useEffect(() => {
    const handleLangChange = () => {
      setCurrentLang(getCurrentLanguage());
    };
    window.addEventListener('languageChanged', handleLangChange);
    return () => window.removeEventListener('languageChanged', handleLangChange);
  }, []);

  // Dedicated state for books uploaded by other users
  const [otherUsersBooks, setOtherUsersBooks] = useState<OtherUserBook[]>([]);
  const [manualOtherBooksExpanded, setManualOtherBooksExpanded] = useState<boolean | null>(() => {
    try {
      const stored = localStorage.getItem('novel_reader_other_books_expanded');
      if (stored === 'true') return true;
      if (stored === 'false') return false;
      return null;
    } catch {
      return null;
    }
  });
  
  const [bookmarksCount, setBookmarksCount] = useState(0);
  const [notesCount, setNotesCount] = useState(0);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [openingOtherBookId, setOpeningOtherBookId] = useState<string | null>(null);
  const [reusingBookId, setReusingBookId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userAvatar, setUserAvatar] = useState('📚');
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [avatarBg, setAvatarBg] = useState(() => localStorage.getItem(`novel_reader_avatar_bg_${getUsername()}`) || 'auto');

  const getAvatarBgStyle = () => {
    if (avatarBg === 'auto') {
      return `linear-gradient(135deg, ${interfaceStyles.accent}, #6366f1)`;
    }
    if (avatarBg === 'sunset') return 'linear-gradient(135deg, #f97316, #ec4899)';
    if (avatarBg === 'ocean') return 'linear-gradient(135deg, #06b6d4, #3b82f6)';
    if (avatarBg === 'forest') return 'linear-gradient(135deg, #10b981, #059669)';
    if (avatarBg === 'amber') return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (avatarBg === 'dark') return 'linear-gradient(135deg, #1e293b, #0f172a)';
    if (avatarBg === 'purple') return 'linear-gradient(135deg, #a855f7, #6366f1)';
    return avatarBg;
  };

  useEffect(() => {
    const stored = localStorage.getItem(`novel_reader_avatar_${activeUsername}`);
    if (stored) {
      setUserAvatar(stored);
    } else {
      setUserAvatar(activeUsername.charAt(0).toUpperCase());
    }
    setAvatarBg(localStorage.getItem(`novel_reader_avatar_bg_${activeUsername}`) || 'auto');
  }, [activeUsername]);

  useEffect(() => {
    const loadLogs = () => {
      setActivityLogs(getActivityLogs());
      const stored = localStorage.getItem(`novel_reader_avatar_${activeUsername}`);
      if (stored) {
        setUserAvatar(stored);
      } else {
        setUserAvatar(activeUsername.charAt(0).toUpperCase());
      }
      setAvatarBg(localStorage.getItem(`novel_reader_avatar_bg_${activeUsername}`) || 'auto');
    };
    loadLogs();
    window.addEventListener('activity_logs_updated', loadLogs);
    return () => {
      window.removeEventListener('activity_logs_updated', loadLogs);
    };
  }, [activeUsername]);

  // States for name renaming and first-time onboarding
  const [onboardingName, setOnboardingName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const favoritesStorageKey = activeUsername 
    ? `novel_reader_favorites_${activeUsername}` 
    : 'novel_reader_favorites';

  const [favoriteBookIds, setFavoriteBookIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(favoritesStorageKey) || localStorage.getItem('novel_reader_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep favorites in sync when switching user profiles
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(favoritesStorageKey);
      if (stored) {
        setFavoriteBookIds(JSON.parse(stored));
      } else {
        const fallback = localStorage.getItem('novel_reader_favorites');
        setFavoriteBookIds(fallback ? JSON.parse(fallback) : []);
      }
    } catch {
      setFavoriteBookIds([]);
    }
  }, [favoritesStorageKey]);

  // Clean up ghost/stale favorite IDs that don't belong to any book in the current library
  React.useEffect(() => {
    if (books.length > 0) {
      setFavoriteBookIds(prev => {
        const bookIdSet = new Set(books.map(b => b.id));
        const valid = prev.filter(id => bookIdSet.has(id));
        if (valid.length !== prev.length) {
          localStorage.setItem(favoritesStorageKey, JSON.stringify(valid));
          return valid;
        }
        return prev;
      });
    }
  }, [books, favoritesStorageKey]);

  // Books in the current library that are marked as favorite
  const validFavorites = React.useMemo(() => {
    const bookIdSet = new Set(books.map(b => b.id));
    return favoriteBookIds.filter(id => bookIdSet.has(id));
  }, [books, favoriteBookIds]);

  const toggleFavorite = (bookId: string) => {
    setFavoriteBookIds(prev => {
      const next = prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId];
      localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
      localStorage.setItem('novel_reader_favorites', JSON.stringify(next));
      return next;
    });
  };

  const [filterFavoritesOnly, setFilterFavoritesOnly] = useState(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState<'library' | 'history' | 'notes' | 'translate'>('library');
  const [historyTab, setHistoryTab] = useState<'chapters' | 'books' | 'stats' | 'trends' | 'logs'>('chapters');
  const [inlineTranslatingBook, setInlineTranslatingBook] = useState<Book | null>(null);

  const { greeting, quote } = React.useMemo(() => {
    const hour = new Date().getHours();
    const lang = getCurrentLanguage();
    
    let greet = '';
    if (hour >= 6 && hour < 12) {
      if (lang === 'pt') greet = `Bom dia, ${activeUsername}. Uma nova aurora de grandes histórias te espera.`;
      else if (lang === 'es') greet = `¡Buenos días, ${activeUsername}! Una nueva aurora de grandes histórias te espera.`;
      else greet = `Good morning, ${activeUsername}. A new dawn of great stories awaits you.`;
    } else if (hour >= 12 && hour < 18) {
      if (lang === 'pt') greet = `Boa tarde, ${activeUsername}. Que tal uma pausa revigorante com sua leitura atual?`;
      else if (lang === 'es') greet = `¡Buenas tardes, ${activeUsername}! ¿Qué tal una pausa inspiradora con tu leitura?`;
      else greet = `Good afternoon, ${activeUsername}. Time for an inspiring reading break?`;
    } else {
      if (lang === 'pt') greet = `Boa noite, ${activeUsername}. Descontraia com o conforto de um bom capítulo.`;
      else if (lang === 'es') greet = `¡Buenas noites, ${activeUsername}! Relájate con el confort de un buen capítulo.`;
      else greet = `Good evening, ${activeUsername}. Unwind tonight with the comfort of a good chapter.`;
    }

    const quotesList = {
      pt: [
        { text: "Um livro é um sonho que você segura nas mãos.", author: "Neil Gaiman" },
        { text: "A leitura de todos os bons livros é como uma conversa com as melhores mentes dos séculos passados.", author: "René Descartes" },
        { text: "Há livros de que apenas queremos saber a pele, e outros que queremos ler até aos ossos.", author: "Mia Couto" },
        { text: "A leitura abre as janelas da alma para as maravilhas do universo.", author: "Machado de Assis" },
        { text: "A leitura é para a mente o que o exercício é para o corpo.", author: "Joseph Addison" }
      ],
      en: [
        { text: "A book is a dream that you hold in your hand.", author: "Neil Gaiman" },
        { text: "The reading of all good books is like a conversation with the finest minds of past centuries.", author: "René Descartes" },
        { text: "There are books of which we only want to know the skin, and others we want to read to the bones.", author: "Mia Couto" },
        { text: "Reading opens the windows of the soul to the wonders of the universe.", author: "Machado de Assis" },
        { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" }
      ],
      es: [
        { text: "Un libro es un sueño que tienes en tus manos.", author: "Neil Gaiman" },
        { text: "La lectura de todos los buenos libros es como una conversación con las mejores mentes de los siglos pasados.", author: "René Descartes" },
        { text: "Hay libros de los que sólo queremos conocer la piel, y otros que queremos leer hasta los huesos.", author: "Mia Couto" },
        { text: "La lectura abre las ventanas del alma a las maravillas del universo.", author: "Machado de Assis" },
        { text: "La lectura es para la mente lo que el ejercicio es para el cuerpo.", author: "Joseph Addison" }
      ]
    };

    const selectedQuotes = quotesList[lang as 'pt'|'en'|'es'] || quotesList['en'];
    const selectedQuote = selectedQuotes[new Date().getDate() % selectedQuotes.length];

    return { greeting: greet, quote: selectedQuote };
  }, [activeUsername]);

  // Local translations helper for the Profile Drawer & Welcomer
  const getLocalTranslation = (key: string, username?: string) => {
    const lang = currentLang || getCurrentLanguage();
    const dict = otherUsersBooksTranslations;
    const selectedDict = dict[lang] || dict["en"];
    let text = selectedDict?.[key] || getTranslation(key) || key;
    if (username) {
      text = text.replace("{username}", username);
    }
    return text;
  };

  // Fetch real-time statistics (bookmarks count and notes count)
  useEffect(() => {
    const loadStats = async () => {
      try {
        const bookmarks = await getBookmarks();
        setBookmarksCount(bookmarks.length);
        
        const localNotes = localStorage.getItem('novel_reader_notes');
        if (localNotes) {
          try {
            const parsed = JSON.parse(localNotes);
            if (Array.isArray(parsed)) {
              setNotesCount(parsed.length);
            }
          } catch (e) {
            console.error(e);
          }
        }
      } catch (err) {
        console.error('Error loading sidebar stats:', err);
      }
    };
    loadStats();
  }, [activeUsername, books]);

  // Sync with prop preferences when they change
  useEffect(() => {
    if (propsPreferences) {
      setPreferences(propsPreferences);
      applyPreferencesTheme(propsPreferences);
    }
  }, [propsPreferences]);
  const [bookToDelete, setBookToDelete] = useState<string | null>(null);
  const [translatingBook, setTranslatingBook] = useState<Book | null>(null);

  const handleRenameProfile = async (e?: React.FormEvent, customName?: string) => {
    if (e) e.preventDefault();
    const targetName = (customName || renameInput || '').trim();
    if (!targetName) return;
    const cleanNewName = targetName.replace(/[\\/:*?"<>|]/g, "_");
    if (cleanNewName === activeUsername) {
      setIsEditingName(false);
      return;
    }

    setIsSwitchingProfile(true);
    try {
      await renameUserProfile(activeUsername, cleanNewName);
      setActiveUsername(cleanNewName);
      setIsEditingName(false);
      window.location.reload();
    } catch (err: any) {
      console.error('Error renaming profile:', err);
      alert(err.message || 'Erro ao renomear o perfil');
      setIsSwitchingProfile(false);
    }
  };

  const handleDeleteProfile = async (targetUsername: string) => {
    if (targetUsername === activeUsername) {
      alert(getCurrentLanguage() === 'pt' ? 'Não é possível excluir o perfil ativo.' : 'Cannot delete the active profile.');
      return;
    }
    const confirmMsg = getCurrentLanguage() === 'pt' 
      ? `Tem certeza que deseja excluir o perfil "${targetUsername}"? Todos os dados deste usuário serão apagados permanentemente.`
      : `Are you sure you want to delete profile "${targetUsername}"? All data for this user will be permanently erased.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteUserProfile(targetUsername);
      const updated = usedUsernames.filter(u => u !== targetUsername);
      setUsedUsernames(updated);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao excluir perfil');
    }
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingName.trim()) return;
    const cleanName = onboardingName.trim().replace(/[\\/:*?"<>|]/g, "_");
    if (!cleanName) return;

    setIsSwitchingProfile(true);
    try {
      await switchUserSession(cleanName);
      setActiveUsername(cleanName);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSwitchingProfile(false);
    }
  };

  // Load profile list from server on mount
  useEffect(() => {
    let isMounted = true;
    const fetchProfiles = async () => {
      try {
        const profiles = await getProfilesList();
        if (!isMounted) return;
        setUsedUsernames(profiles);
        // If no active username is set in state, but existing profiles are found, auto-select the first profile
        if (!activeUsername && profiles.length > 0) {
          const autoUser = profiles[0];
          setUsername(autoUser);
          setActiveUsername(autoUser);
        }
      } catch (err) {
        console.error('Error fetching profiles:', err);
      } finally {
        if (isMounted) {
          setIsResolvingInitialProfile(false);
        }
      }
    };
    fetchProfiles();
    return () => {
      isMounted = false;
    };
  }, [activeUsername]);

  const supportedTypes = getSupportedFileTypes();

  // Initialize drag drop controller to prevent unwanted popups
  // We keep this to prevent default browser behavior for file drops,
  // but the visual overlay and specific drag-drop handling for upload is removed.
  useDragDropController({
    enableDragOverlay: false, // Already false, but explicitly keeping it
    allowedFileTypes: supportedTypes,
    preventDefaultDragBehavior: true
  });

  // Initialize language on component mount
  useEffect(() => {
    initializeLanguage();
  }, []);

  // Load preferences and apply theme
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const userPrefs = await getPreferences();
        setPreferences(userPrefs);
        
        // Apply interface theme
        if (userPrefs.selectedInterfaceTheme) {
          applyPreferencesTheme(userPrefs);
        }
      } catch (error) {
        console.error('Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Revoke blob URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      Object.values(coverUrls).forEach(url => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.debug('Failed to revoke blob URL:', e);
          }
        }
      });
    };
  }, [coverUrls]);

  // Load books from storage and other users
  const loadOtherUsersBooks = async () => {
    try {
      const list = await getOtherUsersBooks();
      setOtherUsersBooks(list);
    } catch (err) {
      console.error('Error loading other users books:', err);
    }
  };

  const fetchOtherBookFile = async (otherBook: OtherUserBook): Promise<File | null> => {
    try {
      const currentUsername = activeUsername || getUsername() || 'default';
      const res = await fetch(`/api/book-file/${otherBook.id}?username=${encodeURIComponent(otherBook.uploadedBy || '')}`, {
        headers: { 'X-Username': currentUsername }
      });
      if (res.ok) {
        const blob = await res.blob();
        const ext = otherBook.fileType === 'pdf' ? '.pdf' : '.epub';
        const mimeType = otherBook.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip';
        const fileObj = new Blob([blob], { type: mimeType });
        (fileObj as any).name = `${otherBook.title}${ext}`;
        return fileObj as unknown as File;
      }
    } catch (e) {
      console.warn('Could not fetch book file blob for other user book:', e);
    }
    return null;
  };

  const handleOpenOtherBook = async (otherBook: OtherUserBook) => {
    if (openingOtherBookId) return;
    setOpeningOtherBookId(otherBook.id);
    try {
      let localBook = books.find(b => b.id === otherBook.id);
      if (!localBook) {
        localBook = await getBook(otherBook.id);
      }

      let fileBlob: File | null = (localBook?.file && typeof localBook.file === 'object' && ('size' in localBook.file || 'name' in localBook.file || 'arrayBuffer' in localBook.file)) ? (localBook.file as File) : null;
      if (!fileBlob) {
        fileBlob = await fetchOtherBookFile(otherBook);
      }

      // Download and cache cover image blob permanently for current user
      let coverBlob: Blob | null = null;
      if (otherBook.coverUrl) {
        try {
          const coverRes = await fetch(otherBook.coverUrl);
          if (coverRes.ok) {
            const b = await coverRes.blob();
            if (b.size > 0) coverBlob = b;
          }
        } catch (e) {
          console.warn('Could not fetch other book cover:', e);
        }
      }

      if (coverBlob) {
        try {
          await saveCoverImage(otherBook.id, coverBlob);
          const coverObjectUrl = URL.createObjectURL(coverBlob);
          setCoverUrls(prev => ({ ...prev, [otherBook.id]: coverObjectUrl }));
        } catch (e) {
          console.warn('Could not save cover image copy:', e);
        }
      }

      if (!localBook || !localBook.file) {
        const currentUsername = activeUsername || getUsername() || 'default';
        localBook = {
          id: otherBook.id,
          title: otherBook.title,
          author: otherBook.author,
          description: otherBook.description || '',
          fileType: (otherBook.fileType as any) || 'epub',
          totalChapters: otherBook.totalChapters || 0,
          currentChapter: localBook?.currentChapter || 0,
          progress: localBook?.progress || 0,
          lastRead: new Date(),
          addedAt: localBook?.addedAt || new Date(),
          file: fileBlob,
          cover: otherBook.coverUrl,
          metadata: {
            uploadedBy: currentUsername,
            reusedFrom: otherBook.uploadedBy
          }
        };
        await saveBook(localBook, false); // Save permanent independent local copy
        setBooks(prev => {
          if (prev.some(b => b.id === localBook!.id)) {
            return prev.map(b => b.id === localBook!.id ? localBook! : b);
          }
          return [localBook!, ...prev];
        });
      }

      await onOpenBook(localBook);
    } catch (err) {
      console.error('Error opening other user book:', err);
    } finally {
      setOpeningOtherBookId(null);
    }
  };

  const handleReuseOtherBook = async (otherBook: OtherUserBook, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (reusingBookId) return;
    setReusingBookId(otherBook.id);
    try {
      const currentUsername = activeUsername || getUsername() || 'default';
      let localBook = await getBook(otherBook.id);
      
      let fileBlob: File | null = (localBook?.file && typeof localBook.file === 'object' && ('size' in localBook.file || 'name' in localBook.file || 'arrayBuffer' in localBook.file)) ? (localBook.file as File) : null;
      if (!fileBlob) {
        fileBlob = await fetchOtherBookFile(otherBook);
      }

      // Download and cache cover image blob permanently for current user
      let coverBlob: Blob | null = null;
      if (otherBook.coverUrl) {
        try {
          const coverRes = await fetch(otherBook.coverUrl);
          if (coverRes.ok) {
            const b = await coverRes.blob();
            if (b.size > 0) coverBlob = b;
          }
        } catch (e) {
          console.warn('Could not fetch other book cover:', e);
        }
      }

      if (coverBlob) {
        try {
          await saveCoverImage(otherBook.id, coverBlob);
          const coverObjectUrl = URL.createObjectURL(coverBlob);
          setCoverUrls(prev => ({ ...prev, [otherBook.id]: coverObjectUrl }));
        } catch (e) {
          console.warn('Could not save cover image copy:', e);
        }
      } else if (fileBlob) {
        // Fallback: extract cover directly from book file
        try {
          const { createParserForFile } = await import('../utils/file-parser');
          const parser = createParserForFile(fileBlob, otherBook.fileType);
          await (parser as any).initialize();
          if (typeof (parser as any).cacheCoverImage === 'function') {
            await (parser as any).cacheCoverImage(otherBook.id);
            const cached = await getCoverImage(otherBook.id);
            if (cached) {
              setCoverUrls(prev => ({ ...prev, [otherBook.id]: cached }));
            }
          }
          parser.destroy();
        } catch (parserCoverErr) {
          console.warn('Could not extract cover from file parser:', parserCoverErr);
        }
      }

      localBook = {
        id: otherBook.id,
        title: otherBook.title,
        author: otherBook.author,
        description: otherBook.description || '',
        fileType: (otherBook.fileType as any) || 'epub',
        totalChapters: otherBook.totalChapters || 0,
        currentChapter: localBook?.currentChapter || 0,
        progress: localBook?.progress || 0,
        lastRead: new Date(),
        addedAt: localBook?.addedAt || new Date(),
        file: fileBlob,
        cover: otherBook.coverUrl,
        metadata: {
          ...(localBook?.metadata || {}),
          uploadedBy: currentUsername, // Mark as owned by current user
          reusedFrom: otherBook.uploadedBy,
          reusedAt: new Date().toISOString()
        }
      };

      await saveBook(localBook, false); // Permanent independent local copy in user's personal storage

      setBooks(prev => {
        const without = prev.filter(b => b.id !== localBook!.id);
        return [localBook!, ...without];
      });

      // Immediately remove from other users books so it vanishes from that section
      setOtherUsersBooks(prev => prev.filter(b => b.id !== otherBook.id));

      logActivity({
        type: 'add_book',
        bookId: localBook.id,
        bookTitle: localBook.title
      });
    } catch (err) {
      console.error('Error reusing other user book:', err);
    } finally {
      setReusingBookId(null);
    }
  };

  const loadBooks = React.useCallback(async () => {
    try {
      const loadedBooks = await getBooks();
      setBooks(loadedBooks);
      setFilteredBooks(loadedBooks);
      
      // Load cached cover images in parallel to prevent sequential database bottlenecks
      const covers: Record<string, string> = {};
      await Promise.all(
        loadedBooks.map(async (book) => {
          const cachedCover = await getCoverImage(book.id);
          if (cachedCover) {
            covers[book.id] = cachedCover;
          }
        })
      );
      setCoverUrls(covers);

      // Background chapter count verification and cache persistence for books with missing/1 count
      loadedBooks.forEach(async (book) => {
        const count = getBookChaptersCount(book);
        if (count <= 1 && book.file) {
          try {
            const { createParserForFile } = await import('../utils/file-parser');
            const parser = createParserForFile(book.file, book.fileType);
            await parser.initialize();
            const toc = await parser.getTableOfContents();
            parser.destroy();
            if (toc && toc.length > 1) {
              try {
                localStorage.setItem(`novel_reader_chapters_count_${book.id}`, String(toc.length));
              } catch (err) {
                // Ignore storage errors
              }
              const updated = {
                ...book,
                totalPages: toc.length,
                metadata: {
                  ...(book.metadata || {}),
                  chaptersCount: toc.length
                }
              };
              await saveBook(updated, true);
              setBooks(prev => prev.map(b => b.id === book.id ? updated : b));
              setFilteredBooks(prev => prev.map(b => b.id === book.id ? updated : b));
            }
          } catch {
            // Ignore background parsing issues
          }
        }
      });
    } catch (error) {
      console.error('Error loading books:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
    loadOtherUsersBooks();
  }, [activeUsername, loadBooks]);

  // Real-time synchronization when books change, when returning from reader, or when window regains focus
  useEffect(() => {
    const handleSync = () => {
      loadBooks();
      loadOtherUsersBooks();
    };

    window.addEventListener('booksChanged', handleSync);
    window.addEventListener('bookUpdated', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      window.removeEventListener('booksChanged', handleSync);
      window.removeEventListener('bookUpdated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [loadBooks]);

  // Filter books based on search query, file type, and tags
  useEffect(() => {
    let filtered = books;

    // Search query filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // File type filter
    if (selectedFileType !== 'all') {
      filtered = filtered.filter(book => book.fileType === selectedFileType);
    }

    // Tags filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(book => {
        const bookTags = book.metadata?.tags || [];
        return selectedTags.every(tag => bookTags.includes(tag));
      });
    }

    // Chapter count sorting
    if (sortOrder === 'mostChapters') {
      filtered = [...filtered].sort((a, b) => getBookChaptersCount(b) - getBookChaptersCount(a));
    } else if (sortOrder === 'leastChapters') {
      filtered = [...filtered].sort((a, b) => getBookChaptersCount(a) - getBookChaptersCount(b));
    }

    setFilteredBooks(filtered);
  }, [books, searchQuery, selectedFileType, selectedTags, sortOrder]);

  // Get all unique tags from the library
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    books.forEach(book => {
      const bookTags = book.metadata?.tags;
      if (Array.isArray(bookTags)) {
        bookTags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }, [books]);

  const handleBookAdded = async (newBook: Book) => {
    setBooks(prev => [newBook, ...prev]);
    
    // Load cover image for the new book
    const cachedCover = await getCoverImage(newBook.id);
    if (cachedCover) {
      setCoverUrls(prev => ({ ...prev, [newBook.id]: cachedCover }));
    }
  };

  const handleDeleteBook = (bookId: string) => {
    setBookToDelete(bookId);
  };

  const confirmDeleteBook = async () => {
    if (bookToDelete) {
      try {
        await deleteBook(bookToDelete);
        if (coverUrls[bookToDelete] && typeof coverUrls[bookToDelete] === 'string' && coverUrls[bookToDelete].startsWith('blob:')) {
          try {
            URL.revokeObjectURL(coverUrls[bookToDelete]);
          } catch (e) {
            console.debug('Failed to revoke deleted book cover URL:', e);
          }
        }
        setBooks(prev => prev.filter(book => book.id !== bookToDelete));
        setCoverUrls(prev => {
          const newUrls = { ...prev };
          delete newUrls[bookToDelete];
          return newUrls;
        });
        setSelectedBook(null);
      } catch (error) {
        console.error('Error deleting book:', error);
      } finally {
        setBookToDelete(null);
      }
    }
  };

  const cancelDeleteBook = () => {
    setBookToDelete(null);
  };

  const handlePreferencesChange = async (newPreferences: ReadingPreferences) => {
    setPreferences(newPreferences);
    
    // Apply interface theme immediately
    if (newPreferences.selectedInterfaceTheme) {
      applyPreferencesTheme(newPreferences);
    }
    
    try {
      await savePreferences(newPreferences);
      if (onPreferencesChange) {
        onPreferencesChange(newPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const formatProgress = (progress: number) => {
    return Math.round(progress * 100);
  };

  const formatLastRead = (date?: Date) => {
    if (!date) return getTranslation('never');
    
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return getTranslation('justNow');
    if (diffInHours < 24) return `${Math.round(diffInHours)}${getTranslation('hoursAgo')}`;
    if (diffInHours < 168) return `${Math.round(diffInHours / 24)}${getTranslation('daysAgo')}`;
    return formatLocalizedDate(date);
  };

  const getFileTypeIcon = (fileType?: string) => {
    switch (fileType) {
      case 'epub':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'pdf':
        return <File className="w-4 h-4 text-red-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-gray-600" />;
    }
  };

  const displayedBooks = React.useMemo(() => {
    // Main bookshelf displays all books in the user's active library
    let result = filteredBooks;
    if (filterFavoritesOnly) {
      const validSet = new Set(validFavorites);
      result = result.filter(book => validSet.has(book.id));
    }
    return result;
  }, [filteredBooks, filterFavoritesOnly, validFavorites]);

  const filteredOtherUsersBooks = React.useMemo(() => {
    const currentLower = (activeUsername || '').toLowerCase();
    const myOwnedBookIds = new Set(books.map(b => b.id));

    let list = otherUsersBooks.filter(b => {
      const uploaderLower = (b.uploadedBy || '').toLowerCase();
      if (uploaderLower === currentLower) return false;
      if (myOwnedBookIds.has(b.id)) return false;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(b => 
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.uploadedBy.toLowerCase().includes(q)
      );
    }
    if (selectedFileType !== 'all') {
      list = list.filter(b => b.fileType === selectedFileType);
    }
    return list;
  }, [otherUsersBooks, books, activeUsername, searchQuery, selectedFileType]);

  // When count is 0: minimized by default (false), unless user manually expanded it.
  // When count is >= 1: expanded by default (true), unless user explicitly minimized it (false).
  const isOtherBooksExpanded = filteredOtherUsersBooks.length === 0
    ? false
    : (manualOtherBooksExpanded !== null ? manualOtherBooksExpanded : true);

  const toggleOtherBooksExpanded = () => {
    const next = !isOtherBooksExpanded;
    setManualOtherBooksExpanded(next);
    try {
      localStorage.setItem('novel_reader_other_books_expanded', String(next));
    } catch (e) {
      // Ignore
    }
  };

  const userProgressMap = React.useMemo(() => {
    const map = new Map<string, number>();
    books.forEach(b => {
      if (b.progress !== undefined) map.set(b.id, b.progress);
    });
    return map;
  }, [books]);

  // No longer adding a placeholder for drag and drop
  const getGridItems = () => {
    return [...displayedBooks];
  };

  // Get interface theme styles
  const getInterfaceStyles = () => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme.colors;
    const isDark = isHexColorDark(colors.panelBackground || '#ffffff');
    const accentColor = colors.accent || '#007BFF';
    const buttonText = colors.buttonPrimaryText || (isHexColorDark(accentColor) ? '#ffffff' : '#0f172a');

    return {
      backgroundColor: colors.headerBackground || '#ffffff',
      color: colors.headerText || colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      borderColor: colors.borderColor || colors.headerBorder || (isDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb'),
      panelBackground: colors.panelBackground || '#ffffff',
      panelSecondaryBackground: colors.panelSecondaryBackground || (isDark ? '#111827' : '#f9fafb'),
      accent: accentColor,
      textPrimary: colors.textPrimary || (isDark ? '#f9fafb' : '#1f2937'),
      textSecondary: colors.textSecondary || (isDark ? '#cbd5e1' : '#6b7280'),
      textMuted: colors.textMuted || (isDark ? '#94a3b8' : '#9ca3af'),
      buttonPrimary: colors.buttonPrimary || accentColor,
      buttonPrimaryText: buttonText,
      buttonSecondary: colors.buttonSecondary || (isDark ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6'),
      buttonSecondaryText: colors.buttonSecondaryText || (isDark ? '#f9fafb' : '#374151'),
      inputBackground: colors.inputBackground || (isDark ? 'rgba(0, 0, 0, 0.35)' : '#ffffff'),
      inputText: colors.inputText || (isDark ? '#ffffff' : '#1f2937'),
      isDark
    };
  };

  const interfaceStyles = getInterfaceStyles();

  // While determining if existing profiles exist on server, show light loader
  if (isResolvingInitialProfile && !activeUsername) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: interfaceStyles.panelSecondaryBackground }}
      >
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <BookOpen className="w-10 h-10" style={{ color: interfaceStyles.accent }} />
          <span className="text-xs font-bold opacity-60">{getLocalTranslation('loading')}</span>
        </div>
      </div>
    );
  }

  // If activeUsername is empty, enforce onboarding
  if (!activeUsername) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: interfaceStyles.panelSecondaryBackground }}
      >
        <div 
          className="w-full max-w-md rounded-2xl shadow-2xl p-8 border text-center animate-scale-in relative"
          style={{
            backgroundColor: interfaceStyles.backgroundColor,
            color: interfaceStyles.color,
            borderColor: interfaceStyles.borderColor
          }}
        >
          {/* Quick language selector in onboarding */}
          <div className="flex justify-end mb-2 relative">
            <button
              type="button"
              onClick={() => setShowLanguageSelector(prev => !prev)}
              data-language-toggle="true"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold hover:opacity-85 transition-all cursor-pointer shadow-2xs"
              style={{ 
                borderColor: interfaceStyles.borderColor, 
                color: interfaceStyles.color,
                backgroundColor: interfaceStyles.panelSecondaryBackground
              }}
              title="Mudar Idioma / Change Language"
            >
              <Globe className="w-3.5 h-3.5" style={{ color: interfaceStyles.accent }} />
              <span className="uppercase text-[10px] font-black">{getCurrentLanguage()}</span>
            </button>
            {showLanguageSelector && (
              <div className="absolute bottom-full right-0 mb-2 z-[99999] animate-fade-in text-left">
                <LanguageSelector
                  preferences={preferences || undefined}
                  onClose={() => setShowLanguageSelector(false)}
                />
              </div>
            )}
          </div>

          <div 
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-bounce"
            style={{ background: `linear-gradient(135deg, ${interfaceStyles.accent}, #6366f1)` }}
          >
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight mb-2">
            {getLocalTranslation('onboardingTitle')}
          </h2>
          <p className="text-sm opacity-70 mb-4">
            {getLocalTranslation('onboardingSubtitle')}
          </p>

          {/* Quick choice for existing profiles if present on server */}
          {usedUsernames.length > 0 && (
            <div className="mb-4 text-left border rounded-xl p-3" style={{ borderColor: interfaceStyles.borderColor, backgroundColor: interfaceStyles.panelSecondaryBackground }}>
              <span className="block text-[10px] font-black uppercase tracking-wider mb-2 opacity-70">
                {getLocalTranslation('recentProfiles')}
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {usedUsernames.map(uname => (
                  <button
                    key={uname}
                    type="button"
                    onClick={async () => {
                      setIsSwitchingProfile(true);
                      try {
                        await switchUserSession(uname);
                        setActiveUsername(uname);
                        window.location.reload();
                      } catch (err) {
                        console.error(err);
                        setIsSwitchingProfile(false);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg border text-xs font-bold hover:opacity-85 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    style={{
                      borderColor: interfaceStyles.borderColor,
                      backgroundColor: interfaceStyles.backgroundColor,
                      color: interfaceStyles.color
                    }}
                  >
                    <User className="w-3 h-3" style={{ color: interfaceStyles.accent }} />
                    <span>{uname}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-2 opacity-70">
                {getLocalTranslation('usernameLabel') || 'Username'}
              </label>
              <input
                type="text"
                placeholder={getLocalTranslation('onboardingPlaceholder')}
                required
                value={onboardingName}
                onChange={(e) => setOnboardingName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border font-semibold outline-none focus:ring-2 transition-all"
                style={{
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor,
                  color: interfaceStyles.color,
                  '--tw-ring-color': interfaceStyles.accent
                } as React.CSSProperties}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isSwitchingProfile || !onboardingName.trim()}
              className="w-full py-3 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${interfaceStyles.accent}, #6366f1)` }}
            >
              {isSwitchingProfile ? "..." : getLocalTranslation('onboardingButton')}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-all duration-300"
        style={{ 
          backgroundColor: interfaceStyles.panelSecondaryBackground,
          color: interfaceStyles.color
        }}
      >
        <div className="text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 animate-pulse" style={{ color: interfaceStyles.accent }} />
          <p className="text-sm opacity-80" style={{ color: interfaceStyles.color }}>{getTranslation('loadingLibrary')}</p>
        </div>
      </div>
    );
  }

return (
    <div 
      className="library-container h-screen overflow-hidden transition-all duration-300 flex flex-col relative antialiased"
      style={{ 
        backgroundColor: interfaceStyles.panelSecondaryBackground,
        color: interfaceStyles.color,
        fontFamily: preferences?.applyFontGlobally ? 
          (preferences.fontFamily === 'Arial' ? 'Arial, Helvetica, sans-serif' : 
           preferences.fontFamily === 'Inter' ? 'Inter, sans-serif' :
           'Georgia, serif') : undefined
      }}
    >
      {/* Redesigned Sidebar Layout - No Top Header */}
      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative h-full">
        
        {/* Left Side: Redesigned Filter Sidebar */}
        <aside 
          className="w-72 border-r flex flex-col h-full overflow-hidden select-none flex-shrink-0 themed-panel"
          style={{
            backgroundColor: interfaceStyles.panelBackground,
            borderColor: interfaceStyles.borderColor,
            color: interfaceStyles.color
          }}
        >
          {/* 1. BRAND HEADER */}
          <div className="py-2.5 px-4 border-b flex-shrink-0 flex items-center justify-between" style={{ borderColor: interfaceStyles.borderColor }}>
            <div 
              onClick={() => {
                setActiveMainTab('library');
                setFilterFavoritesOnly(false);
                setInlineTranslatingBook(null);
              }}
              className="flex items-center gap-2.5 cursor-pointer select-none active:scale-95 transition-transform group"
              title={getTranslation('backToMyLibrary') || 'Voltar para Minha Biblioteca'}
            >
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
                style={{ backgroundColor: `${interfaceStyles.accent}20` }}
              >
                <BookOpen className="w-4 h-4" style={{ color: interfaceStyles.accent }} />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                  NovelReader <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 opacity-70">3.0.0</span>
                </h1>
              </div>
            </div>
          </div>

            {/* 2. PROFILE WIDGET */}
            <div className="px-4 py-1.5 border-b flex-shrink-0" style={{ borderColor: interfaceStyles.borderColor }}>
              <button
                onClick={() => setIsProfileDrawerOpen(true)}
                className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-200 border text-left cursor-pointer group"
                style={{ borderColor: interfaceStyles.borderColor }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center font-black text-white text-xs shadow-xs transform transition-transform group-hover:scale-105 shrink-0 select-none"
                    style={{ background: getAvatarBgStyle() }}
                  >
                    {userAvatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black truncate leading-tight" style={{ color: interfaceStyles.color }}>
                      {activeUsername}
                    </div>
                    <div className="text-[9px] font-bold opacity-55 uppercase tracking-wide leading-tight">
                      {getTranslation('activeProfile')}
                    </div>
                  </div>
                </div>
                <Edit className="w-3 h-3 opacity-40 group-hover:opacity-100 transition-opacity" style={{ color: interfaceStyles.accent }} />
              </button>
            </div>

            {/* 3. NAVIGATION SECTION (PERMANENT FIXED TABS) */}
            <div className="px-4 py-2.5 space-y-0.5 border-b flex-shrink-0" style={{ borderColor: interfaceStyles.borderColor }}>
              <div className="text-[9px] font-black uppercase tracking-widest opacity-45 px-1.5 mb-1.5">
                {getTranslation('mainNavigation')}
              </div>

              {/* Tab 1: Minha Biblioteca */}
              <button
                onClick={() => {
                  setActiveMainTab('library');
                  setFilterFavoritesOnly(false);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border text-left cursor-pointer"
                style={{
                  borderColor: activeMainTab === 'library' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.25)' : `${interfaceStyles.accent}50`) : 'transparent',
                  backgroundColor: activeMainTab === 'library' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.12)' : `${interfaceStyles.accent}15`) : 'transparent',
                  color: activeMainTab === 'library' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                }}
              >
                <div 
                  className="p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-xs" 
                  style={{ 
                    borderColor: activeMainTab === 'library' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.35)' : `${interfaceStyles.accent}50`) : interfaceStyles.borderColor,
                    backgroundColor: activeMainTab === 'library' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.20)' : `${interfaceStyles.accent}25`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                    color: activeMainTab === 'library' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                  }}
                >
                  <LibraryIcon className="w-4 h-4" />
                </div>
                <span className="text-[13px]">{getTranslation('myLibrary') || 'Minha Biblioteca'}</span>
                {activeMainTab === 'library' && (
                  <span 
                    className="ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full border shadow-xs" 
                    style={{ 
                      backgroundColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.2)' : `${interfaceStyles.accent}20`,
                      borderColor: interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.35)' : `${interfaceStyles.accent}40`,
                      color: interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent
                    }}
                  >
                    {books.length}
                  </span>
                )}
              </button>

              {/* Tab 2: Histórico */}
              <button
                onClick={() => {
                  setActiveMainTab('history');
                  setHistoryTab('chapters');
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border text-left cursor-pointer"
                style={{
                  borderColor: activeMainTab === 'history' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.25)' : `${interfaceStyles.accent}50`) : 'transparent',
                  backgroundColor: activeMainTab === 'history' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.12)' : `${interfaceStyles.accent}15`) : 'transparent',
                  color: activeMainTab === 'history' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                }}
              >
                <div 
                  className="p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-xs" 
                  style={{ 
                    borderColor: activeMainTab === 'history' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.35)' : `${interfaceStyles.accent}50`) : interfaceStyles.borderColor,
                    backgroundColor: activeMainTab === 'history' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.20)' : `${interfaceStyles.accent}25`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                    color: activeMainTab === 'history' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                  }}
                >
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-[13px]">{getTranslation('readingHistory') || 'Histórico de Leitura'}</span>
              </button>

              {/* Tab 3: Notas */}
              <button
                onClick={() => setActiveMainTab('notes')}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border text-left cursor-pointer"
                style={{
                  borderColor: activeMainTab === 'notes' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.25)' : `${interfaceStyles.accent}50`) : 'transparent',
                  backgroundColor: activeMainTab === 'notes' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.12)' : `${interfaceStyles.accent}15`) : 'transparent',
                  color: activeMainTab === 'notes' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                }}
              >
                <div 
                  className="p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-xs" 
                  style={{ 
                    borderColor: activeMainTab === 'notes' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.35)' : `${interfaceStyles.accent}50`) : interfaceStyles.borderColor,
                    backgroundColor: activeMainTab === 'notes' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.20)' : `${interfaceStyles.accent}25`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                    color: activeMainTab === 'notes' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                  }}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[13px]">{getTranslation('notes') || 'Anotações'}</span>
              </button>

              {/* Tab 4: Traduzir */}
              <button
                onClick={() => setActiveMainTab('translate')}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border text-left cursor-pointer"
                style={{
                  borderColor: activeMainTab === 'translate' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.25)' : `${interfaceStyles.accent}50`) : 'transparent',
                  backgroundColor: activeMainTab === 'translate' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.12)' : `${interfaceStyles.accent}15`) : 'transparent',
                  color: activeMainTab === 'translate' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                }}
              >
                <div 
                  className="p-1.5 rounded-lg border flex items-center justify-center shrink-0 transition-all shadow-xs" 
                  style={{ 
                    borderColor: activeMainTab === 'translate' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.35)' : `${interfaceStyles.accent}50`) : interfaceStyles.borderColor,
                    backgroundColor: activeMainTab === 'translate' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.20)' : `${interfaceStyles.accent}25`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                    color: activeMainTab === 'translate' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                  }}
                >
                  <Globe className="w-4 h-4" />
                </div>
                <span className="text-[13px]">{getTranslation('translate') || 'Traduzir'}</span>
              </button>
            </div>

            {/* 4. CONTEXTUAL WORKSPACE FILTERS */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-4 py-2.5 space-y-3">
              {activeMainTab === 'library' ? (
                <>
                  {/* Search Filter with keyboard aesthetic */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-45 px-1.5">
                      {getTranslation('search') || 'Buscar'}
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                      <input
                        type="text"
                        placeholder={getTranslation('searchBooks') || 'Pesquisar livros...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                        style={{
                          backgroundColor: interfaceStyles.panelSecondaryBackground,
                          borderColor: interfaceStyles.borderColor,
                          color: interfaceStyles.color
                        }}
                      />
                    </div>
                  </div>

                  {/* Filters: File Types Selection (Dynamic) */}
                  {(() => {
                    const uniqueLoadedTypes = Array.from(new Set(books.map(b => b.fileType?.toLowerCase()))).filter(Boolean) as string[];
                    if (uniqueLoadedTypes.length === 0) return null;

                    return (
                      <div className="space-y-1.5 pt-2">
                        <label className="text-[9px] font-black uppercase tracking-widest opacity-45 px-1.5">
                          {getTranslation('fileType') || 'Tipo de Arquivo'}
                        </label>
                        <div className={`grid ${uniqueLoadedTypes.length > 1 ? 'grid-cols-3' : 'grid-cols-1'} gap-1.5`}>
                          {uniqueLoadedTypes.length > 1 && (
                            <button
                              onClick={() => setSelectedFileType('all')}
                              className="py-1.5 px-1 rounded-xl text-[9px] font-black uppercase border text-center transition-all cursor-pointer truncate"
                              style={{
                                borderColor: selectedFileType === 'all' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.3)' : `${interfaceStyles.accent}50`) : 'transparent',
                                backgroundColor: selectedFileType === 'all' ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : `${interfaceStyles.accent}15`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                                color: selectedFileType === 'all' ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                              }}
                            >
                              {getTranslation('allTypes') || 'All Types'}
                            </button>
                          )}
                          {uniqueLoadedTypes.map((type) => (
                            <button
                              key={type}
                              onClick={() => setSelectedFileType(type)}
                              className="py-1.5 px-1 rounded-xl text-[9px] font-black uppercase border text-center transition-all cursor-pointer truncate"
                              style={{
                                borderColor: (selectedFileType === type || (uniqueLoadedTypes.length === 1 && selectedFileType !== 'all')) ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.3)' : `${interfaceStyles.accent}50`) : 'transparent',
                                backgroundColor: (selectedFileType === type || (uniqueLoadedTypes.length === 1 && selectedFileType !== 'all')) ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : `${interfaceStyles.accent}15`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                                color: (selectedFileType === type || (uniqueLoadedTypes.length === 1 && selectedFileType !== 'all')) ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                              }}
                            >
                              {type.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Single Unified Sort By Selection */}
                  <div className="space-y-1.5 mt-3">
                    <label className="text-[9px] font-black uppercase tracking-widest opacity-45 px-1.5">
                      {getTranslation('sortBy') || 'SORT BY CHAPTER'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'default', label: getTranslation('sortDefault') || 'DEFAULT' },
                        { id: 'mostChapters', label: getTranslation('sortMostChapters') || 'MOST' },
                        { id: 'leastChapters', label: getTranslation('sortLeastChapters') || 'FEWER' }
                      ].map((order) => (
                        <button
                          key={order.id}
                          onClick={() => setSortOrder(order.id as any)}
                          className="py-1.5 px-1.5 rounded-xl text-[9px] font-black uppercase border text-center transition-all cursor-pointer truncate"
                          style={{
                            borderColor: sortOrder === order.id ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.3)' : `${interfaceStyles.accent}50`) : 'transparent',
                            backgroundColor: sortOrder === order.id ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : `${interfaceStyles.accent}15`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.04)'),
                            color: sortOrder === order.id ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary
                          }}
                        >
                          {order.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Favorites Filter toggle */}
                  <button
                    onClick={() => setFilterFavoritesOnly(!filterFavoritesOnly)}
                    className="w-full flex items-center justify-between px-3 py-2.5 mt-4 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer"
                    style={{
                      borderColor: filterFavoritesOnly ? 'rgba(239, 68, 68, 0.3)' : 'transparent',
                      backgroundColor: filterFavoritesOnly ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                      color: filterFavoritesOnly ? '#ef4444' : interfaceStyles.textSecondary
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <Heart className={`w-4 h-4 ${filterFavoritesOnly ? 'fill-red-500 text-red-500' : ''}`} />
                      <span className="text-xs">{getTranslation('favorites') || 'Favoritos'}</span>
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
                      {validFavorites.length}
                    </span>
                  </button>

                  {/* Tags list if any exist */}
                  {allTags.length > 0 && (
                    <div className="space-y-1.5 pt-0.5">
                      <label className="text-[9px] font-black uppercase tracking-widest opacity-45 px-1.5">
                        {getTranslation('tags') || 'Marcadores'}
                      </label>
                      <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
                        {allTags.map(tag => {
                          const isSelected = selectedTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedTags(prev =>
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                );
                              }}
                              className="text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all cursor-pointer"
                              style={{ 
                                borderColor: isSelected ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.3)' : `${interfaceStyles.accent}50`) : 'transparent',
                                backgroundColor: isSelected ? (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.15)' : `${interfaceStyles.accent}15`) : (interfaceStyles.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'),
                                color: isSelected ? (interfaceStyles.isDark ? '#ffffff' : interfaceStyles.accent) : interfaceStyles.textSecondary 
                              }}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* 5. SIDEBAR FOOTER: ADD BOOK + UTILITIES DOCK (ZERO DEAD SPACE) */}
            <div 
              className="p-3 border-t flex-shrink-0 space-y-2 mt-auto" 
              style={{ borderColor: interfaceStyles.borderColor }}
            >
              {/* Add/Import Book Primary Trigger button - tightly docked right above the bottom utilities bar */}
              <button
                id="sidebar-add-book-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUploaderOpen(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-2 transform hover:scale-[1.01] shadow-xs text-xs font-black cursor-pointer uppercase tracking-wider"
                style={{ 
                  backgroundColor: interfaceStyles.buttonPrimary,
                  color: interfaceStyles.buttonPrimaryText 
                }}
              >
                <Plus className="w-4 h-4" />
                <span>{getTranslation('addBook') || 'Importar Livro'}</span>
              </button>

              {/* Bottom Utilities Dock: Language & Settings on left, joaowars776 on right */}
              <div className="flex items-center justify-between pt-0.5">
                {/* Left: Language & Settings */}
                <div className="flex items-center gap-1">
                  {/* Language Switcher */}
                  <div className="relative">
                    <button
                      onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                      className="flex items-center gap-1 px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all cursor-pointer opacity-70 hover:opacity-100"
                      title={getTranslation('language')}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span className="uppercase text-[9px] font-black">{getCurrentLanguage()}</span>
                    </button>
                    {showLanguageSelector && (
                      <div className="absolute bottom-full left-0 mb-1.5 z-[9999] animate-fade-in">
                        <LanguageSelector preferences={preferences} onClose={() => setShowLanguageSelector(false)} />
                      </div>
                    )}
                  </div>

                  {/* Settings Trigger */}
                  <button
                    onClick={() => setShowHomePageSettings(true)}
                    className="flex items-center gap-1 px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-all cursor-pointer opacity-70 hover:opacity-100"
                    title={getTranslation('homePageSettings')}
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase">{getTranslation('settings')}</span>
                  </button>
                </div>

                {/* Right: joaowars776 - right at the very bottom end! */}
                <a
                  id="author-project-link"
                  href="https://github.com/joaowars776/Novel-Reader"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-1.5 py-0.5 rounded-md transition-all duration-300 hover:scale-105 opacity-85 hover:opacity-100 cursor-pointer select-none"
                  title="GitHub: joaowars776/Novel-Reader"
                >
                  <span className="author-glowing-name text-[10px] tracking-wider font-black">
                    joaowars776
                  </span>
                </a>
              </div>
            </div>
          </aside>

        {/* Center Panel: Library Workspace */}
        <div className="flex-1 overflow-y-auto flex flex-col h-full">
          {activeMainTab === 'history' ? (
            <div className="flex-1 w-full">
              <ReadingHistoryTab 
                onClose={() => setActiveMainTab('library')} 
                preferences={preferences || undefined} 
                onPreferencesChange={handlePreferencesChange} 
                initialTab={historyTab}
              />
            </div>
          ) : activeMainTab === 'notes' ? (
            <div className="flex-1 w-full">
              <Notes 
                onClose={() => setActiveMainTab('library')} 
                preferences={preferences || undefined} 
                onPreferencesChange={handlePreferencesChange} 
                onOpenBook={onOpenBook} 
              />
            </div>
          ) : activeMainTab === 'translate' ? (
            <div className="flex-1 w-full flex flex-col h-full overflow-hidden">
              <BookTranslatorModal
                book={inlineTranslatingBook}
                onClose={() => {
                  setInlineTranslatingBook(null);
                  setActiveMainTab('library');
                }}
                preferences={preferences}
                inline={true}
              />
            </div>
          ) : (
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 flex-1 flex flex-col space-y-6">
              
              {/* Collection / Shelf Section */}
            <section className="flex-1 flex flex-col space-y-3">
              <div className="flex items-center justify-between mb-1 select-none">
                <div className="flex items-center gap-2">
                  <h3 className="text-[10px] font-black uppercase tracking-wider opacity-60 px-1" style={{ color: interfaceStyles.color }}>
                    {getTranslation('myBookshelf') || 'Sua Estante'}
                  </h3>
                  <span 
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full opacity-75"
                    style={{ 
                      color: interfaceStyles.color, 
                      backgroundColor: interfaceStyles.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' 
                    }}
                  >
                    {displayedBooks.length} {getCurrentLanguage() === 'pt' ? (displayedBooks.length === 1 ? 'livro' : 'livros') : (displayedBooks.length === 1 ? 'book' : 'books')}
                  </span>
                </div>

                {/* View modes controls */}
                {displayedBooks.length > 0 && (
                  <div 
                    className="flex items-center rounded-xl p-0.5 border shadow-2xs"
                    style={{ backgroundColor: interfaceStyles.panelBackground, borderColor: interfaceStyles.borderColor }}
                  >
                    <button
                      onClick={() => setViewMode('cover')}
                      className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${viewMode === 'cover' ? 'shadow-2xs' : 'opacity-60'}`}
                      style={{
                        backgroundColor: viewMode === 'cover' ? interfaceStyles.panelSecondaryBackground : 'transparent',
                        color: viewMode === 'cover' ? interfaceStyles.accent : interfaceStyles.color
                      }}
                      title={getTranslation('gridView') || 'Visualização em Grade'}
                    >
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('detail')}
                      className={`p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${viewMode === 'detail' ? 'shadow-2xs' : 'opacity-60'}`}
                      style={{
                        backgroundColor: viewMode === 'detail' ? interfaceStyles.panelSecondaryBackground : 'transparent',
                        color: viewMode === 'detail' ? interfaceStyles.accent : interfaceStyles.color
                      }}
                      title={getTranslation('listView') || 'Visualização em Lista'}
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Empty state handlers */}
              {displayedBooks.length === 0 && books.length === 0 ? (
                <div className="text-center py-16 my-auto rounded-2xl border border-dashed flex flex-col items-center justify-center p-8" style={{ borderColor: interfaceStyles.borderColor }}>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${interfaceStyles.accent}15` }}
                  >
                    <BookOpen className="w-6 h-6" style={{ color: interfaceStyles.accent }} />
                  </div>
                  <h3 className="text-sm font-black mb-1" style={{ color: interfaceStyles.color }}>
                    {getTranslation('noBooksYet') || "Sua estante está vazia"}
                  </h3>
                  <p className="mb-4 text-xs opacity-60 max-w-xs mx-auto leading-relaxed" style={{ color: interfaceStyles.color }}>
                    {getTranslation('addFirstBook') || "Comece importando seus arquivos favoritos de leitura (.EPUB, .PDF)"}
                  </p>
                  <button
                    onClick={() => setIsUploaderOpen(true)}
                    className="text-white px-4 py-2 rounded-xl hover:opacity-95 transition-all shadow-sm text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: interfaceStyles.accent }}
                  >
                    {getTranslation('addYourFirstBook') || "Adicionar Primeiro Livro"}
                  </button>
                </div>
              ) : displayedBooks.length === 0 ? (
                <div className="text-center py-16 my-auto rounded-2xl border" style={{ backgroundColor: interfaceStyles.panelBackground, borderColor: interfaceStyles.borderColor }}>
                  <Search className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-xs font-black mb-1" style={{ color: interfaceStyles.color }}>
                    {getTranslation('noBooksFound') || "Nenhum resultado encontrado"}
                  </h4>
                  <p className="text-[10px] opacity-50" style={{ color: interfaceStyles.color }}>
                    {getTranslation('tryAdjustingSearch') || "Experimente ajustar ou redefinir os filtros do painel lateral"}
                  </p>
                </div>
              ) : viewMode === 'cover' ? (
                /* Cover View - High-end Responsive grid with tactile spine bindings */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                  {getGridItems().map((book) => {
                    const isFav = favoriteBookIds.includes(book.id);
                    return (
                      <div
                        key={book.id}
                        className={`rounded-2xl hover:shadow-md transition-all duration-300 border flex flex-col relative transform hover:scale-[1.015] ${selectedBook === book.id ? 'overflow-visible z-30' : 'overflow-hidden'}`}
                        style={{
                          backgroundColor: interfaceStyles.panelBackground,
                          borderColor: interfaceStyles.borderColor
                        }}
                      >
                        {/* Book Spine-shadow Cover Container */}
                        <div 
                          className="aspect-[3/4] bg-gradient-to-br from-blue-100/10 to-purple-100/10 dark:from-blue-900/5 dark:to-purple-900/5 relative overflow-hidden cursor-pointer"
                          onClick={() => onOpenBook(book)}
                        >
                          {/* 3D spine shadow effect inside every card */}
                          <div className="absolute top-0 left-0 w-2 h-full z-10 bg-gradient-to-r from-black/20 via-black/8 to-transparent pointer-events-none" />

                          {coverUrls[book.id] || book.cover ? (
                            <img
                              src={coverUrls[book.id] || book.cover}
                              alt={`${book.title} cover`}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement?.querySelector('.fallback-cover')?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          
                          {/* Fallback Cover */}
                          <div className={`fallback-cover w-full h-full flex items-center justify-center ${(coverUrls[book.id] || book.cover) ? 'hidden' : ''}`}>
                            <BookOpen className="w-10 h-10 opacity-20" style={{ color: interfaceStyles.accent }} />
                          </div>

                          {/* Quick Interactive Hover Heart Icon */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(book.id);
                            }}
                            className="absolute top-2 left-2 z-10 p-1.5 rounded-lg backdrop-blur-md bg-black/35 hover:bg-black/55 transition-all duration-200 cursor-pointer"
                            title={isFav ? (getTranslation('removeFromFavorites') || "Remover dos Favoritos") : (getTranslation('addToFavorites') || "Adicionar aos Favoritos")}
                          >
                            <Heart 
                              className={`w-3 h-3 transition-colors ${isFav ? 'text-red-500 fill-red-500' : 'text-white'}`} 
                            />
                          </button>

                          {/* Format Badge overlay */}
                          <div className="absolute top-2 right-2 z-10">
                            <span className="bg-black/35 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                              {getFileTypeDisplayName(book.fileType || 'epub')}
                            </span>
                          </div>

                          {/* Fast Action Metadata indicator */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedMetadata(expandedMetadata === book.id ? null : book.id);
                            }}
                            className="absolute bottom-2 right-2 z-10 bg-black/35 backdrop-blur-md text-white p-1.5 rounded-lg hover:bg-black/55 transition-all duration-300 opacity-0 group-hover:opacity-100"
                            title={getTranslation('showMetadata') || "Exibir metadados"}
                          >
                            <Globe className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Metadata Panel if triggered */}
                        {expandedMetadata === book.id && (
                          <div 
                            className="px-3 py-2 border-t text-[9px] space-y-1 animate-fade-in relative z-10"
                            style={{ 
                              backgroundColor: interfaceStyles.panelSecondaryBackground,
                              color: interfaceStyles.color,
                              borderColor: interfaceStyles.borderColor
                            }}
                          >
                            <h4 className="font-extrabold uppercase tracking-wider opacity-45 text-[8px]">{getTranslation('bookDetails') || 'Ficha Técnica'}</h4>
                            {book.metadata?.publisher && (
                              <div className="truncate"><span className="font-bold">{getTranslation('publisher') || 'Editora:'}</span> {book.metadata.publisher}</div>
                            )}
                            {book.metadata?.pubdate && (
                              <div><span className="font-bold">{getTranslation('published') || 'Publicado:'}</span> {book.metadata.pubdate}</div>
                            )}
                            {book.metadata?.language && (
                              <div><span className="font-bold">{getTranslation('language') || 'Idioma:'}</span> {book.metadata.language}</div>
                            )}
                          </div>
                        )}

                        {/* Tactile Progress Track Bar */}
                        {book.progress > 0 && (
                          <div className="px-3 pt-2.5 select-none">
                            <div className="flex items-center justify-between text-[9px] mb-0.5 font-semibold opacity-60" style={{ color: interfaceStyles.color }}>
                              <span>{getTranslation('reading') || 'Leitura'}</span>
                              <span>{formatProgress(book.progress)}%</span>
                            </div>
                            <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                              <div
                                className="h-1 rounded-full transition-all duration-500 ease-out"
                                style={{ 
                                  width: `${formatProgress(book.progress)}%`,
                                  backgroundColor: interfaceStyles.accent
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Card Title & Meta details footer */}
                        <div className="p-3 flex-1 flex flex-col justify-between cursor-pointer" onClick={() => onOpenBook(book)}>
                          <div className="space-y-0.5">
                            <h3 className="font-bold text-xs line-clamp-2 leading-snug tracking-tight hover:underline" style={{ color: interfaceStyles.color }}>
                              {book.title}
                            </h3>
                            <p className="text-[9px] opacity-60 font-bold truncate flex items-center gap-1 flex-wrap" style={{ color: interfaceStyles.textSecondary }}>
                              <span>by {book.author}</span>
                              <span>•</span>
                              <span>{getBookChaptersCount(book)} {getTranslation('chaptersCount') || 'capítulos'}</span>
                              {book.currentChapter !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-blue-500 dark:text-blue-400">
                                    {(() => {
                                      const chNum = (book.currentChapter ?? 0) + 1;
                                      const abbr = getTranslation('chapterAbbr') || 'Ch.';
                                      return abbr.includes('{n}') ? abbr.replace('{n}', String(chNum)) : `${abbr} ${chNum}`;
                                    })()}
                                  </span>
                                </>
                              )}
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between text-[8px] border-t pt-2 mt-2" style={{ color: interfaceStyles.color, borderColor: interfaceStyles.borderColor }}>
                            <span className="opacity-60">{getTranslation('accessLabel') || 'Access:'} {formatLastRead(book.lastRead)}</span>
                            
                            {/* Inner Trigger action menu */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBook(selectedBook === book.id ? null : book.id);
                                }}
                                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>
                              
                              {selectedBook === book.id && (
                                <>
                                  <div 
                                    className="fixed inset-0 z-40 cursor-default" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBook(null);
                                    }} 
                                  />
                                  <div 
                                    className="absolute bottom-full right-0 mb-1.5 rounded-xl shadow-2xl border py-1 z-50 min-w-[140px]"
                                    style={{
                                      backgroundColor: interfaceStyles.panelBackground || '#ffffff',
                                      borderColor: interfaceStyles.borderColor,
                                      color: interfaceStyles.color,
                                      opacity: 1,
                                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3)'
                                    }}
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInlineTranslatingBook(book);
                                        setActiveMainTab('translate');
                                        setSelectedBook(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10 flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer"
                                      style={{ color: interfaceStyles.color }}
                                    >
                                      <Languages className="w-3.5 h-3.5 shrink-0" style={{ color: interfaceStyles.accent }} />
                                      <span>{getTranslation('translateBook') || 'Traduzir Livro'}</span>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBook(book.id);
                                        setSelectedBook(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-red-500/10 flex items-center gap-2 text-xs font-semibold text-red-500 transition-colors cursor-pointer border-t"
                                      style={{ borderColor: interfaceStyles.borderColor }}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                      <span>{getTranslation('deleteBook') || 'Excluir Livro'}</span>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Detail View - Refined Dense list rows */
                <div className="space-y-2">
                  {displayedBooks.map((book) => {
                    const isFav = favoriteBookIds.includes(book.id);
                    return (
                      <div
                        key={book.id}
                        className="rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 border overflow-hidden group"
                        style={{
                          backgroundColor: interfaceStyles.panelBackground,
                          borderColor: interfaceStyles.borderColor
                        }}
                      >
                        <div className="p-3.5 flex items-center gap-4">
                          {/* Tactile Mini Cover */}
                          <div 
                            className="w-10 h-14 bg-gradient-to-br from-blue-100/10 to-purple-100/10 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer relative border border-black/10"
                            onClick={() => onOpenBook(book)}
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full z-10 bg-gradient-to-r from-black/15 via-black/5 to-transparent pointer-events-none" />
                            {coverUrls[book.id] || book.cover ? (
                              <img
                                src={coverUrls[book.id] || book.cover}
                                alt={`${book.title} cover`}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                                <BookOpen className="w-4 h-4 opacity-25" style={{ color: interfaceStyles.accent }} />
                              </div>
                            )}
                          </div>

                          {/* Dense Title Meta */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenBook(book)}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <h3 className="font-extrabold text-xs sm:text-sm truncate hover:underline" style={{ color: interfaceStyles.color }}>
                                {book.title}
                              </h3>
                              <span className="text-[8px] font-black uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                {getFileTypeDisplayName(book.fileType || 'epub')}
                              </span>
                            </div>
                            <p className="text-[9px] opacity-60 font-bold mb-1.5 flex items-center gap-1.5 flex-wrap" style={{ color: interfaceStyles.textSecondary }}>
                              <span>by {book.author}</span>
                              <span>•</span>
                              <span>{getBookChaptersCount(book)} {getTranslation('chaptersCount') || 'capítulos'}</span>
                              {book.currentChapter !== undefined && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-blue-500 dark:text-blue-400">
                                    {getTranslation('currentChapter') || 'Capítulo atual'}: {book.currentChapter + 1}
                                  </span>
                                </>
                              )}
                            </p>
                            
                            {book.progress > 0 && (
                              <div className="flex items-center gap-2 max-w-xs">
                                <div className="flex-1 bg-black/5 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                                  <div
                                    className="h-1 rounded-full transition-all duration-300"
                                    style={{ 
                                      width: `${formatProgress(book.progress)}%`,
                                      backgroundColor: interfaceStyles.accent
                                    }}
                                  />
                                </div>
                                <span className="text-[8px] font-black opacity-60">{formatProgress(book.progress)}%</span>
                              </div>
                            )}
                          </div>

                          {/* Row micro actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => toggleFavorite(book.id)}
                              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title={isFav ? (getTranslation('removeFavorite') || "Remover dos Favoritos") : (getTranslation('addFavorite') || "Adicionar aos Favoritos")}
                            >
                              <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-red-500 fill-red-500' : 'opacity-30'}`} />
                            </button>

                            <button
                              onClick={() => {
                                setInlineTranslatingBook(book);
                                setActiveMainTab('translate');
                              }}
                              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-blue-500 cursor-pointer"
                              title={getTranslation('translateBook') || 'Traduzir Livro'}
                            >
                              <Languages className="w-3.5 h-3.5" style={{ color: interfaceStyles.accent }} />
                            </button>

                            <button
                              onClick={() => handleDeleteBook(book.id)}
                              className="p-2 rounded-xl hover:bg-red-500/10 text-red-600 transition-colors cursor-pointer"
                              title={getTranslation('deleteBook') || 'Excluir Livro'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Dedicated Area: Livros de Outros Usuários (Shared Library from Other Users) */}
            <section 
              className="mt-8 pt-6 border-t transition-all duration-300"
              style={{ borderColor: interfaceStyles.borderColor }}
            >
                {/* Header with Title, Count & Minimize Toggle */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2 select-none">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center shadow-xs"
                      style={{ 
                        backgroundColor: `${interfaceStyles.accent}20`,
                        color: interfaceStyles.accent 
                      }}
                    >
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider" style={{ color: interfaceStyles.color }}>
                          {getLocalTranslation('otherUsersBooksTitle')}
                        </h3>
                        <span 
                          className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase border"
                          style={{ 
                            backgroundColor: `${interfaceStyles.accent}15`,
                            borderColor: `${interfaceStyles.accent}30`,
                            color: interfaceStyles.accent
                          }}
                        >
                          {filteredOtherUsersBooks.length} {filteredOtherUsersBooks.length === 1 ? getLocalTranslation('bookSingular').toUpperCase() : getLocalTranslation('bookPlural').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-50 font-medium" style={{ color: interfaceStyles.color }}>
                        {getLocalTranslation('otherUsersBooksSubtitle')}
                      </p>
                    </div>
                  </div>

                  {/* Minimize / Expand Toggle Button */}
                  <button
                    onClick={toggleOtherBooksExpanded}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-all hover:opacity-85 cursor-pointer shadow-2xs"
                    style={{
                      backgroundColor: interfaceStyles.panelBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.color
                    }}
                    title={isOtherBooksExpanded ? getLocalTranslation('minimize') : getLocalTranslation('expand')}
                  >
                    <span>
                      {isOtherBooksExpanded ? getLocalTranslation('minimize') : getLocalTranslation('expand')}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOtherBooksExpanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Collapsible Area Content */}
                {isOtherBooksExpanded && (
                  <div className="animate-fade-in">
                    {filteredOtherUsersBooks.length === 0 ? (
                      <div 
                        className="text-center py-6 rounded-xl border text-[11px] opacity-60"
                        style={{ backgroundColor: interfaceStyles.panelBackground, borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
                      >
                        {getTranslation('noBooksFound') || "Nenhum livro de outro usuário encontrado para esta pesquisa"}
                      </div>
                    ) : viewMode === 'cover' ? (
                      /* Cover View for Other Users' Books */
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                        {filteredOtherUsersBooks.map((otherBook) => {
                          const userProgress = userProgressMap.get(otherBook.id);
                          const hasRead = userProgress !== undefined && userProgress > 0;
                          const isOpening = openingOtherBookId === otherBook.id;
                          return (
                            <div
                              key={otherBook.id}
                              className="rounded-2xl hover:shadow-md transition-all duration-300 border overflow-hidden group flex flex-col relative transform hover:scale-[1.015]"
                              style={{
                                backgroundColor: interfaceStyles.panelBackground,
                                borderColor: interfaceStyles.borderColor
                              }}
                            >
                              {/* Book Spine Cover Container - wider horizontal proportions */}
                              <div 
                                className="aspect-[4/3.8] max-h-48 sm:max-h-52 bg-gradient-to-br from-indigo-100/10 to-blue-100/10 dark:from-indigo-900/10 dark:to-blue-900/10 relative overflow-hidden cursor-pointer"
                                onClick={() => handleOpenOtherBook(otherBook)}
                              >
                                <div className="absolute top-0 left-0 w-2 h-full z-10 bg-gradient-to-r from-black/20 via-black/8 to-transparent pointer-events-none" />

                                {otherBook.coverUrl ? (
                                  <img
                                    src={otherBook.coverUrl}
                                    alt={`${otherBook.title} cover`}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement?.querySelector('.fallback-cover')?.classList.remove('hidden');
                                    }}
                                  />
                                ) : null}

                                <div className={`fallback-cover w-full h-full flex items-center justify-center ${otherBook.coverUrl ? 'hidden' : ''}`}>
                                  <BookOpen className="w-10 h-10 opacity-20" style={{ color: interfaceStyles.accent }} />
                                </div>

                                {/* Notice Tag: [uploader] */}
                                <div className="absolute top-2 left-2 z-10">
                                  <span 
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white shadow-xs backdrop-blur-md"
                                    style={{ backgroundColor: 'rgba(79, 70, 229, 0.92)' }}
                                    title={`${getTranslation('uploadedBy') || 'Carregado por'} ${otherBook.uploadedBy}`}
                                  >
                                    [{otherBook.uploadedBy}]
                                  </span>
                                </div>

                                {/* Format badge */}
                                <div className="absolute top-2 right-2 z-10">
                                  <span className="bg-black/45 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                    {getFileTypeDisplayName(otherBook.fileType || 'epub')}
                                  </span>
                                </div>

                                {/* Hover action: Start or Continue reading */}
                                <div className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] ${isOpening ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3 text-white text-center`}>
                                  {isOpening ? (
                                    <>
                                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      <span className="text-[11px] font-black uppercase tracking-wider">
                                        {getLocalTranslation('loading')}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <BookOpen className="w-6 h-6 text-white" />
                                      <span className="text-[11px] font-black uppercase tracking-wider">
                                        {hasRead ? getLocalTranslation('continueReading') : getLocalTranslation('startReading')}
                                      </span>
                                      <span className="text-[8px] opacity-80">
                                        {hasRead ? `${formatProgress(userProgress!)}% ${getLocalTranslation('readByYou')}` : getLocalTranslation('yourReadingIsolated')}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Progress bar if current user has reading progress on this book */}
                              {hasRead && (
                                <div className="px-3 pt-2.5 select-none">
                                  <div className="flex items-center justify-between text-[9px] mb-0.5 font-semibold opacity-60" style={{ color: interfaceStyles.color }}>
                                    <span>{getLocalTranslation('yourProgress')}</span>
                                    <span>{formatProgress(userProgress!)}%</span>
                                  </div>
                                  <div className="w-full bg-black/5 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                                    <div
                                      className="h-1 rounded-full transition-all duration-500 ease-out"
                                      style={{ 
                                        width: `${formatProgress(userProgress!)}%`,
                                        backgroundColor: interfaceStyles.accent
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Title & Author Info */}
                              <div className="p-3 flex-1 flex flex-col justify-between cursor-pointer" onClick={() => handleOpenOtherBook(otherBook)}>
                                <div className="space-y-0.5">
                                  <h3 className="font-bold text-xs line-clamp-2 leading-snug tracking-tight hover:underline" style={{ color: interfaceStyles.color }}>
                                    {otherBook.title}
                                  </h3>
                                  <p className="text-[9px] opacity-60 font-bold truncate flex items-center gap-1.5 flex-wrap">
                                    <span>by {otherBook.author}</span>
                                    <span>•</span>
                                    <span>{getBookChaptersCount(otherBook)} {getTranslation('chaptersCount') || 'capítulos'}</span>
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[8px] opacity-60 border-t pt-2 mt-2" style={{ color: interfaceStyles.color, borderColor: interfaceStyles.borderColor }}>
                                  <span className="font-semibold text-indigo-500 dark:text-indigo-400 truncate max-w-[85px]">
                                    [{otherBook.uploadedBy}]
                                  </span>
                                  <span className="opacity-75 font-bold">
                                    {hasRead ? `${formatProgress(userProgress!)}%` : getLocalTranslation('newBadge')}
                                  </span>
                                </div>

                                {/* Button to reuse / adopt into personal library */}
                                <button
                                  type="button"
                                  onClick={(e) => handleReuseOtherBook(otherBook, e)}
                                  disabled={reusingBookId === otherBook.id}
                                  className="mt-2.5 w-full py-1.5 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:opacity-90 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                  style={{
                                    backgroundColor: `${interfaceStyles.accent}15`,
                                    color: interfaceStyles.accent,
                                    border: `1px solid ${interfaceStyles.accent}35`
                                  }}
                                  title={getLocalTranslation('reuseBookTitle')}
                                >
                                  <BookmarkPlus className="w-3.5 h-3.5" />
                                  <span>{reusingBookId === otherBook.id ? '...' : getLocalTranslation('reuseBook')}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Detail View for Other Users' Books */
                      <div className="space-y-2">
                        {filteredOtherUsersBooks.map((otherBook) => {
                          const userProgress = userProgressMap.get(otherBook.id);
                          const hasRead = userProgress !== undefined && userProgress > 0;
                          const isOpening = openingOtherBookId === otherBook.id;
                          return (
                            <div
                              key={otherBook.id}
                              className="rounded-xl shadow-2xs hover:shadow-xs transition-all duration-200 border overflow-hidden group cursor-pointer"
                              style={{
                                backgroundColor: interfaceStyles.panelBackground,
                                borderColor: interfaceStyles.borderColor
                              }}
                              onClick={() => handleOpenOtherBook(otherBook)}
                            >
                              <div className="p-3.5 flex items-center gap-4">
                                <div className="w-10 h-14 bg-gradient-to-br from-indigo-100/10 to-blue-100/10 rounded-lg overflow-hidden flex-shrink-0 relative border border-black/10">
                                  <div className="absolute top-0 left-0 w-1.5 h-full z-10 bg-gradient-to-r from-black/15 via-black/5 to-transparent pointer-events-none" />
                                  {otherBook.coverUrl ? (
                                    <img
                                      src={otherBook.coverUrl}
                                      alt={`${otherBook.title} cover`}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                                      <BookOpen className="w-4 h-4 opacity-25" style={{ color: interfaceStyles.accent }} />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-extrabold text-xs sm:text-sm truncate hover:underline" style={{ color: interfaceStyles.color }}>
                                      {otherBook.title}
                                    </h3>
                                    <span 
                                      className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-white shadow-2xs"
                                      style={{ backgroundColor: 'rgba(79, 70, 229, 0.9)' }}
                                    >
                                      [{otherBook.uploadedBy}]
                                    </span>
                                    <span className="text-[8px] font-black uppercase bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded">
                                      {getFileTypeDisplayName(otherBook.fileType || 'epub')}
                                    </span>
                                  </div>
                                  <p className="text-[9px] opacity-60 font-bold mb-1 flex items-center gap-1.5 flex-wrap">
                                    <span>by {otherBook.author}</span>
                                    <span>•</span>
                                    <span>{getBookChaptersCount(otherBook)} {getTranslation('chaptersCount') || 'capítulos'}</span>
                                  </p>
                                  
                                  {hasRead && (
                                    <div className="flex items-center gap-2 max-w-xs">
                                      <div className="flex-1 bg-black/5 dark:bg-white/10 rounded-full h-1 overflow-hidden">
                                        <div
                                          className="h-1 rounded-full transition-all duration-300"
                                          style={{ 
                                            width: `${formatProgress(userProgress!)}%`,
                                            backgroundColor: interfaceStyles.accent
                                          }}
                                        />
                                      </div>
                                      <span className="text-[8px] font-black opacity-60">{formatProgress(userProgress!)}%</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => handleReuseOtherBook(otherBook, e)}
                                    disabled={reusingBookId === otherBook.id}
                                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-[0.98] cursor-pointer shadow-2xs disabled:opacity-50"
                                    style={{
                                      backgroundColor: `${interfaceStyles.accent}15`,
                                      color: interfaceStyles.accent,
                                      borderColor: `${interfaceStyles.accent}35`
                                    }}
                                    title={getLocalTranslation('reuseBookTitle')}
                                  >
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">{reusingBookId === otherBook.id ? '...' : getLocalTranslation('reuseBook')}</span>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenOtherBook(otherBook);
                                    }}
                                    disabled={isOpening}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5"
                                    style={{ backgroundColor: interfaceStyles.accent }}
                                  >
                                    {isOpening ? (
                                      <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>{getLocalTranslation('loading')}</span>
                                      </>
                                    ) : (
                                      hasRead ? getLocalTranslation('continueReading') : getLocalTranslation('startReading')
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </main>
        )}
        </div>
      </div>

      {/* Left Drawer: Profile Sidebar Popover */}
      {isProfileDrawerOpen && (
        <div className="fixed inset-0 z-[120] flex justify-start animate-fade-in bg-black/60">
          {/* Backdrop closer */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsProfileDrawerOpen(false)} />
          
          <aside 
            className="w-full sm:w-[380px] flex-shrink-0 border-r flex flex-col h-full overflow-hidden relative shadow-2xl select-none z-10 animate-slide-in-left"
            style={{
              backgroundColor: interfaceStyles.panelBackground,
              borderColor: interfaceStyles.borderColor,
              color: interfaceStyles.color
            }}
          >
            {/* Drawer Header */}
            <div 
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0 gap-2 min-w-0"
              style={{ 
                backgroundColor: interfaceStyles.panelSecondaryBackground,
                borderColor: interfaceStyles.borderColor 
              }}
            >
              <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 min-w-0 flex-1 truncate" style={{ color: interfaceStyles.color }} title={getLocalTranslation('myProfile')}>
                <User className="w-4 h-4 text-blue-500 shrink-0" style={{ color: interfaceStyles.accent }} />
                <span className="truncate">{getLocalTranslation('myProfile')}</span>
              </span>
              <button
                onClick={() => setIsProfileDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                title={getLocalTranslation('closeProfile')}
                style={{ color: interfaceStyles.color }}
                aria-label={getLocalTranslation('closeProfile')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Profile Card and rename trigger */}
              <div 
                className="flex flex-col items-center text-center p-4 rounded-2xl border relative overflow-hidden"
                style={{
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor,
                  color: interfaceStyles.color
                }}
              >
                <button 
                  onClick={() => setShowAvatarEditor(!showAvatarEditor)}
                  className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-md mb-2 shrink-0 select-none cursor-pointer hover:opacity-80 hover:scale-105 transition-all border-none focus:outline-none"
                  style={{
                    background: getAvatarBgStyle()
                  }}
                  title={getCurrentLanguage() === 'pt' ? 'Clique para alterar avatar' : 'Click to change avatar'}
                >
                  {userAvatar}
                </button>

                {/* Emojis & Background selection drawer - only shown when clicked */}
                {showAvatarEditor && (
                  <div className="mt-2.5 w-full border-t pt-3 animate-fade-in" style={{ borderColor: interfaceStyles.borderColor }}>
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-80 block mb-2" style={{ color: interfaceStyles.color }}>
                      CHANGE AVATAR
                    </span>
                    <div className="flex flex-wrap gap-1.5 justify-center max-w-[280px] mx-auto mb-2">
                      {['📚', '📖', '🦊', '🦁', '🐼', '🦉', '🌟', '🧙', '🚀', '💻', '☕', '🔮', '🦄', '🍀', '🎨', '🎮', '🎯', '🧩', '🎧'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_${activeUsername}`, emoji);
                            setUserAvatar(emoji);
                            window.dispatchEvent(new Event('activity_logs_updated'));
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border hover:scale-115 transition-all cursor-pointer ${
                            userAvatar === emoji ? 'border-blue-500 bg-blue-500/10 scale-110' : 'border-transparent hover:bg-black/5 dark:hover:bg-white/10'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                      <button
                        onClick={() => {
                          localStorage.removeItem(`novel_reader_avatar_${activeUsername}`);
                          setUserAvatar(activeUsername.charAt(0).toUpperCase());
                          window.dispatchEvent(new Event('activity_logs_updated'));
                        }}
                        className="px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer flex items-center justify-center"
                        style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
                      >
                        {getTranslation('letter')}
                      </button>
                    </div>

                    {/* Custom keyboard letter input */}
                    <div 
                      className="flex items-center gap-2 w-full mt-2.5 px-2.5 py-1.5 rounded-xl border max-w-[260px] mx-auto"
                      style={{
                        backgroundColor: interfaceStyles.inputBackground,
                        borderColor: interfaceStyles.borderColor
                      }}
                    >
                      <span className="text-[10px] font-bold opacity-75 uppercase shrink-0" style={{ color: interfaceStyles.color }}>
                        {getCurrentLanguage() === 'pt' ? 'Digitar Letra:' : 'Type Letter:'}
                      </span>
                      <input
                        type="text"
                        maxLength={1}
                        value={userAvatar.length === 1 && !['📚', '📖', '🦊', '🦁', '🐼', '🦉', '🌟', '🧙', '🚀', '💻', '☕', '🔮', '🦄', '🍀', '🎨', '🎮', '🎯', '🧩', '🎧'].includes(userAvatar) ? userAvatar : ''}
                        onChange={(e) => {
                          const char = e.target.value;
                          if (char) {
                            localStorage.setItem(`novel_reader_avatar_${activeUsername}`, char);
                            setUserAvatar(char);
                            window.dispatchEvent(new Event('activity_logs_updated'));
                          }
                        }}
                        placeholder={activeUsername.charAt(0).toUpperCase()}
                        className="flex-1 min-w-[32px] h-7 rounded-lg bg-transparent text-center font-black border-none focus:outline-none text-xs"
                        style={{ color: interfaceStyles.inputText }}
                      />
                    </div>

                    {/* Background Picker */}
                    <div className="w-full mt-3.5 pt-2.5 border-t max-w-[260px] mx-auto" style={{ borderColor: interfaceStyles.borderColor }}>
                      <span className="text-[9px] font-black uppercase tracking-wider opacity-70 block mb-1.5" style={{ color: interfaceStyles.color }}>
                        {getCurrentLanguage() === 'pt' ? 'BACKGROUND DA FOTO' : 'PHOTO BACKGROUND'}
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'auto');
                            setAvatarBg('auto');
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold border transition-all cursor-pointer ${
                            avatarBg === 'auto' ? 'border-blue-500 bg-blue-500/10' : 'opacity-70 hover:opacity-100'
                          }`}
                          style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
                        >
                          Auto
                        </button>
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'sunset');
                            setAvatarBg('sunset');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'sunset' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #f97316, #ec4899)' }}
                          title="Sunset"
                        />
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'ocean');
                            setAvatarBg('ocean');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'ocean' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                          title="Ocean"
                        />
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'forest');
                            setAvatarBg('forest');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'forest' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                          title="Forest"
                        />
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'amber');
                            setAvatarBg('amber');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'amber' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                          title="Amber"
                        />
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'dark');
                            setAvatarBg('dark');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'dark' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)' }}
                          title="Dark"
                        />
                        <button
                          onClick={() => {
                            localStorage.setItem(`novel_reader_avatar_bg_${activeUsername}`, 'purple');
                            setAvatarBg('purple');
                          }}
                          className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                            avatarBg === 'purple' ? 'ring-2 ring-blue-500' : 'border-transparent hover:scale-110'
                          }`}
                          style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)' }}
                          title="Purple"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {isEditingName ? (
                  <form 
                    onSubmit={handleRenameProfile}
                    className="flex items-center gap-1.5 mt-2"
                  >
                    <input 
                      type="text"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      className="px-2.5 py-1 border rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                      style={{
                        backgroundColor: interfaceStyles.inputBackground,
                        borderColor: interfaceStyles.borderColor,
                        color: interfaceStyles.inputText
                      }}
                      autoFocus
                    />
                    <button 
                      type="submit"
                      className="p-1 rounded-lg text-green-500 hover:bg-black/5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 rounded-lg text-red-500 hover:bg-black/5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <h4 className="text-sm font-black tracking-tight" style={{ color: interfaceStyles.color }}>
                      {activeUsername}
                    </h4>
                    <button 
                      onClick={() => {
                        setRenameInput(activeUsername);
                        setIsEditingName(true);
                      }}
                      className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-xs flex-shrink-0"
                      title={getTranslation('renameProfile') || 'Renomear perfil'}
                    >
                      <Edit className="w-3 h-3 opacity-65 hover:opacity-100" style={{ color: interfaceStyles.accent }} />
                    </button>
                  </div>
                )}
                <span className="text-[9px] opacity-60 font-bold block mt-1 uppercase tracking-wider" style={{ color: interfaceStyles.textSecondary }}>
                  {getLocalTranslation('memberSinceLabel') || 'Membro desde Agosto 2026'}
                </span>
              </div>

              {/* Statistics Grid */}
              <div 
                className="grid grid-cols-3 gap-2 p-3 rounded-xl border text-center"
                style={{
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor,
                  color: interfaceStyles.color
                }}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[8px] opacity-70 font-bold uppercase tracking-wider mb-0.5" style={{ color: interfaceStyles.textSecondary }}>
                    {getLocalTranslation('booksCount')}
                  </span>
                  <span className="text-sm font-black" style={{ color: interfaceStyles.accent }}>
                    {books.length}
                  </span>
                </div>
                <div className="flex flex-col items-center border-x px-1" style={{ borderColor: interfaceStyles.borderColor }}>
                  <span className="text-[8px] opacity-70 font-bold uppercase tracking-wider mb-0.5" style={{ color: interfaceStyles.textSecondary }}>
                    {getLocalTranslation('bookmarksCount')}
                  </span>
                  <span className="text-sm font-black" style={{ color: interfaceStyles.accent }}>
                    {bookmarksCount}
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] opacity-70 font-bold uppercase tracking-wider mb-0.5" style={{ color: interfaceStyles.textSecondary }}>
                    {getLocalTranslation('notesCount')}
                  </span>
                  <span className="text-sm font-black" style={{ color: interfaceStyles.accent }}>
                    {notesCount}
                  </span>
                </div>
              </div>

              {/* Quick Profile Switching Workspace */}
              <div className="space-y-2.5">
                <div className="text-[9px] font-bold uppercase tracking-widest opacity-70 px-0.5" style={{ color: interfaceStyles.textSecondary }}>
                  {getLocalTranslation('changeUser') || 'Alternar de Usuário'}
                </div>

                {/* Profiles lists stack */}
                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                  {usedUsernames.map((u) => {
                    const isCurrent = u === activeUsername;
                    return (
                      <button
                        key={u}
                        disabled={isCurrent}
                        type="button"
                        onClick={async () => {
                          if (isCurrent) return;
                          setIsSwitchingProfile(true);
                          try {
                            await switchUserSession(u);
                            window.location.reload();
                          } catch (err) {
                            console.error(err);
                            setIsSwitchingProfile(false);
                          }
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all duration-200 border text-left cursor-pointer hover:opacity-90"
                        style={{ 
                          color: interfaceStyles.color,
                          backgroundColor: isCurrent ? `${interfaceStyles.accent}20` : 'transparent',
                          borderColor: isCurrent ? interfaceStyles.accent : 'transparent'
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          <span 
                            className="w-4 h-4 rounded-md flex items-center justify-center font-bold text-white text-[8px]"
                            style={{ background: `linear-gradient(135deg, ${interfaceStyles.accent}, #6366f1)` }}
                          >
                            {u.charAt(0).toUpperCase()}
                          </span>
                          <span className="truncate max-w-[130px] font-bold">{u}</span>
                        </span>
                        {isCurrent ? (
                          <span 
                            className="text-[8px] px-2 py-0.5 rounded font-black uppercase"
                            style={{ 
                              color: interfaceStyles.accent, 
                              backgroundColor: `${interfaceStyles.accent}25` 
                            }}
                          >
                            {getLocalTranslation('activeBadge') || 'ATIVO'}
                          </span>
                        ) : (
                          <span className="text-[8px] opacity-70 font-bold uppercase" style={{ color: interfaceStyles.textSecondary }}>
                            {getLocalTranslation('accessButton') || 'Acessar'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Create profile fast input */}
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newProfileInput.trim()) return;
                    const cleanName = newProfileInput.trim().replace(/[\\/:*?"<>|]/g, "_");
                    setIsSwitchingProfile(true);
                    try {
                      await switchUserSession(cleanName);
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                      setIsSwitchingProfile(false);
                    }
                  }}
                  className="flex gap-1.5"
                >
                  <input
                    type="text"
                    placeholder={getLocalTranslation('createNewProfilePlaceholder')}
                    required
                    value={newProfileInput}
                    onChange={(e) => setNewProfileInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none font-semibold focus:ring-1 focus:ring-blue-500"
                    style={{
                      backgroundColor: interfaceStyles.inputBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.inputText
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSwitchingProfile || !newProfileInput.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs text-white hover:opacity-95 font-bold transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
                    style={{ backgroundColor: interfaceStyles.accent }}
                  >
                    {isSwitchingProfile ? "..." : getLocalTranslation('create')}
                  </button>
                </form>

                {/* Recent Activities Section */}
                <div 
                  className="pt-3 border-t mt-1.5" 
                  style={{ borderColor: interfaceStyles.borderColor }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider opacity-70" style={{ color: interfaceStyles.textSecondary }}>
                      {getTranslation('recentActivities')}
                    </span>
                    <button
                      onClick={() => {
                        setHistoryTab('logs');
                        setIsProfileDrawerOpen(false);
                        setActiveMainTab('history');
                      }}
                      className="text-[10px] font-bold hover:underline flex items-center gap-0.5 cursor-pointer bg-transparent border-0 p-0"
                      style={{ color: interfaceStyles.accent }}
                    >
                      {getTranslation('viewMore')} →
                    </button>
                  </div>
                  
                  {activityLogs.length === 0 ? (
                    <div className="text-[10px] opacity-60 py-1.5 px-1 font-semibold italic text-center" style={{ color: interfaceStyles.textSecondary }}>
                      {getTranslation('noRecentActivity')}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {activityLogs.slice(0, 3).map((log) => {
                        const localeMap: Record<string, string> = {
                          pt: 'pt-BR', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
                          ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN',
                          tr: 'tr-TR', sw: 'sw-KE', bn: 'bn-BD', id: 'id-ID', yo: 'yo-NG', nl: 'nl-NL',
                          th: 'th-TH', ur: 'ur-PK'
                        };
                        const currentLang = getCurrentLanguage();
                        const activeLocale = localeMap[currentLang] || currentLang || 'en-US';
                        const dateObj = new Date(log.timestamp);
                        const formattedDate = dateObj.toLocaleDateString(activeLocale, {
                          month: 'numeric',
                          day: 'numeric'
                        });
                        const formattedTime = dateObj.toLocaleTimeString(activeLocale, {
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        return (
                          <div 
                            key={log.id} 
                            className="p-1.5 rounded-lg text-[10px] leading-tight font-semibold border flex flex-col gap-0.5"
                            style={{ 
                              backgroundColor: interfaceStyles.panelSecondaryBackground,
                              borderColor: interfaceStyles.borderColor,
                              color: interfaceStyles.color
                            }}
                          >
                            <div className="opacity-90 font-medium">
                              {translateLog(log, currentLang)}
                            </div>
                            <span className="text-[8px] opacity-60 font-bold self-end" style={{ color: interfaceStyles.textSecondary }}>
                              {formattedDate} {formattedTime}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </aside>
        </div>
      )}

      {/* Book Uploader Modal */}
      {isUploaderOpen && (
        <BookUploader
          onBookAdded={handleBookAdded}
          onClose={() => setIsUploaderOpen(false)}
        />
      )}

      {/* Home Page Settings Panel */}
      {showHomePageSettings && preferences && (
        <HomePageSettings
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          onClose={() => setShowHomePageSettings(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {bookToDelete && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 animate-fade-in backdrop-blur-sm">
          <div 
            className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in border"
            style={{
              backgroundColor: interfaceStyles.backgroundColor,
              color: interfaceStyles.color,
              borderColor: interfaceStyles.borderColor
            }}
          >
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                {getTranslation('delete')}
              </h3>
              <p className="mb-6 opacity-80">
                {getTranslation('confirmDeleteBook')}
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={cancelDeleteBook}
                  className="px-4 py-2 rounded-lg font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {getTranslation('cancel')}
                </button>
                <button
                  onClick={confirmDeleteBook}
                  className="px-4 py-2 rounded-lg font-medium bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm"
                >
                  {getTranslation('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full Book Translator Modal */}
      {translatingBook && (
        <BookTranslatorModal
          book={translatingBook}
          onClose={() => setTranslatingBook(null)}
          preferences={preferences}
        />
      )}

      {/* Weather Effects (Rain, Aurora petals, Snow) in Library Interface */}
      {isActive && (
        <>
          {(preferences?.interfaceRainEnabled && (preferences.interfaceRainMode === 'interface' || preferences.interfaceRainMode === 'both')) ? (
            <RainEffect 
              key="independent-rain"
              density={preferences.interfaceRainAmount ?? 15} 
              speed={preferences.interfaceRainSpeed ?? 50} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : preferences?.selectedInterfaceTheme === 'rain' ? (
            <RainEffect 
              key="rain-effect"
              density={preferences.snowDensity ?? 10} 
              speed={preferences.snowSpeed ?? 100} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : null}

          {(preferences?.interfacePetalsEnabled && (preferences.interfacePetalsMode === 'interface' || preferences.interfacePetalsMode === 'both')) ? (
            <PetalEffect 
              key="independent-petals"
              density={preferences.interfacePetalsAmount ?? 15} 
              speed={preferences.interfacePetalsSpeed ?? 50} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : preferences?.selectedInterfaceTheme === 'aurora' ? (
            <PetalEffect 
              key="aurora-effect"
              density={preferences.snowDensity ?? 10} 
              speed={preferences.snowSpeed ?? 100} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : null}

          {(preferences?.interfaceSnowyEnabled && (preferences.interfaceSnowyMode === 'interface' || preferences.interfaceSnowyMode === 'both')) ? (
            <SnowEffect 
              key="independent-snow"
              density={preferences.interfaceSnowyAmount ?? 15} 
              speed={preferences.interfaceSnowySpeed ?? 50} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : (preferences?.selectedInterfaceTheme === 'snow' || (preferences?.glassEnabled && preferences?.menuSubTheme === 'snowy')) ? (
            <SnowEffect 
              key="snow-effect"
              density={preferences.snowDensity ?? 10} 
              speed={preferences.snowSpeed ?? 100} 
              isDefocused={false} 
              position="fixed" 
            />
          ) : null}
        </>
      )}

      {/* User Profile Switcher Modal */}
      {isProfileModalOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div 
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in border max-h-[90vh] flex flex-col"
            style={{
              backgroundColor: interfaceStyles.panelBackground,
              color: interfaceStyles.color,
              borderColor: interfaceStyles.borderColor
            }}
          >
            {/* Header */}
            <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: interfaceStyles.borderColor }}>
              <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: interfaceStyles.color }}>
                <User className="w-5 h-5" style={{ color: interfaceStyles.accent }} />
                Gerenciar Perfil e Contas
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ color: interfaceStyles.textSecondary }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* SECTION 1: RENAME CURRENT PROFILE */}
              <div 
                className="p-4 rounded-xl border space-y-3"
                style={{
                  backgroundColor: interfaceStyles.panelSecondaryBackground,
                  borderColor: interfaceStyles.borderColor
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm"
                      style={{ background: getAvatarBgStyle() }}
                    >
                      {userAvatar}
                    </div>
                    <div>
                      <div className="text-xs uppercase font-bold tracking-wider" style={{ color: interfaceStyles.accent }}>
                        Perfil Ativo Atual
                      </div>
                      <div className="text-base font-black" style={{ color: interfaceStyles.color }}>
                        {activeUsername}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase" style={{ backgroundColor: `${interfaceStyles.accent}20`, color: interfaceStyles.accent }}>
                    {books.length} {books.length === 1 ? 'Livro' : 'Livros'}
                  </span>
                </div>

                <div className="text-xs opacity-75" style={{ color: interfaceStyles.textSecondary }}>
                  Renomear este perfil mantém 100% de seus livros, marcadores, notas, histórico e configurações intactos.
                </div>

                <form
                  onSubmit={(e) => handleRenameProfile(e, renameInput)}
                  className="flex gap-2 items-center pt-1"
                >
                  <input
                    type="text"
                    required
                    placeholder="Novo nome para este perfil..."
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: interfaceStyles.inputBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.inputText
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSwitchingProfile || !renameInput.trim() || renameInput.trim() === activeUsername}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-opacity disabled:opacity-40 cursor-pointer shrink-0"
                    style={{ backgroundColor: interfaceStyles.accent }}
                  >
                    {isSwitchingProfile ? "Salvando..." : "Salvar Nome"}
                  </button>
                </form>
              </div>

              {/* SECTION 2: SWITCH TO OTHER PROFILES */}
              {usedUsernames.filter(u => u !== activeUsername).length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: interfaceStyles.textSecondary }}>
                    Alternar para Outra Conta
                  </label>
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {usedUsernames.filter(u => u !== activeUsername).map((u) => (
                      <div
                        key={u}
                        className="flex items-center justify-between p-2.5 rounded-xl border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                        style={{
                          backgroundColor: interfaceStyles.panelSecondaryBackground,
                          borderColor: interfaceStyles.borderColor
                        }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span 
                            className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px] shrink-0"
                            style={{ background: `linear-gradient(135deg, ${interfaceStyles.accent}, #6366f1)` }}
                          >
                            {u.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-bold text-xs truncate max-w-[180px]" style={{ color: interfaceStyles.color }}>{u}</span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isSwitchingProfile}
                            onClick={async () => {
                              setIsSwitchingProfile(true);
                              try {
                                await switchUserSession(u);
                                window.location.reload();
                              } catch (err) {
                                console.error(err);
                                setIsSwitchingProfile(false);
                              }
                            }}
                            className="px-3 py-1 rounded-lg text-xs font-bold text-white cursor-pointer hover:opacity-90"
                            style={{ backgroundColor: interfaceStyles.accent }}
                          >
                            Acessar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(u)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            title={getTranslation('deleteProfile') || 'Excluir perfil'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 3: CREATE NEW SEPARATE PROFILE */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
                <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: interfaceStyles.textSecondary }}>
                  Criar Nova Conta Separada (Biblioteca em Branco)
                </label>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newProfileInput.trim()) return;
                    const profileName = newProfileInput.trim().replace(/[\\/:*?"<>|]/g, "_");
                    setIsSwitchingProfile(true);
                    try {
                      await switchUserSession(profileName);
                      window.location.reload();
                    } catch (err) {
                      console.error("Error switching profile:", err);
                      setIsSwitchingProfile(false);
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    required
                    placeholder={getLocalTranslation('createNewProfilePlaceholder')}
                    value={newProfileInput}
                    onChange={(e) => setNewProfileInput(e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      backgroundColor: interfaceStyles.inputBackground,
                      borderColor: interfaceStyles.borderColor,
                      color: interfaceStyles.inputText
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSwitchingProfile || !newProfileInput.trim()}
                    className="px-4 py-2 rounded-xl text-xs font-bold border hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer shrink-0"
                    style={{
                      borderColor: interfaceStyles.borderColor,
                      backgroundColor: interfaceStyles.panelSecondaryBackground,
                      color: interfaceStyles.color
                    }}
                  >
                    {isSwitchingProfile ? "..." : getLocalTranslation('create')}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                style={{ color: interfaceStyles.color }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
