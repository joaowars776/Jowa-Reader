import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Book as BookIcon } from 'lucide-react';
import { useTranslations } from '../hooks/useTranslations';
import { importUserData, importUserDataFromZip, saveBook } from '../utils/storage';
import { createParserForFile } from '../utils/file-parser';
import type { Book } from '../types';
import { getInterfaceThemeFromPrefs } from '../utils/themes';

interface ImportDataModalProps {
  onClose: () => void;
  preferences?: any;
}

export const ImportDataModal: React.FC<ImportDataModalProps> = ({ onClose, preferences }) => {
  const { getTranslation } = useTranslations();
  const [step, setStep] = useState<'select-file' | 'missing-books' | 'complete'>('select-file');
  const [importData, setImportData] = useState<any>(null);
  const [missingBooks, setMissingBooks] = useState<Book[]>([]);
  const [bookFiles, setBookFiles] = useState<Record<string, File>>({});
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setError(null);

      // Handle full ZIP archive import
      if (file.name.endsWith('.zip') || file.type.includes('zip')) {
        await importUserDataFromZip(file);
        setStep('complete');
        setIsImporting(false);
        return;
      }

      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data.database || !data.version) {
        throw new Error('Invalid backup file format');
      }

      setImportData(data);
      
      const books = data.database.books || [];
      if (books.length > 0) {
        setMissingBooks(books);
        setStep('missing-books');
      } else {
        // No books, just import everything else
        await performImport(data, {});
      }
    } catch (err) {
      setError('Failed to parse backup file. Please make sure it is a valid ZIP or JSON export.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBookFileSelect = (bookId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBookFiles(prev => ({ ...prev, [bookId]: file }));
    }
  };

  const performImport = async (data: any, files: Record<string, File>) => {
    setIsImporting(true);
    try {
      // 1. Import all base data
      await importUserData(data);

      // 2. Save books with their files
      const books = data.database.books || [];
      for (const bookData of books) {
        const file = files[bookData.id];
        if (file) {
          const book: Book = {
            ...bookData,
            file: file,
            lastRead: new Date(bookData.lastRead || Date.now())
          };
          await saveBook(book);

          // Re-extract cover if possible
          try {
            const parser = createParserForFile(file);
            if ('initialize' in parser) {
              await (parser as any).initialize();
              if ('cacheCoverImage' in parser) {
                await (parser as any).cacheCoverImage(book.id);
              }
              if ('destroy' in parser) {
                (parser as any).destroy();
              }
            }
          } catch (coverErr) {
            console.warn(`Failed to re-extract cover for ${book.title}:`, coverErr);
          }
        }
      }

      setStep('complete');
    } catch (err) {
      setError('Import failed. Please try again.');
      console.error(err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFinalImport = () => {
    performImport(importData, bookFiles);
  };

  const handleSkip = () => {
    performImport(importData, {});
  };

  const handleReload = () => {
    window.location.reload();
  };

  const interfaceStyles = React.useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme?.colors || {};
    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      color: colors.panelText || colors.textPrimary || '#1f2937',
      borderColor: colors.borderColor || colors.panelBorder || '#e5e7eb',
      secondaryBackground: colors.panelSecondaryBackground || '#f9fafb',
      textSecondary: colors.textSecondary || '#6b7280',
      buttonPrimary: colors.buttonPrimary || '#3b82f6',
      buttonPrimaryText: colors.buttonPrimaryText || '#ffffff'
    };
  }, [preferences]);

  return createPortal(
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
      <div 
        data-import-modal
        className="themed-panel modal-content glass-surface rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border"
        style={{
          backgroundColor: interfaceStyles.backgroundColor,
          color: interfaceStyles.color,
          borderColor: interfaceStyles.borderColor
        }}
      >
        {/* Header */}
        <div 
          className="p-6 border-b flex items-center justify-between"
          style={{ borderColor: interfaceStyles.borderColor, backgroundColor: interfaceStyles.backgroundColor + '80' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Upload className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-xl font-bold">
              {getTranslation('importData')}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition-colors"
            style={{ color: interfaceStyles.color }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {step === 'select-file' && (
            <div className="text-center py-12">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-dashed cursor-pointer hover:bg-blue-100/20 transition-colors"
                style={{ borderColor: interfaceStyles.borderColor, backgroundColor: interfaceStyles.backgroundColor }}
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {getTranslation('selectImportFile')}
              </h3>
              <p className="mb-8 max-w-md mx-auto opacity-70">
                {getTranslation('importDataDescription')}
              </p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".zip,.json"
                className="hidden"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
              >
                {getTranslation('selectFile')}
              </button>
            </div>
          )}

          {step === 'missing-books' && (
            <div className="space-y-6">
              <div 
                className="p-6 rounded-2xl border"
                style={{ backgroundColor: '#007BFF10', borderColor: '#007BFF40' }}
              >
                <h3 className="text-lg font-bold text-blue-600 mb-2 flex items-center gap-2">
                  <BookIcon className="w-5 h-5" />
                  {getTranslation('missingBooks')}
                </h3>
                <p className="text-blue-600 opacity-80 text-sm">
                  {getTranslation('missingBooksDescription')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {missingBooks.map((book) => (
                  <div 
                    key={book.id}
                    className="relative group rounded-xl border p-4 flex flex-col items-center text-center transition-all hover:border-blue-500/50"
                    style={{ backgroundColor: interfaceStyles.backgroundColor, borderColor: interfaceStyles.borderColor }}
                  >
                    <div 
                      className="w-full aspect-[3/4] rounded-lg mb-3 flex items-center justify-center overflow-hidden relative"
                      style={{ backgroundColor: interfaceStyles.borderColor + '40' }}
                    >
                      {bookFiles[book.id] ? (
                        <div className="absolute inset-0 bg-green-500/10 flex flex-col items-center justify-center p-2">
                          <CheckCircle2 className="w-8 h-8 text-green-500 mb-2" />
                          <span className="text-[10px] font-medium text-green-600 truncate w-full">
                            {bookFiles[book.id].name}
                          </span>
                        </div>
                      ) : (
                        <BookIcon className="w-12 h-12 opacity-30" />
                      )}
                      <input 
                        type="file"
                        id={`file-${book.id}`}
                        className="hidden"
                        onChange={(e) => handleBookFileSelect(book.id, e)}
                        accept=".epub,.pdf,.txt,.mobi"
                      />
                      <label 
                        htmlFor={`file-${book.id}`}
                        className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 bg-black/40 flex items-center justify-center transition-opacity"
                      >
                        <span className="bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                          {getTranslation('selectFile')}
                        </span>
                      </label>
                    </div>
                    <h4 className="text-xs font-bold line-clamp-2 min-h-[2rem]">
                      {book.title}
                    </h4>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t" style={{ borderColor: interfaceStyles.borderColor }}>
                <button 
                  onClick={handleSkip}
                  disabled={isImporting}
                  className="px-6 py-2.5 font-semibold hover:bg-black/5 rounded-xl transition-colors disabled:opacity-50"
                  style={{ color: interfaceStyles.color }}
                >
                  {getTranslation('skip')}
                </button>
                <button 
                  onClick={handleFinalImport}
                  disabled={isImporting}
                  className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {getTranslation('importData')}
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {getTranslation('importComplete')}
              </h3>
              <p className="opacity-70 mb-8">
                {getTranslation('importCompleteDescription')}
              </p>
              <button 
                onClick={handleReload}
                className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/20 active:scale-95"
              >
                OK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
