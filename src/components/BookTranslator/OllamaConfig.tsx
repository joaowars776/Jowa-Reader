import React from 'react';
import { Cpu, RefreshCw } from 'lucide-react';
import { getTranslation } from '../../utils/translations';

interface OllamaConfigProps {
  ollamaUrl: string;
  setOllamaUrl: (val: string) => void;
  ollamaModels: string[];
  selectedOllamaModel: string;
  setSelectedOllamaModel: (val: string) => void;
  isOllamaOnline: boolean | null;
  isOllamaChecking: boolean;
  checkOllamaAndFetchModels: () => void;
  interfaceStyles: {
    backgroundColor: string;
    color: string;
    borderColor: string;
    panelSecondaryBackground: string;
    inputBackground: string;
    inputText: string;
    inputBorder: string;
  };
}

export const OllamaConfig: React.FC<OllamaConfigProps> = ({
  ollamaUrl,
  setOllamaUrl,
  ollamaModels,
  selectedOllamaModel,
  setSelectedOllamaModel,
  isOllamaOnline,
  isOllamaChecking,
  checkOllamaAndFetchModels,
  interfaceStyles
}) => {
  return (
    <div 
      className="p-4 rounded-2xl border space-y-3.5 animate-fade-in"
      style={{ backgroundColor: interfaceStyles.panelSecondaryBackground, borderColor: interfaceStyles.borderColor }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase opacity-75 flex items-center gap-1.5" style={{ color: interfaceStyles.color }}>
          <Cpu className="w-4 h-4 text-purple-500" />
          {getTranslation('ollamaSettings') || 'Ollama Settings'}
        </span>
        <button
          type="button"
          onClick={checkOllamaAndFetchModels}
          disabled={isOllamaChecking}
          className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
          style={{ color: interfaceStyles.color }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isOllamaChecking ? 'animate-spin' : ''}`} />
          {getTranslation('reload') || 'Reload'}
        </button>
      </div>

      {/* API Endpoint Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold opacity-75" style={{ color: interfaceStyles.color }}>
          {getTranslation('ollamaApiUrl') || 'Ollama API URL:'}
        </label>
        <input
          type="text"
          value={ollamaUrl}
          onChange={(e) => setOllamaUrl(e.target.value)}
          onBlur={() => checkOllamaAndFetchModels()}
          placeholder="e.g. http://127.0.0.1:11434"
          className="px-3 py-2 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          style={{
            backgroundColor: interfaceStyles.inputBackground,
            borderColor: interfaceStyles.inputBorder,
            color: interfaceStyles.inputText
          }}
        />
      </div>

      {/* Model Selection Dropdown */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-bold opacity-75" style={{ color: interfaceStyles.color }}>
          {getTranslation('translationModel') || 'Translation Model:'}
        </label>
        {ollamaModels.length > 0 ? (
          <select
            value={selectedOllamaModel}
            onChange={(e) => setSelectedOllamaModel(e.target.value)}
            className="px-3 py-2.5 rounded-xl border text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            style={{
              backgroundColor: interfaceStyles.inputBackground,
              borderColor: interfaceStyles.inputBorder,
              color: interfaceStyles.inputText
            }}
          >
            {ollamaModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-rose-500 font-medium py-1">
            {getTranslation('noModelsFound') || 'No models found. Make sure Ollama is running and has models downloaded.'}
          </div>
        )}
      </div>

      {/* Connection Status Indicator */}
      <div className="text-[11px] flex items-center gap-2" style={{ color: interfaceStyles.color }}>
        <div className={`w-2 h-2 rounded-full ${isOllamaOnline === true ? 'bg-emerald-500' : isOllamaOnline === false ? 'bg-rose-500 animate-pulse' : 'bg-gray-400'}`} />
        <span className="opacity-80">
          {isOllamaOnline === true 
            ? getTranslation('ollamaConnected')
            : isOllamaOnline === false 
            ? getTranslation('ollamaNotConnected')
            : getTranslation('ollamaChecking')}
        </span>
      </div>
    </div>
  );
};
