import { saveCoverImage, logError } from './storage';
import type { Book, Chapter } from '../types';

export interface PdbRecord {
  offset: number;
  attributes: number;
  id: number;
  data?: Uint8Array;
}

export interface MobiHeader {
  compression: number;
  textLength: number;
  textRecordCount: number;
  textRecordSize: number;
  encryption: number;
  fullNameOffset: number;
  fullNameLength: number;
  title: string;
  author: string;
  firstImageRecord: number;
  coverImageRecord: number;
}

// Highly optimized PalmDoc LZ77 decompression
export function decompressPalmDoc(data: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const len = data.length;
  
  while (i < len) {
    const c = data[i++];
    if (c >= 1 && c <= 8) {
      // Copy literal bytes
      for (let j = 0; j < c; j++) {
        if (i < len) out.push(data[i++]);
      }
    } else if (c <= 0x7f) {
      // Literal byte
      out.push(c);
    } else if (c >= 0xc0) {
      // Space + character
      out.push(32);
      out.push(c ^ 0x80);
    } else {
      // LZ77 compressed sequence
      if (i >= len) break;
      const d = data[i++];
      const m = (c << 8) | d;
      const offset = (m >> 3) & 0x7ff;
      const length = (m & 0x07) + 3;
      const start = out.length - offset;
      if (start >= 0) {
        for (let j = 0; j < length; j++) {
          out.push(out[start + j]);
        }
      }
    }
  }
  return new Uint8Array(out);
}

// Parse Palm Database (PDB) records
export function parsePdb(arrayBuffer: ArrayBuffer): PdbRecord[] {
  const view = new DataView(arrayBuffer);
  const numRecords = view.getUint16(76);
  const records: PdbRecord[] = [];
  
  for (let i = 0; i < numRecords; i++) {
    const offset = view.getUint32(78 + i * 8);
    const attributes = view.getUint8(78 + i * 8 + 4);
    const id = (view.getUint8(78 + i * 8 + 5) << 16) |
               (view.getUint8(78 + i * 8 + 6) << 8) |
               view.getUint8(78 + i * 8 + 7);
               
    records.push({ offset, attributes, id });
  }
  
  const totalLength = arrayBuffer.byteLength;
  const rawBytes = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < numRecords; i++) {
    const start = records[i].offset;
    const end = (i + 1 < numRecords) ? records[i + 1].offset : totalLength;
    records[i].data = rawBytes.subarray(start, end);
  }
  
  return records;
}

// Parse MOBI Record 0 Header
export function parseMobiHeader(record0: Uint8Array): MobiHeader {
  const view = new DataView(record0.buffer, record0.byteOffset, record0.byteLength);
  
  const compression = view.getUint16(0);
  const textLength = view.getUint32(4);
  const textRecordCount = view.getUint16(8);
  const textRecordSize = view.getUint16(10);
  const encryption = view.getUint16(12);
  
  let isMobi = false;
  try {
    const identifier = String.fromCharCode(record0[16], record0[17], record0[18], record0[19]);
    isMobi = identifier === 'MOBI';
  } catch (e) {
    // Ignore
  }
  
  let fullNameOffset = 0;
  let fullNameLength = 0;
  let firstImageRecord = -1;
  let coverImageRecord = -1;
  let author = 'Unknown Author';
  
  if (isMobi) {
    const mobiHeaderLength = view.getUint32(20);
    fullNameOffset = view.getUint32(84);
    fullNameLength = view.getUint32(88);
    firstImageRecord = view.getUint32(108);
    
    // Parse EXTH if present
    const exthOffset = 16 + mobiHeaderLength;
    if (exthOffset + 12 <= record0.length) {
      const exthId = String.fromCharCode(record0[exthOffset], record0[exthOffset+1], record0[exthOffset+2], record0[exthOffset+3]);
      if (exthId === 'EXTH') {
        const exthView = new DataView(record0.buffer, record0.byteOffset + exthOffset, record0.byteLength - exthOffset);
        const exthLength = exthView.getUint32(4);
        const recordCount = exthView.getUint32(8);
        
        let currentOffset = 12;
        for (let i = 0; i < recordCount; i++) {
          if (currentOffset + 8 > exthLength || exthOffset + currentOffset + 8 > record0.length) break;
          const recordType = exthView.getUint32(currentOffset);
          const recordLen = exthView.getUint32(currentOffset + 4);
          const dataLen = recordLen - 8;
          
          if (dataLen > 0 && currentOffset + 8 + dataLen <= exthLength) {
            const startIdx = exthOffset + currentOffset + 8;
            const endIdx = startIdx + dataLen;
            const valueBytes = record0.subarray(startIdx, endIdx);
            
            if (recordType === 100) { // Author
              author = new TextDecoder('utf-8').decode(valueBytes).trim();
            } else if (recordType === 201) { // CoverOffset
              let coverOffset = 0;
              if (dataLen === 4) {
                coverOffset = new DataView(valueBytes.buffer, valueBytes.byteOffset, valueBytes.byteLength).getUint32(0);
              }
              coverImageRecord = firstImageRecord + coverOffset;
            }
          }
          currentOffset += recordLen;
        }
      }
    }
  }
  
  let title = 'Unknown Title';
  if (fullNameLength > 0 && fullNameOffset < record0.length) {
    try {
      title = new TextDecoder('utf-8').decode(record0.subarray(fullNameOffset, fullNameOffset + fullNameLength)).trim();
    } catch (e) {
      console.warn('Failed to decode full name:', e);
    }
  }
  
  return {
    compression,
    textLength,
    textRecordCount,
    textRecordSize,
    encryption,
    fullNameOffset,
    fullNameLength,
    title,
    author,
    firstImageRecord,
    coverImageRecord
  };
}

