import React, { useState, useEffect, useCallback } from 'react';
import { Library } from './components/Library';
import { ReaderContainer } from './components/Reader/ReaderContainer';
import { initDB, logError, getPreferences, savePreferences, importUserData, saveBook, getCachedPreferences, getUsername, getBook } from './utils/storage';
import { initializeLanguage } from './utils/translations';
import { dragDropController } from './utils/dragDropController';
import { applyPreferencesTheme, getInterfaceThemeFromPrefs } from './utils/themes';
import type { Book, ReadingPreferences } from './types';

const isBlobReadable = async (blob: Blob): Promise<boolean> => {
  try {
    const slice = blob.slice(0, 10);
    await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(true);
      reader.onerror = () => reject(new Error('Unreadable'));
      reader.readAsArrayBuffer(slice);
    });
    return true;
  } catch {
    return false;
  }
};

function App() {
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<ReadingPreferences | null>(() => {
    const cached = getCachedPreferences();
    if (cached) {
      applyPreferencesTheme(cached);
    }
    return cached;
  });

  // Initialize the database, language, drag drop controller, and preferences
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize language first
        initializeLanguage();
        
        // Initialize drag drop controller to prevent unwanted popups
        dragDropController.init();
        
        await initDB();

        // Load server backup if it exists
        try {
          let currentUsername = getUsername();
          // If no active username locally, query /api/profiles to see if any user exists in UserData
          if (!currentUsername) {
            try {
              const profilesRes = await fetch('/api/profiles');
              if (profilesRes.ok) {
                const profilesData = await profilesRes.json();
                if (Array.isArray(profilesData?.profiles) && profilesData.profiles.length > 0) {
                  currentUsername = profilesData.profiles[0];
                  setUsername(currentUsername);
                  console.log(`Auto-selected existing profile "${currentUsername}" from /UserData on server`);
                }
              }
            } catch (err) {
              console.warn('Could not auto-fetch profiles on startup:', err);
            }
          }

          if (currentUsername) {
            const res = await fetch(`/api/userdata?username=${encodeURIComponent(currentUsername)}`, {
              headers: { 'X-Username': currentUsername }
            });
            if (res.ok) {
              const serverData = await res.json();
              if (serverData && serverData.status !== 'empty' && serverData.database) {
                console.log(`Restoring UserData automatically for "${currentUsername}" from server backup...`);
                await importUserData(serverData, true);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load automatic server backup on startup:', e);
        }
        
        // Load preferences on mount
        const userPrefs = await getPreferences();
        setPreferences(userPrefs);
        if (userPrefs.selectedInterfaceTheme) {
          applyPreferencesTheme(userPrefs);
        }
        
        setIsInitialized(true);
        console.log('Application initialized successfully');
      } catch (error) {
        console.error('Error initializing database:', error);
        logError('APP_INIT_FAILED', error);
        setInitError('Failed to initialize the application. Please refresh the page.');
        setIsInitialized(true); // Still show the UI even if DB fails
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      // Note: We don't destroy the singleton dragDropController here
      // as it should persist for the entire app lifecycle
    };
  }, []);

  // Handle browser navigation and URL parsing
  useEffect(() => {
    const handleRouting = () => {
      const path = window.location.pathname;
      const bookTitleMatch = path.match(/^\/([^/]+)\/chapter\/(\d+)$/);
      
      if (bookTitleMatch && currentBook) {
        const chapterNumber = parseInt(bookTitleMatch[2], 10);
        // Update current chapter if different from URL
        if (chapterNumber - 1 !== currentBook.currentChapter) {
          setCurrentBook(prev => prev ? { ...prev, currentChapter: chapterNumber - 1 } : null);
        }
      }
    };

    handleRouting();
    window.addEventListener('popstate', handleRouting);
    
    return () => {
      window.removeEventListener('popstate', handleRouting);
    };
  }, [currentBook]);

  const handleOpenBook = async (book: Book) => {
    try {
      // Query the freshest book record directly from IndexedDB to ensure accurate currentChapter and progress
      const freshBook = await getBook(book.id);
      let activeBook: Book = freshBook ? { ...freshBook, file: book.file || freshBook.file } : { ...book };

      // Validate readability and recover book if needed
      let readable = false;
      if (activeBook.file && activeBook.file.size > 0) {
        readable = await isBlobReadable(activeBook.file);
      }

      if (!readable) {
        console.log(`Book file for "${book.title}" is missing, empty, or unreadable in IndexedDB. Attempting recovery from server...`);
        try {
          const currentUsername = getUsername();
          const res = await fetch(`/api/book-file/${book.id}?username=${encodeURIComponent(currentUsername)}`, {
            headers: { 'X-Username': currentUsername }
          });
          if (!res.ok) {
            throw new Error(`Server copy not found (HTTP ${res.status})`);
          }
          const blob = await res.blob();
          const getMimeAndExt = (fileType?: string) => {
            switch (fileType) {
              case 'pdf':
                return { mimeType: 'application/pdf', ext: '.pdf' };
              case 'mobi':
                return { mimeType: 'application/x-mobipocket-ebook', ext: '.mobi' };
              case 'azw3':
                return { mimeType: 'application/vnd.amazon.mobi8-ebook', ext: '.azw3' };
              case 'azw':
                return { mimeType: 'application/vnd.amazon.ebook', ext: '.azw' };
              case 'kfx':
                return { mimeType: 'application/vnd.amazon.kfx', ext: '.kfx' };
              case 'txt':
                return { mimeType: 'text/plain', ext: '.txt' };
              case 'epub':
              default:
                return { mimeType: 'application/epub+zip', ext: '.epub' };
            }
          };

          const { mimeType, ext } = getMimeAndExt(book.fileType);
          const file = new File([blob], `${book.title}${ext}`, { type: mimeType });

          activeBook.file = file;

          // Save back to local DB so it is restored locally for subsequent reads (skipping redundant re-upload)
          await saveBook(activeBook, true);
          console.log(`Successfully recovered and cached book file for "${book.title}"`);
        } catch (recoveryError) {
          console.error('Failed to recover book from server:', recoveryError);
          throw new Error('Book file is missing and could not be downloaded from the server.');
        }
      }
      
      setCurrentBook(activeBook);
      
      // Update URL for the book
      const bookTitle = activeBook.title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      
      const newUrl = `/${bookTitle}/chapter/${activeBook.currentChapter + 1}`;
      window.history.pushState(
        { bookId: activeBook.id, chapterIndex: activeBook.currentChapter },
        `${activeBook.title} - Chapter ${activeBook.currentChapter + 1}`,
        newUrl
      );
    } catch (error: any) {
      console.error('Error opening book:', error);
      logError('OPEN_BOOK_FAILED', error, { bookId: book.id });
      alert(error.message || 'Failed to open the book. The file may be corrupted.');
    }
  };

  const handlePreferencesChange = useCallback((newPrefs: ReadingPreferences) => {
    setPreferences(newPrefs);
    applyPreferencesTheme(newPrefs);
    savePreferences(newPrefs).catch(err => console.error('Error saving preferences from App:', err));
  }, []);

  const handleBackToLibrary = useCallback(async () => {
    setCurrentBook(null);
    
    // Reset URL to root
    window.history.pushState(null, 'Novel Reader', '/');

    // Dispatch real-time refresh to update reading progress on bookshelf immediately
    window.dispatchEvent(new CustomEvent('booksChanged'));

    // Reload preferences to sync any changes made inside the reader settings
    try {
      const updatedPrefs = await getPreferences();
      setPreferences(updatedPrefs);
      applyPreferencesTheme(updatedPrefs);
    } catch (error) {
      console.error('Error refreshing preferences on return to library:', error);
    }
  }, []);

  if (!isInitialized) {
    const theme = preferences ? getInterfaceThemeFromPrefs(preferences) : null;
    const bgColor = theme?.colors?.panelSecondaryBackground || '#f3f4f6';
    const textColor = theme?.colors?.headerText || '#1f2937';
    const accentColor = theme?.colors?.accent || '#007BFF';

    return (
      <div 
        className="min-h-screen flex items-center justify-center transition-all duration-300"
        style={{ backgroundColor: bgColor, color: textColor }}
      >
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: accentColor }}
          ></div>
          <p className="opacity-80">Initializing eBook Reader...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Initialization Error</h2>
          <p className="text-gray-600 mb-4">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div style={{ display: currentBook ? 'block' : 'none' }}>
        {currentBook && (
          <ReaderContainer
            book={currentBook}
            onBackToLibrary={handleBackToLibrary}
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />
        )}
      </div>
      <div style={{ display: currentBook ? 'none' : 'block' }}>
        <Library 
          onOpenBook={handleOpenBook} 
          preferences={preferences}
          onPreferencesChange={handlePreferencesChange}
          isActive={!currentBook}
        />
      </div>
    </div>
  );
}

export default App;
