import React from 'react';
import { Cpu, ChevronDown, ChevronUp, Copy, Check, FileDown } from 'lucide-react';
import { getTranslation, getCurrentLanguage } from '../../utils/translations';

interface LibreTranslateConfigProps {
  threads: number;
  setThreads: (val: number) => void;
  cpuCores: number;
  startCommand: string;
  handleCopyCommand: () => void;
  copied: boolean;
  handleDownloadLauncherBat: () => void;
  showHelper: boolean;
  setShowHelper: (val: boolean) => void;
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

export const LibreTranslateConfig: React.FC<LibreTranslateConfigProps> = ({
  threads,
  setThreads,
  cpuCores,
  startCommand,
  handleCopyCommand,
  copied,
  handleDownloadLauncherBat,
  showHelper,
  setShowHelper,
  interfaceStyles
}) => {
  return (
    <div 
      className="border rounded-2xl overflow-hidden transition-all duration-200"
      style={{ borderColor: interfaceStyles.borderColor }}
    >
      <button
        type="button"
        onClick={() => setShowHelper(!showHelper)}
        className="w-full p-3.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
        style={{ backgroundColor: interfaceStyles.panelSecondaryBackground, color: interfaceStyles.color }}
      >
        <span className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-500" />
          {getTranslation('libretranslateControlCenter') || 'LibreTranslate Control Center'}
        </span>
        {showHelper ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showHelper && (
        <div className="p-4 space-y-3 text-xs leading-relaxed" style={{ backgroundColor: interfaceStyles.backgroundColor }}>
          {/* CPU Optimization notice banner */}
          <div 
            className="p-3.5 rounded-xl border-l-4 text-xs font-medium space-y-1 animate-fade-in"
            style={{ 
              backgroundColor: interfaceStyles.panelSecondaryBackground,
              borderColor: '#10b981',
              color: interfaceStyles.color
            }}
          >
            <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider text-[10px]">
              <Cpu className="w-3.5 h-3.5" />
              {getCurrentLanguage() === 'pt' ? 'Otimização de CPU para Tradução' : (getTranslation('cpuOptimizationTitle') || 'CPU Optimization')}
            </span>
            <p className="opacity-90 leading-relaxed">
              {getTranslation('cpuOptimizationNotice', { cores: cpuCores })}
            </p>
            <p className="opacity-75 leading-relaxed text-[11px]">
              {getTranslation('libretranslateParallelNotice', { cores: cpuCores })}
            </p>
          </div>
 
          {/* Threads configuration control */}
          <div className="pt-1 max-w-[240px] mx-auto">
            <div className="flex flex-col gap-1.5 text-center">
              <label className="font-semibold opacity-75" style={{ color: interfaceStyles.color }}>
                {getTranslation('executionThreads')}
              </label>
              <input
                type="number"
                min="1"
                max="64"
                value={threads}
                onChange={(e) => setThreads(Math.max(1, parseInt(e.target.value) || 1))}
                className="p-2 rounded-lg border outline-none text-center font-mono w-24 mx-auto"
                style={{ 
                  backgroundColor: interfaceStyles.inputBackground, 
                  color: interfaceStyles.inputText,
                  borderColor: interfaceStyles.inputBorder
                }}
              />
              <span className="text-[10px] opacity-50" style={{ color: interfaceStyles.color }}>
                {getTranslation('recommendedCores', { cores: cpuCores })}
              </span>
            </div>
          </div>

          {/* Startup command copy area */}
          <div className="mt-3 flex flex-col gap-1">
            <label className="font-semibold opacity-75" style={{ color: interfaceStyles.color }}>
              {getTranslation('startupCliCommand')}
            </label>
            <div 
              className="flex items-center gap-1.5 rounded-lg p-2 font-mono text-[10px] select-all border relative group"
              style={{ backgroundColor: interfaceStyles.panelSecondaryBackground, borderColor: interfaceStyles.borderColor }}
            >
              <span className="pr-8 truncate block w-full" style={{ color: interfaceStyles.color }}>{startCommand}</span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="absolute right-1.5 top-1.5 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-blue-500 transition-colors cursor-pointer"
                title="Copy command"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Download Launcher .bat script */}
          <button
            type="button"
            onClick={handleDownloadLauncherBat}
            className="w-full mt-2.5 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
            style={{ borderColor: interfaceStyles.borderColor, color: interfaceStyles.color }}
          >
            <FileDown className="w-4 h-4 text-emerald-500" />
            {getTranslation('downloadCustomStartBat')}
          </button>
        </div>
      )}
    </div>
  );
};