export function splitMobiIntoChapters(html: string): Chapter[] {
  const chapters: Chapter[] = [];
  
  let text = html.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.replace(/<mbp:pagebreak\s*\/?>/gi, '<!-- PAGEBREAK -->');
  
  const parts = text.split(/<!-- PAGEBREAK -->/);
  
  if (parts.length <= 1) {
    const headingRegex = /<h[1-3][^>]*>.*?<\/h[1-3]>/gi;
    const headings = [...text.matchAll(headingRegex)];
    
    if (headings.length > 2) {
      let lastIndex = 0;
      let order = 0;
      
      for (let i = 0; i < headings.length; i++) {
        const match = headings[i];
        const index = match.index!;
        
        if (index > lastIndex) {
          const content = text.substring(lastIndex, index).trim();
          if (content.length > 100 || order === 0) {
            let title = `Chapter ${order + 1}`;
            if (order > 0) {
              const prevMatch = headings[order - 1][0];
              title = prevMatch.replace(/<[^>]*>/g, '').trim() || title;
            }
            
            chapters.push({
              id: `chapter-${order}`,
              title,
              content,
              startIndex: lastIndex,
              endIndex: index,
              pageNumber: order + 1,
              href: `chapter-${order}`
            });
            order++;
          }
        }
        lastIndex = index;
      }
      
      if (lastIndex < text.length) {
        const content = text.substring(lastIndex).trim();
        const prevMatch = headings[headings.length - 1][0];
        const title = prevMatch.replace(/<[^>]*>/g, '').trim() || `Chapter ${order + 1}`;
        chapters.push({
          id: `chapter-${order}`,
          title,
          content,
          startIndex: lastIndex,
          endIndex: text.length,
          pageNumber: order + 1,
          href: `chapter-${order}`
        });
      }
    }
  } else {
    parts.forEach((part, idx) => {
      const trimmed = part.trim();
      if (trimmed.length > 0) {
        const hMatch = trimmed.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i);
        const title = hMatch ? hMatch[1].replace(/<[^>]*>/g, '').trim() : `Section ${idx + 1}`;
        
        chapters.push({
          id: `chapter-${idx}`,
          title: title || `Section ${idx + 1}`,
          content: trimmed,
          startIndex: 0,
          endIndex: trimmed.length,
          pageNumber: idx + 1,
          href: `chapter-${idx}`
        });
      }
    });
  }
  
  if (chapters.length <= 1) {
    const rawChapters = chapters.length === 1 ? chapters[0].content : text;
    const splitSize = 15000;
    const finalChapters: Chapter[] = [];
    let start = 0;
    let order = 0;
    
    while (start < rawChapters.length) {
      let end = start + splitSize;
      if (end < rawChapters.length) {
        const nextParagraph = rawChapters.indexOf('</p>', end);
        if (nextParagraph !== -1 && nextParagraph - end < 3000) {
          end = nextParagraph + 4;
        } else {
          const nextSpace = rawChapters.indexOf(' ', end);
          if (nextSpace !== -1 && nextSpace - end < 100) {
            end = nextSpace;
          }
        }
      } else {
        end = rawChapters.length;
      }
      
      const content = rawChapters.substring(start, end).trim();
      if (content.length > 0) {
        let title = `Part ${order + 1}`;
        const hMatch = content.match(/<h[1-4][^>]*>(.*?)<\/h[1-4]>/i);
        if (hMatch && hMatch[1]) {
          title = hMatch[1].replace(/<[^>]*>/g, '').trim();
        } else {
          const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
          if (pMatch && pMatch[1] && pMatch[1].length < 60) {
            title = pMatch[1].replace(/<[^>]*>/g, '').trim();
          }
        }
        
        finalChapters.push({
          id: `chapter-${order}`,
          title: title || `Part ${order + 1}`,
          content,
          startIndex: start,
          endIndex: end,
          pageNumber: order + 1,
          href: `chapter-${order}`
        });
        order++;
      }
      
      start = end;
    }
    return finalChapters;
  }
  
  return chapters;
}

