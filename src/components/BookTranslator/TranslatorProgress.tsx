import React from 'react';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getTranslation } from '../../utils/translations';

interface TranslatorProgressProps {
  translationState: 'idle' | 'parsing' | 'translating' | 'compiling' | 'success' | 'error';
  progressPercent: number;
  progressText: string;
  estTimeRemaining: string | null;
  errorMessage: string | null;
}

export const TranslatorProgress: React.FC<TranslatorProgressProps> = ({
  translationState,
  progressPercent,
  progressText,
  estTimeRemaining,
  errorMessage
}) => {
  if (translationState === 'idle') return null;

  return (
    <div className="space-y-4 py-2 animate-fade-in">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          {translationState !== 'success' && translationState !== 'error' && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {translationState === 'parsing' && getTranslation('parsingEbook')}
          {translationState === 'translating' && getTranslation('translatingSegments')}
          {translationState === 'compiling' && getTranslation('compilingTranslated')}
          {translationState === 'success' && (
            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              {getTranslation('compiledSuccessfully')}
            </span>
          )}
          {translationState === 'error' && (
            <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              {getTranslation('compilationFailed')}
            </span>
          )}
        </span>
        <span className="text-sm font-mono">{progressPercent}%</span>
      </div>

      {/* Progress bar container */}
      <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${
            translationState === 'error' 
              ? 'bg-rose-500' 
              : translationState === 'success' 
              ? 'bg-emerald-500' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Detailed logs & remaining time estimate */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-mono opacity-80 select-all leading-relaxed whitespace-pre-wrap">
          {progressText}
        </p>
        {estTimeRemaining && (
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {getTranslation('estimatedTime', { time: estTimeRemaining })}
          </p>
        )}
      </div>

      {/* Error detail banner */}
      {translationState === 'error' && errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 text-xs font-medium leading-relaxed animate-fade-in">
          {errorMessage}
        </div>
      )}
    </div>
  );
};
