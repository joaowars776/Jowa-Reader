import ePub from 'epubjs';
import { saveCoverImage, logError } from './storage';
import type { Book, Chapter } from '../types';

// Safely monkey-patch ePub Book & Rendition prototypes to permanently prevent
// "Cannot read properties of undefined (reading 'displayOptions')" or "fixedLayout"
try {
  const BookClass = (ePub as any)?.Book || (ePub as any);
  const RenditionClass = (ePub as any)?.Rendition;

  // 1. Ensure Book.prototype always has a fallback displayOptions
  if (BookClass && BookClass.prototype) {
    if (!BookClass.prototype.displayOptions) {
      BookClass.prototype.displayOptions = { fixedLayout: 'false', destroy: () => {} };
    }

    // Patch Book.prototype.destroy so it doesn't set this.loaded to undefined
    // which causes late async tasks like this.loaded.displayOptions.then() to crash
    const originalBookDestroy = BookClass.prototype.destroy;
    if (originalBookDestroy) {
      BookClass.prototype.destroy = function(...args: any[]) {
        try {
          // Provide safe dummy resolved promises before destruction to prevent uncaught rejections
          const safePromise = Promise.resolve();
          const safeLoaded = {
            manifest: safePromise,
            spine: safePromise,
            metadata: safePromise,
            cover: safePromise,
            navigation: safePromise,
            pageList: safePromise,
            resources: safePromise,
            displayOptions: safePromise
          };
          const safeLoading = {
            manifest: { resolve: () => {}, promise: safePromise },
            spine: { resolve: () => {}, promise: safePromise },
            metadata: { resolve: () => {}, promise: safePromise },
            cover: { resolve: () => {}, promise: safePromise },
            navigation: { resolve: () => {}, promise: safePromise },
            pageList: { resolve: () => {}, promise: safePromise },
            resources: { resolve: () => {}, promise: safePromise },
            displayOptions: { resolve: () => {}, promise: safePromise }
          };
          
          if (!this.displayOptions) {
            this.displayOptions = { fixedLayout: 'false', destroy: () => {} };
          }
          
          const result = originalBookDestroy.apply(this, args);
          
          // Re-attach safe fallback mocks instead of leaving them undefined
          this.loaded = safeLoaded;
          this.loading = safeLoading;
          this.displayOptions = { fixedLayout: 'false', destroy: () => {} };
          
          return result;
        } catch (destroyErr) {
          console.warn('Error during Book.prototype.destroy:', destroyErr);
        }
      };
    }
  }

  // 2. Patch Rendition.prototype.start to guard this.book and this.book.displayOptions
  if (RenditionClass && RenditionClass.prototype && RenditionClass.prototype.start) {
    const originalStart = RenditionClass.prototype.start;
    RenditionClass.prototype.start = function(...args: any[]) {
      if (!this.book) {
        this.book = {
          package: { metadata: { layout: 'reflowable', spread: 'none' } },
          displayOptions: { fixedLayout: 'false', destroy: () => {} }
        };
      } else {
        if (!this.book.package) {
          this.book.package = { metadata: { layout: 'reflowable', spread: 'none' } };
        } else if (!this.book.package.metadata) {
          this.book.package.metadata = { layout: 'reflowable', spread: 'none' };
        }
        if (!this.book.displayOptions) {
          this.book.displayOptions = { fixedLayout: 'false', destroy: () => {} };
        }
      }
      return originalStart.apply(this, args);
    };
  }
} catch (patchErr) {
  console.warn('Could not patch ePub prototypes:', patchErr);
}

export class EpubParser {
  private book: any;
  private rendition: any;
  public isDestroyed: boolean = false;
  private searchCache: Map<string, any> = new Map();

