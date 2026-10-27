import React from 'react';
import { X } from 'lucide-react';

interface TranslationErrorPopupProps {
  translationError: string | null;
  onClose: () => void;
}

export const TranslationErrorPopup: React.FC<TranslationErrorPopupProps> = ({
  translationError,
  onClose,
}) => {
  if (!translationError) return null;

  return (
    <div className="themed-panel glass-surface backdrop-blur-md fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl shadow-xl border border-red-500/30 bg-red-50/90 dark:bg-red-950/70 text-red-900 dark:text-red-200 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2 items-center">
          <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <h4 className="font-bold text-sm tracking-tight">Backend Error</h4>
        </div>
        <button 
          onClick={onClose}
          className="text-red-500 hover:text-red-700 dark:hover:text-red-300 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs opacity-90 leading-normal">
        Could not connect to LibreTranslate at <strong>http://127.0.0.1:5000</strong>. Make sure the server is running.
      </p>
    </div>
  );
};
