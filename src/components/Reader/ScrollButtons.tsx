import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { ReadingPreferences } from '../../types';

interface ScrollButtonsProps {
  preferences?: ReadingPreferences | null;
}

export const ScrollButtons: React.FC<ScrollButtonsProps> = ({ preferences }) => {
  const [isFullscreen, setIsFullscreen] = React.useState(!!document.fullscreenElement);
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const checkSettings = () => {
      setIsSettingsOpen(document.querySelector('[data-settings-panel]') !== null);
    };

    // Initial check
    checkSettings();

    // Set up an observer to watch for settings panel
    const observer = new MutationObserver(checkSettings);
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      observer.disconnect();
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  if (!preferences?.scrollButtons?.visible) {
    return null;
  }

  const scrollButtons = preferences.scrollButtons;

  const getSizeClasses = () => {
    if (scrollButtons.size === 'custom' && scrollButtons.customSize) {
      const size = scrollButtons.customSize;
      return { width: `${size}px`, height: `${size}px` };
    }
    
    switch (scrollButtons.size) {
      case 'small':
        return { width: '40px', height: '40px' };
      case 'large':
        return { width: '64px', height: '64px' };
      default:
        return { width: '48px', height: '48px' };
    }
  };

  const getIconSize = () => {
    if (scrollButtons.size === 'custom' && scrollButtons.customSize) {
      const size = Math.max(16, Math.min(32, (scrollButtons.customSize || 48) * 0.4));
      return { width: `${size}px`, height: `${size}px` };
    }
    
    switch (scrollButtons.size) {
      case 'small':
        return { width: '16px', height: '16px' };
      case 'large':
        return { width: '32px', height: '32px' };
      default:
        return { width: '24px', height: '24px' };
    }
  };

  const sizeStyles = getSizeClasses();
  const iconStyles = getIconSize();

  // If settings is open, move buttons to the left of the panel
  // The panel is max-w-lg (approx 512px)
  const rightOffset = isSettingsOpen ? 'right-[540px]' : 'right-6';
  
  // In fullscreen, we want them to be very accessible
  const topClass = isFullscreen ? 'top-10' : 'top-24';
  const bottomClass = isFullscreen ? 'bottom-10' : 'bottom-24';

  return (
    <>
      {/* Scroll to Top Button */}
      <div className={`fixed ${topClass} ${rightOffset} z-[110] transition-all duration-500`}>
        <button
          onClick={scrollToTop}
          className="bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          style={{
            ...sizeStyles,
            borderRadius: '50%', // Circle for corner buttons
            border: '2px solid #ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          aria-label="Scroll to top"
        >
          <ChevronUp style={iconStyles} />
        </button>
      </div>
      
      {/* Scroll to Bottom Button */}
      <div className={`fixed ${bottomClass} ${rightOffset} z-[110] transition-all duration-500`}>
        <button
          onClick={scrollToBottom}
          className="bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          style={{
            ...sizeStyles,
            borderRadius: '50%', // Circle for corner buttons
            border: '2px solid #ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
          aria-label="Scroll to bottom"
        >
          <ChevronDown style={iconStyles} />
        </button>
      </div>
    </>
  );
};
