import { openDB, type IDBPDatabase } from 'idb';
import JSZip from 'jszip';
import { logActivity } from './activity-logger';
import { INTERFACE_THEMES, getInterfaceTheme, COLOR_THEMES, getColorTheme, applyPreferencesTheme } from './themes';
import type { Book, ReadingPreferences, Bookmark, ReadingStats } from '../types';

const DB_NAME = 'EBookReaderDB';
const DB_VERSION = 4; // Incremented for reading sessions

let db: IDBPDatabase | null = null;

export const getUsername = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('novel_reader_username');
    if (stored) return stored;
    const used = getUsedUsernames();
    if (used.length > 0) {
      const fallback = used[0];
      localStorage.setItem('novel_reader_username', fallback);
      return fallback;
    }
    return '';
  }
  return '';
};

export const RESERVED_USERNAMES = [
  'default',
  'shared_books',
  'shared_covers',
  'covers',
  'books',
  'userdata',
  '_shared_storage'
];

export const isReservedUsername = (username?: string | null): boolean => {
  if (!username) return true;
  const clean = username.trim().toLowerCase();
  return !clean || RESERVED_USERNAMES.includes(clean) || clean.startsWith('.');
};

export const getUsedUsernames = (): string[] => {
  if (typeof window !== 'undefined') {
    try {
      const data = localStorage.getItem('novel_reader_used_usernames');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => typeof p === 'string' && !isReservedUsername(p));
        }
      }
    } catch (e) {
      console.error(e);
    }
  }
  return [];
};

export const getProfilesList = async (): Promise<string[]> => {
  try {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.profiles)) {
        const profiles = data.profiles.filter((p: string) => typeof p === 'string' && !isReservedUsername(p));
        if (typeof window !== 'undefined') {
          localStorage.setItem('novel_reader_used_usernames', JSON.stringify(profiles));
        }
        return profiles;
      }
    }
  } catch (err) {
    // Fallback gracefully without throwing or logging noisy network errors
  }
  return getUsedUsernames();
};

export interface OtherUserBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  fileType: string;
  totalChapters?: number;
  uploadedBy: string;
  coverUrl?: string;
}

export const getOtherUsersBooks = async (): Promise<OtherUserBook[]> => {
  try {
    const currentUsername = getUsername() || 'default';
    const res = await fetch(`/api/other-users-books?username=${encodeURIComponent(currentUsername)}`, {
      headers: { 'X-Username': currentUsername }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.books)) {
        return data.books;
      }
    }
  } catch (err) {
    // Fallback gracefully without throwing or logging noisy network errors
  }
  return [];
};

