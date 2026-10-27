import React, { useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, BookOpen, X, FileText, File, Folder, Info } from 'lucide-react';
import { createBookFromSupportedFile, getSupportedFileTypes, getFileType } from '../utils/file-parser';
import { saveBook } from '../utils/storage';
import { logActivity } from '../utils/activity-logger';
import { getTranslation } from '../utils/translations';
import type { Book } from '../types';

interface BookUploaderProps {
  onBookAdded: (book: Book) => void;
  onClose?: () => void;
}

export const BookUploader: React.FC<BookUploaderProps> = ({ onBookAdded, onClose }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const supportedTypes = getSupportedFileTypes();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleClickOutside = (event: MouseEvent) => {
      if (modalContentRef.current && !modalContentRef.current.contains(event.target as Node)) {
        onClose?.();
      }
    };

    timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const processFile = useCallback(async (file: File) => {
    const fileType = getFileType(file);
    
    if (!fileType) {
      setError(getTranslation('pleaseSelectSupportedFile'));
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const bookData = await createBookFromSupportedFile(file);
      const book: Book = {
        id: `book-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...bookData
      };

      if (book.cover) {
        try {
          const { createParserForFile } = await import('../utils/file-parser');
          const parser = createParserForFile(file);
          await (parser as any).initialize();
          if (typeof (parser as any).cacheCoverImage === 'function') {
            await (parser as any).cacheCoverImage(book.id);
          }
          parser.destroy();
        } catch (coverError) {
          console.warn('Could not cache cover image:', coverError);
        }
      }

      await saveBook(book);
      logActivity({
        type: 'add_book',
        bookId: book.id,
        bookTitle: book.title
      });
      onBookAdded(book);
      onClose?.();
    } catch (error) {
      console.error('Error processing file:', error);
      setError(getTranslation('failedToProcessFile'));
    } finally {
      setIsUploading(false);
    }
  }, [onBookAdded, onClose]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer?.files || []);
    const supportedFile = files.find(file => {
      const fileName = file.name.toLowerCase();
      return supportedTypes.some(type => fileName.endsWith(type));
    });

    if (supportedFile) {
      processFile(supportedFile);
    } else {
      setError(getTranslation('pleaseDropSupportedFile'));
    }
  }, [processFile, supportedTypes]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const supportedFile = files.find(file => {
      const fileName = file.name.toLowerCase();
      return supportedTypes.some(type => fileName.endsWith(type));
    });

    if (supportedFile) {
      processFile(supportedFile);
    } else if (files.length > 0) {
      setError(getTranslation('noSupportedFilesInFolder'));
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  }, [processFile, supportedTypes]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = dropZoneRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        setIsDragOver(false);
      }
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-md animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        ref={modalContentRef} 
        className="rounded-[2rem] max-w-2xl w-full p-8 relative animate-scale-in shadow-2xl border themed-panel my-auto z-10"
        style={{
          backgroundColor: 'var(--interface-panelBackground, #ffffff)',
          color: 'var(--interface-textPrimary, #1f2937)',
          borderColor: 'var(--interface-borderColor, rgba(255, 255, 255, 0.2))'
        }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 z-20"
            aria-label={getTranslation('closeUploader')}
          >
            <X className="w-6 h-6" style={{ color: 'var(--interface-textSecondary)' }} />
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mx-auto mb-4 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <BookOpen className="w-10 h-10" style={{ color: 'var(--interface-accent)' }} />
          </div>
          <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--interface-textPrimary)' }}>{getTranslation('addNewBook')}</h2>
          <p className="text-lg opacity-70" style={{ color: 'var(--interface-textSecondary)' }}>{getTranslation('uploadSupportedFile')}</p>
        </div>

        <div
          ref={dropZoneRef}
          className={`relative border-2 border-dashed rounded-[1.5rem] p-12 text-center transition-all duration-500 ease-out group ${
            isDragOver
              ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-400 scale-[1.02] shadow-xl shadow-blue-500/10'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnter={handleDragEnter}
          data-drop-zone="true"
        >
          <div className={`w-20 h-20 bg-gray-50 dark:bg-zinc-800/50 border border-gray-100 dark:border-zinc-700/30 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform duration-500 ${isDragOver ? 'scale-110 bg-blue-50 dark:bg-blue-900/30' : ''}`}>
            <Upload 
              className={`w-10 h-10 transition-all duration-500 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} 
            />
          </div>
          
          <div className="mb-8">
            <p className="text-2xl font-bold mb-2" style={{ color: 'var(--interface-textPrimary)' }}>
              {isDragOver ? getTranslation('dropFileHere') : getTranslation('dragAndDropFile')}
            </p>
            <div className="flex items-center justify-center gap-4 text-gray-400">
              <div className="h-px w-8 bg-current opacity-20"></div>
              <span className="text-sm font-medium uppercase tracking-widest">{getTranslation('or')}</span>
              <div className="h-px w-8 bg-current opacity-20"></div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <label className="relative">
              <input
                type="file"
                accept={supportedTypes.join(',')}
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
                ref={fileInputRef}
              />
              <span className="px-8 py-4 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-blue-500/25 active:scale-95"
                style={{
                  backgroundColor: 'var(--interface-buttonPrimary)',
                  color: 'var(--interface-buttonPrimaryText)',
                }}
              >
                <FileText className="w-5 h-5 mr-3" />
                {isUploading ? getTranslation('processing') : getTranslation('selectFile')}
              </span>
            </label>

            <label className="relative">
              <input
                type="file"
                // @ts-expect-error webkitdirectory is a non-standard property
                webkitdirectory=""
                directory=""
                onChange={handleFolderSelect}
                className="hidden"
                disabled={isUploading}
                ref={folderInputRef}
              />
              <span className="px-8 py-4 rounded-2xl transition-all duration-300 cursor-pointer flex items-center justify-center font-bold text-lg shadow-lg hover:shadow-gray-500/10 active:scale-95 border border-gray-100 dark:border-gray-800"
                style={{
                  backgroundColor: 'var(--interface-buttonSecondary)',
                  color: 'var(--interface-buttonSecondaryText)',
                }}
              >
                <Folder className="w-5 h-5 mr-3" />
                {getTranslation('selectFolder')}
              </span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-6 p-4 rounded-2xl animate-fade-in flex items-start gap-3"
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.2)',
            }}
          >
            <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>EPUB</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <File className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>PDF</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <File className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>MOBI</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <File className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>AZW</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <File className="w-4 h-4 text-violet-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>AZW3</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50/70 dark:bg-zinc-800/60 border border-gray-100 dark:border-zinc-700/50">
                <File className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--interface-textPrimary)' }}>KFX</span>
              </div>
            </div>
            <p className="text-xs font-medium opacity-50 max-w-[200px] text-center md:text-right" style={{ color: 'var(--interface-textSecondary)' }}>
              {getTranslation('supportedFormatsDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