export function cleanMobiHtml(html: string): string {
  if (!html) return html;

  // 1. Fix corrupted HTML tag names like < Vfont or <\x00\x02p
  let cleaned = html;
  cleaned = cleaned.replace(/<[^\s>a-zA-Z/]*?(font|p|span|div|a|b|i|u|strong|em|h[1-6])\b/gi, '<$1');
  cleaned = cleaned.replace(/<[^\s>a-zA-Z/]*?\/[^\s>a-zA-Z/]*?(font|p|span|div|a|b|i|u|strong|em|h[1-6])\b/gi, '</$1');

  // Helper to check if a color string is dark (invisible on dark themes)
  const isDarkColor = (colorStr: string): boolean => {
    colorStr = colorStr.trim().toLowerCase();
    if (colorStr === 'black' || colorStr === '#000' || colorStr === '#000000') return true;
    
    // Hex colors
    const hexMatch = colorStr.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hex = hexMatch[1];
      let r = 0, g = 0, b = 0;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      return brightness < 85; // Less than ~33% brightness is considered dark
    }
    
    // RGB colors
    const rgbMatch = colorStr.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1], 10);
      const g = parseInt(rgbMatch[2], 10);
      const b = parseInt(rgbMatch[3], 10);
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      return brightness < 85;
    }
    
    return false;
  };

  // 2. Remove dark legacy color attributes from tags (font, etc.) so they fall back to theme text colors
  cleaned = cleaned.replace(/(\bcolor\s*=\s*["'])([^"']+)["']/gi, (match, prefix, colorVal) => {
    if (isDarkColor(colorVal)) {
      return '';
    }
    return match;
  });

  cleaned = cleaned.replace(/\bcolor\s*=\s*([^"' >\s]+)/gi, (match, colorVal) => {
    if (isDarkColor(colorVal)) {
      return '';
    }
    return match;
  });

  // 3. Adapt inline style colors (replace dark colors with 'currentColor' so they inherit the theme text color)
  cleaned = cleaned.replace(/style\s*=\s*["']([^"']+)["']/gi, (match, styleVal) => {
    const updatedStyle = styleVal.replace(/\bcolor\s*:\s*([^;]+)/gi, (colorMatch, colorVal) => {
      if (isDarkColor(colorVal)) {
        return 'color: currentColor';
      }
      return colorMatch;
    });
    return `style="${updatedStyle}"`;
  });

  return cleaned;
}

export class MobiParser {
  private file: File;
  public isDestroyed: boolean = false;
  private records: PdbRecord[] = [];
  private header?: MobiHeader;
  private fullText: string = '';
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
      this.records = parsePdb(arrayBuffer);
      
      if (this.records.length > 0 && this.records[0].data) {
        this.header = parseMobiHeader(this.records[0].data);
      } else {
        throw new Error('Invalid MOBI/AZW3 file: No records found');
      }
      
      // Load full text
      let fullText = '';
      const textCount = Math.min(this.header.textRecordCount, this.records.length - 1);
      
      if (this.header.compression === 17480) {
        console.warn('MOBI/AZW file uses Huff/CDIC proprietary compression which is not directly decodable in pure browser client.');
        fullText = `
          <div style="padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid rgba(234, 179, 8, 0.4); background: rgba(234, 179, 8, 0.08); font-family: system-ui, sans-serif;">
            <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #b45309;">Aviso de Formato: Compressão Huff/CDIC (Kindle AZW)</h2>
            <p style="font-size: 14px; line-height: 1.6; margin-bottom: 12px; opacity: 0.9;">
              Este livro digital foi gerado com compressão proprietária Huff/CDIC (Amazon Kindle). Para descompactação completa e suporte a imagens no leitor, converta este arquivo para <strong>.EPUB</strong> (ex.: através do Calibre).
            </p>
          </div>
        `;
      } else {
        for (let i = 1; i <= textCount; i++) {
          if (this.records[i].data) {
            let block = this.records[i].data!;
            if (this.header.compression === 2) {
              block = decompressPalmDoc(block);
            }
            try {
              fullText += new TextDecoder('utf-8').decode(block);
            } catch (e) {
              try {
                fullText += new TextDecoder('windows-1252').decode(block);
              } catch (err) {
                fullText += String.fromCharCode.apply(null, Array.from(block));
              }
            }
          }
        }
      }
      
      this.fullText = cleanMobiHtml(fullText || '<p>No content available.</p>');
      return this;
    } catch (error) {
      logError('MOBI_PARSER_INITIALIZE_FAILED', error);
      throw error;
    }
  }

  async getMetadata() {
    try {
      if (this.isDestroyed) {
        throw new Error('Parser has been destroyed');
      }
      
      let cover: string | undefined;
      
      // Extract cover image
      if (this.header && this.header.coverImageRecord !== -1) {
        const coverRecord = this.records[this.header.coverImageRecord];
        if (coverRecord && coverRecord.data) {
          let mimeType = 'image/jpeg';
          if (coverRecord.data[0] === 0x89 && coverRecord.data[1] === 0x50) mimeType = 'image/png';
          else if (coverRecord.data[0] === 0x47 && coverRecord.data[1] === 0x49) mimeType = 'image/gif';
          
          const blob = new Blob([coverRecord.data], { type: mimeType });
          cover = URL.createObjectURL(blob);
        }
      }
      
      return {
        title: this.header?.title || this.file.name.replace(/\.(mobi|azw3)$/i, '') || 'Unknown Title',
        author: this.header?.author || 'Unknown Author',
        cover,
        metadata: {
          compression: this.header?.compression,
          encryption: this.header?.encryption,
          textLength: this.header?.textLength,
        }
      };
    } catch (error) {
      logError('MOBI_GET_METADATA_FAILED', error);
      throw error;
    }
  }

  async getTableOfContents(): Promise<Chapter[]> {
    if (!this.cachedChapters) {
      this.cachedChapters = splitMobiIntoChapters(this.fullText);
    }
    return this.cachedChapters;
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
      logError('MOBI_SEARCH_FAILED', error);
      throw error;
    }
  }

  async cacheCoverImage(bookId: string): Promise<void> {
    try {
      if (this.isDestroyed || !this.header) return;
      
      if (this.header.coverImageRecord !== -1) {
        const coverRecord = this.records[this.header.coverImageRecord];
        if (coverRecord && coverRecord.data) {
          let mimeType = 'image/jpeg';
          if (coverRecord.data[0] === 0x89 && coverRecord.data[1] === 0x50) mimeType = 'image/png';
          const blob = new Blob([coverRecord.data], { type: mimeType });
          await saveCoverImage(bookId, blob);
        }
      }
    } catch (error) {
      console.warn('Could not cache MOBI cover image:', error);
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.records = [];
    this.cachedChapters = undefined;
    this.searchCache.clear();
  }
}

export const createBookFromMobiFile = async (file: File, type: 'mobi' | 'azw3' | 'azw'): Promise<Omit<Book, 'id'>> => {
  try {
    const parser = new MobiParser(file);
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
      fileType: type
    };
    
    parser.destroy();
    return book;
  } catch (error) {
    logError('CREATE_BOOK_FROM_MOBI_FAILED', error);
    throw error;
  }
};