  constructor(file: File) {
    try {
      this.book = ePub(file);
      
      let currentRendition: any = {};
      
      const themesProxy = new Proxy({}, {
        get(target: any, prop: string | symbol) {
          const originalThemes = currentRendition && currentRendition.themes;
          if (originalThemes && prop in originalThemes) {
            const val = originalThemes[prop];
            if (typeof val === 'function') {
              return val.bind(originalThemes);
            }
            return val;
          }
          // Fallback dummy methods
          return () => {};
        }
      });

      const renditionProxy = new Proxy({}, {
        get(target: any, prop: string | symbol) {
          if (prop === 'themes') {
            return themesProxy;
          }
          if (prop === 'hooks') {
            if (currentRendition && currentRendition.hooks) {
              return currentRendition.hooks;
            }
            return {
              content: {
                register: () => {},
                deregister: () => {},
                run: () => Promise.resolve()
              }
            };
          }
          
          if (currentRendition && prop in currentRendition) {
            const val = currentRendition[prop];
            if (typeof val === 'function') {
              return val.bind(currentRendition);
            }
            return val;
          }

          if (prop === 'destroy') {
            return () => {};
          }
          return undefined;
        }
      });

      Object.defineProperty(this.book, 'rendition', {
        get() {
          return renditionProxy;
        },
        set(val) {
          if (val) {
            currentRendition = val;
          }
        },
        configurable: true,
        enumerable: true
      });

      // Guard against epubjs race condition where this.resources is set to undefined before .then(() => this.resources.replaceCss())
      let currentResources = this.book.resources;
      Object.defineProperty(this.book, 'resources', {
        get() {
          if (!currentResources) {
            return {
              replaceCss: () => Promise.resolve([]),
              replacements: () => Promise.resolve([]),
              destroy: () => {},
              substitute: (content: any) => content,
              settings: {}
            };
          }
          return currentResources;
        },
        set(val) {
          currentResources = val;
        },
        configurable: true,
        enumerable: true
      });

      // Guard against missing displayOptions on this.book
      let currentDisplayOptions = this.book.displayOptions || { fixedLayout: "false", destroy: () => {} };
      Object.defineProperty(this.book, 'displayOptions', {
        get() {
          return currentDisplayOptions || { fixedLayout: "false", destroy: () => {} };
        },
        set(val) {
          currentDisplayOptions = val || { fixedLayout: "false", destroy: () => {} };
        },
        configurable: true,
        enumerable: true
      });
    } catch (error) {
      logError('EPUB_PARSER_INIT_FAILED', error, { fileName: file.name, fileSize: file.size });
      throw error;
    }
  }

