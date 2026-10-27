import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Languages, CheckCircle, Play, Square, Loader2, Download, AlertTriangle, RefreshCw, Cpu, Trash2, Sparkles, BookOpen } from 'lucide-react';
import { getTranslation, AVAILABLE_LANGUAGES, getCurrentLanguage } from '../utils/translations';
import { logActivity } from '../utils/activity-logger';
import { getBooks } from '../utils/storage';
import { EpubParser } from '../utils/epub-parser';
import { PdfParser } from '../utils/pdf-parser';
import { compileTranslatedEpub } from '../utils/epub-compiler';
import { LibreTranslateConfig } from './BookTranslator/LibreTranslateConfig';
import { OllamaConfig } from './BookTranslator/OllamaConfig';
import { TranslatorProgress } from './BookTranslator/TranslatorProgress';
import { getInterfaceThemeFromPrefs } from '../utils/themes';
import type { Book, Chapter, ReadingPreferences } from '../types';

function getTranslatableNodes(container: HTMLElement): Element[] {
  const standardSelector = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, td, th';
  const nodes = Array.from(container.querySelectorAll(standardSelector));
  
  const blockTags = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'td', 'th', 'ul', 'ol', 'section', 'article'];
  const allDivs = Array.from(container.querySelectorAll('div'));
  
  allDivs.forEach(div => {
    const hasBlockChild = blockTags.some(tag => div.querySelector(tag) !== null);
    const hasDirectText = div.textContent?.trim();
    const isInsideStandard = div.closest(standardSelector) !== null;
    
    if (!hasBlockChild && hasDirectText && !isInsideStandard) {
      if (!nodes.includes(div)) {
        nodes.push(div);
      }
    }
  });
  
  return nodes.sort((a, b) => {
    const position = a.compareDocumentPosition(b);
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    } else if (position & Node.DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

interface BookTranslatorModalProps {
  book?: Book | null;
  onClose: () => void;
  preferences?: ReadingPreferences | null;
  inline?: boolean;
}

export const BookTranslatorModal: React.FC<BookTranslatorModalProps> = ({
  book,
  onClose,
  preferences,
  inline = false
}) => {
  const [selectedBookState, setSelectedBookState] = useState<Book | null>(book || null);
  const [bookFile, setBookFile] = useState<Blob | File | null>(null);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);

  useEffect(() => {
    if (book) {
      setSelectedBookState(book);
    }
  }, [book]);

  useEffect(() => {
    if (!book) {
      getBooks().then(setAvailableBooks).catch(console.error);
    }
  }, [book]);

  useEffect(() => {
    if (selectedBookState) {
      setBookFile(selectedBookState.file || null);
    } else {
      setBookFile(null);
    }
  }, [selectedBookState]);

  useEffect(() => {
    const recoverFile = async () => {
      if (!selectedBookState) return;
      if (!bookFile || bookFile.size === 0) {
        console.log(`[BookTranslatorModal] Missing local file for "${selectedBookState.title}". Fetching backup from server...`);
        try {
          const res = await fetch(`/api/book-file/${selectedBookState.id}`);
          if (res.ok) {
            const blob = await res.blob();
            const mimeType = selectedBookState.fileType === 'pdf' ? 'application/pdf' : 'application/epub+zip';
            const ext = selectedBookState.fileType === 'pdf' ? '.pdf' : '.epub';
            const file = new File([blob], `${selectedBookState.title}${ext}`, { type: mimeType });
            setBookFile(file);
            
            // Also restore locally in IndexedDB so the user has it cached
            const { saveBook } = await import('../utils/storage');
            await saveBook({
              ...selectedBookState,
              file
            });
            console.log(`[BookTranslatorModal] Restored book file from server backup and cached locally in DB.`);
          }
        } catch (e) {
          console.error('[BookTranslatorModal] Failed to restore file from backup server:', e);
        }
      }
    };
    recoverFile();
  }, [selectedBookState, bookFile]);

  const [sourceLanguage, setSourceLanguage] = useState('auto');
  const [targetLanguage, setTargetLanguage] = useState(() => {
    const browserLang = navigator.language.split('-')[0];
    const isSupported = AVAILABLE_LANGUAGES.some(l => l.code === browserLang);
    return isSupported ? browserLang : 'en';
  });

  // Translation Engine selection state ('libretranslate' | 'ollama')
  const [translationEngine, setTranslationEngine] = useState<'libretranslate' | 'ollama'>('libretranslate');
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [selectedOllamaModel, setSelectedOllamaModel] = useState('');
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean | null>(null);
  const [isOllamaChecking, setIsOllamaChecking] = useState(false);
  
  // Status states
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(false);
  const [translationState, setTranslationState] = useState<'idle' | 'parsing' | 'translating' | 'compiling' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Progress tracking states
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [estTimeRemaining, setEstTimeRemaining] = useState<string | null>(null);
  
  // Generated EPUB file download link reference
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  // Cancellation and timing refs
  const abortRef = useRef(false);
  const translationTimerRef = useRef<any>(null);

  // LibreTranslate Control Center States
  const [showHelper, setShowHelper] = useState(true);
  const [copied, setCopied] = useState(false);
  const cpuCores = useMemo(() => navigator.hardwareConcurrency || 4, []);
  const [threads, setThreads] = useState(Math.max(1, cpuCores));

  // Translation Memory / Cache States
  const cacheKey = useMemo(() => {
    if (!selectedBookState) return 'book_translation_cache_none';
    const safeTitle = (selectedBookState.id || selectedBookState.title).replace(/[^a-zA-Z0-9]/g, '_');
    return `book_translation_cache_${safeTitle}_${sourceLanguage}_${targetLanguage}`;
  }, [selectedBookState, sourceLanguage, targetLanguage]);

  const [cacheCount, setCacheCount] = useState(0);

  const updateCacheCount = useCallback(() => {
    try {
      const existing = localStorage.getItem(cacheKey);
      if (existing) {
        const parsed = JSON.parse(existing);
        setCacheCount(Object.keys(parsed).length);
      } else {
        setCacheCount(0);
      }
    } catch {
      setCacheCount(0);
    }
  }, [cacheKey]);

  useEffect(() => {
    updateCacheCount();
  }, [cacheKey, updateCacheCount]);

  const handleClearCache = () => {
    try {
      localStorage.removeItem(cacheKey);
      setCacheCount(0);
    } catch (e) {
      console.warn('Failed to clear cache:', e);
    }
  };

  const loadOnlyCode = useMemo(() => {
    return `${sourceLanguage === 'auto' ? 'en' : sourceLanguage},${targetLanguage}`;
  }, [sourceLanguage, targetLanguage]);

  const startCommand = useMemo(() => {
    return `libretranslate --port 5000 --load-only ${loadOnlyCode} --threads ${threads}`;
  }, [loadOnlyCode, threads]);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(startCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLauncherBat = () => {
    const bookTitle = selectedBookState?.title || 'Book';
    const batContent = `@echo off
title LibreTranslate Launcher (Custom - ${bookTitle})
echo ===================================================
echo   LibreTranslate Custom Launcher for ${bookTitle}
echo ===================================================
echo.
echo [INFO] Iniciando o LibreTranslate...
echo [INFO] Idiomas carregados: ${loadOnlyCode}
echo [INFO] Threads de execucao: ${threads}
echo.
libretranslate --port 5000 --load-only ${loadOnlyCode} --threads ${threads}
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Falha ao iniciar. Certifique-se de que o LibreTranslate esta instalado.
    echo Execute Install.bat para instalar se ainda nao o fez.
)
pause
`;
    const blob = new Blob([batContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Start-LibreTranslate-${targetLanguage}.bat`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const interfaceStyles = useMemo(() => {
    const theme = getInterfaceThemeFromPrefs(preferences);
    const colors = theme?.colors || {};
    return {
      backgroundColor: colors.panelBackground || '#ffffff',
      color: colors.panelText || colors.textPrimary || '#1f2937',
      borderColor: colors.borderColor || colors.panelBorder || '#e5e7eb',
      panelSecondaryBackground: colors.panelSecondaryBackground || '#f3f4f6',
      inputBackground: colors.inputBackground || colors.panelBackground || '#ffffff',
      inputText: colors.inputText || colors.panelText || '#1f2937',
      inputBorder: colors.inputBorder || colors.borderColor || '#d1d5db',
      buttonPrimary: colors.buttonPrimary || '#3b82f6',
      buttonPrimaryText: colors.buttonPrimaryText || '#ffffff',
      textSecondary: colors.textSecondary || '#6b7280'
    };
  }, [preferences]);

  // Check backend server status
  const checkBackend = useCallback(async () => {
    setIsCheckingBackend(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 1200);

      const response = await fetch('http://127.0.0.1:5000/languages', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(id);
      if (response.ok) {
        setIsBackendOnline(true);
        setIsCheckingBackend(false);
        return true;
      }
    } catch {
      // Fallback
    }

    try {
      const rootController = new AbortController();
      const rootId = setTimeout(() => rootController.abort(), 1000);
      await fetch('http://127.0.0.1:5000/', {
        method: 'GET',
        signal: rootController.signal,
        mode: 'no-cors'
      });
      clearTimeout(rootId);
      setIsBackendOnline(true);
    } catch {
      setIsBackendOnline(false);
    } finally {
      setIsCheckingBackend(false);
    }
  }, []);

  const checkOllamaAndFetchModels = useCallback(async (urlToCheck?: string) => {
    const targetUrl = urlToCheck || ollamaUrl;
    setIsOllamaChecking(true);
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const cleanUrl = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl;
      const res = await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      if (res.ok) {
        const d = await res.json();
        if (d && Array.isArray(d.models)) {
          const names = d.models.map((m: any) => m.name);
          setOllamaModels(names);
          setIsOllamaOnline(true);
          if (names.length > 0 && !selectedOllamaModel) {
            setSelectedOllamaModel(names[0]);
          }
          return true;
        }
      }
      setIsOllamaOnline(false);
    } catch (e) {
      console.warn('Ollama check failed:', e);
      setIsOllamaOnline(false);
    } finally {
      setIsOllamaChecking(false);
    }
    return false;
  }, [ollamaUrl, selectedOllamaModel]);

  useEffect(() => {
    checkBackend();
    checkOllamaAndFetchModels();
  }, [checkBackend, checkOllamaAndFetchModels]);

  // Cleanup on unmount
  useEffect(() => {
    const currentTimer = translationTimerRef.current;
    return () => {
      abortRef.current = true;
      if (currentTimer) {
        clearTimeout(currentTimer);
      }
    };
  }, []);

  const handleStopTranslation = () => {
    abortRef.current = true;
    setTranslationState('idle');
    setProgressText('Translation stopped. Progress has been saved in translation memory.');
    setEstTimeRemaining(null);
    updateCacheCount();
  };

  const handleExportCurrentProgress = async () => {
    if (!bookFile) {
      setTranslationState('error');
      setErrorMessage('Book file is missing or invalid.');
      return;
    }

    abortRef.current = false;
    setTranslationState('compiling');
    setErrorMessage(null);
    setProgressPercent(0);
    setProgressText('Opening book and parsing chapters...');
    setEstTimeRemaining(null);
    setDownloadBlob(null);

    let parser: EpubParser | PdfParser | null = null;
    try {
      // 1. Initialize Parser
      if (selectedBookState?.fileType === 'pdf') {
        parser = new PdfParser(bookFile);
      } else {
        parser = new EpubParser(bookFile);
      }
      await parser.initialize();

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      // 2. Fetch all chapters/pages list
      setProgressText('Retrieving Table of Contents...');
      const toc = await parser.getTableOfContents();
      
      if (!toc || toc.length === 0) {
        throw new Error('No chapters or pages found in the book file.');
      }

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      // 3. Load actual raw content for all chapters
      setProgressText(`Loading content for ${toc.length} chapters...`);
      const fullChapters: Chapter[] = [];
      for (let i = 0; i < toc.length; i++) {
        if (abortRef.current) {
          parser.destroy();
          return;
        }
        setProgressPercent(Math.round(((i + 1) / toc.length) * 40)); // 0% - 40% for loading
        setProgressText(`Loading chapter ${i + 1} of ${toc.length}...`);
        
        const ch = toc[i];
        let content = '';
        if (selectedBookState?.fileType === 'pdf') {
          content = await parser.getPageContent(ch.pageNumber || 1);
        } else {
          content = await parser.getChapterContent(ch.href);
        }
        fullChapters.push({ ...ch, content });
      }

      // 4. Load cache and apply to chapters
      setProgressText('Applying translated segments from cache...');
      setProgressPercent(50);

      let cache: Record<string, string> = {};
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          cache = JSON.parse(cachedStr);
        }
      } catch (e) {
        console.warn('Failed to load cache:', e);
      }

      const translatedChapters = fullChapters.map((ch) => {
        const div = document.createElement('div');
        div.innerHTML = ch.content;
        
        const nodes = getTranslatableNodes(div);
        
        nodes.forEach((node) => {
          const text = node.innerHTML?.trim();
          if (text && node.textContent?.trim()) {
            const cachedTranslation = cache[text];
            if (cachedTranslation) {
              node.innerHTML = cachedTranslation;
            }
          }
        });

        // Translate chapter title if cached
        let translatedTitle = ch.title;
        if (ch.title) {
          const trimmedTitle = ch.title.trim();
          const cachedTitle = cache[trimmedTitle];
          if (cachedTitle) {
            translatedTitle = cachedTitle;
          }
        }

        return {
          ...ch,
          title: translatedTitle,
          content: div.innerHTML
        };
      });

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      setProgressText('Compiling partially translated EPUB...');
      setProgressPercent(80);

      const compiledTitle = `${selectedBookState?.title || 'Book'} [${targetLanguage.toUpperCase()}] [Partial]`;
      const blob = await compileTranslatedEpub(compiledTitle, selectedBookState?.author, translatedChapters);

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      setProgressPercent(100);
      setProgressText(`Successfully compiled book with ${cacheCount} translated segments!`);
      setDownloadBlob(blob);
      setTranslationState('success');

      parser.destroy();
    } catch (err: any) {
      console.error('Partial compilation error:', err);
      setErrorMessage(err.message || 'An error occurred during partial compilation.');
      setTranslationState('error');
      if (parser) {
        try {
          parser.destroy();
        } catch (e) {
          console.debug('Parser destroy failed:', e);
        }
      }
    }
  };

  // Helper translation request
  const performBatchTranslation = async (
    texts: string[], 
    source: string, 
    target: string,
    onDetectedLanguage?: (lang: string) => void
  ): Promise<string[]> => {
    const promises = texts.map(async (txt) => {
      if (abortRef.current) return txt;

      // Translate a single segment within the text block
      const translateSingleSegment = async (segment: string): Promise<string> => {
        const controller = new AbortController();
        const timeoutMs = translationEngine === 'ollama' ? 25000 : 12000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          if (translationEngine === 'ollama') {
            const cleanUrl = ollamaUrl.endsWith('/') ? ollamaUrl.slice(0, -1) : ollamaUrl;
            const res = await fetch(`${cleanUrl}/api/generate`, {
              method: 'POST',
              body: JSON.stringify({
                model: selectedOllamaModel,
                prompt: `Translate this text from ${source === 'auto' ? 'auto-detected language' : getLanguageName(source)} to ${getLanguageName(target)}. Do not write any introduction, commentary, explanations, or quotes. Only return the final translated text, preserving HTML tags like <b>, <i>, <span> if present:\n\n${segment}`,
                stream: false,
                options: {
                  temperature: 0.1
                }
              }),
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const d = await res.json();
              if (d && d.response) {
                let resultText = d.response.trim();
                if (resultText.startsWith('```') && resultText.endsWith('```')) {
                  resultText = resultText.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
                }
                // Strip common LLM prefixes like "Translation: ..." or "Tradução: ..."
                resultText = resultText.replace(/^(Translation|Tradução|Traducción|Traduction|Übersetzung):\s*/i, '');
                // Strip surrounding quotes if segment itself did not start and end with quotes
                if ((resultText.startsWith('"') && resultText.endsWith('"')) || (resultText.startsWith('“') && resultText.endsWith('”'))) {
                  if (!segment.startsWith('"') && !segment.startsWith('“')) {
                    resultText = resultText.slice(1, -1).trim();
                  }
                }
                return resultText.trim() || segment;
              }
            }
            return segment;
          } else {
            const res = await fetch('http://127.0.0.1:5000/translate', {
              method: 'POST',
              body: JSON.stringify({
                q: segment,
                source: source,
                target: target,
                format: 'html'
              }),
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const d = await res.json();
              if (d) {
                if (d.detectedLanguage && onDetectedLanguage) {
                  const detLang = d.detectedLanguage.language || (Array.isArray(d.detectedLanguage) ? d.detectedLanguage[0]?.language : null);
                  if (detLang) {
                    onDetectedLanguage(detLang);
                  }
                }
                return d.translatedText || segment;
              }
            }
            return segment;
          }
        } catch (err) {
          clearTimeout(timeoutId);
          console.warn(`[Translator] Segment translation fetch failed for ${translationEngine}:`, err);
          return segment;
        }
      };

      // Split the text block by <br> tags and \n to preserve precise paragraph structure and spacing
      const parts = txt.split(/(<br\s*\/?>|\n)/gi);
      const translatedParts = await Promise.all(
        parts.map(async (part) => {
          const isTagOrNewline = /^(<br\s*\/?>|\n)$/i.test(part);
          if (isTagOrNewline) return part;
          const trimmed = part.trim();
          if (!trimmed) return part;
          if (!/[a-zA-Z0-9à-úÀ-Ú]/i.test(trimmed)) return part;
          return await translateSingleSegment(part);
        })
      );

      return translatedParts.join('');
    });

    return await Promise.all(promises);
  };

  const handleStartTranslation = async (isResuming: boolean = false) => {
    if (!bookFile) {
      setTranslationState('error');
      setErrorMessage('Book file is missing or invalid.');
      return;
    }

    if (!isResuming) {
      try {
        localStorage.removeItem(cacheKey);
        setCacheCount(0);
      } catch (e) {
        console.warn('Failed to clear cache on fresh start:', e);
      }
    }

    abortRef.current = false;
    setTranslationState('parsing');
    setErrorMessage(null);
    setProgressPercent(0);
    setProgressText('Opening book and parsing chapters...');
    setEstTimeRemaining(null);
    setDownloadBlob(null);

    logActivity({
      type: 'translate_book',
      bookId: selectedBookState?.id,
      bookTitle: selectedBookState?.title,
      targetLang: targetLanguage
    });

    let parser: EpubParser | PdfParser | null = null;
    try {
      // 1. Initialize Parser
      if (selectedBookState?.fileType === 'pdf') {
        parser = new PdfParser(bookFile);
      } else {
        parser = new EpubParser(bookFile);
      }
      await parser.initialize();

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      // 2. Fetch TOC list
      setProgressText('Retrieving Table of Contents...');
      const toc = await parser.getTableOfContents();
      
      if (!toc || toc.length === 0) {
        throw new Error('No chapters or pages found in the book file.');
      }

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      // 3. Load raw chapter texts
      setProgressText(`Loading content for ${toc.length} chapters...`);
      const fullChapters: Chapter[] = [];
      for (let i = 0; i < toc.length; i++) {
        if (abortRef.current) {
          parser.destroy();
          return;
        }
        setProgressPercent(Math.round(((i + 1) / toc.length) * 15)); // 0% - 15% for parsing
        setProgressText(`Loading chapter ${i + 1} of ${toc.length}...`);
        
        const ch = toc[i];
        let content = '';
        if (selectedBookState?.fileType === 'pdf') {
          content = await parser.getPageContent(ch.pageNumber || 1);
        } else {
          content = await parser.getChapterContent(ch.href);
        }
        fullChapters.push({ ...ch, content });
      }

      // 4. Pre-process text structures
      setTranslationState('translating');
      setProgressText('Pre-processing text structure for translation...');

      let cache: Record<string, string> = {};
      try {
        const cachedStr = localStorage.getItem(cacheKey);
        if (cachedStr) {
          cache = JSON.parse(cachedStr);
        }
      } catch (e) {
        console.warn('Failed to load cache:', e);
      }

      let lastProgressUpdate = 0;
      const updateProgressThrottled = (percent: number, text: string, timeRemaining: string | null, force: boolean = false) => {
        const now = Date.now();
        if (force || now - lastProgressUpdate > 200 || percent === 100) {
          setProgressPercent(percent);
          setProgressText(text);
          setEstTimeRemaining(timeRemaining);
          lastProgressUpdate = now;
        }
      };

      const flushCacheToDisk = () => {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(cache));
          updateCacheCount();
        } catch (e) {
          console.warn('Failed to save translation cache to disk:', e);
        }
      };

      const chapterTranslatableList: Array<{
        chapterIndex: number;
        elements: Array<{
          index: number;
          tag: string;
          original: string;
          translated: string;
        }>;
      }> = [];

      let totalTranslatableItems = 0;
      let alreadyTranslatedCount = 0;

      fullChapters.forEach((ch, idx) => {
        const div = document.createElement('div');
        div.innerHTML = ch.content;
        
        const nodes = getTranslatableNodes(div);
        const elements: typeof chapterTranslatableList[0]['elements'] = [];

        nodes.forEach((node, nodeIdx) => {
          const text = node.innerHTML?.trim();
          if (text && node.textContent?.trim()) {
            const cachedTranslation = cache[text];
            elements.push({
              index: nodeIdx,
              tag: node.tagName.toLowerCase(),
              original: text,
              translated: cachedTranslation || ''
            });
            totalTranslatableItems++;
            if (cachedTranslation) {
              alreadyTranslatedCount++;
            }
          }
        });

        chapterTranslatableList.push({
          chapterIndex: idx,
          elements
        });
      });

      if (totalTranslatableItems === 0) {
        throw new Error('No translatable text elements found in this book.');
      }

      let activeSourceLanguage = sourceLanguage;

      if (activeSourceLanguage === 'auto' && translationEngine === 'libretranslate') {
        let firstSampleText = '';
        for (const chList of chapterTranslatableList) {
          const firstElem = chList.elements.find(el => el.original && el.original.trim().length > 10);
          if (firstElem) {
            firstSampleText = firstElem.original;
            break;
          }
        }
        
        if (firstSampleText) {
          setProgressText('Detecting source language of the book...');
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            const detectRes = await fetch('http://127.0.0.1:5000/translate', {
              method: 'POST',
              body: JSON.stringify({
                q: firstSampleText,
                source: 'auto',
                target: targetLanguage,
                format: 'html'
              }),
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            if (detectRes.ok) {
              const d = await detectRes.json();
              const detLang = d.detectedLanguage?.language || (Array.isArray(d.detectedLanguage) ? d.detectedLanguage[0]?.language : null);
              if (detLang) {
                activeSourceLanguage = detLang;
                console.log(`[Translator] Locked book language to: ${detLang}`);
              }
            }
          } catch (e) {
            console.warn('[Translator] Failed to pre-detect language:', e);
          }
        }
      }

      const batchSize = 8;
      const allTranslatableBatches: Array<{
        chapterIndex: number;
        elements: typeof chapterTranslatableList[0]['elements'];
      }> = [];

      let currentBatchElements: typeof chapterTranslatableList[0]['elements'] = [];
      let currentChapterIdx = -1;

      chapterTranslatableList.forEach((chList) => {
        chList.elements.forEach((elem) => {
          if (elem.translated) {
            return;
          }
          if (currentChapterIdx === -1) {
            currentChapterIdx = chList.chapterIndex;
          }
          if (chList.chapterIndex !== currentChapterIdx || currentBatchElements.length >= batchSize) {
            if (currentBatchElements.length > 0) {
              allTranslatableBatches.push({
                chapterIndex: currentChapterIdx,
                elements: currentBatchElements
              });
            }
            currentBatchElements = [];
            currentChapterIdx = chList.chapterIndex;
          }
          currentBatchElements.push(elem);
        });
      });

      if (currentBatchElements.length > 0) {
        allTranslatableBatches.push({
          chapterIndex: currentChapterIdx,
          elements: currentBatchElements
        });
      }

      const totalBatches = allTranslatableBatches.length;
      let completedItems = alreadyTranslatedCount;
      const startTime = Date.now();

      if (totalBatches > 0) {
        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          if (abortRef.current) {
            flushCacheToDisk();
            parser.destroy();
            return;
          }

          const batch = allTranslatableBatches[batchIdx];
          const textsToTranslate = batch.elements.map(e => e.original);
          
          try {
            const translatedTexts = await performBatchTranslation(
              textsToTranslate, 
              activeSourceLanguage, 
              targetLanguage,
              (detectedLang) => {
                if (sourceLanguage === 'auto' && detectedLang && activeSourceLanguage === 'auto') {
                  activeSourceLanguage = detectedLang;
                }
              }
            );
            
            batch.elements.forEach((elem, itemIdx) => {
              const transText = translatedTexts[itemIdx] || elem.original;
              elem.translated = transText;
              if (translatedTexts[itemIdx]) {
                cache[elem.original] = transText;
              }
            });

            if (batchIdx % 10 === 0 || batchIdx === totalBatches - 1) {
              flushCacheToDisk();
            }
          } catch (apiError) {
            console.warn('Batch translation failed:', apiError);
            batch.elements.forEach((elem) => {
              elem.translated = elem.original;
            });
          }

          completedItems += batch.elements.length;
          
          const itemProgress = completedItems / totalTranslatableItems;
          const currentProgress = 15 + Math.round(itemProgress * 75);
          
          const elapsedMs = Date.now() - startTime;
          const completedBatches = batchIdx + 1;
          const avgMsPerBatch = elapsedMs / completedBatches;
          const remainingMs = (totalBatches - completedBatches) * avgMsPerBatch;
          
          updateProgressThrottled(
            currentProgress,
            `Translating book segments... (${completedItems} of ${totalTranslatableItems} paragraphs complete)`,
            formatRemainingTime(remainingMs)
          );
        }
        updateProgressThrottled(
          90,
          `Translating book segments... (${completedItems} of ${totalTranslatableItems} paragraphs complete)`,
          null,
          true
        );
      } else {
        setProgressPercent(90);
        setProgressText(`All ${totalTranslatableItems} segments already cached! Proceeding to compilation.`);
      }

      // Rebuild chapters
      setProgressText('Compiling translations into chapters...');
      setTranslationState('compiling');
      setProgressPercent(93);

      const translatedChapters = fullChapters.map((ch, idx) => {
        const div = document.createElement('div');
        div.innerHTML = ch.content;
        
        const nodes = getTranslatableNodes(div);
        
        const translatedElemMap = new Map<number, string>();
        chapterTranslatableList[idx].elements.forEach(el => {
          if (el.translated) {
            translatedElemMap.set(el.index, el.translated);
          }
        });

        nodes.forEach((node, nodeIdx) => {
          if (translatedElemMap.has(nodeIdx)) {
            node.innerHTML = translatedElemMap.get(nodeIdx) || node.innerHTML;
          }
        });

        let translatedTitle = ch.title;
        if (ch.title) {
          const trimmedTitle = ch.title.trim();
          const cachedTitle = cache[trimmedTitle];
          if (cachedTitle) {
            translatedTitle = cachedTitle;
          } else {
            const titleElem = chapterTranslatableList[idx].elements.find(el => 
              el.translated && 
              (el.original.toLowerCase().includes(trimmedTitle.toLowerCase()) || 
               trimmedTitle.toLowerCase().includes(el.original.toLowerCase()))
            );
            if (titleElem && titleElem.translated) {
              translatedTitle = titleElem.translated;
            }
          }
        }

        return {
          ...ch,
          title: translatedTitle,
          content: div.innerHTML
        };
      });

      // Assemble final package
      setProgressText('Assembling e-book package and styling headers...');
      setProgressPercent(97);

      const compiledTitle = `${selectedBookState?.title || 'Book'} (${targetLanguage.toUpperCase()})`;
      const blob = await compileTranslatedEpub(compiledTitle, selectedBookState?.author, translatedChapters);

      if (abortRef.current) {
        parser.destroy();
        return;
      }

      setProgressPercent(100);
      setProgressText('Translation and compilation successful!');
      setEstTimeRemaining(null);
      setDownloadBlob(blob);
      setTranslationState('success');

      parser.destroy();
    } catch (err: any) {
      console.error('Error translating book:', err);
      setTranslationState('error');
      setErrorMessage(err.message || 'An unknown error occurred.');
      if (parser) {
        try {
          parser.destroy();
        } catch (e) {
          console.warn('Parser destroy silent error:', e);
        }
      }
    }
  };

  const formatRemainingTime = (ms: number): string => {
    if (isNaN(ms) || ms <= 0) return 'estimating...';
    const totalSecs = Math.round(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s remaining`;
    }
    return `${secs}s remaining`;
  };

  const handleDownload = () => {
    if (!downloadBlob) return;
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedBookState?.title || 'Book'}_[${targetLanguage.toUpperCase()}].epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveToLibrary = async () => {
    if (!downloadBlob || isSavingToLibrary || savedToLibrary) return;
    try {
      setIsSavingToLibrary(true);
      const bookTitle = `${selectedBookState?.title || 'Book'} [${targetLanguage.toUpperCase()}]`;
      const file = new File([downloadBlob], `${bookTitle}.epub`, { type: 'application/epub+zip' });
      
      const { createBookFromSupportedFile } = await import('../utils/file-parser');
      const { saveBook, getUsername } = await import('../utils/storage');
      
      const newBookData = await createBookFromSupportedFile(file);
      const newBook: Book = {
        ...newBookData,
        id: `translated-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: bookTitle,
        author: selectedBookState?.author || 'Unknown',
        file,
        addedAt: new Date(),
        lastRead: new Date(),
        metadata: {
          uploadedBy: getUsername() || 'default',
          translatedFrom: selectedBookState?.id,
          targetLanguage
        }
      };

      await saveBook(newBook);
      setSavedToLibrary(true);
    } catch (saveErr) {
      console.error('Failed to save translated book to library:', saveErr);
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const getLanguageName = (code: string) => {
    if (code === 'auto') return getTranslation('autoDetect');
    const found = AVAILABLE_LANGUAGES.find(l => l.code === code);
    return found ? found.name : code;
  };

  const isTranslationDisabled = useMemo(() => {
    if (translationEngine === 'libretranslate') {
      return isBackendOnline === false;
    }
    if (translationEngine === 'ollama') {
      return isOllamaOnline === false || !selectedOllamaModel;
    }
    return false;
  }, [translationEngine, isBackendOnline, isOllamaOnline, selectedOllamaModel]);

  if (inline && !selectedBookState) {
    const isPt = getCurrentLanguage() === 'pt';
    return (
      <div 
        className="w-full h-full flex-1 flex flex-col p-8 overflow-y-auto animate-fade-in scrollbar-none" 
        style={{ 
          backgroundColor: interfaceStyles.backgroundColor, 
          color: interfaceStyles.color
        }}
      >
        <div className="w-full flex flex-col gap-6 max-w-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: interfaceStyles.borderColor }}>
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border"
                style={{ backgroundColor: `${interfaceStyles.accent}15`, borderColor: `${interfaceStyles.accent}30` }}
              >
                <Languages className="w-5 h-5" style={{ color: interfaceStyles.accent }} />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">{getTranslation('translateEntireBook')}</h2>
                <p className="text-xs opacity-65 leading-tight">
                  {getTranslation('chooseBookToTranslate')}
                </p>
              </div>
            </div>
          </div>

          {/* List of available books */}
          {availableBooks.length === 0 ? (
            <div className="text-center py-16 opacity-60 text-sm">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-35" />
              {getTranslation('noBooksFoundForTranslation')}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-wider opacity-60">
                {getTranslation('selectTheBook')}
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pr-1">
                {availableBooks.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBookState(b)}
                    className="flex items-center gap-4 p-4 rounded-2xl border text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer group"
                    style={{ borderColor: interfaceStyles.borderColor }}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm truncate" style={{ color: interfaceStyles.color }}>{b.title}</h4>
                      <p className="text-xs opacity-65 truncate">{b.author || (isPt ? 'Autor desconhecido' : 'Unknown author')}</p>
                      <p className="text-[9px] mt-1 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-full inline-block font-mono uppercase tracking-wider opacity-70">
                        {b.fileType}
                      </p>
                    </div>
                    <span 
                      className="text-[10px] font-black uppercase border px-3 py-1.5 rounded-xl transition-all group-hover:bg-blue-500/10 group-hover:border-blue-500/30"
                      style={{ color: interfaceStyles.accent, borderColor: `${interfaceStyles.accent}20` }}
                    >
                      {getTranslation('select')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const translatorContentInner = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-3 gap-2 min-w-0" style={{ borderColor: interfaceStyles.borderColor }}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <Languages className="w-6 h-6 text-blue-500 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold tracking-tight truncate" title={getTranslation('translateEntireBook')}>{getTranslation('translateEntireBook')}</h2>
            <p className="text-xs opacity-60 leading-tight truncate">{getTranslation('translateBookDescription')}</p>
          </div>
        </div>
        {inline && translationState === 'idle' ? (
          <button 
            type="button"
            onClick={() => setSelectedBookState(null)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold border hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shrink-0"
            style={{ borderColor: interfaceStyles.borderColor }}
          >
            {getTranslation('changeBook')}
          </button>
        ) : (
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            style={{ color: interfaceStyles.color }}
            aria-label={getTranslation('close') || 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="space-y-4">
        {/* Book Details Cover Card */}
        <div 
          className="p-3.5 rounded-2xl flex gap-3.5 border items-center"
          style={{ backgroundColor: interfaceStyles.panelSecondaryBackground, borderColor: interfaceStyles.borderColor }}
        >
          <div className="w-12 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs border">
            {selectedBookState?.fileType?.toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-bold text-sm truncate">{selectedBookState?.title}</h4>
            <p className="text-xs opacity-75 truncate">{getTranslation('byAuthor', { author: selectedBookState?.author || '' })}</p>
            <p className="text-[10px] mt-1 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full inline-block font-mono">
              {getTranslation('originalType', { type: selectedBookState?.fileType?.toUpperCase() || '' })}
            </p>
          </div>
        </div>

          {/* Translation Engine Selector */}
          {translationState === 'idle' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase opacity-60">
                {getTranslation('translationEngine')}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: LibreTranslate */}
                <button
                  type="button"
                  onClick={() => setTranslationEngine('libretranslate')}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    translationEngine === 'libretranslate'
                      ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: translationEngine === 'libretranslate' ? 'rgba(59, 130, 246, 0.05)' : interfaceStyles.backgroundColor,
                    borderColor: translationEngine === 'libretranslate' ? '#3b82f6' : interfaceStyles.borderColor
                  }}
                >
                  <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                    <Languages className="w-4 h-4 text-blue-500" />
                    {getTranslation('libreTranslate')}
                  </span>
                  <span className="text-[10px] opacity-75" style={{ color: interfaceStyles.color }}>
                    {getTranslation('fastLocalOffline')}
                  </span>
                </button>

                {/* Option 2: Ollama */}
                <button
                  type="button"
                  onClick={() => {
                    setTranslationEngine('ollama');
                    checkOllamaAndFetchModels();
                  }}
                  className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    translationEngine === 'ollama'
                      ? 'border-blue-500 bg-blue-500/5 ring-1 ring-blue-500'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  style={{
                    backgroundColor: translationEngine === 'ollama' ? 'rgba(59, 130, 246, 0.05)' : interfaceStyles.backgroundColor,
                    borderColor: translationEngine === 'ollama' ? '#3b82f6' : interfaceStyles.borderColor
                  }}
                >
                  <span className="font-bold text-xs sm:text-sm flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
                    <Cpu className="w-4 h-4 text-purple-500" />
                    {getTranslation('ollamaLlm')}
                  </span>
                  <span className="text-[10px] opacity-75" style={{ color: interfaceStyles.color }}>
                    {getTranslation('advancedAiTranslator')}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Language selection dropdowns */}
          {translationState === 'idle' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase opacity-60">{getTranslation('sourceLanguage')}</label>
                <select
                  value={sourceLanguage}
                  onChange={(e) => setSourceLanguage(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: interfaceStyles.inputBackground,
                    borderColor: interfaceStyles.inputBorder,
                    color: interfaceStyles.inputText
                  }}
                >
                  <option value="auto">{getTranslation('autoDetect')}</option>
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase opacity-60">{getTranslation('targetLanguage')}</label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    backgroundColor: interfaceStyles.inputBackground,
                    borderColor: interfaceStyles.inputBorder,
                    color: interfaceStyles.inputText
                  }}
                >
                  {AVAILABLE_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Ollama Config Modular Subcomponent */}
          {translationState === 'idle' && translationEngine === 'ollama' && (
            <OllamaConfig
              ollamaUrl={ollamaUrl}
              setOllamaUrl={setOllamaUrl}
              ollamaModels={ollamaModels}
              selectedOllamaModel={selectedOllamaModel}
              setSelectedOllamaModel={setSelectedOllamaModel}
              isOllamaOnline={isOllamaOnline}
              isOllamaChecking={isOllamaChecking}
              checkOllamaAndFetchModels={checkOllamaAndFetchModels}
              interfaceStyles={interfaceStyles}
            />
          )}

          {/* LibreTranslate Backend online check indicator */}
          {translationState === 'idle' && translationEngine === 'libretranslate' && (
            <div 
              className={`p-3.5 rounded-2xl flex items-center justify-between text-xs border ${
                isBackendOnline === true 
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30' 
                  : isBackendOnline === false 
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100 border-amber-300 dark:border-amber-700/50'
                  : 'opacity-70'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {isBackendOnline === true ? (
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : isBackendOnline === false ? (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 animate-pulse" />
                ) : (
                  <Loader2 className="w-4 h-4 animate-spin shrink-0 text-blue-500" />
                )}
                <span className="font-semibold">
                  {isBackendOnline === true 
                    ? getTranslation('connectionActive') 
                    : isBackendOnline === false 
                    ? getTranslation('offlineTranslateOffline') 
                    : getTranslation('connectionChecking')}
                </span>
              </div>
              <button 
                type="button"
                onClick={checkBackend} 
                disabled={isCheckingBackend}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition-all cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingBackend ? 'animate-spin' : ''}`} style={{ color: interfaceStyles.color }} />
              </button>
            </div>
          )}

          {/* Translation Cache Info / Memory */}
          {translationState === 'idle' && cacheCount > 0 && (
            <div 
              className="p-3.5 rounded-2xl border text-xs flex items-center justify-between animate-fade-in"
              style={{ 
                backgroundColor: interfaceStyles.panelSecondaryBackground, 
                borderColor: interfaceStyles.borderColor 
              }}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-blue-600 dark:text-blue-400">{getTranslation('translationMemoryActive')}</span>
                <span className="opacity-75" style={{ color: interfaceStyles.color }}>{getTranslation('segmentsTranslatedInCache', { count: cacheCount, lang: getLanguageName(targetLanguage) })}</span>
              </div>
              <button
                type="button"
                onClick={handleClearCache}
                className="p-1.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-600 transition-colors cursor-pointer"
                title={getTranslation('clearCacheTooltip')}
                style={{ color: interfaceStyles.color }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* LibreTranslate Config Modular Subcomponent */}
          {translationState === 'idle' && translationEngine === 'libretranslate' && (
            <LibreTranslateConfig
              threads={threads}
              setThreads={setThreads}
              cpuCores={cpuCores}
              startCommand={startCommand}
              handleCopyCommand={handleCopyCommand}
              copied={copied}
              handleDownloadLauncherBat={handleDownloadLauncherBat}
              showHelper={showHelper}
              setShowHelper={setShowHelper}
              interfaceStyles={interfaceStyles}
            />
          )}

          {/* Active Progress View Subcomponent */}
          {translationState !== 'idle' && (
            <TranslatorProgress
              translationState={translationState}
              progressPercent={progressPercent}
              progressText={progressText}
              estTimeRemaining={estTimeRemaining}
              errorMessage={errorMessage}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div 
          className="flex items-center justify-end gap-3 border-t pt-4 mt-1"
          style={{ borderColor: interfaceStyles.borderColor }}
        >
          {translationState === 'idle' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4.5 py-2.5 text-sm font-semibold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ color: interfaceStyles.color }}
              >
                {getTranslation('cancel')}
              </button>
              {cacheCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={handleExportCurrentProgress}
                    className="px-4.5 py-2.5 text-sm font-semibold rounded-xl text-emerald-600 hover:bg-emerald-500/10 transition-colors flex items-center gap-1.5 mr-auto cursor-pointer"
                    title={getCurrentLanguage() === 'pt' ? 'Exportar livro com capítulos traduzidos até agora' : 'Export book with chapters translated so far'}
                  >
                    <Download className="w-4 h-4 shrink-0 text-emerald-500" />
                    {getCurrentLanguage() === 'pt' ? 'Exportar Parcial' : 'Export Partial'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartTranslation(false)}
                    disabled={isTranslationDisabled}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {getTranslation('startFresh')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStartTranslation(true)}
                    disabled={isTranslationDisabled}
                    className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity flex items-center gap-2 cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 shrink-0" />
                    {getTranslation('resumeTranslation')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartTranslation(false)}
                  disabled={isTranslationDisabled}
                  className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 animate-in fade-in"
                  style={{ backgroundColor: isTranslationDisabled ? '#9ca3af' : '#007BFF' }}
                >
                  <Play className="w-4 h-4 shrink-0" />
                  {getTranslation('startAndCompile')}
                </button>
              )}
            </>
          ) : translationState === 'success' && downloadBlob ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4.5 py-2.5 text-sm font-semibold rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                style={{ color: interfaceStyles.color }}
              >
                {getTranslation('close')}
              </button>
              <button
                type="button"
                onClick={handleSaveToLibrary}
                disabled={isSavingToLibrary || savedToLibrary}
                className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-70"
              >
                {savedToLibrary ? (
                  <>
                    <CheckCircle className="w-4 h-4 shrink-0 text-emerald-300" />
                    <span>{getCurrentLanguage() === 'pt' ? 'Salvo na Biblioteca!' : 'Saved to Library!'}</span>
                  </>
                ) : isSavingToLibrary ? (
                  <>
                    <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    <span>{getCurrentLanguage() === 'pt' ? 'Salvando...' : 'Saving...'}</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4 shrink-0" />
                    <span>{getCurrentLanguage() === 'pt' ? 'Salvar na Biblioteca' : 'Add to Library'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 text-sm font-semibold rounded-xl text-white transition-opacity flex items-center gap-2 cursor-pointer shadow-xs bg-emerald-600 hover:bg-emerald-700"
              >
                <Download className="w-4 h-4 shrink-0" />
                {getTranslation('downloadTranslatedEpub')}
              </button>
            </>
          ) : (
            <>
              {(translationState !== 'success' && translationState !== 'error') && (
                <button
                  type="button"
                  onClick={handleStopTranslation}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 shrink-0" />
                  {getTranslation('pauseAndSave')}
                </button>
              )}
              {translationState === 'error' && (
                <button
                  type="button"
                  onClick={() => setTranslationState('idle')}
                  className="px-5 py-2.5 text-sm font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Retry Configuration
                </button>
              )}
            </>
          )}
        </div>
    </>
  );

  if (inline) {
    return (
      <div 
        className="themed-panel modal-content glass-surface w-full h-full flex-1 flex flex-col p-8 overflow-y-auto scrollbar-none" 
        style={{ 
          backgroundColor: interfaceStyles.backgroundColor, 
          color: interfaceStyles.color
        }}
      >
        <div className="w-full flex flex-col gap-6 max-w-full">
          {translatorContentInner}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[110] animate-in fade-in duration-250"
      onClick={onClose}
    >
      <div 
        className="themed-panel modal-content glass-surface w-full max-w-lg p-6 rounded-3xl border shadow-2xl flex flex-col gap-5 mx-4 relative max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-250"
        style={{ 
          backgroundColor: interfaceStyles.backgroundColor, 
          color: interfaceStyles.color,
          borderColor: interfaceStyles.borderColor
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {translatorContentInner}
      </div>
    </div>
  );
};
