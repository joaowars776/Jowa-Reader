import { EpubParser } from './epub-parser';
import { PdfParser } from './pdf-parser';
import type { Chapter } from '../types';

interface BookCacheEntry {
  toc: Chapter[];
  parser: EpubParser | PdfParser;
  chaptersContent: Record<string, string>; // href -> content
}

const cache = new Map<string, BookCacheEntry>();

export const getBookCache = (bookId: string): BookCacheEntry | undefined => {
  return cache.get(bookId);
};

export const setBookCache = (bookId: string, entry: BookCacheEntry): void => {
  cache.set(bookId, entry);
};

export const clearBookCache = (bookId?: string): void => {
  if (bookId) {
    const entry = cache.get(bookId);
    if (entry) {
      // Safely destroy parser reference if needed
      try {
        entry.parser.destroy();
      } catch (e) {
        console.warn('Error destroying cached parser:', e);
      }
    }
    cache.delete(bookId);
  } else {
    cache.forEach(entry => {
      try {
        entry.parser.destroy();
      } catch (e) {
        console.warn('Error destroying cached parser:', e);
      }
    });
    cache.clear();
  }
};