export const setUsername = (username: string) => {
  if (typeof window !== 'undefined') {
    const cleaned = (username.trim() || '').replace(/[\\/:*?"<>|]/g, "_");
    if (cleaned && !isReservedUsername(cleaned)) {
      localStorage.setItem('novel_reader_username', cleaned);
      
      // Add to list of used usernames if not already present
      const used = getUsedUsernames();
      if (!used.some(u => u.toLowerCase() === cleaned.toLowerCase())) {
        used.push(cleaned);
        localStorage.setItem('novel_reader_used_usernames', JSON.stringify(used));
      }
    } else if (!cleaned) {
      localStorage.removeItem('novel_reader_username');
    }
  }
};

export const renameUserProfile = async (oldName: string, newName: string): Promise<boolean> => {
  const currentActive = getUsername();
  const cleanOld = (oldName || currentActive || 'default').trim().replace(/[\\/:*?"<>|]/g, "_") || "default";
  const cleanNew = (newName || '').trim().replace(/[\\/:*?"<>|]/g, "_");

  if (!cleanNew || isReservedUsername(cleanNew) || isReservedUsername(cleanOld)) return false;
  if (cleanOld === cleanNew) return true;

  // Cancel any pending debounced auto-backup with the old name
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 1. Snapshot current user data to server under old name first (excluding heavy binaries for instant speed)
  try {
    const currentData = await getUserDataPayload(true);
    if (currentData && currentData.localStorage) {
      currentData.localStorage.novel_reader_username = cleanNew;
    }
    await fetch(`/api/userdata?username=${encodeURIComponent(cleanOld)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': cleanOld
      },
      body: JSON.stringify(currentData)
    });
  } catch (e) {
    console.warn('Could not save snapshot before rename:', e);
  }

  // 2. Call server to rename the profile directory
  try {
    const res = await fetch('/api/rename-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName: cleanOld, newName: cleanNew })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('Server rename failed, continuing with local migration:', errData.error);
    }
  } catch (netErr) {
    console.warn('Server offline or unreachable, continuing with local migration:', netErr);
  }

  // 3. Migrate all books in local IndexedDB so ownership moves cleanly to cleanNew
  try {
    const database = await initDB();
    const allBooks = await database.getAll('books');
    for (const b of allBooks) {
      if (b) {
        if (!b.metadata) b.metadata = {};
        if (!b.metadata.uploadedBy || b.metadata.uploadedBy.toLowerCase() === cleanOld.toLowerCase()) {
          b.metadata.uploadedBy = cleanNew;
        }
        await database.put('books', b);
      }
    }
  } catch (dbErr) {
    console.warn('Could not update books in IndexedDB during rename:', dbErr);
  }

  // 4. Migrate cached preferences in localStorage
  try {
    const oldCachedPref = getCachedPreferences(cleanOld);
    if (oldCachedPref) {
      setCachedPreferencesItem(oldCachedPref, cleanNew);
      localStorage.removeItem(`novel_reader_preferences_${cleanOld}`);
    }
  } catch (prefErr) {
    console.warn('Could not migrate cached preferences:', prefErr);
  }

  // 5. Migrate all localStorage items tied to oldName
  if (typeof window !== 'undefined') {
    const storageKeysToMigrate = [
      'novel_reader_notes',
      'novel_reader_trash_notes',
      'novel_reader_trash_bookmarks',
      'novel_reader_favorites',
      'novel_reader_avatar',
      'novel_reader_avatar_bg',
      'activity_logs'
    ];

    for (const baseKey of storageKeysToMigrate) {
      const oldKey = `${baseKey}_${cleanOld}`;
      const newKey = `${baseKey}_${cleanNew}`;
      const val = localStorage.getItem(oldKey);
      if (val !== null) {
        localStorage.setItem(newKey, val);
        localStorage.removeItem(oldKey);
      }
    }

    // 6. Update used usernames list uniquely (de-duplicated case-insensitively)
    const rawUsed = getUsedUsernames();
    const usedSet = new Set(rawUsed.map(u => u.trim()).filter(Boolean));
    usedSet.delete(cleanOld);
    for (const u of usedSet) {
      if (u.toLowerCase() === cleanNew.toLowerCase()) {
        usedSet.delete(u);
      }
    }
    usedSet.add(cleanNew);
    localStorage.setItem('novel_reader_used_usernames', JSON.stringify(Array.from(usedSet)));

    // 7. Update active username in localStorage
    localStorage.setItem('novel_reader_username', cleanNew);
  }

  // 8. Save an immediate snapshot under the new name
  try {
    const updatedData = await getUserDataPayload(true);
    await fetch(`/api/userdata?username=${encodeURIComponent(cleanNew)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Username': cleanNew
      },
      body: JSON.stringify(updatedData)
    });
  } catch (e) {
    console.warn('Could not save snapshot after rename:', e);
  }

  return true;
};

export const deleteUserProfile = async (username: string): Promise<boolean> => {
  const clean = (username.trim() || '').replace(/[\\/:*?"<>|]/g, "_");
  if (!clean || isReservedUsername(clean)) return false;

  try {
    const res = await fetch('/api/delete-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: clean })
    });

    if (res.ok && typeof window !== 'undefined') {
      const used = getUsedUsernames().filter(u => u !== clean);
      localStorage.setItem('novel_reader_used_usernames', JSON.stringify(used));

      const storageKeysToClean = [
        'novel_reader_notes',
        'novel_reader_trash_notes',
        'novel_reader_trash_bookmarks',
        'novel_reader_favorites',
        'novel_reader_avatar',
        'novel_reader_avatar_bg',
        'activity_logs'
      ];
      for (const baseKey of storageKeysToClean) {
        localStorage.removeItem(`${baseKey}_${clean}`);
      }
      localStorage.removeItem(getPreferencesCacheKey(clean));
      localStorage.removeItem(`user_snapshot_${clean}`);
      userPreferencesCache.delete(clean.toLowerCase());
      return true;
    }
  } catch (e) {
    console.error('Failed to delete profile:', e);
  }
  return false;
};

export const switchUserSession = async (newUsername: string): Promise<boolean> => {
  const cleanNew = (newUsername || '').trim().replace(/[\\/:*?"<>|]/g, "_");
  if (!cleanNew || isReservedUsername(cleanNew)) {
    return false;
  }

  // Flush any pending user config synchronization for current user first
  await flushPendingUserConfigSync();

  const currentUsername = getUsername();

  // Cancel any pending debounced auto-backup for the previous user
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 0. Backup current user data and preferences before switching
  if (currentUsername && currentUsername !== cleanNew && !isReservedUsername(currentUsername)) {
    try {
      const currentPrefs = getCachedPreferences(currentUsername);
      if (currentPrefs) {
        setCachedPreferencesItem(currentPrefs, currentUsername);
        await fetch(`/api/userconfig?username=${encodeURIComponent(currentUsername)}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Username': currentUsername
          },
          body: JSON.stringify({ preferences: currentPrefs })
        }).catch(() => {});
      }

      const currentData = await getUserDataPayload(true);
      if (currentData) {
        try {
          localStorage.setItem(`user_snapshot_${currentUsername}`, JSON.stringify(currentData));
        } catch {
          // Ignore local storage quota errors on snapshot
        }
      }

      await fetch(`/api/userdata?username=${encodeURIComponent(currentUsername)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': currentUsername
        },
        body: JSON.stringify(currentData)
      });
      console.log(`Saved session snapshot for user "${currentUsername}" before switching.`);
    } catch (backupErr) {
      console.warn(`Could not save snapshot for user "${currentUsername}":`, backupErr);
    }
  }

  setUsername(cleanNew);

  // Clear in-memory caches to prevent cross-contamination
  bookBase64Cache.clear();
  coverBase64Cache.clear();
  userPreferencesCache.clear();

  // 1. Fetch user config and data BEFORE wiping local database to prevent offline data loss
  let targetConfig: any = null;
  let targetUserData: any = null;

  try {
    const res = await fetch(`/api/userconfig?username=${encodeURIComponent(cleanNew)}`, {
      headers: { 'X-Username': cleanNew }
    });
    if (res.ok) {
      targetConfig = await res.json();
    }
  } catch (configErr) {
    console.warn(`Server userconfig unreachable for user "${cleanNew}":`, configErr);
  }

  try {
    const res = await fetch(`/api/userdata?username=${encodeURIComponent(cleanNew)}`, {
      headers: { 'X-Username': cleanNew }
    });
    if (res.ok) {
      targetUserData = await res.json();
    }
  } catch (dataErr) {
    console.warn(`Server userdata unreachable for user "${cleanNew}":`, dataErr);
  }

  // Fallback to local snapshot if server userdata was not retrieved
  if (!targetUserData || targetUserData.status === 'empty' || !targetUserData.database) {
    try {
      const snap = localStorage.getItem(`user_snapshot_${cleanNew}`);
      if (snap) {
        targetUserData = JSON.parse(snap);
      }
    } catch {
      // Ignore JSON parse errors on stored snapshot
    }
  }

  setUsername(cleanNew);

  try {
    const database = await initDB();
    const storeNames = ['books', 'preferences', 'bookmarks', 'stats', 'chapters', 'covers', 'navigation', 'readingSessions'];
    for (const store of storeNames) {
      if (database.objectStoreNames.contains(store)) {
        await database.clear(store);
      }
    }
    // Also reset uploadedBooks tracking Set
    uploadedBooks.clear();

    let newPrefs: ReadingPreferences | null = null;
    if (targetConfig && targetConfig.preferences) {
      newPrefs = ensurePreferencesDefaults(targetConfig.preferences);
    } else {
      newPrefs = getCachedPreferences(cleanNew);
    }

    if (!newPrefs) {
      newPrefs = { ...DEFAULT_PREFERENCES };
    }

    await database.put('preferences', { id: 'default', ...newPrefs });
    setCachedPreferencesItem(newPrefs, cleanNew);
    applyPreferencesTheme(newPrefs);

    // Also persist userconfig.json for target user immediately
    debouncedSyncUserConfig(cleanNew, newPrefs);

    if (targetUserData && targetUserData.status !== 'empty' && targetUserData.database) {
      console.log(`Restoring UserData automatically for user "${cleanNew}"...`);
      await importUserData(targetUserData, true);
    }
  } catch (err) {
    console.error('Error clearing/restoring database on session switch:', err);
  }

  // Guarantee that active username in localStorage is preserved as cleanNew
  setUsername(cleanNew);
  return true;
};

// Define default preferences constant with proper interface theme
export const DEFAULT_PREFERENCES: ReadingPreferences = {
  fontSize: 38, // Updated default
  fontFamily: 'Arial',
  lineHeight: 1.6, // Updated default
  marginSize: 0.5, // Updated default (Letter Spacing)
  theme: 'light',
  maxWidth: 'custom',
  hideMenuWhileReading: true,
  colors: {
    textColor: '#000000',
    backgroundColor: '#ffffff'
  },
  interfaceTheme: 'light',
  snowDensity: 10, // Default 10%
  snowSpeed: 100, // Default 100%
  interfaceColors: INTERFACE_THEMES[0].colors, // Use the actual light theme colors
  scrollButtons: {
    visible: false,
    size: 'medium',
    customSize: 48
  },
  cornerNavigation: {
    visible: false
  },
  selectedColorTheme: 'light',
  selectedInterfaceTheme: 'light',
  snowSubTheme: 'midnight',
  snowInReaderArea: true,
  sideBordersEnabled: false,
  sideBordersWidth: 35,
  sideBordersColor: 'original',
  sideBordersEffect: 'none',
  sideBordersSnowAmount: 15,
  sideBordersThunderAmount: 0,
  sideBordersPulseAmount: 50,
  applyRetroFont: false,
  useThemeBasedColors: true,
  syncInterfaceWithReading: true, // Default enabled
  applyFontGlobally: false,
  interfaceSnowyEnabled: false,
  interfaceSnowyMode: 'interface',
  interfaceSnowyAmount: 15,
  interfaceSnowySpeed: 50,
  interfacePetalsEnabled: false,
  interfacePetalsMode: 'interface',
  interfacePetalsAmount: 15,
  interfacePetalsSpeed: 50,
  interfaceRainEnabled: false,
  interfaceRainMode: 'interface',
  interfaceRainAmount: 15,
  interfaceRainSpeed: 50,
  interfaceEffectsMinimized: false,
  menuStyle: 'classic',
  menuSubTheme: 'default',
  neonCustomColor: '',
  glassTintColor: '#3b82f6',
  glassReaderBackdropVariation: false,
  // Additional reading controls
  enablePageTurning: false,
  enableReadingProgress: true,
  enableNightMode: false,
  enableFocusMode: false,
  enableTextToSpeech: false, // Default to false
  enableFastFavorite: false,
  fastFavoriteName: 'Quick Bookmark',
  paragraphSpacing: 1.5,
  syncAllBookmarks: false,
  showTopBarInFullScreen: true,
  fixedTopBar: true,
  markReadText: true,
  markReadStyle: 'underline',
  // Icon visibility controls
  iconVisibility: {
    showSearchIcon: true,
    showBookmarkIcon: true, // Default to true
    showFavoriteIcon: true,
    showShareIcon: false, // Changed to false
    showFullscreenIcon: false, // Changed to false
    showShortcutsIcon: true // Changed to true
  },
  bookmarkHighlight: {
    color: '#fef08a',
    style: 'highlight'
  },
  bookmarksSettingsExpanded: false,
  shortcuts: {
    nextChapter: ['ArrowRight'],
    previousChapter: ['ArrowLeft'],
    toggleMenu: ['m'],
    toggleSettings: ['s'],
    toggleFullscreen: ['F11'],
    search: ['/'],
    increaseFontSize: ['='],
    decreaseFontSize: ['-']
  },
  glassEnabled: false,
  glassReaderArea: false,
  glassReaderOpacity: 65,
  glassReaderBlur: 16,
  glassReaderAreaOnly: false,
  imageScale: 100,
  imageReadingMode: 'paginated',
  showPdfImages: true
};

export const ensurePreferencesDefaults = (prefs: Partial<ReadingPreferences> | null | undefined): ReadingPreferences => {
  if (!prefs) return { ...DEFAULT_PREFERENCES };
  return {
    ...DEFAULT_PREFERENCES,
    ...prefs,
    scrollButtons: {
      ...DEFAULT_PREFERENCES.scrollButtons,
      ...(prefs.scrollButtons || {})
    },
    cornerNavigation: {
      ...DEFAULT_PREFERENCES.cornerNavigation,
      ...(prefs.cornerNavigation || {})
    },
    iconVisibility: {
      ...DEFAULT_PREFERENCES.iconVisibility,
      ...(prefs.iconVisibility || {})
    },
    bookmarkHighlight: {
      ...DEFAULT_PREFERENCES.bookmarkHighlight,
      ...(prefs.bookmarkHighlight || {})
    },
    shortcuts: {
      ...DEFAULT_PREFERENCES.shortcuts,
      ...(prefs.shortcuts || {})
    },
    colors: {
      ...DEFAULT_PREFERENCES.colors,
      ...(prefs.colors || {})
    },
    interfaceColors: {
      ...DEFAULT_PREFERENCES.interfaceColors,
      ...(prefs.interfaceColors || {})
    }
  };
};

export const initDB = async () => {
  if (db) return db;
  
  try {
    db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Books store
        if (!db.objectStoreNames.contains('books')) {
          const booksStore = db.createObjectStore('books', { keyPath: 'id' });
          booksStore.createIndex('title', 'title');
          booksStore.createIndex('author', 'author');
          booksStore.createIndex('lastRead', 'lastRead');
        }

        // Preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'id' });
        }

        // Bookmarks store
        if (!db.objectStoreNames.contains('bookmarks')) {
          const bookmarksStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
          bookmarksStore.createIndex('bookId', 'bookId');
          bookmarksStore.createIndex('createdAt', 'createdAt');
        }

        // Reading stats store
        if (!db.objectStoreNames.contains('stats')) {
          db.createObjectStore('stats', { keyPath: 'id' });
        }

        // Chapter content cache
        if (!db.objectStoreNames.contains('chapters')) {
          const chaptersStore = db.createObjectStore('chapters', { keyPath: 'id' });
          chaptersStore.createIndex('bookId', 'bookId');
        }

        // Cover images store
        if (!db.objectStoreNames.contains('covers')) {
          const coversStore = db.createObjectStore('covers', { keyPath: 'bookId' });
          coversStore.createIndex('createdAt', 'createdAt');
        }

        // Navigation history store
        if (!db.objectStoreNames.contains('navigation')) {
          const navStore = db.createObjectStore('navigation', { keyPath: 'id' });
          navStore.createIndex('bookId', 'bookId');
          navStore.createIndex('timestamp', 'timestamp');
        }

        // Reading sessions store (new in version 4)
        if (!db.objectStoreNames.contains('readingSessions')) {
          const sessionsStore = db.createObjectStore('readingSessions', { keyPath: 'id' });
          sessionsStore.createIndex('bookId', 'bookId');
          sessionsStore.createIndex('startTime', 'startTime');
          sessionsStore.createIndex('chapterIndex', 'chapterIndex');
        }

        // Error logs store
        if (!db.objectStoreNames.contains('errorLogs')) {
          const errorStore = db.createObjectStore('errorLogs', { keyPath: 'id', autoIncrement: true });
          errorStore.createIndex('type', 'type');
          errorStore.createIndex('timestamp', 'timestamp');
        }
      },
    });

    // Log successful initialization
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Database initialization failed:', error);
    // Create error log entry
    logError('DB_INIT_FAILED', error);
    throw error;
  }
};

// Error logging function
export const logError = async (type: string, error: any, context?: any) => {
  // Throttle error logging to prevent spam
  const errorKey = `${type}-${error?.message || error}`;
  
  try {
    const lastLogged = sessionStorage.getItem(`lastError-${errorKey}`);
    const now = Date.now();
    
    if (lastLogged && (now - parseInt(lastLogged)) < 5000) {
      return; // Don't log the same error within 5 seconds
    }
    
    sessionStorage.setItem(`lastError-${errorKey}`, now.toString());
  } catch {
    // Ignore sessionStorage errors (e.g., in iframes with blocked cookies)
    console.warn('Could not access sessionStorage for error throttling');
  }
  
  const errorLog = {
    type,
    error: error?.message || error,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  console.error('Error logged:', errorLog);
  
  try {
    const database = await initDB();
    await database.put('errorLogs', errorLog);
  } catch (logError) {
    console.error('Failed to log error to database:', logError);
  }
};

// Sync userconfig to server with immediate flush support
let userConfigSyncTimer: any = null;
let pendingUserConfig: { username: string; preferences: ReadingPreferences } | null = null;

export const flushPendingUserConfigSync = async () => {
  if (userConfigSyncTimer) {
    clearTimeout(userConfigSyncTimer);
    userConfigSyncTimer = null;
  }
  if (pendingUserConfig) {
    const { username, preferences } = pendingUserConfig;
    pendingUserConfig = null;
    try {
      await fetch(`/api/userconfig?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({ preferences })
      });
    } catch (configSaveErr) {
      console.warn('Failed to sync userconfig.json to server:', configSaveErr);
    }
  }
};

export const debouncedSyncUserConfig = (username: string, preferences: ReadingPreferences) => {
  pendingUserConfig = { username, preferences };
  if (userConfigSyncTimer) clearTimeout(userConfigSyncTimer);
  userConfigSyncTimer = setTimeout(() => {
    flushPendingUserConfigSync().catch(() => {});
  }, 100);
};

// Books operations
const uploadedBooks = new Set<string>();

export const forceTriggerAutoBackup = async () => {
  try {
    const data = await getUserDataPayload(true); // Exclude heavy binaries
    const username = getUsername();
    await fetch(`/api/userdata?username=${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Username': username
      },
      body: JSON.stringify(data)
    });
    console.log('UserData immediate backup triggered after delete/update');
  } catch (e) {
    console.error('Failed immediate user data backup:', e);
  }
};

export const saveBook = async (book: Book, skipUpload = false) => {
  try {
    const currentUsername = getUsername() || 'default';
    if (!book.metadata) book.metadata = {};
    if (!book.metadata.uploadedBy) {
      book.metadata.uploadedBy = currentUsername;
    }

    const database = await initDB();
    await database.put('books', book);

    const uploadKey = `${currentUsername}:${book.id}`;
    // Save permanent copy to /UserData/books on the server if not already uploaded
    if (!skipUpload && book.file instanceof Blob && !uploadedBooks.has(uploadKey)) {
      try {
        const fileData = await blobToBase64(book.file);
        const filename = book.file.name || `${book.title || 'book'}.${book.fileType || 'epub'}`;
        const username = currentUsername;
        const response = await fetch(`/api/upload-book?username=${encodeURIComponent(username)}`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Username': username
          },
          body: JSON.stringify({
            bookId: book.id,
            filename,
            fileData,
            username
          })
        });
        if (response.ok) {
          uploadedBooks.add(uploadKey);
          console.log(`Saved permanent book file copy to server for user ${username} and book ${book.id}`);
          // Immediate backup to ensure other users can see the book right away
          forceTriggerAutoBackup().catch(err => console.warn('Sync failed:', err));
        }
      } catch (uploadError) {
        console.warn('Could not save permanent book file copy to server:', uploadError);
      }
    }

    // Debounced idle backup to prevent any CPU/GPU lag during reading
    triggerAutoBackup();
  } catch (error) {
    logError('SAVE_BOOK_FAILED', error, { bookId: book.id });
    throw error;
  }
};

export const getBooks = async (): Promise<Book[]> => {
  try {
    const database = await initDB();
    return database.getAll('books');
  } catch (error) {
    logError('GET_BOOKS_FAILED', error);
    return [];
  }
};

export const getBook = async (id: string): Promise<Book | undefined> => {
  try {
    const database = await initDB();
    return database.get('books', id);
  } catch (error) {
    logError('GET_BOOK_FAILED', error, { bookId: id });
    return undefined;
  }
};

export const deleteBook = async (id: string) => {
  try {
    uploadedBooks.delete(id);
    const currentUsername = getUsername() || 'default';
    uploadedBooks.delete(`${currentUsername}:${id}`);
    const database = await initDB();
    const tx = database.transaction(['books', 'bookmarks', 'chapters', 'covers', 'navigation', 'readingSessions'], 'readwrite');
    
    await Promise.all([
      tx.objectStore('books').delete(id),
      tx.objectStore('bookmarks').index('bookId').getAllKeys(id).then(keys => 
        Promise.all(keys.map(key => tx.objectStore('bookmarks').delete(key)))
      ),
      tx.objectStore('chapters').index('bookId').getAllKeys(id).then(keys =>
        Promise.all(keys.map(key => tx.objectStore('chapters').delete(key)))
      ),
      tx.objectStore('covers').delete(id),
      tx.objectStore('navigation').index('bookId').getAllKeys(id).then(keys =>
        Promise.all(keys.map(key => tx.objectStore('navigation').delete(key)))
      )
    ]);

    // Ensure the transaction is fully committed to the database first
    await tx.done;

    // Delete copy of book on server
    try {
      const username = getUsername();
      await fetch(`/api/delete-book?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({ bookId: id, username })
      });
      console.log(`Deleted book copy on server for book ${id}`);
    } catch (deleteError) {
      console.warn('Could not delete book file copy on server:', deleteError);
    }

    // Immediately trigger a non-debounced auto-backup to sync userdata.json
    await forceTriggerAutoBackup();
  } catch (error) {
    logError('DELETE_BOOK_FAILED', error, { bookId: id });
    throw error;
  }
};

// Cover image operations
export const saveCoverImage = async (bookId: string, imageBlob: Blob) => {
  try {
    const database = await initDB();
    await database.put('covers', {
      bookId,
      imageBlob,
      createdAt: new Date()
    });

    // Save permanent cover image to server
    try {
      const fileData = await blobToBase64(imageBlob);
      const username = getUsername();
      await fetch(`/api/upload-cover?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Username': username
        },
        body: JSON.stringify({ bookId, fileData, username })
      });
      console.log(`Saved permanent cover image copy to server for book ${bookId}`);
    } catch (uploadError) {
      console.warn('Could not save permanent cover image copy to server:', uploadError);
    }

    triggerAutoBackup();
  } catch (error) {
    logError('SAVE_COVER_FAILED', error, { bookId });
    throw error;
  }
};

export const getCoverImage = async (bookId: string): Promise<string | null> => {
  try {
    const database = await initDB();
    const cover = await database.get('covers', bookId);
    if (cover?.imageBlob) {
      return URL.createObjectURL(cover.imageBlob);
    }

    // Fallback: Recover from server cover copy!
    try {
      const username = getUsername();
      const res = await fetch(`/api/cover-image/${bookId}?username=${encodeURIComponent(username)}`, {
        headers: { 'X-Username': username }
      });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          // Save back to local DB so it is restored locally for subsequent views
          await database.put('covers', {
            bookId,
            imageBlob: blob,
            createdAt: new Date()
          });
          console.log(`Successfully recovered and cached cover image from server for ${bookId}`);
          return URL.createObjectURL(blob);
        }
      }
    } catch (recoveryErr) {
      console.warn(`Could not recover cover image from server for ${bookId}:`, recoveryErr);
    }

    return null;
  } catch (error) {
    logError('GET_COVER_FAILED', error, { bookId });
    return null;
  }
};