  async initialize() {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      await this.book.ready;
      return this;
    } catch (error) {
      logError('EPUB_PARSER_READY_FAILED', error);
      throw error;
    }
  }

  async getMetadata(): Promise<{ title: string; author: string; cover?: string; metadata?: any }> {
    try {
      if (this.isDestroyed || !this.book) {
        throw new Error('Parser has been destroyed');
      }
      
      await this.book.ready;
      
      const metadata = this.book.packaging.metadata;
      let cover: string | undefined;

      // Try to get cover image and cache it
      try {
        const coverUrl = await this.book.coverUrl();
        if (coverUrl) {
          // Fetch the cover image and convert to blob for storage
          const response = await fetch(coverUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch cover: ${response.status}`);
          }
          
          const blob = await response.blob();
          
          // Validate blob
          if (blob.size === 0) {
            throw new Error('Cover image is empty');
          }
          
          // Generate a temporary book ID for caching
          const tempId = `temp-${Date.now()}`;
          await saveCoverImage(tempId, blob);
          
          // Create object URL for immediate use
          cover = URL.createObjectURL(blob);
        }
      } catch (error) {
        console.warn('Could not load cover image:', error);
        logError('COVER_LOAD_FAILED', error);
      }

      // Extract more detailed metadata
      const extraMetadata: any = {
        publisher: metadata.publisher,
        description: metadata.description,
        pubdate: metadata.pubdate,
        language: metadata.language,
        rights: metadata.rights,
        tags: Array.isArray(metadata.subject) ? metadata.subject : (metadata.subject ? [metadata.subject] : [])
      };

      return {
        title: metadata.title || 'Unknown Title',
        author: metadata.creator || 'Unknown Author',
        cover,
        metadata: extraMetadata
      };
    } catch (error) {
      logError('GET_METADATA_FAILED', error);
      throw error;
    }
  }

  async getTableOfContents(): Promise<Chapter[]> {
    try {
      if (this.isDestroyed || !this.book) {
        throw new Error('Parser has been destroyed');
      }
      
      await this.book.ready;
      
      const navigation = await this.book.loaded.navigation;
      const chapters: Chapter[] = [];
      let runningOrder = 0;

      // Primary: TOC navigation
      const processNavItem = (item: any) => {
        if (!item) return;
        const rawLabel = (typeof item.label === 'string' ? item.label.trim() : '') || 
                         (typeof item.title === 'string' ? item.title.trim() : '');
        chapters.push({
          id: item.id || `chapter-${runningOrder}`,
          title: rawLabel || `Chapter ${runningOrder + 1}`,
          content: '',
          href: item.href || '',
          order: runningOrder
        });
        runningOrder++;

        if (item.subitems && Array.isArray(item.subitems) && item.subitems.length > 0) {
          item.subitems.forEach(processNavItem);
        }
      };

      if (navigation && navigation.toc && navigation.toc.length > 1) {
        navigation.toc.forEach(processNavItem);
        return chapters;
      }

      // Fallback: Spine processing with smart grouping
      const groupedSpine = await this.getSpineGrouped();
      
      // Only use grouped spine if we actually performed grouping (otherwise it's just a raw spine list)
      if (groupedSpine.length > 0) {
        return groupedSpine.map((group, index) => ({
          id: group.id,
          title: group.title,
          content: '',
          href: group.hrefs,
          order: index
        }));
      }

      return chapters.length > 0 ? chapters : [{
        id: 'chapter-0',
        title: 'Chapter 1',
        content: '',
        href: '',
        order: 0
      }];
    } catch (error) {
      logError('GET_TOC_FAILED', error);
      throw error;
    }
  }

  private expandHref(href: string): string[] {
    if (!href) return [];
    const cleanHref = href.split('#')[0];
    
    const splitMatch = cleanHref.match(/^(.*)_split_\d+(\.[^/.]+)$/i) || cleanHref.match(/^(.*?)[-_]part\d+(\.[^/.]+)$/i);
    if (!splitMatch) {
      return [cleanHref];
    }

    const basePrefix = splitMatch[1];
    const extension = splitMatch[2];

    const matchedHrefs: string[] = [];
    if (this.book && this.book.spine && typeof this.book.spine.each === 'function') {
      this.book.spine.each((section: any) => {
        if (section && section.href) {
          const secClean = section.href.split('#')[0];
          if (secClean.startsWith(basePrefix) && secClean.endsWith(extension)) {
            if (!matchedHrefs.includes(secClean)) {
              matchedHrefs.push(secClean);
            }
          }
        }
      });
    }

    if (matchedHrefs.length === 0) {
      return [cleanHref];
    }

    matchedHrefs.sort((a, b) => {
      const matchA = a.match(/(?:_split_|-part-)(\d+)/i);
      const matchB = b.match(/(?:_split_|-part-)(\d+)/i);
      const numA = matchA ? parseInt(matchA[1], 10) : 0;
      const numB = matchB ? parseInt(matchB[1], 10) : 0;
      return numA - numB;
    });

    return matchedHrefs;
  }

  async getChapterContent(hrefs: string | string[]): Promise<string> {
    try {
      if (this.isDestroyed || !this.book || !this.book.spine || !this.book.load) {
        return '<p>Reader is busy or closed. Please wait.</p>';
      }
      
      const hrefArray = Array.isArray(hrefs) ? hrefs : [hrefs];
      const expandedHrefs: string[] = [];
      for (const h of hrefArray) {
        const expanded = this.expandHref(h);
        for (const eh of expanded) {
          if (!expandedHrefs.includes(eh)) {
            expandedHrefs.push(eh);
          }
        }
      }

      let concatenatedContent = '';

      for (const href of expandedHrefs) {
        const section = this.book.spine.get(href);
        if (!section) {
          console.warn(`Chapter not found in spine: ${href}`);
          continue;
        }

        // Check if book is still valid before loading
        if (this.isDestroyed || !this.book || !this.book.load) break;

        const doc = await section.load(this.book.load.bind(this.book));
        
        if (this.isDestroyed) break;

        if (!doc) continue;
        
        let content = '';
        if (typeof doc === 'string') {
          content = doc;
        } else if (doc && typeof doc === 'object') {
          content = (doc as any).innerHTML || (doc as any).textContent || '';
        }
        
        concatenatedContent += content;
      }
      
      if (!concatenatedContent) return '<p>Chapter is empty.</p>';

      // Remove boilerplate text requested by user
      concatenatedContent = concatenatedContent.replace(/If audio player doesn't work, press Stop then Play button again/gi, '');
      return concatenatedContent;
    } catch (error) {
      // Handle specific "undefined" or "archive" errors that occur during rapid navigation
      if (error instanceof Error && (error.message.includes('undefined') || error.message.includes('archive') || error.message.includes('null'))) {
         console.warn('Caught expected race condition error during rapid navigation:', error.message);
         return '<p>Loading chapter... please wait a moment.</p>';
      }
      console.error('Error loading chapter content:', error);
      logError('GET_CHAPTER_CONTENT_FAILED', error, { hrefs });
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
              const content = await this.getChapterContent(chapter.href as any);
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
      logError('GET_ALL_CHAPTERS_FAILED', error);
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
      logError('SEARCH_TEXT_FAILED', error, { query, chapterIndex });
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
      if (this.isDestroyed || !this.book) {
        throw new Error('Parser has been destroyed');
      }
      
      const coverUrl = await this.book.coverUrl();
      if (coverUrl) {
        const response = await fetch(coverUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch cover: ${response.status}`);
        }
        
        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Cover image is empty');
        }
        
        await saveCoverImage(bookId, blob);
      }
    } catch (error) {
      console.warn('Could not cache cover image:', error);
      logError('CACHE_COVER_FAILED', error, { bookId });
    }
  }

  async getSpineGrouped(): Promise<Array<{ id: string; title: string; hrefs: string[]; order: number }>> {
    if (this.isDestroyed || !this.book) throw new Error('Parser has been destroyed');
    await this.book.ready;
    
    const spineItems: Array<{ id: string; href: string }> = [];
    if (this.book.spine && typeof this.book.spine.each === 'function') {
      this.book.spine.each((section: any) => {
        if (section && section.href) {
          spineItems.push({ id: section.idref || section.id || section.href, href: section.href });
        }
      });
    }

    if (spineItems.length === 0) return [];

    const groupMap = new Map<string, { hrefs: string[]; ids: string[] }>();
    const orderList: string[] = [];

    spineItems.forEach((item) => {
      const cleanHref = item.href.split('#')[0];
      const filename = cleanHref.split('/').pop() || cleanHref;
      
      const splitMatch = filename.match(/^(.*)_split_\d+(\.[^/.]+)$/i) || filename.match(/^(.*?)[-_]part\d+(\.[^/.]+)$/i);
      let baseName = splitMatch ? splitMatch[1] : filename.replace(/\.[^/.]+$/, '');

      if (!groupMap.has(baseName)) {
        groupMap.set(baseName, { hrefs: [cleanHref], ids: [item.id] });
        orderList.push(baseName);
      } else {
        const group = groupMap.get(baseName)!;
        if (!group.hrefs.includes(cleanHref)) {
          group.hrefs.push(cleanHref);
          group.ids.push(item.id);
        }
      }
    });

    const groups: Array<{ id: string; title: string; hrefs: string[]; order: number }> = [];
    orderList.forEach((baseName, index) => {
      const group = groupMap.get(baseName)!;
      let title = baseName
        .replace(/[-_]/g, ' ')
        .replace(/chapter/gi, 'Chapter')
        .trim();
      
      if (!title || /^\d+$/.test(title)) {
        title = `Chapter ${index + 1}`;
      } else {
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      groups.push({
        id: group.ids[0] || `group-${index}`,
        title,
        hrefs: group.hrefs,
        order: index
      });
    });

    return groups;
  }

  destroy() {
    try {
      this.isDestroyed = true;
      
      // Clear search cache
      this.searchCache.clear();
      
      // Destroy rendition first if it exists
      if (this.rendition) {
        try {
          this.rendition.destroy();
        } catch (e) {
          console.warn('Error destroying rendition:', e);
        }
        this.rendition = null;
      }
      
      if (this.book) {
        try {
          if (!this.book.displayOptions) {
            this.book.displayOptions = { fixedLayout: "false", destroy: () => {} };
          }
          // Some internal epubjs tasks might still be running, 
          // destroying the book should stop them.
          this.book.destroy();
        } catch (e) {
          console.warn('Error destroying book:', e);
        }
        this.book = null;
      }
    } catch (error) {
      console.warn('Error during parser destruction:', error);
    }
  }
}

export const createBookFromFile = async (file: File): Promise<Omit<Book, 'id'>> => {
  try {
    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file: File is empty or corrupted');
    }

    if (!file.name.toLowerCase().endsWith('.epub')) {
      throw new Error('Invalid file type: Only EPUB files are supported');
    }

    const parser = new EpubParser(file);
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
      fileType: 'epub'
    };

    parser.destroy();
    return book;
  } catch (error) {
    logError('CREATE_BOOK_FROM_FILE_FAILED', error, { 
      fileName: file?.name, 
      fileSize: file?.size 
    });
    throw error;
  }
};
