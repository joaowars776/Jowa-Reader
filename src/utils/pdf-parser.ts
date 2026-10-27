import * as pdfjsLib from 'pdfjs-dist';
// @ts-expect-error - Vite handles ?url suffix
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { saveCoverImage, logError } from './storage';
import type { Book, Chapter } from '../types';

// Configure PDF.js worker using local asset for offline support
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export class PdfParser {
  private pdf: any;
  public isDestroyed: boolean = false;
  private file: File;
  private searchCache: Map<string, any> = new Map();

  constructor(file: File) {
    this.file = file;
  }

  async initialize() {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const arrayBuffer = await this.file.arrayBuffer();
      this.pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      return this;
    } catch (error) {
      logError('PDF_PARSER_READY_FAILED', error);
      throw error;
    }
  }

  async getMetadata(): Promise<{ title: string; author: string; cover?: string; metadata?: any }> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const metadata = await this.pdf.getMetadata();
      let cover: string | undefined;

      // Try to generate cover from first page
      try {
        const page = await this.pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          // Convert canvas to blob
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((blob) => {
              resolve(blob!);
            }, 'image/jpeg', 0.8);
          });

          if (blob && blob.size > 0) {
            // Generate a temporary book ID for caching
            const tempId = `temp-${Date.now()}`;
            await saveCoverImage(tempId, blob);
            
            // Create object URL for immediate use
            cover = URL.createObjectURL(blob);
          }
        }
      } catch (error) {
        console.warn('Could not generate cover from first page:', error);
        logError('PDF_COVER_GENERATION_FAILED', error);
      }

      // Extract more detailed metadata
      const info = metadata.info || {};
      const extraMetadata: any = {
        subject: info.Subject,
        keywords: info.Keywords,
        producer: info.Producer,
        creator: info.Creator,
        creationDate: info.CreationDate,
        modDate: info.ModDate,
        tags: info.Keywords ? info.Keywords.split(/[,;]+/).map((k: string) => k.trim()).filter(Boolean) : []
      };

      return {
        title: info.Title || this.file.name.replace('.pdf', '') || 'Unknown Title',
        author: info.Author || 'Unknown Author',
        cover,
        metadata: extraMetadata
      };
    } catch (error) {
      logError('GET_PDF_METADATA_FAILED', error);
      throw error;
    }
  }

  async getTableOfContents(): Promise<Chapter[]> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const chapters: Chapter[] = [];
      const numPages = this.pdf.numPages;

      // Try to get outline (bookmarks) from PDF
      try {
        const outline = await this.pdf.getOutline();
        if (outline && outline.length > 0) {
          let order = 0;
          
          const processOutlineItem = async (item: any, level: number = 0): Promise<void> => {
            const pageRef = item.dest;
            let pageNumber = 1;
            
            if (pageRef) {
              try {
                const pageIndex = await this.pdf.getPageIndex(pageRef[0]);
                pageNumber = pageIndex + 1;
              } catch (error) {
                console.warn('Could not resolve page reference:', error);
              }
            }

            chapters.push({
              id: `chapter-${order}`,
              title: item.title || `Chapter ${order + 1}`,
              content: '',
              startIndex: 0,
              endIndex: 0,
              pageNumber: pageNumber,
              href: `page-${pageNumber}` // Keep href for internal logic
            });
            order++;

            if (item.items && item.items.length > 0) {
              for (const subItem of item.items) {
                await processOutlineItem(subItem, level + 1);
              }
            }
          };

          for (const item of outline) {
            await processOutlineItem(item);
          }
        }
      } catch (error) {
        console.warn('Could not load PDF outline:', error);
      }

      // Fallback: create chapters based on page ranges if no outline
      if (chapters.length === 0) {
        const pagesPerChapter = Math.max(1, Math.floor(numPages / 20)); // Max 20 chapters
        
        for (let i = 0; i < numPages; i += pagesPerChapter) {
          const startPage = i + 1;
          const endPage = Math.min(i + pagesPerChapter, numPages);
          
          chapters.push({
            id: `chapter-${chapters.length}`,
            title: endPage === startPage ? `Page ${startPage}` : `Pages ${startPage}-${endPage}`,
            content: '',
            startIndex: 0,
            endIndex: 0,
            pageNumber: startPage,
            href: `page-${startPage}` // Keep href for internal logic
          });
        }
      }

      return chapters;
    } catch (error) {
      logError('GET_PDF_TOC_FAILED', error);
      throw error;
    }
  }

  async getPageContent(pageNumber: number): Promise<string> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const page = await this.pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      
      let text = '';
      textContent.items.forEach((item: any) => {
        if (item.str) {
          text += item.str + ' ';
        }
      });

      // Basic formatting - add line breaks for better readability
      text = text.replace(/\s+/g, ' ').trim();
      
      // Remove specific boilerplate text requested by user
      text = text.replace(/If audio player doesn't work, press Stop then Play button again/gi, '');
      
      // Try to detect paragraphs and add proper formatting
      const sentences = text.split(/[.!?]+/);
      const formattedText = sentences
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0)
        .map(sentence => `<p>${sentence}.</p>`)
        .join('\n');

      // Render high-fidelity visual image of the PDF page with all illustrations/diagrams/images
      let imageHtml = '';
      try {
        const viewport = page.getViewport({ scale: 1.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport
          }).promise;
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          imageHtml = `<div class="pdf-page-visual-container my-4 text-center select-none" data-page="${pageNumber}"><img src="${dataUrl}" alt="Página ${pageNumber}" class="pdf-page-image mx-auto rounded-xl shadow-lg border border-black/10 dark:border-white/10 max-w-full h-auto" /></div>`;
        }
        // Cleanup canvas dimensions
        canvas.width = 0;
        canvas.height = 0;
      } catch (imgErr) {
        console.warn(`Could not render visual page image for page ${pageNumber}:`, imgErr);
      }

      return `${imageHtml}<div class="pdf-extracted-text mt-4">${formattedText || `<p>Page ${pageNumber}</p>`}</div>`;
    } catch (error) {
      console.error('Error loading page content:', error);
      logError('GET_PDF_PAGE_CONTENT_FAILED', error, { pageNumber });
      return `<p>Error loading page ${pageNumber} content.</p>`;
    }
  }

  async getChapterContent(href: string): Promise<string> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const pageMatch = href.match(/page-(\d+)/);
      if (!pageMatch) {
        throw new Error(`Invalid page reference: ${href}`);
      }

      const pageNumber = parseInt(pageMatch[1], 10);
      return await this.getPageContent(pageNumber);
    } catch (error) {
      console.error('Error loading chapter content:', error);
      logError('GET_PDF_CHAPTER_CONTENT_FAILED', error, { href });
      return '<p>Error loading chapter content.</p>';
    }
  }

  async getAllChapters(): Promise<Chapter[]> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const toc = await this.getTableOfContents();
      const chaptersWithContent: Chapter[] = [];
      
      // Load chapters in small sequential chunks to prevent memory spikes & UI freezing
      const chunkSize = 5;
      for (let i = 0; i < toc.length; i += chunkSize) {
        if (this.isDestroyed) break;
        const chunk = toc.slice(i, i + chunkSize);
        const results = await Promise.all(
          chunk.map(async (chapter) => {
            try {
              const content = await this.getChapterContent(chapter.href);
              return { ...chapter, content };
            } catch (error) {
              console.warn(`Failed to load content for chapter: ${chapter.title}`, error);
              return { ...chapter, content: '<p>Failed to load chapter content.</p>' };
            }
          })
        );
        chaptersWithContent.push(...results);
      }

      return chaptersWithContent;
    } catch (error) {
      logError('GET_ALL_PDF_CHAPTERS_FAILED', error);
      throw error;
    }
  }

  async searchText(query: string, chapterIndex?: number): Promise<Array<{ chapterIndex: number; matches: Array<{ text: string; position: number; start: number; end: number }> }>> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      // Check cache first with key distinct for full book vs specific chapter searches
      const cacheKey = `${query.toLowerCase()}_ch_${chapterIndex !== undefined ? chapterIndex : 'all'}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey);
      }
      
      let chaptersToSearch: Array<{ chapter: Chapter; originalIndex: number }> = [];
      
      if (chapterIndex !== undefined) {
        const toc = await this.getTableOfContents();
        const chapter = toc[chapterIndex];
        if (chapter) {
          try {
            const content = await this.getChapterContent(chapter.href);
            chaptersToSearch.push({
              chapter: { ...chapter, content },
              originalIndex: chapterIndex
            });
          } catch (e) {
            console.warn(`Failed to load content for search chapter ${chapterIndex}:`, e);
          }
        }
      } else {
        const allChapters = await this.getAllChapters();
        chaptersToSearch = allChapters.map((chapter, index) => ({
          chapter,
          originalIndex: index
        }));
      }
      
      const results: Array<{ chapterIndex: number; matches: Array<{ text: string; position: number; start: number; end: number }> }> = [];
      
      // Use a more efficient search approach for large texts
      const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

      chaptersToSearch.forEach(({ chapter, originalIndex }) => {
        try {
          const content = this.stripHtml(chapter.content);
          const matches: Array<{ text: string; position: number; start: number; end: number }> = [];
          
          // Use a more efficient search method
          let match;
          const maxMatches = 100; // Limit matches per chapter for performance

          while ((match = searchRegex.exec(content)) !== null && matches.length < maxMatches) {
            const contextStart = Math.max(0, match.index - 50);
            const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
            const context = content.substring(contextStart, contextEnd);

            matches.push({
              text: context,
              position: match.index,
              start: match.index - contextStart,
              end: match.index - contextStart + match[0].length
            });

            // Prevent infinite loop
            if (searchRegex.lastIndex === match.index) {
              searchRegex.lastIndex++;
            }
            
            // Break if we've found too many matches (performance optimization)
            if (matches.length >= maxMatches) {
              break;
            }
          }

          if (matches.length > 0) {
            results.push({ chapterIndex: originalIndex, matches });
          }
        } catch (error) {
          console.warn(`Search failed for chapter ${originalIndex}:`, error);
        }
      });

      // Cache the results for this query (limit cache size)
      if (this.searchCache.size > 50) {
        // Clear oldest entries
        const firstKey = this.searchCache.keys().next().value;
        this.searchCache.delete(firstKey);
      }
      this.searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      logError('PDF_SEARCH_TEXT_FAILED', error, { query, chapterIndex });
      throw error;
    }
  }

  private stripHtml(html: string): string {
    if (!html) return '';
    try {
      // High-performance regex-based HTML tag removal, avoiding costly browser DOM parsing
      let text = html.replace(/<[^>]*>/g, ' ');
      text = text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");
      return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
      console.warn('Failed to strip HTML with regex:', error);
      return html;
    }
  }

  async cacheCoverImage(bookId: string): Promise<void> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      // Generate cover from first page
      const page = await this.pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => {
            resolve(blob!);
          }, 'image/jpeg', 0.9);
        });

        if (blob && blob.size > 0) {
          await saveCoverImage(bookId, blob);
        }
      }
    } catch (error) {
      console.warn('Could not cache PDF cover image:', error);
      logError('CACHE_PDF_COVER_FAILED', error, { bookId });
    }
  }

  destroy() {
    try {
      this.isDestroyed = true;
      
      // Clear search cache
      this.searchCache.clear();
      
      if (this.pdf) {
        try {
          this.pdf.destroy();
        } catch (e) {
          console.warn('Error destroying PDF:', e);
        }
        this.pdf = null;
      }
    } catch (error) {
      console.warn('Error during PDF parser destruction:', error);
    }
  }
}

export const createBookFromPdfFile = async (file: File): Promise<Omit<Book, 'id'>> => {
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file: File is empty or corrupted');
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Invalid file type: Only PDF files are supported');
    }

    const parser = new PdfParser(file);
    await parser.initialize();
    
    const metadata = await parser.getMetadata();
    const toc = await parser.getTableOfContents();
    const chaptersCount = toc.length;
    
    const book: Omit<Book, 'id'> = {
      title: metadata.title,
      author: metadata.author,
      cover: metadata.cover,
      metadata: {
        ...(metadata.metadata || {}),
        chaptersCount,
        chapters: toc.map(c => ({ id: c.id, title: c.title, href: c.href, order: c.order }))
      },
      file,
      addedAt: new Date(),
      lastRead: new Date(),
      progress: 0,
      currentChapter: 0,
      totalPages: chaptersCount,
      scrollPosition: 0,
      fileType: 'pdf' // Add file type identifier
    };

    parser.destroy();
    return book;
  } catch (error) {
    logError('CREATE_BOOK_FROM_PDF_FILE_FAILED', error, { 
      fileName: file?.name, 
      fileSize: file?.size 
    });
    throw error;
  }
};