export const getPreferencesCacheKey = (targetUser?: string): string => {
  const user = (targetUser || getUsername() || 'default').toLowerCase();
  return `cached_preferences_${user}_json`;
};

// User-scoped in-memory cache for preferences to avoid cross-contamination
const userPreferencesCache = new Map<string, ReadingPreferences>();
let cachedPreferences: ReadingPreferences | null = null;

export const setCachedPreferencesItem = (prefs: ReadingPreferences, targetUser?: string) => {
  const user = (targetUser || getUsername() || 'default').toLowerCase();
  userPreferencesCache.set(user, prefs);
  cachedPreferences = prefs;
  if (typeof window !== 'undefined') {
    try {
      const userKey = getPreferencesCacheKey(user);
      const str = JSON.stringify(prefs);
      localStorage.setItem(userKey, str);
      localStorage.setItem('cached_preferences_json', str);
    } catch (e) {
      console.warn('Could not update cached preferences in localStorage:', e);
    }
  }
};

export const getCachedPreferences = (targetUser?: string): ReadingPreferences | null => {
  const user = (targetUser || getUsername() || 'default').toLowerCase();
  if (userPreferencesCache.has(user)) {
    return userPreferencesCache.get(user)!;
  }
  if (typeof window !== 'undefined') {
    try {
      const userKey = getPreferencesCacheKey(user);
      let val = localStorage.getItem(userKey);
      if (!val && user === 'default') {
        val = localStorage.getItem('cached_preferences_json');
      }
      if (val) {
        const parsed = ensurePreferencesDefaults(JSON.parse(val));
        userPreferencesCache.set(user, parsed);
        return parsed;
      }
    } catch (e) {
      // Ignore
    }
  }
  return null;
};

// Helper to check if current date is within the Snow season (disabled by default to preserve user choices)
const isSnowSeason = (): boolean => {
  return false;
};

