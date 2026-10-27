import { useState, useEffect, useCallback, useRef } from 'react';
import { saveBook, getBook } from '../utils/storage';
import type { Book } from '../types';

export const useReadingProgress = (bookId: string, initialBook?: Book | null) => {
  const [book, setBook] = useState<Book | null>(initialBook || null);
  const [isLoading, setIsLoading] = useState(!initialBook);
  const [lastSave, setLastSave] = useState<Date>(new Date());

  // Load book data
  useEffect(() => {
    let isMounted = true;
    const loadBook = async () => {
      try {
        const bookData = await getBook(bookId);
        if (bookData && isMounted) {
          setBook(bookData);
        }
      } catch (error) {
        console.error('Error loading book:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (bookId) {
      loadBook();
    }
    return () => { isMounted = false; };
  }, [bookId]);

  // Create a ref to store the latest book state for stable interval auto-saves
  const bookRef = useRef<Book | null>(book);
  useEffect(() => {
    bookRef.current = book;
  }, [book]);

  // Auto-save progress every 30 seconds stably
  useEffect(() => {
    if (!bookId) return;

    const interval = setInterval(async () => {
      const currentBook = bookRef.current;
      if (!currentBook) return;
      try {
        await saveBook(currentBook, true);
        setLastSave(new Date());
      } catch (error) {
        console.error('Error auto-saving progress:', error);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [bookId]);

  const updateProgress = useCallback(async (updates: Partial<Pick<Book, 'progress' | 'currentChapter' | 'scrollPosition' | 'lastRead'>>) => {
    setBook((prevBook) => {
      const targetBook = prevBook || initialBook;
      if (!targetBook) return null;

      const updatedBook: Book = {
        ...targetBook,
        ...updates,
        lastRead: new Date()
      };

      // Save immediately
      saveBook(updatedBook, true).then(() => {
        setLastSave(new Date());
        window.dispatchEvent(new CustomEvent('booksChanged', { detail: { bookId: updatedBook.id } }));
      }).catch((error) => {
        console.error('Error saving progress:', error);
      });

      return updatedBook;
    });
  }, [initialBook]);

  const saveProgress = useCallback(async () => {
    if (!book) return;

    try {
      await saveBook(book);
      setLastSave(new Date());
    } catch (error) {
      console.error('Error manually saving progress:', error);
    }
  }, [book]);

  return {
    book,
    isLoading,
    lastSave,
    updateProgress,
    saveProgress
  };
};
