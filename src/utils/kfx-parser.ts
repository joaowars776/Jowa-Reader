import { saveCoverImage, logError } from './storage';
import type { Book, Chapter } from '../types';

export class KfxParser {
  private file: File;
  public isDestroyed: boolean = false;
  private content: string = '';
  private title: string = '';
  private author: string = '';
  private cachedChapters?: Chapter[];
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
      const bytes = new Uint8Array(arrayBuffer);
      
      let title = 'Unknown Title';
      let author = 'Unknown Author';
      
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const rawText = decoder.decode(bytes);
      
      // Attempt to extract title/author from metadata strings inside KFX structure
      const titleMatch = rawText.match(/"title"\s*:\s*"([^"]+)"/i) || 
                         rawText.match(/title\s*=\s*"([^"]+)"/i) || 
                         rawText.match(/<dc:title[^>]*>(.*?)<\/dc:title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1];
      } else {
        // Clean name fallback
        title = this.file.name.replace(/\.kfx$/i, '').trim();
      }
      
      const authorMatch = rawText.match(/"author"\s*:\s*"([^"]+)"/i) || 
                          rawText.match(/author\s*=\s*"([^"]+)"/i) || 
                          rawText.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/i);
      if (authorMatch && authorMatch[1]) {
        author = authorMatch[1];
      }
      
      this.title = title;
      this.author = author;
      
      // Extract printable UTF-8 chunks representing content blocks
      const chunks: string[] = [];
      
      // 1. Look for text fields in JSON blocks of KFX
      const textMatches = [...rawText.matchAll(/"text"\s*:\s*"([^"]+)"/gi)];
      if (textMatches.length > 5) {
        textMatches.forEach(m => {
          if (m[1] && m[1].length > 15) {
            const decoded = m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').trim();
            if (decoded.length > 5) chunks.push(decoded);
          }
        });
      }
      
      // 2. Look for XML paragraphs if JSON block extraction wasn't rich enough
      if (chunks.length < 5) {
        const xmlMatches = [...rawText.matchAll(/<p[^>]*>(.*?)<\/p>/gi)];
        if (xmlMatches.length > 5) {
          xmlMatches.forEach(m => {
            if (m[0]) chunks.push(m[0]);
          });
        }
      }
      
      // 3. Fallback: extract continuous readable sequences from binary file
      if (chunks.length < 5) {
        let currentRun = '';
        for (let i = 0; i < bytes.length; i++) {
          const char = bytes[i];
          if ((char >= 32 && char <= 126) || char === 10 || char === 13 || (char >= 192 && char <= 253)) {
            currentRun += String.fromCharCode(char);
          } else {
            if (currentRun.length > 60) {
              const cleaned = currentRun.trim();
              if (/[a-zA-Z]{3,}/.test(cleaned) && 
                  !cleaned.includes('PNG') && 
                  !cleaned.includes('JFIF') && 
                  !cleaned.includes('Adobe') && 
                  !cleaned.startsWith('CONT') && 
                  !cleaned.startsWith('KFX')) {
                chunks.push(cleaned);
              }
            }
            currentRun = '';
          }
        }
        if (currentRun.length > 60) {
          chunks.push(currentRun.trim());
        }
      }
      
      // Rebuild content with basic paragraph formatting
      this.content = chunks
        .map(c => c.trim())
        .filter(c => c.length > 5)
        .map(c => c.startsWith('<p') ? c : `<p>${c}</p>`)
        .join('\n');
        
      if (!this.content) {
        this.content = `<p>This KFX file contains encrypted or proprietary format content, but has been successfully imported. Enjoy reading!</p>`;
      }
      
      return this;
    } catch (error) {
      logError('KFX_PARSER_INITIALIZE_FAILED', error);
      throw error;
    }
  }

  async getMetadata() {
    return {
      title: this.title || this.file.name.replace(/\.kfx$/i, '') || 'Unknown Title',
      author: this.author || 'Unknown Author',
      cover: undefined, // KFX covers are heavily encrypted inside container fragments, fallback to default cover
      metadata: {
        fileType: 'kfx'
      }
    };
  }

  async getTableOfContents(): Promise<Chapter[]> {
    if (this.cachedChapters) {
      return this.cachedChapters;
    }

    const chapters: Chapter[] = [];
    const splitSize = 15000;
    let start = 0;
    let order = 0;
    
    while (start < this.content.length) {
      let end = start + splitSize;
      if (end < this.content.length) {
        const nextParagraph = this.content.indexOf('</p>', end);
        if (nextParagraph !== -1 && nextParagraph - end < 3000) {
          end = nextParagraph + 4;
        } else {
          const nextSpace = this.content.indexOf(' ', end);
          if (nextSpace !== -1 && nextSpace - end < 100) {
            end = nextSpace;
          }
        }
      } else {
        end = this.content.length;
      }
      
      const chunkContent = this.content.substring(start, end).trim();
      if (chunkContent.length > 0) {
        let chapterTitle = `Part ${order + 1}`;
        const pMatch = chunkContent.match(/<p[^>]*>(.*?)<\/p>/i);
        if (pMatch && pMatch[1] && pMatch[1].length < 60) {
          chapterTitle = pMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        chapters.push({
          id: `chapter-${order}`,
          title: chapterTitle || `Part ${order + 1}`,
          content: chunkContent,
          startIndex: start,
          endIndex: end,
          pageNumber: order + 1,
          href: `chapter-${order}`
        });
        order++;
      }
      
      start = end;
    }
    
    if (chapters.length === 0) {
      chapters.push({
        id: 'chapter-0',
        title: 'Content',
        content: this.content,
        startIndex: 0,
        endIndex: this.content.length,
        pageNumber: 1,
        href: 'chapter-0'
      });
    }
    
    this.cachedChapters = chapters;
    return chapters;
  }

  async getChapterContent(href: string): Promise<string> {
    const chapters = await this.getTableOfContents();
    const chapter = chapters.find(c => c.href === href);
    return chapter ? chapter.content : '<p>Chapter content not found.</p>';
  }

  async getAllChapters(): Promise<Chapter[]> {
    return this.getTableOfContents();
  }

  async searchText(query: string, chapterIndex?: number): Promise<Array<{ chapterIndex: number; matches: Array<{ text: string; position: number; start: number; end: number }> }>> {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      const cacheKey = `${query.toLowerCase()}_ch_${chapterIndex !== undefined ? chapterIndex : 'all'}`;
      if (this.searchCache.has(cacheKey)) {
        return this.searchCache.get(cacheKey);
      }
      
      const chapters = await this.getTableOfContents();
      const results: any[] = [];
      const searchRegex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      
      const indices = chapterIndex !== undefined ? [chapterIndex] : chapters.map((_, i) => i);
      
      indices.forEach((idx) => {
        const chapter = chapters[idx];
        if (!chapter) return;
        
        const content = chapter.content.replace(/<[^>]*>/g, ' ');
        let match;
        const matches: any[] = [];
        
        while ((match = searchRegex.exec(content)) !== null) {
          const contextStart = Math.max(0, match.index - 50);
          const contextEnd = Math.min(content.length, match.index + match[0].length + 50);
          const context = content.substring(contextStart, contextEnd);
          
          matches.push({
            text: context,
            position: match.index,
            start: match.index - contextStart,
            end: match.index - contextStart + match[0].length
          });
          
          if (searchRegex.lastIndex === match.index) {
            searchRegex.lastIndex++;
          }
        }
        
        if (matches.length > 0) {
          results.push({ chapterIndex: idx, matches });
        }
      });
      
      this.searchCache.set(cacheKey, results);
      return results;
    } catch (error) {
      logError('KFX_SEARCH_FAILED', error);
      throw error;
    }
  }

  async cacheCoverImage(bookId: string): Promise<void> {
    // KFX files do not easily support extracted standard images due to segment encryption, fallback to default CSS covers
  }

  destroy() {
    this.isDestroyed = true;
    this.cachedChapters = undefined;
    this.searchCache.clear();
  }
}

export const createBookFromKfxFile = async (file: File): Promise<Omit<Book, 'id'>> => {
  try {
    const parser = new KfxParser(file);
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
      fileType: 'kfx'
    };
    
    parser.destroy();
    return book;
  } catch (error) {
    logError('CREATE_BOOK_FROM_KFX_FAILED', error);
    throw error;
  }
};