// Preferences operations with proper interface theme handling
export const savePreferences = async (preferences: ReadingPreferences) => {
  try {
    const database = await initDB();
    
    // Ensure interface colors are properly set based on selected theme and options
    const interfaceTheme = getInterfaceTheme(
      preferences.selectedInterfaceTheme || 'light',
      preferences.snowSubTheme || 'night',
      preferences.menuStyle || 'classic',
      preferences.linkStyleWithTheme !== false
    );
    const updatedPreferences = {
      ...preferences,
      interfaceTheme: interfaceTheme.id
    };

    // If custom theme is selected, use stored custom colors if available
    if (updatedPreferences.theme === 'custom' && updatedPreferences.customColors) {
      updatedPreferences.colors = { ...updatedPreferences.colors, ...updatedPreferences.customColors };
    } else {
      // Otherwise use the selected theme colors
      const readingTheme = getColorTheme(
        updatedPreferences.theme,
        updatedPreferences.snowSubTheme || 'night'
      );
      updatedPreferences.colors = readingTheme.colors;
    }

    // If custom interface theme is selected, use stored custom interface colors if available
    if (updatedPreferences.interfaceTheme === 'custom' && updatedPreferences.customInterfaceColors) {
      updatedPreferences.interfaceColors = { 
        ...interfaceTheme.colors, 
        ...updatedPreferences.customInterfaceColors,
        // Ensure panelBackground is used for all relevant fields if it was the one changed
        headerBackground: updatedPreferences.customInterfaceColors.panelBackground || interfaceTheme.colors.headerBackground,
        panelBackground: updatedPreferences.customInterfaceColors.panelBackground || interfaceTheme.colors.panelBackground,
        panelSecondaryBackground: updatedPreferences.customInterfaceColors.panelBackground || interfaceTheme.colors.panelSecondaryBackground,
        inputBackground: updatedPreferences.customInterfaceColors.panelBackground || interfaceTheme.colors.inputBackground,
        // Same for text
        headerText: updatedPreferences.customInterfaceColors.panelText || interfaceTheme.colors.headerText,
        panelText: updatedPreferences.customInterfaceColors.panelText || interfaceTheme.colors.panelText,
        inputText: updatedPreferences.customInterfaceColors.panelText || interfaceTheme.colors.inputText,
        textMuted: updatedPreferences.customInterfaceColors.panelText || interfaceTheme.colors.textMuted,
      };
    } else {
      updatedPreferences.interfaceColors = interfaceTheme.colors;
    }
    
    // Log any changed preferences
    try {
      const username = getUsername() || 'default';
      const prev = getCachedPreferences(username) || await database.get('preferences', 'default');
      if (prev) {
        const keysToCompare: (keyof ReadingPreferences)[] = [
          'theme',
          'fontSize',
          'fontFamily',
          'lineHeight',
          'menuStyle',
          'glassEnabled',
          'sideBordersEnabled',
          'interfaceSnowyEnabled'
        ];
        for (const key of keysToCompare) {
          if (prev[key] !== undefined && prev[key] !== updatedPreferences[key]) {
            logActivity({
              type: 'change_setting',
              settingKey: key,
              settingPrevValue: prev[key],
              settingNewValue: updatedPreferences[key]
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to log settings changes:', err);
    }

    const currentUsername = getUsername() || 'default';
    setCachedPreferencesItem(updatedPreferences, currentUsername);
    await database.put('preferences', { id: 'default', ...updatedPreferences });

    // Sync with debouncing to userconfig.json on server
    try {
      if (currentUsername && !isReservedUsername(currentUsername)) {
        debouncedSyncUserConfig(currentUsername, updatedPreferences);
      }
    } catch (configSaveErr) {
      console.warn('Failed to sync userconfig.json to server:', configSaveErr);
    }
  } catch (error) {
    logError('SAVE_PREFERENCES_FAILED', error);
    throw error;
  }
};

export const getPreferences = async (): Promise<ReadingPreferences> => {
  const currentUsername = getUsername() || 'default';
  const cached = getCachedPreferences(currentUsername);
  if (cached) {
    return ensurePreferencesDefaults(cached);
  }
  try {
    const database = await initDB();

    // Try to load from server-side userconfig.json first to ensure fresh configurations
    try {
      const username = getUsername();
      if (username) {
        const res = await fetch(`/api/userconfig?username=${encodeURIComponent(username)}`, {
          headers: { 'X-Username': username }
        });
        if (res.ok) {
          const configData = await res.json();
          if (configData && configData.preferences) {
            console.log(`Successfully fetched userconfig.json from server for "${username}"`);
            const normalizedConfig = ensurePreferencesDefaults(configData.preferences);
            await database.put('preferences', { id: 'default', ...normalizedConfig });
            cachedPreferences = normalizedConfig;
            try {
              localStorage.setItem('cached_preferences_json', JSON.stringify(normalizedConfig));
            } catch (e) { /* ignore */ }
            return normalizedConfig;
          }
        }
      }
    } catch (configFetchErr) {
      console.warn('Could not retrieve userconfig.json from server:', configFetchErr);
    }

    const prefs = await database.get('preferences', 'default');
    
    if (!prefs) {
      // Return defaults if no preferences exist, overriding with snow during season
      const defaultPrefs = { ...DEFAULT_PREFERENCES };
      if (isSnowSeason()) {
        defaultPrefs.theme = 'snow';
        defaultPrefs.selectedColorTheme = 'snow';
        defaultPrefs.interfaceTheme = 'snow';
        defaultPrefs.selectedInterfaceTheme = 'snow';
        defaultPrefs.snowDensity = 10;
        defaultPrefs.snowSpeed = 100;
        defaultPrefs.snowSubTheme = 'night';
        defaultPrefs.snowMenuType = 'glass';
        
        const snowThemeColors = getInterfaceTheme('snow', 'night', 'glass');
        defaultPrefs.interfaceColors = snowThemeColors.colors;
        const snowReadingTheme = getColorTheme('snow', 'night');
        defaultPrefs.colors = snowReadingTheme.colors;
      }
      cachedPreferences = defaultPrefs;
      return defaultPrefs;
    }

    // Migrate legacy lavender theme to snow
    if (prefs.theme === 'lavender') prefs.theme = 'snow';
    if (prefs.selectedColorTheme === 'lavender') prefs.selectedColorTheme = 'snow';
    if (prefs.interfaceTheme === 'lavender') prefs.interfaceTheme = 'snow';
    if (prefs.selectedInterfaceTheme === 'lavender') prefs.selectedInterfaceTheme = 'snow';
    
    // Ensure interface colors are properly set
    const interfaceTheme = getInterfaceTheme(
      prefs.selectedInterfaceTheme || 'light',
      prefs.snowSubTheme || 'night',
      prefs.menuStyle || 'classic',
      prefs.linkStyleWithTheme !== false
    );
    
    // Merge stored preferences with defaults
    const mergedPrefs = ensurePreferencesDefaults({
      ...prefs,
      interfaceTheme: interfaceTheme.id
    });

    // If custom theme is selected, use stored custom colors if available
    if (mergedPrefs.theme === 'custom' && mergedPrefs.customColors) {
      mergedPrefs.colors = { ...mergedPrefs.colors, ...mergedPrefs.customColors };
    } else {
      // Otherwise use the selected theme colors
      const readingTheme = getColorTheme(
        mergedPrefs.theme,
        mergedPrefs.snowSubTheme || 'night'
      );
      mergedPrefs.colors = readingTheme.colors;
    }

    // If custom interface theme is selected, use stored custom interface colors if available
    if (mergedPrefs.interfaceTheme === 'custom' && mergedPrefs.customInterfaceColors) {
      mergedPrefs.interfaceColors = { 
        ...interfaceTheme.colors, 
        ...mergedPrefs.customInterfaceColors,
        // Ensure panelBackground is used for all relevant fields if it was the one changed
        headerBackground: mergedPrefs.customInterfaceColors.panelBackground || interfaceTheme.colors.headerBackground,
        panelBackground: mergedPrefs.customInterfaceColors.panelBackground || interfaceTheme.colors.panelBackground,
        panelSecondaryBackground: mergedPrefs.customInterfaceColors.panelBackground || interfaceTheme.colors.panelSecondaryBackground,
        inputBackground: mergedPrefs.customInterfaceColors.panelBackground || interfaceTheme.colors.inputBackground,
        // Same for text
        headerText: mergedPrefs.customInterfaceColors.panelText || interfaceTheme.colors.headerText,
        panelText: mergedPrefs.customInterfaceColors.panelText || interfaceTheme.colors.panelText,
        inputText: mergedPrefs.customInterfaceColors.panelText || interfaceTheme.colors.inputText,
        textMuted: mergedPrefs.customInterfaceColors.panelText || interfaceTheme.colors.textMuted,
      };
    } else {
      mergedPrefs.interfaceColors = interfaceTheme.colors;
    }
    
    cachedPreferences = mergedPrefs;
    try {
      localStorage.setItem('cached_preferences_json', JSON.stringify(mergedPrefs));
    } catch (e) {
      // Ignore
    }
    return mergedPrefs;
  } catch (error) {
    logError('GET_PREFERENCES_FAILED', error);
    // Return defaults on error
    return DEFAULT_PREFERENCES;
  }
};

// Reset to defaults function - Clears EVERYTHING completely (Browser & Server)
export const resetToDefaults = async () => {
  try {
    // 1. First, tell server to completely wipe all server-side UserData & profiles
    const res = await fetch('/api/reset', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Server reset failed with status ${res.status}`);
    }
    console.log('Successfully requested full system server data wipe');

    // 2. Close and null out the active database connection
    if (db) {
      try {
        db.close();
      } catch (e) {
        // Ignore close errors
      }
      db = null;
    }

    // 3. Brutally and cleanly delete the IndexedDB database itself to prevent transaction blocks
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(DB_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => {
        console.warn('Database deletion failed, resolving anyway');
        resolve();
      };
      req.onblocked = () => {
        console.warn('Database deletion blocked by other connections, resolving anyway');
        resolve();
      };
    });

    // 4. Clear all browser cache storage if available (service workers / Cache API)
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      } catch (e) {
        console.warn('Cache storage clear warning:', e);
      }
    }

    // 5. Clear all cookies
    if (typeof document !== 'undefined') {
      try {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        }
      } catch (e) {
        // Ignore cookie clear errors
      }
    }
    
    // 6. Clear all localStorage and sessionStorage completely
    localStorage.clear();
    sessionStorage.clear();
    
    // 7. Reset in-memory caches and tracked sets
    cachedPreferences = null;
    uploadedBooks.clear();
    
    return true;
  } catch (error) {
    logError('RESET_TO_DEFAULTS_FAILED', error);
    throw error;
  }
};

// Navigation history operations
export const saveNavigationState = async (bookId: string, chapterIndex: number, scrollPosition: number = 0) => {
  try {
    const database = await initDB();
    await database.put('navigation', {
      id: `${bookId}-${chapterIndex}`,
      bookId,
      chapterIndex,
      scrollPosition,
      timestamp: new Date()
    });
  } catch (error) {
    logError('SAVE_NAVIGATION_FAILED', error, { bookId, chapterIndex });
  }
};

export const saveHeaderButtonPosition = async (x: number) => {
  try {
    const database = await initDB();
    await database.put('preferences', { id: 'header-button-x', x });
  } catch (error) {
    logError('SAVE_HEADER_BUTTON_X_FAILED', error);
  }
};

export const getHeaderButtonPosition = async (): Promise<number> => {
  try {
    const database = await initDB();
    const data = await database.get('preferences', 'header-button-x');
    return data?.x ?? 50;
  } catch (error) {
    logError('GET_HEADER_BUTTON_X_FAILED', error);
    return 50;
  }
};

export const getNavigationHistory = async (bookId: string) => {
  try {
    const database = await initDB();
    return database.getAllFromIndex('navigation', 'bookId', bookId);
  } catch (error) {
    logError('GET_NAVIGATION_FAILED', error, { bookId });
    return [];
  }
};

// Bookmarks operations
export const saveBookmark = async (bookmark: Bookmark) => {
  try {
    const database = await initDB();
    await database.put('bookmarks', bookmark);
    triggerAutoBackup();

    // Instant sync to dedicated bookmarks.json on server
    try {
      const user = getUsername();
      if (user) {
        database.getAll('bookmarks').then(allBookmarks => {
          fetch(`/api/bookmarks?username=${encodeURIComponent(user)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Username': user },
            body: JSON.stringify({ bookmarks: allBookmarks })
          }).catch(err => console.warn('Sync bookmarks failed:', err));
        }).catch(() => { /* ignore */ });
      }
    } catch (e) {
      /* ignore */
    }
    
    // Log the bookmark creation activity
    try {
      const book = await getBook(bookmark.bookId);
      logActivity({
        type: 'create_bookmark',
        bookId: bookmark.bookId,
        bookTitle: book?.title || 'Livro',
        chapterTitle: bookmark.text ? (bookmark.text.slice(0, 40) + '...') : `Marcador`,
        chapterIndex: bookmark.chapterIndex
      });
    } catch (err) {
      console.warn('Logging bookmark creation failed:', err);
    }
  } catch (error) {
    logError('SAVE_BOOKMARK_FAILED', error, { bookmarkId: bookmark.id });
    throw error;
  }
};

export const getBookmarks = async (bookId?: string): Promise<Bookmark[]> => {
  try {
    const database = await initDB();
    if (bookId) {
      return database.getAllFromIndex('bookmarks', 'bookId', bookId);
    }
    return database.getAll('bookmarks');
  } catch (error) {
    logError('GET_BOOKMARKS_FAILED', error, { bookId });
    return [];
  }
};

export const deleteBookmark = async (id: string) => {
  try {
    const database = await initDB();
    
    // Get the bookmark before deleting to log its context
    try {
      const bookmark = await database.get('bookmarks', id);
      if (bookmark) {
        const book = await getBook(bookmark.bookId);
        logActivity({
          type: 'delete_bookmark',
          bookId: bookmark.bookId,
          bookTitle: book?.title || 'Livro',
          chapterTitle: bookmark.text ? (bookmark.text.slice(0, 40) + '...') : `Marcador`,
          chapterIndex: bookmark.chapterIndex
        });
      }
    } catch (err) {
      console.warn('Logging bookmark deletion failed:', err);
    }

    await database.delete('bookmarks', id);
    triggerAutoBackup();

    // Instant sync to dedicated bookmarks.json on server
    try {
      const user = getUsername();
      if (user) {
        database.getAll('bookmarks').then(allBookmarks => {
          fetch(`/api/bookmarks?username=${encodeURIComponent(user)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Username': user },
            body: JSON.stringify({ bookmarks: allBookmarks })
          }).catch(err => console.warn('Sync bookmarks failed:', err));
        }).catch(() => { /* ignore */ });
      }
    } catch (e) {
      /* ignore */
    }
  } catch (error) {
    logError('DELETE_BOOKMARK_FAILED', error, { bookmarkId: id });
    throw error;
  }
};

// Auto-save bookmarks state
export const saveBookmarkState = async (bookId: string, isOpen: boolean) => {
  try {
    const database = await initDB();
    await database.put('preferences', { 
      id: `bookmark-state-${bookId}`, 
      isOpen,
      lastUpdated: new Date()
    });
  } catch (error) {
    logError('SAVE_BOOKMARK_STATE_FAILED', error, { bookId });
  }
};

export const getBookmarkState = async (bookId: string): Promise<boolean> => {
  try {
    const database = await initDB();
    const state = await database.get('preferences', `bookmark-state-${bookId}`);
    return state?.isOpen || false;
  } catch (error) {
    logError('GET_BOOKMARK_STATE_FAILED', error, { bookId });
    return false;
  }
};

// Reading stats operations
export const saveReadingStats = async (stats: ReadingStats) => {
  try {
    const database = await initDB();
    await database.put('stats', { id: 'default', ...stats });
    triggerAutoBackup();
  } catch (error) {
    logError('SAVE_STATS_FAILED', error);
    throw error;
  }
};

export const getReadingStats = async (): Promise<ReadingStats> => {
  try {
    const database = await initDB();
    const stats = await database.get('stats', 'default');
    
    return stats || {
      totalTimeRead: 0,
      booksCompleted: 0,
      pagesRead: 0,
      averageReadingSpeed: 0,
      streakDays: 0,
      lastReadDate: new Date()
    };
  } catch (error) {
    logError('GET_STATS_FAILED', error);
    return {
      totalTimeRead: 0,
      booksCompleted: 0,
      pagesRead: 0,
      averageReadingSpeed: 0,
      streakDays: 0,
      lastReadDate: new Date()
    };
  }
};

// Chapter cache operations
export const cacheChapter = async (bookId: string, chapterIndex: number, content: string) => {
  try {
    const database = await initDB();
    await database.put('chapters', {
      id: `${bookId}-${chapterIndex}`,
      bookId,
      chapterIndex,
      content,
      cachedAt: new Date()
    });
  } catch (error) {
    logError('CACHE_CHAPTER_FAILED', error, { bookId, chapterIndex });
  }
};

export const getCachedChapter = async (bookId: string, chapterIndex: number): Promise<string | null> => {
  try {
    const database = await initDB();
    const cached = await database.get('chapters', `${bookId}-${chapterIndex}`);
    return cached?.content || null;
  } catch (error) {
    logError('GET_CACHED_CHAPTER_FAILED', error, { bookId, chapterIndex });
    return null;
  }
};

// Helper functions to serialize Blobs/Files to base64 for JSON export/import
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64 = base64String.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

// Export/Import functionality
const getDefaultsPayload = () => ({
  database: {
    books: [],
    bookmarks: [],
    readingSessions: [],
    chapters: [],
    navigation: [],
    stats: {}
  }
});

// Bounded LRU caches to avoid memory leaks while preventing redundant Blob to Base64 conversions
const MAX_BOOK_BASE64_CACHE = 15;
const MAX_COVER_BASE64_CACHE = 50;

const bookBase64Cache = new Map<string, { fileData: string; mimeType: string }>();
const coverBase64Cache = new Map<string, { imageData: string; mimeType: string }>();

function setBookCache(id: string, entry: { fileData: string; mimeType: string }) {
  if (bookBase64Cache.has(id)) {
    bookBase64Cache.delete(id);
  } else if (bookBase64Cache.size >= MAX_BOOK_BASE64_CACHE) {
    const oldestKey = bookBase64Cache.keys().next().value;
    if (oldestKey) bookBase64Cache.delete(oldestKey);
  }
  bookBase64Cache.set(id, entry);
}

function setCoverCache(id: string, entry: { imageData: string; mimeType: string }) {
  if (coverBase64Cache.has(id)) {
    coverBase64Cache.delete(id);
  } else if (coverBase64Cache.size >= MAX_COVER_BASE64_CACHE) {
    const oldestKey = coverBase64Cache.keys().next().value;
    if (oldestKey) coverBase64Cache.delete(oldestKey);
  }
  coverBase64Cache.set(id, entry);
}

// Export/Import functionality
export const getUserDataPayload = async (excludeBinaries = false) => {
  const database = await initDB();
  
  // Get all data from all stores
  const [
    books, 
    preferences, 
    bookmarks, 
    stats, 
    chapters, 
    covers, 
    navigation, 
    readingSessions
  ] = await Promise.all([
    database.getAll('books'),
    database.getAll('preferences'),
    database.getAll('bookmarks'),
    database.get('stats', 'default'),
    database.getAll('chapters'),
    database.getAll('covers'),
    database.getAll('navigation'),
    database.getAll('readingSessions')
  ]);

  // Convert actual book files to Base64 strings for the export JSON, using the cache to avoid blocking the main thread
  const processedBooks = await Promise.all(books.map(async book => {
    let fileData: string | undefined;
    let fileMimeType = '';
    
    if (excludeBinaries) {
      // Skip heavy conversions for lightweight background backup
    } else if (bookBase64Cache.has(book.id)) {
      const cached = bookBase64Cache.get(book.id)!;
      fileData = cached.fileData;
      fileMimeType = cached.mimeType;
    } else if (book.file instanceof Blob) {
      try {
        fileData = await blobToBase64(book.file);
        fileMimeType = book.file.type;
        if (fileData) {
          setBookCache(book.id, { fileData, mimeType: fileMimeType });
        }
      } catch (e) {
        console.warn('Could not convert book file to base64:', e);
      }
    }
    
    return {
      ...book,
      file: null, // Clear raw File/Blob field as it can't be JSON serialized
      fileData,
      fileMimeType
    };
  }));

  // Convert cover images to Base64 strings for the export JSON, using the cache to avoid blocking the main thread
  const processedCovers = await Promise.all(covers.map(async cover => {
    let imageData: string | undefined;
    let imageMimeType = '';
    
    if (excludeBinaries) {
      // Skip heavy conversions for lightweight background backup
    } else if (coverBase64Cache.has(cover.id)) {
      const cached = coverBase64Cache.get(cover.id)!;
      imageData = cached.imageData;
      imageMimeType = cached.mimeType;
    } else if (cover.imageBlob instanceof Blob) {
      try {
        imageData = await blobToBase64(cover.imageBlob);
        imageMimeType = cover.imageBlob.type;
        if (imageData) {
          setCoverCache(cover.id, { imageData, mimeType: imageMimeType });
        }
      } catch (e) {
        console.warn('Could not convert cover to base64:', e);
      }
    }
    
    return {
      ...cover,
      imageBlob: null, // Clear raw Blob field
      imageData,
      imageMimeType
    };
  }));

  // Ensure the latest in-memory and storage preferences (glass, accent tint, themes, font, spacings, etc.) are included
  const currentPreferences = await database.get('preferences', 'default');
  const mergedDefaultPref = {
    id: 'default',
    ...DEFAULT_PREFERENCES,
    ...(currentPreferences || {}),
    ...(cachedPreferences || {})
  };
  const finalPreferences = (preferences && preferences.length > 0)
    ? preferences.map(p => p.id === 'default' ? mergedDefaultPref : p)
    : [mergedDefaultPref];

  // Extract notes array for dedicated notes.json synchronization
  let userNotes: any[] = [];
  const currentActiveUser = getUsername();
  const notesKey = currentActiveUser ? `novel_reader_notes_${currentActiveUser}` : 'novel_reader_notes';
  const rawNotes = localStorage.getItem(notesKey) || localStorage.getItem('novel_reader_notes');
  if (rawNotes) {
    try {
      const parsedNotes = JSON.parse(rawNotes);
      if (Array.isArray(parsedNotes)) userNotes = parsedNotes;
    } catch (e) {
      /* ignore parse error */
    }
  }

  return {
    version: DB_VERSION,
    exportedAt: new Date().toISOString(),
    notes: userNotes,
    localStorage: { 
      ...localStorage,
      novel_reader_username: getUsername() || ''
    },
    database: {
      books: processedBooks,
      preferences: finalPreferences,
      bookmarks,
      stats,
      chapters,
      covers: processedCovers,
      navigation,
      readingSessions
    }
  };
};

let debounceTimer: any = null;
export const triggerAutoBackup = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    // Wrap the heavy operation preparation and network call in requestIdleCallback or a deferred timeout
    // to ensure it never blocks animations, rendering or active reading interactions
    const runBackup = async () => {
      try {
        const data = await getUserDataPayload(true); // Exclude heavy book/cover binaries in auto-backups to eliminate stutters!
        
        const processBackup = () => {
          const username = getUsername();
          fetch(`/api/userdata?username=${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-Username': username
            },
            body: JSON.stringify(data)
          }).then(response => {
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}`);
            }
            console.log('UserData automatically backed up to server UserData/userdata.json');
          }).catch(e => {
            console.error('Auto-backup to server failed:', e);
          });
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
          (window as any).requestIdleCallback(() => processBackup(), { timeout: 10000 });
        } else {
          setTimeout(processBackup, 1);
        }
      } catch (e) {
        console.error('Auto-backup preparation failed:', e);
      }
    };
    
    runBackup();
  }, 15000); // Debounce to 15 seconds to minimize frequency and completely prevent lags during active scrolling/reading
};

export const exportUserData = async () => {
  try {
    const activeExportData = await getUserDataPayload();
    const activeUsername = getUsername() || 'default';
    const zip = new JSZip();

    // 0. Fetch all profiles from server
    let serverProfilesData: Record<string, any> = {};
    try {
      const allRes = await fetch('/api/all-userdata');
      if (allRes.ok) {
        const json = await allRes.json();
        if (json?.profiles) serverProfilesData = json.profiles;
      }
    } catch (e) {
      console.warn('Could not fetch server multi-user data for export:', e);
    }

    const allProfilesList = Array.from(new Set([
      activeUsername,
      ...getUsedUsernames(),
      ...Object.keys(serverProfilesData)
    ].filter(p => p && !isReservedUsername(p))));

    // 1. Root Manifest
    const manifest = {
      app: "NovelNook",
      version: "3.5.0",
      exportedAt: new Date().toISOString(),
      activeUser: activeUsername,
      allProfiles: allProfilesList,
      summary: {
        totalProfiles: allProfilesList.length,
        booksCount: activeExportData.database?.books?.length || 0,
        bookmarksCount: activeExportData.database?.bookmarks?.length || 0,
        sessionsCount: activeExportData.database?.readingSessions?.length || 0,
        chaptersCount: activeExportData.database?.chapters?.length || 0
      }
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("all-profiles.json", JSON.stringify(allProfilesList, null, 2));

    // 2. Build multi-profile bundle
    const multiProfileBundle: Record<string, any> = {};

    for (const p of allProfilesList) {
      let pData = p === activeUsername ? activeExportData : serverProfilesData[p]?.userdata;
      let pConfig = serverProfilesData[p]?.userconfig;

      // If missing from server cache, attempt fallback fetch
      if (!pData && p !== activeUsername) {
        try {
          const res = await fetch(`/api/userdata?username=${encodeURIComponent(p)}`, {
            headers: { 'X-Username': p }
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.status !== 'empty') pData = json;
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (!pConfig) {
        try {
          const res = await fetch(`/api/userconfig?username=${encodeURIComponent(p)}`, {
            headers: { 'X-Username': p }
          });
          if (res.ok) {
            const json = await res.json();
            if (json && json.preferences) pConfig = json;
          }
        } catch (e) {
          /* ignore */
        }
      }

      // Collect scoped notes and settings from localStorage for this profile
      let pNotes: any[] = [];
      let pTrashNotes: any[] = [];
      let pTrashBookmarks: any[] = [];
      let pFavorites: any[] = [];
      let pAvatar = '';
      let pAvatarBg = '';
      let pLogs: any[] = [];

      try {
        const n = localStorage.getItem(`novel_reader_notes_${p}`) || (p === activeUsername ? localStorage.getItem('novel_reader_notes') : null);
        if (n) pNotes = JSON.parse(n);
        const tn = localStorage.getItem(`novel_reader_trash_notes_${p}`) || (p === activeUsername ? localStorage.getItem('novel_reader_trash_notes') : null);
        if (tn) pTrashNotes = JSON.parse(tn);
        const tb = localStorage.getItem(`novel_reader_trash_bookmarks_${p}`) || (p === activeUsername ? localStorage.getItem('novel_reader_trash_bookmarks') : null);
        if (tb) pTrashBookmarks = JSON.parse(tb);
        const f = localStorage.getItem(`novel_reader_favorites_${p}`) || (p === activeUsername ? localStorage.getItem('novel_reader_favorites') : null);
        if (f) pFavorites = JSON.parse(f);
        pAvatar = localStorage.getItem(`novel_reader_avatar_${p}`) || '';
        pAvatarBg = localStorage.getItem(`novel_reader_avatar_bg_${p}`) || '';
        const l = localStorage.getItem(`activity_logs_${p}`) || (p === activeUsername ? localStorage.getItem('activity_logs') : null);
        if (l) pLogs = JSON.parse(l);
      } catch (e) {
        /* ignore */
      }

      const pPrefs = pConfig?.preferences || (p === activeUsername ? cachedPreferences : null) || pData?.database?.preferences?.[0] || DEFAULT_PREFERENCES;

      multiProfileBundle[p] = {
        userdata: pData || getDefaultsPayload(),
        userconfig: pConfig || { preferences: pPrefs },
        preferences: pPrefs,
        notes: pNotes,
        trashNotes: pTrashNotes,
        trashBookmarks: pTrashBookmarks,
        favorites: pFavorites,
        avatar: pAvatar,
        avatarBg: pAvatarBg,
        logs: pLogs
      };

      // Create folder for each profile inside zip: /profiles/<username>/
      const userFolder = zip.folder(`profiles/${p}`);
      if (userFolder) {
        if (pData) userFolder.file("userdata.json", JSON.stringify(pData, null, 2));
        if (pConfig) userFolder.file("userconfig.json", JSON.stringify(pConfig, null, 2));
        userFolder.file("reading-preferences.json", JSON.stringify(pPrefs, null, 2));
        userFolder.file("reading-stats.json", JSON.stringify(pData?.database?.stats || {}, null, 2));
        userFolder.file("reading-sessions.json", JSON.stringify(pData?.database?.readingSessions || [], null, 2));
        userFolder.file("bookmarks.json", JSON.stringify(pData?.database?.bookmarks || [], null, 2));
        userFolder.file("chapters.json", JSON.stringify(pData?.database?.chapters || [], null, 2));
        userFolder.file("navigation.json", JSON.stringify(pData?.database?.navigation || [], null, 2));
        userFolder.file("notes.json", JSON.stringify(pNotes, null, 2));
        userFolder.file("trash-notes.json", JSON.stringify(pTrashNotes, null, 2));
        userFolder.file("trash-bookmarks.json", JSON.stringify(pTrashBookmarks, null, 2));
        userFolder.file("favorites.json", JSON.stringify(pFavorites, null, 2));
        userFolder.file("activity-logs.json", JSON.stringify(pLogs, null, 2));
      }
    }

    // 3. Full Unified Backup JSON (ensures 100% lossless restoration of active user + all profiles)
    const fullBackupPayload = {
      version: DB_VERSION,
      app: "NovelNook",
      exportedAt: new Date().toISOString(),
      activeUser: activeUsername,
      allProfiles: allProfilesList,
      profiles: multiProfileBundle,
      database: activeExportData.database,
      localStorage: activeExportData.localStorage
    };
    zip.file("backup-data.json", JSON.stringify(fullBackupPayload, null, 2));

    // 4. /books/ area: saves ALL books and covers across all profiles
    const booksFolder = zip.folder("books");
    if (booksFolder) {
      const allBooksMap = new Map<string, any>();
      const allCoversMap = new Map<string, any>();

      // A. Add active user's books & covers
      if (activeExportData.database?.books) {
        for (const b of activeExportData.database.books) {
          if (b && b.id) allBooksMap.set(b.id, b);
        }
      }
      if (activeExportData.database?.covers) {
        for (const c of activeExportData.database.covers) {
          const key = c.bookId || c.id;
          if (key) allCoversMap.set(key, c);
        }
      }

      // B. Add books & covers from all other profiles
      for (const p of allProfilesList) {
        const pData = serverProfilesData[p]?.userdata;
        if (pData?.database?.books && Array.isArray(pData.database.books)) {
          for (const b of pData.database.books) {
            if (b && b.id && !allBooksMap.has(b.id)) {
              allBooksMap.set(b.id, b);
            }
          }
        }
        if (pData?.database?.covers && Array.isArray(pData.database.covers)) {
          for (const c of pData.database.covers) {
            const key = c.bookId || c.id;
            if (key && !allCoversMap.has(key)) {
              allCoversMap.set(key, c);
            }
          }
        }
      }

      const allBooksList = Array.from(allBooksMap.values());
      booksFolder.file("books-metadata.json", JSON.stringify(allBooksList.map(b => {
        const { fileData, ...rest } = b;
        return rest;
      }), null, 2));

      // Individual book files
      for (const book of allBooksList) {
        let b64 = book.fileData;
        if (!b64) {
          try {
            const res = await fetch(`/api/book-file/${encodeURIComponent(book.id)}`);
            if (res.ok) {
              const blob = await res.blob();
              b64 = await blobToBase64(blob);
            }
          } catch (e) {
            console.warn(`Could not fetch file for book ${book.id} during export:`, e);
          }
        }

        if (b64) {
          const ext = book.fileType === 'pdf' ? 'pdf' : (book.fileType || 'epub');
          const safeTitle = (book.title || 'book').replace(/[/\\?%*:|"<>]/g, '_').substring(0, 50);
          const filename = `${safeTitle}_${book.id}.${ext}`;
          booksFolder.file(filename, b64, { base64: true });
        }
      }

      // Covers subfolder
      const coversFolder = booksFolder.folder("covers");
      if (coversFolder) {
        for (const [coverKey, cover] of allCoversMap.entries()) {
          let b64 = cover.imageData;
          let mime = cover.imageMimeType || 'image/jpeg';
          if (!b64) {
            try {
              const res = await fetch(`/api/cover-image/${encodeURIComponent(coverKey)}`);
              if (res.ok) {
                const blob = await res.blob();
                mime = blob.type || mime;
                b64 = await blobToBase64(blob);
              }
            } catch (e) {
              /* ignore */
            }
          }
          if (b64) {
            const ext = mime?.includes('png') ? 'png' : 'jpg';
            coversFolder.file(`${coverKey}_cover.${ext}`, b64, { base64: true });
          }
        }
      }
    }

    // 5. /readinghistory/ area for active user
    const historyFolder = zip.folder("readinghistory");
    if (historyFolder) {
      historyFolder.file("reading-stats.json", JSON.stringify(activeExportData.database?.stats || {}, null, 2));
      historyFolder.file("reading-sessions.json", JSON.stringify(activeExportData.database?.readingSessions || [], null, 2));
      historyFolder.file("chapters.json", JSON.stringify(activeExportData.database?.chapters || [], null, 2));
      historyFolder.file("navigation.json", JSON.stringify(activeExportData.database?.navigation || [], null, 2));
    }

    // 6. Generate zip archive blob
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ebook-reader-backup-${activeUsername}-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return activeExportData;
  } catch (error) {
    logError('EXPORT_DATA_FAILED', error);
    throw error;
  }
};

export const importUserDataFromZip = async (zipFile: File | Blob) => {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    
    // 1. Read backup-data.json if present
    let backupData: any = null;
    const backupDataFile = zip.file("backup-data.json");
    if (backupDataFile) {
      const text = await backupDataFile.async("string");
      backupData = JSON.parse(text);
    }

    // If no backup-data.json, assemble from folder hierarchy
    if (!backupData) {
      backupData = {
        version: DB_VERSION,
        database: {},
        localStorage: {}
      };

      const booksMetaFile = zip.file("books/books-metadata.json");
      if (booksMetaFile) {
        backupData.database.books = JSON.parse(await booksMetaFile.async("string"));
      }

      const statsFile = zip.file("readinghistory/reading-stats.json");
      if (statsFile) backupData.database.stats = JSON.parse(await statsFile.async("string"));

      const sessionsFile = zip.file("readinghistory/reading-sessions.json");
      if (sessionsFile) backupData.database.readingSessions = JSON.parse(await sessionsFile.async("string"));

      const chaptersFile = zip.file("readinghistory/chapters.json");
      if (chaptersFile) backupData.database.chapters = JSON.parse(await chaptersFile.async("string"));

      const navFile = zip.file("readinghistory/navigation.json");
      if (navFile) backupData.database.navigation = JSON.parse(await navFile.async("string"));

      const prefFile = zip.file("profiles/reading-preferences.json") || zip.file("profiles/preferences.json");
      if (prefFile) {
        const pContent = JSON.parse(await prefFile.async("string"));
        backupData.database.preferences = Array.isArray(pContent) ? pContent : [pContent];
      }

      const lsFile = zip.file("profiles/localstorage.json");
      if (lsFile) backupData.localStorage = JSON.parse(await lsFile.async("string"));
    }

    // 2. Restore multi-profile accounts across the server and browser
    const allProfilesFound: string[] = [];

    if (backupData.profiles && typeof backupData.profiles === 'object') {
      for (const [profName, profObj] of Object.entries<any>(backupData.profiles)) {
        if (!profName) continue;
        allProfilesFound.push(profName);

        // Restore userdata on server
        if (profObj.userdata) {
          try {
            await fetch(`/api/userdata?username=${encodeURIComponent(profName)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Username': profName },
              body: JSON.stringify(profObj.userdata)
            });
          } catch (e) {
            console.warn(`Could not restore server userdata for ${profName}:`, e);
          }
        }

        // Restore userconfig on server
        if (profObj.userconfig) {
          try {
            await fetch(`/api/userconfig?username=${encodeURIComponent(profName)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Username': profName },
              body: JSON.stringify(profObj.userconfig)
            });
          } catch (e) {
            console.warn(`Could not restore server userconfig for ${profName}:`, e);
          }
        }

        // Restore scoped localStorage keys
        if (profObj.notes) localStorage.setItem(`novel_reader_notes_${profName}`, JSON.stringify(profObj.notes));
        if (profObj.trashNotes) localStorage.setItem(`novel_reader_trash_notes_${profName}`, JSON.stringify(profObj.trashNotes));
        if (profObj.trashBookmarks) localStorage.setItem(`novel_reader_trash_bookmarks_${profName}`, JSON.stringify(profObj.trashBookmarks));
        if (profObj.favorites) localStorage.setItem(`novel_reader_favorites_${profName}`, JSON.stringify(profObj.favorites));
        if (profObj.avatar) localStorage.setItem(`novel_reader_avatar_${profName}`, profObj.avatar);
        if (profObj.avatarBg) localStorage.setItem(`novel_reader_avatar_bg_${profName}`, profObj.avatarBg);
        if (profObj.logs) localStorage.setItem(`activity_logs_${profName}`, JSON.stringify(profObj.logs));

        // If this is the active user, also update non-scoped keys for immediate live view
        const currentActiveUsername = getUsername() || backupData.activeUser || 'default';
        if (profName === currentActiveUsername) {
          if (profObj.notes) localStorage.setItem('novel_reader_notes', JSON.stringify(profObj.notes));
          if (profObj.trashNotes) localStorage.setItem('novel_reader_trash_notes', JSON.stringify(profObj.trashNotes));
          if (profObj.trashBookmarks) localStorage.setItem('novel_reader_trash_bookmarks', JSON.stringify(profObj.trashBookmarks));
          if (profObj.favorites) localStorage.setItem('novel_reader_favorites', JSON.stringify(profObj.favorites));
          if (profObj.avatar) localStorage.setItem('novel_reader_avatar', profObj.avatar);
          if (profObj.avatarBg) localStorage.setItem('novel_reader_avatar_bg', profObj.avatarBg);
          if (profObj.logs) localStorage.setItem('activity_logs', JSON.stringify(profObj.logs));
        }
      }
    }

    // Also scan any folder entries under profiles/
    const profileFolderMatches = new Set<string>();
    zip.forEach((entryPath) => {
      // Security: Prevent Zip Slip path traversal
      if (!entryPath || entryPath.includes('..') || entryPath.startsWith('/') || entryPath.includes('\\')) return;
      const match = entryPath.match(/^profiles\/([^/]+)\//);
      if (match && match[1]) {
        const cleanProf = match[1].replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, '_');
        if (cleanProf && !isReservedUsername(cleanProf)) {
          profileFolderMatches.add(cleanProf);
        }
      }
    });

    for (const profName of profileFolderMatches) {
      if (!isReservedUsername(profName) && !allProfilesFound.includes(profName)) allProfilesFound.push(profName);

      const uDataFile = zip.file(`profiles/${profName}/userdata.json`);
      if (uDataFile) {
        try {
          const content = await uDataFile.async("string");
          await fetch(`/api/userdata?username=${encodeURIComponent(profName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Username': profName },
            body: content
          });
        } catch (e) { /* ignore */ }
      }

      const uConfigFile = zip.file(`profiles/${profName}/userconfig.json`);
      if (uConfigFile) {
        try {
          const content = await uConfigFile.async("string");
          await fetch(`/api/userconfig?username=${encodeURIComponent(profName)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Username': profName },
            body: content
          });
        } catch (e) { /* ignore */ }
      }

      const nFile = zip.file(`profiles/${profName}/notes.json`);
      if (nFile) {
        try {
          const content = await nFile.async("string");
          localStorage.setItem(`novel_reader_notes_${profName}`, content);
        } catch (e) { /* ignore */ }
      }

      const tnFile = zip.file(`profiles/${profName}/trash-notes.json`);
      if (tnFile) {
        try {
          const content = await tnFile.async("string");
          localStorage.setItem(`novel_reader_trash_notes_${profName}`, content);
        } catch (e) { /* ignore */ }
      }

      const tbFile = zip.file(`profiles/${profName}/trash-bookmarks.json`);
      if (tbFile) {
        try {
          const content = await tbFile.async("string");
          localStorage.setItem(`novel_reader_trash_bookmarks_${profName}`, content);
        } catch (e) { /* ignore */ }
      }

      const favFile = zip.file(`profiles/${profName}/favorites.json`);
      if (favFile) {
        try {
          const content = await favFile.async("string");
          localStorage.setItem(`novel_reader_favorites_${profName}`, content);
        } catch (e) { /* ignore */ }
      }
    }

    // 3. Extract raw book files from /books/ if present
    const database = await initDB();
    const bookFilesMap = new Map<string, File>();
    const zipBooks = zip.folder("books");
    if (zipBooks) {
      const filePromises: Promise<void>[] = [];
      zipBooks.forEach((relativePath, fileEntry) => {
        // Security: Prevent Zip Slip path traversal
        if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) return;
        if (!fileEntry.dir && !relativePath.endsWith('.json') && !relativePath.startsWith('covers/')) {
          filePromises.push((async () => {
            const blob = await fileEntry.async("blob");
            const match = relativePath.match(/_([a-zA-Z0-9_-]+)\.([a-zA-Z0-9]+)$/);
            const bookId = match ? match[1] : null;
            const fileName = relativePath.split('/').pop() || 'book.epub';
            const file = new File([blob], fileName, { type: blob.type || (fileName.endsWith('.pdf') ? 'application/pdf' : 'application/epub+zip') });
            if (bookId) {
              bookFilesMap.set(bookId, file);

              // Upload copy to server for permanent recovery
              try {
                const b64 = await blobToBase64(file);
                const activeUser = getUsername();
                await fetch('/api/upload-book', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Username': activeUser },
                  body: JSON.stringify({ bookId, filename: fileName, fileData: b64 })
                });
              } catch (uploadErr) {
                console.warn(`Could not upload book copy for ${bookId}:`, uploadErr);
              }
            }
          })());
        }
      });
      await Promise.all(filePromises);
    }

    // 4. Extract cover images from /books/covers/ if present
    const zipCovers = zip.folder("books/covers");
    if (zipCovers) {
      const coverPromises: Promise<void>[] = [];
      zipCovers.forEach((relativePath, coverEntry) => {
        // Security: Prevent Zip Slip path traversal
        if (!relativePath || relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) return;
        if (!coverEntry.dir) {
          coverPromises.push((async () => {
            const blob = await coverEntry.async("blob");
            const coverId = relativePath.replace(/_cover\.[a-zA-Z0-9]+$/, '');
            if (coverId) {
              await database.put('covers', {
                id: coverId,
                bookId: coverId,
                imageBlob: blob,
                createdAt: new Date()
              });

              // Upload copy to server for permanent cover recovery
              try {
                const b64 = await blobToBase64(blob);
                const activeUser = getUsername();
                await fetch('/api/upload-cover', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Username': activeUser },
                  body: JSON.stringify({ bookId: coverId, fileData: b64 })
                });
              } catch (coverUploadErr) {
                console.warn(`Could not upload cover copy for ${coverId}:`, coverUploadErr);
              }
            }
          })());
        }
      });
      await Promise.all(coverPromises);
    }

    // 5. Execute core database restoration for active user
    await importUserData(backupData);

    // 6. Re-attach extracted binary files to books in local IndexedDB
    if (bookFilesMap.size > 0 && backupData.database?.books) {
      for (const book of backupData.database.books) {
        const extractedFile = bookFilesMap.get(book.id);
        if (extractedFile) {
          await saveBook({
            ...book,
            file: extractedFile,
            lastRead: new Date(book.lastRead || Date.now())
          });
        }
      }
    }

    // 7. Update used usernames list with all restored accounts
    const activeUser = getUsername() || backupData.activeUser || 'default';
    const mergedUsers = Array.from(new Set([
      activeUser,
      ...getUsedUsernames(),
      ...allProfilesFound
    ].filter(p => p && !isReservedUsername(p))));
    localStorage.setItem('novel_reader_used_usernames', JSON.stringify(mergedUsers));
    localStorage.setItem('novel_reader_username', activeUser);

    return true;
  } catch (error) {
    logError('IMPORT_DATA_FROM_ZIP_FAILED', error);
    throw error;
  }
};

export const importUserData = async (data: any, isAutomatic: boolean = false) => {
  try {
    const database = await initDB();

    // Helper to convert date strings to Date objects
    const toDate = (val: any) => {
      if (!val) return val;
      if (val instanceof Date) return val;
      const date = new Date(val);
      return isNaN(date.getTime()) ? val : date;
    };

    // Import localStorage safely without overwriting the active user session
    if (data.localStorage) {
      const activeUser = getUsername();
      Object.entries(data.localStorage).forEach(([key, value]) => {
        // CRITICAL: NEVER overwrite active username from backup!
        if (key === 'novel_reader_username') return;
        if (key === 'novel_reader_used_usernames') {
          try {
            const existing = getUsedUsernames();
            const incoming = typeof value === 'string' ? JSON.parse(value) : value;
            if (Array.isArray(incoming)) {
              const merged = Array.from(new Set([...existing, ...incoming, activeUser].filter(p => p && !isReservedUsername(p))));
              localStorage.setItem('novel_reader_used_usernames', JSON.stringify(merged));
            }
          } catch (e) {
            /* ignore parse error */
          }
          return;
        }
        localStorage.setItem(key, value as string);
      });
      if (activeUser) {
        localStorage.setItem('novel_reader_username', activeUser);
      }
    }

    // Ensure notes from dedicated notes.json are restored into localStorage
    if (data.notes && Array.isArray(data.notes)) {
      const activeUser = getUsername();
      if (activeUser) {
        localStorage.setItem(`novel_reader_notes_${activeUser}`, JSON.stringify(data.notes));
      }
      localStorage.setItem('novel_reader_notes', JSON.stringify(data.notes));
    }

    const dbData = data.database;
    if (!dbData) {
      return true;
    }

    // --- PHASE 1: LOAD ALL LOCAL DATA BEFORE OPENING THE WRITE TRANSACTION ---
    // This avoids transaction auto-commit timeouts or microtask gaps during async processing.
    const localBooks = await database.getAll('books');
    const localCovers = await database.getAll('covers');

    const localBooksMap = new Map(localBooks.map(b => [b.id, b]));
    const localCoversMap = new Map();
    localCovers.forEach(c => {
      const key = c.bookId || c.id;
      if (key) {
        localCoversMap.set(key, c);
      }
    });

    // Create title + author lookup for robust book deduplication and mapping
    const localBooksByTitleAuthor = new Map();
    localBooks.forEach(b => {
      if (b.title && b.author) {
        const key = `${b.title.trim().toLowerCase()}||${b.author.trim().toLowerCase()}`;
        localBooksByTitleAuthor.set(key, b);
      }
    });

    // Track ID translations so that covers are properly mapped to the merged book IDs!
    const bookIdMapping = new Map<string, string>(); // maps backupBookId -> localBookId

    // --- PHASE 2: IN-MEMORY PROCESSING & BASE64 RECONSTRUCTION ---
    const processedBackupBooks: any[] = [];
    const processedBackupCovers: any[] = [];

    if (dbData.books) {
      for (const backupBook of dbData.books) {
        const titleAuthorKey = (backupBook.title && backupBook.author)
          ? `${backupBook.title.trim().toLowerCase()}||${backupBook.author.trim().toLowerCase()}`
          : '';

        const duplicateLocalBook = titleAuthorKey ? localBooksByTitleAuthor.get(titleAuthorKey) : null;

        let targetBookId = backupBook.id;
        let localBookToMerge = localBooksMap.get(backupBook.id);

        if (duplicateLocalBook && duplicateLocalBook.id !== backupBook.id) {
          console.log(`[importUserData] Detected duplicate book matching "${backupBook.title}". Merging backup ID (${backupBook.id}) onto existing local ID (${duplicateLocalBook.id}).`);
          targetBookId = duplicateLocalBook.id;
          localBookToMerge = duplicateLocalBook;
          bookIdMapping.set(backupBook.id, duplicateLocalBook.id);
        }

        let fileBlob: Blob | File | null = null;
        if (backupBook.fileData) {
          try {
            const mimeType = backupBook.fileMimeType || (backupBook.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip');
            fileBlob = base64ToBlob(backupBook.fileData, mimeType);
            if (backupBook.title) {
              const ext = backupBook.fileType === 'pdf' ? '.pdf' : '.epub';
              fileBlob = new File([fileBlob], `${backupBook.title}${ext}`, { type: mimeType });
            }
          } catch (e) {
            console.error('Error recreating book file from base64 during import:', e);
          }
        }

        // Preserve existing book file from local DB if backup has no binary
        let finalFile = fileBlob;
        if (!finalFile && localBookToMerge && localBookToMerge.file) {
          finalFile = localBookToMerge.file;
        }

        const { fileData, fileMimeType, ...cleanBook } = backupBook;

        processedBackupBooks.push({
          ...cleanBook,
          id: targetBookId,
          file: finalFile || backupBook.file,
          lastRead: toDate(backupBook.lastRead),
          addedAt: toDate(backupBook.addedAt)
        });
      }
    }

    if (dbData.covers) {
      for (const cover of dbData.covers) {
        const coverKey = cover.bookId || cover.id;
        if (!coverKey) continue;

        // Map cover key if its book ID was merged onto a local book ID
        const targetCoverId = bookIdMapping.get(coverKey) || coverKey;

        let imageBlob: Blob | null = null;
        if (cover.imageData) {
          try {
            imageBlob = base64ToBlob(cover.imageData, cover.imageMimeType || 'image/jpeg');
          } catch (e) {
            console.error('Error recreating cover image from base64 during import:', e);
          }
        }

        // Preserve existing cover image from local DB if backup has no binary
        let finalCoverImage = imageBlob;
        const localCover = localCoversMap.get(targetCoverId);
        if (!finalCoverImage && localCover && localCover.imageBlob) {
          finalCoverImage = localCover.imageBlob;
        }

        const { imageData, imageMimeType, ...cleanCover } = cover;

        processedBackupCovers.push({
          ...cleanCover,
          id: targetCoverId,
          bookId: targetCoverId,
          imageBlob: finalCoverImage || cover.imageBlob,
          createdAt: toDate(cover.createdAt)
        });
      }
    }

    // --- PHASE 3: WRITE ALL DATA IN A SINGLE SYNCHRONOUS WRITE TRANSACTION ---
    const storeNames = ['preferences', 'bookmarks', 'stats', 'chapters', 'navigation', 'readingSessions', 'books', 'covers'];
    const tx = database.transaction(storeNames, 'readwrite');

    // 1. Clear non-asset stores
    const storesToClear = ['preferences', 'bookmarks', 'stats', 'chapters', 'navigation', 'readingSessions'];
    for (const storeName of storesToClear) {
      try {
        await tx.objectStore(storeName as any).clear();
      } catch (clearErr) {
        console.warn(`Could not clear store ${storeName} during import:`, clearErr);
      }
    }

    // 2. Clear books and covers IF doing a manual clean import
    if (!isAutomatic) {
      try {
        await tx.objectStore('books').clear();
        await tx.objectStore('covers').clear();
      } catch (clearErr) {
        console.warn('Could not clear books and covers during manual import:', clearErr);
      }
    } else {
      // If automatic, prune deleted books from local IndexedDB if they are NOT in the backup
      // CRITICAL: ONLY prune if the backup actually has books! If backup has 0 books and local DB has books, NEVER wipe local books!
      if (processedBackupBooks.length > 0) {
        try {
          const backupBookIds = new Set(processedBackupBooks.map(b => b.id));
          for (const localBook of localBooks) {
            if (localBook && localBook.id && !backupBookIds.has(localBook.id)) {
              console.log(`Pruning deleted book from local DB: ${localBook.title} (${localBook.id})`);
              await tx.objectStore('books').delete(localBook.id);
            }
          }
        } catch (pruneError) {
          console.warn('Could not prune local books during import sync:', pruneError);
        }

        // If automatic, prune deleted covers as well
        try {
          const backupBookIds = new Set(processedBackupBooks.map(b => b.id));
          for (const localCover of localCovers) {
            const coverKey = localCover.bookId || localCover.id;
            if (coverKey && !backupBookIds.has(coverKey)) {
              console.log(`Pruning deleted cover from local DB: ${coverKey}`);
              await tx.objectStore('covers').delete(coverKey);
            }
          }
        } catch (pruneCoverErr) {
          console.warn('Could not prune local covers during import sync:', pruneCoverErr);
        }
      }
    }

    // 3. Write all new/merged data
    let restoredDefaultPref: any = null;
    if (dbData.preferences) {
      for (const pref of dbData.preferences) {
        await tx.objectStore('preferences').put(pref);
        if (pref.id === 'default' || !restoredDefaultPref) {
          restoredDefaultPref = pref;
        }
      }
    }
    if (dbData.bookmarks) {
      for (const bookmark of dbData.bookmarks) {
        // Map bookmark book ID if the book was merged
        const targetBookId = bookIdMapping.get(bookmark.bookId) || bookmark.bookId;
        await tx.objectStore('bookmarks').put({
          ...bookmark,
          bookId: targetBookId,
          createdAt: toDate(bookmark.createdAt)
        });
      }
    }
    if (dbData.stats) {
      await tx.objectStore('stats').put({
        id: 'default',
        ...dbData.stats,
        lastReadDate: toDate(dbData.stats.lastReadDate)
      });
    }
    if (dbData.chapters) {
      for (const chapter of dbData.chapters) {
        // Map chapter book ID if the book was merged
        const targetBookId = bookIdMapping.get(chapter.bookId) || chapter.bookId;
        await tx.objectStore('chapters').put({
          ...chapter,
          bookId: targetBookId,
          cachedAt: toDate(chapter.cachedAt)
        });
      }
    }
    if (dbData.navigation) {
      for (const nav of dbData.navigation) {
        // Map navigation book ID if the book was merged
        const targetBookId = bookIdMapping.get(nav.bookId) || nav.bookId;
        await tx.objectStore('navigation').put({
          ...nav,
          bookId: targetBookId,
          timestamp: toDate(nav.timestamp)
        });
      }
    }
    if (dbData.readingSessions) {
      for (const session of dbData.readingSessions) {
        // Map session book ID if the book was merged
        const targetBookId = bookIdMapping.get(session.bookId) || session.bookId;
        await tx.objectStore('readingSessions').put({
          ...session,
          bookId: targetBookId,
          startTime: toDate(session.startTime),
          endTime: toDate(session.endTime)
        });
      }
    }

    // Write processed/merged books
    for (const book of processedBackupBooks) {
      await tx.objectStore('books').put(book);
    }

    // Write processed/merged covers
    for (const cover of processedBackupCovers) {
      await tx.objectStore('covers').put(cover);
    }

    await tx.done;

    // Synchronize restored preferences immediately with runtime cache, localStorage and server
    if (restoredDefaultPref) {
      const username = getUsername() || 'default';
      setCachedPreferencesItem(restoredDefaultPref, username);
      applyPreferencesTheme(restoredDefaultPref);
      try {
        if (username && !isReservedUsername(username)) {
          fetch(`/api/userconfig?username=${encodeURIComponent(username)}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Username': username
            },
            body: JSON.stringify({ preferences: restoredDefaultPref })
          }).catch(err => console.warn('Could not sync restored preferences to server:', err));
        }
      } catch (e) {
        console.warn('Could not sync userconfig to server:', e);
      }
    }

    return true;
  } catch (error) {
    logError('IMPORT_DATA_FAILED', error);
    throw error;
  }
};
