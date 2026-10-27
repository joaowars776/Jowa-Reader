import { EpubParser, createBookFromFile } from './epub-parser';
import { PdfParser, createBookFromPdfFile } from './pdf-parser';
import { MobiParser, createBookFromMobiFile } from './mobi-parser';
import { KfxParser, createBookFromKfxFile } from './kfx-parser';
import type { Book } from '../types';

export type SupportedFileType = 'epub' | 'pdf' | 'mobi' | 'azw3' | 'kfx' | 'azw';

export const getSupportedFileTypes = (): string[] => {
  return ['.epub', '.pdf', '.mobi', '.azw3', '.kfx', '.azw'];
};

export const getFileType = (file?: File | Blob | null, fallbackType?: string): SupportedFileType | null => {
  if (fallbackType && typeof fallbackType === 'string') {
    const clean = fallbackType.toLowerCase().replace(/^\./, '').trim();
    if (['epub', 'pdf', 'mobi', 'azw3', 'kfx', 'azw'].includes(clean)) {
      return clean as SupportedFileType;
    }
  }

  if (!file) {
    if (fallbackType && typeof fallbackType === 'string') {
      const clean = fallbackType.toLowerCase().replace(/^\./, '').trim();
      if (['epub', 'pdf', 'mobi', 'azw3', 'kfx', 'azw'].includes(clean)) {
        return clean as SupportedFileType;
      }
    }
    return null;
  }

  const rawName = (file as any)?.name;
  const fileName = typeof rawName === 'string' ? rawName.toLowerCase() : '';
  
  if (fileName.endsWith('.epub')) {
    return 'epub';
  } else if (fileName.endsWith('.pdf')) {
    return 'pdf';
  } else if (fileName.endsWith('.mobi')) {
    return 'mobi';
  } else if (fileName.endsWith('.azw3')) {
    return 'azw3';
  } else if (fileName.endsWith('.azw')) {
    return 'azw';
  } else if (fileName.endsWith('.kfx')) {
    return 'kfx';
  }

  // Check MIME type fallback safely
  const rawType = (file as any)?.type;
  const mime = typeof rawType === 'string' ? rawType.toLowerCase() : '';
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('epub')) return 'epub';
  if (mime.includes('mobi') || mime.includes('mobipocket')) return 'mobi';
  if (mime.includes('kfx')) return 'kfx';
  
  if (fallbackType && typeof fallbackType === 'string') {
    const clean = fallbackType.toLowerCase().replace(/^\./, '').trim();
    if (['epub', 'pdf', 'mobi', 'azw3', 'kfx', 'azw'].includes(clean)) {
      return clean as SupportedFileType;
    }
  }

  return null;
};

export const isFileSupported = (file: File | Blob): boolean => {
  return getFileType(file) !== null;
};

export const createBookFromSupportedFile = async (file: File): Promise<Omit<Book, 'id'>> => {
  const fileType = getFileType(file);
  
  if (!fileType) {
    throw new Error('Unsupported file type. Supported formats are EPUB, PDF, MOBI, AZW, AZW3, and KFX.');
  }
  
  switch (fileType) {
    case 'epub': {
      const epubBook = await createBookFromFile(file);
      return { ...epubBook, fileType: 'epub' };
    }
    case 'pdf': {
      const pdfBook = await createBookFromPdfFile(file);
      return { ...pdfBook, fileType: 'pdf' };
    }
    case 'mobi': {
      const mobiBook = await createBookFromMobiFile(file, 'mobi');
      return { ...mobiBook, fileType: 'mobi' };
    }
    case 'azw3': {
      const azw3Book = await createBookFromMobiFile(file, 'azw3');
      return { ...azw3Book, fileType: 'azw3' };
    }
    case 'azw': {
      const azwBook = await createBookFromMobiFile(file, 'azw');
      return { ...azwBook, fileType: 'azw' };
    }
    case 'kfx': {
      const kfxBook = await createBookFromKfxFile(file);
      return { ...kfxBook, fileType: 'kfx' };
    }
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

export const createParserForFile = (file: File | Blob, fileTypeHint?: string): EpubParser | PdfParser | MobiParser | KfxParser => {
  if (!file) {
    throw new Error('Arquivo de livro ausente ou corrompido.');
  }
  const fileType = getFileType(file, fileTypeHint) || (fileTypeHint as SupportedFileType) || 'epub';
  
  if (!fileType) {
    throw new Error('Unsupported file type. Supported formats are EPUB, PDF, MOBI, AZW, AZW3, and KFX.');
  }
  
  switch (fileType) {
    case 'epub':
      return new EpubParser(file);
      
    case 'pdf':
      return new PdfParser(file);
      
    case 'mobi':
      return new MobiParser(file);
      
    case 'azw3':
      return new MobiParser(file);
      
    case 'azw':
      return new MobiParser(file);
      
    case 'kfx':
      return new KfxParser(file);
      
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
};

export const getFileTypeDisplayName = (fileType: SupportedFileType): string => {
  switch (fileType) {
    case 'epub':
      return 'EPUB';
    case 'pdf':
      return 'PDF';
    case 'mobi':
      return 'MOBI';
    case 'azw3':
      return 'AZW3';
    case 'azw':
      return 'AZW';
    case 'kfx':
      return 'KFX';
    default:
      return 'Unknown';
  }
};

export const getFileTypeDescription = (fileType: SupportedFileType): string => {
  switch (fileType) {
    case 'epub':
      return 'Electronic Publication format, ideal for reflowable text content';
    case 'pdf':
      return 'Portable Document Format, preserves original layout and formatting';
    case 'mobi':
      return 'Mobipocket e-book format, widely compatible with Kindle devices';
    case 'azw3':
      return 'Kindle Format 8 (KF8), Amazon Kindle advanced e-book format';
    case 'azw':
      return 'Standard Amazon Kindle e-book format';
    case 'kfx':
      return 'Kindle Format 10 (KF10), Amazon Kindle modern layout e-book format';
    default:
      return 'Unknown file format';
  }
};
