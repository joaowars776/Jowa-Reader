import type { InterfaceTheme, ColorTheme } from '../types';

// Interface Theme Definitions with Complete Color Specifications
export const INTERFACE_THEMES: InterfaceTheme[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Clean and bright interface with excellent readability',
    isDefault: true,
    colors: {
      // Header colors
      headerBackground: '#ffffff',
      headerText: '#1f2937',
      headerBorder: '#e5e7eb',
      
      // Panel colors
      panelBackground: '#ffffff',
      panelText: '#1f2937',
      panelBorder: '#e5e7eb',
      panelSecondaryBackground: '#f9fafb',
      
      // Button colors
      buttonPrimary: '#007BFF',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f3f4f6',
      buttonSecondaryText: '#374151',
      buttonHover: '#0056b3',
      
      // Input colors
      inputBackground: '#ffffff',
      inputText: '#1f2937',
      inputBorder: '#d1d5db',
      inputFocus: '#007BFF',
      
      // Accent colors
      accent: '#007BFF',
      accentHover: '#0056b3',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      
      // Interactive elements
      linkColor: '#007BFF',
      linkHover: '#0056b3',
      divider: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      borderColor: '#e5e7eb'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'Modern dark theme perfect for low-light reading',
    colors: {
      // Header colors
      headerBackground: '#1f2937',
      headerText: '#f9fafb',
      headerBorder: '#374151',
      
      // Panel colors
      panelBackground: '#1f2937',
      panelText: '#f9fafb',
      panelBorder: '#374151',
      panelSecondaryBackground: '#111827',
      
      // Button colors
      buttonPrimary: '#3b82f6',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#374151',
      buttonSecondaryText: '#d1d5db',
      buttonHover: '#2563eb',
      
      // Input colors
      inputBackground: '#374151',
      inputText: '#f9fafb',
      inputBorder: '#4b5563',
      inputFocus: '#3b82f6',
      
      // Accent colors
      accent: '#3b82f6',
      accentHover: '#2563eb',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#f9fafb',
      textSecondary: '#d1d5db',
      textMuted: '#9ca3af',
      
      // Interactive elements
      linkColor: '#60a5fa',
      linkHover: '#3b82f6',
      divider: '#374151',
      shadow: 'rgba(0, 0, 0, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.7)',
      borderColor: '#374151'
    }
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm, paper-like interface that reduces eye strain',
    colors: {
      // Header colors
      headerBackground: '#f7f3e9',
      headerText: '#5d4e37',
      headerBorder: '#e6d7c3',
      
      // Panel colors
      panelBackground: '#f7f3e9',
      panelText: '#5d4e37',
      panelBorder: '#e6d7c3',
      panelSecondaryBackground: '#f0e6d2',
      
      // Button colors
      buttonPrimary: '#8b4513',
      buttonPrimaryText: '#f7f3e9',
      buttonSecondary: '#e6d7c3',
      buttonSecondaryText: '#5d4e37',
      buttonHover: '#a0522d',
      
      // Input colors
      inputBackground: '#faf6ed',
      inputText: '#5d4e37',
      inputBorder: '#d4c4a8',
      inputFocus: '#8b4513',
      
      // Accent colors
      accent: '#8b4513',
      accentHover: '#a0522d',
      success: '#6b8e23',
      warning: '#daa520',
      error: '#cd5c5c',
      
      // Text hierarchy
      textPrimary: '#5d4e37',
      textSecondary: '#8b7355',
      textMuted: '#a0916d',
      
      // Interactive elements
      linkColor: '#8b4513',
      linkHover: '#a0522d',
      divider: '#e6d7c3',
      shadow: 'rgba(93, 78, 55, 0.15)',
      overlay: 'rgba(93, 78, 55, 0.5)',
      borderColor: '#e6d7c3'
    }
  },
  {
    id: 'highcontrast',
    name: 'High Contrast',
    description: 'Maximum contrast for enhanced accessibility',
    colors: {
      // Header colors
      headerBackground: '#000000',
      headerText: '#ffffff',
      headerBorder: '#ffffff',
      
      // Panel colors
      panelBackground: '#000000',
      panelText: '#ffffff',
      panelBorder: '#ffffff',
      panelSecondaryBackground: '#1a1a1a',
      
      // Button colors
      buttonPrimary: '#ffffff',
      buttonPrimaryText: '#000000',
      buttonSecondary: '#333333',
      buttonSecondaryText: '#ffffff',
      buttonHover: '#cccccc',
      
      // Input colors
      inputBackground: '#000000',
      inputText: '#ffffff',
      inputBorder: '#ffffff',
      inputFocus: '#ffff00',
      
      // Accent colors
      accent: '#ffff00',
      accentHover: '#cccc00',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      
      // Text hierarchy
      textPrimary: '#ffffff',
      textSecondary: '#cccccc',
      textMuted: '#999999',
      
      // Interactive elements
      linkColor: '#ffff00',
      linkHover: '#cccc00',
      divider: '#ffffff',
      shadow: 'rgba(255, 255, 255, 0.3)',
      overlay: 'rgba(0, 0, 0, 0.8)',
      borderColor: '#ffffff'
    }
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Cozy rain atmosphere with JOWA highlights',
    colors: {
      // Header colors
      headerBackground: '#0f172a',
      headerText: '#e2e8f0',
      headerBorder: '#1e293b',
      
      // Panel colors
      panelBackground: '#0f172a',
      panelText: '#e2e8f0',
      panelBorder: '#1e293b',
      panelSecondaryBackground: '#020617',
      
      // Button colors
      buttonPrimary: '#0ea5e9',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#1e293b',
      buttonSecondaryText: '#cbd5e1',
      buttonHover: '#0284c7',
      
      // Input colors
      inputBackground: '#1e293b',
      inputText: '#e2e8f0',
      inputBorder: '#334155',
      inputFocus: '#0ea5e9',
      
      // Accent colors
      accent: '#0ea5e9',
      accentHover: '#0284c7',
      success: '#06b6d4',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#e2e8f0',
      textSecondary: '#cbd5e1',
      textMuted: '#94a3b8',
      
      // Interactive elements
      linkColor: '#38bdf8',
      linkHover: '#0ea5e9',
      divider: '#1e293b',
      shadow: 'rgba(15, 23, 42, 0.4)',
      overlay: 'rgba(15, 23, 42, 0.7)',
      borderColor: '#1e293b'
    }
  },
  {
    id: 'aurora',
    name: 'Elegant Aurora',
    description: 'Cozy boreal aurora atmosphere with sakura/lotus falling petals',
    colors: {
      // Header colors
      headerBackground: '#0c0a1e',
      headerText: '#e9d5ff',
      headerBorder: '#27215c',
      
      // Panel colors
      panelBackground: '#0f0d26',
      panelText: '#e9d5ff',
      panelBorder: '#27215c',
      panelSecondaryBackground: '#151233',
      
      // Button colors
      buttonPrimary: '#8b5cf6',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#1a163a',
      buttonSecondaryText: '#d8b4fe',
      buttonHover: '#7c3aed',
      
      // Input colors
      inputBackground: '#151233',
      inputText: '#e9d5ff',
      inputBorder: '#27215c',
      inputFocus: '#8b5cf6',
      
      // Accent colors
      accent: '#a78bfa',
      accentHover: '#8b5cf6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#e9d5ff',
      textSecondary: '#d8b4fe',
      textMuted: '#a78bfa',
      
      // Interactive elements
      linkColor: '#d8b4fe',
      linkHover: '#a78bfa',
      divider: '#27215c',
      shadow: 'rgba(15, 13, 38, 0.4)',
      overlay: 'rgba(12, 10, 30, 0.7)',
      borderColor: '#27215c'
    }
  },
  {
    id: 'snow',
    name: 'Snow',
    description: 'Frosty ice blue theme with magical falling snow',
    colors: {
      // Header colors
      headerBackground: '#e0f2fe',
      headerText: '#0369a1',
      headerBorder: '#bae6fd',
      
      // Panel colors
      panelBackground: '#f0f9ff',
      panelText: '#0c4a6e',
      panelBorder: '#bae6fd',
      panelSecondaryBackground: '#e0f2fe',
      
      // Button colors
      buttonPrimary: '#0284c7',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#e0f2fe',
      buttonSecondaryText: '#0369a1',
      buttonHover: '#0369a1',
      
      // Input colors
      inputBackground: '#ffffff',
      inputText: '#0c4a6e',
      inputBorder: '#bae6fd',
      inputFocus: '#0284c7',
      
      // Accent colors
      accent: '#38bdf8',
      accentHover: '#0284c7',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#0c4a6e',
      textSecondary: '#0369a1',
      textMuted: '#64748b',
      
      // Interactive elements
      linkColor: '#0284c7',
      linkHover: '#0369a1',
      divider: '#bae6fd',
      shadow: 'rgba(2, 132, 199, 0.1)',
      overlay: 'rgba(12, 74, 110, 0.4)',
      borderColor: '#bae6fd'
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own interface color combination',
    colors: {
      // Header colors
      headerBackground: '#ffffff',
      headerText: '#1f2937',
      headerBorder: '#e5e7eb',
      
      // Panel colors
      panelBackground: '#ffffff',
      panelText: '#1f2937',
      panelBorder: '#e5e7eb',
      panelSecondaryBackground: '#f9fafb',
      
      // Button colors
      buttonPrimary: '#007BFF',
      buttonPrimaryText: '#ffffff',
      buttonSecondary: '#f3f4f6',
      buttonSecondaryText: '#374151',
      buttonHover: '#0056b3',
      
      // Input colors
      inputBackground: '#ffffff',
      inputText: '#1f2937',
      inputBorder: '#d1d5db',
      inputFocus: '#007BFF',
      
      // Accent colors
      accent: '#007BFF',
      accentHover: '#0056b3',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      
      // Text hierarchy
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
      textMuted: '#9ca3af',
      
      // Interactive elements
      linkColor: '#007BFF',
      linkHover: '#0056b3',
      divider: '#e5e7eb',
      shadow: 'rgba(0, 0, 0, 0.1)',
      overlay: 'rgba(0, 0, 0, 0.5)',
      borderColor: '#e5e7eb'
    }
  }
];

// Reading Color Themes (for EPUB content)
export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'light',
    name: 'Light',
    description: 'Classic black text on white background',
    colors: {
      textColor: '#000000',
      backgroundColor: '#ffffff'
    }
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'White text on dark background for low-light reading',
    colors: {
      textColor: '#f9fafb',
      backgroundColor: '#1f2937'
    }
  },
  {
    id: 'sepia',
    name: 'Sepia',
    description: 'Warm, paper-like reading experience',
    colors: {
      textColor: '#5d4e37',
      backgroundColor: '#f7f3e9'
    }
  },
  {
    id: 'highcontrast',
    name: 'High Contrast',
    description: 'Maximum contrast for accessibility',
    colors: {
      textColor: '#ffffff',
      backgroundColor: '#000000'
    }
  },
  {
    id: 'rain',
    name: 'Rain',
    description: 'Cozy rain atmosphere with JOWA highlights',
    colors: {
      textColor: '#cbd5e1',
      backgroundColor: '#0f172a'
    }
  },
  {
    id: 'aurora',
    name: 'Elegant Aurora',
    description: 'Cozy boreal aurora atmosphere with sakura/lotus falling petals',
    colors: {
      textColor: '#e9d5ff',
      backgroundColor: '#0f0d26'
    }
  },
  {
    id: 'snow',
    name: 'Snow',
    description: 'Cool frosty theme with falling snow',
    colors: {
      textColor: '#0c4a6e',
      backgroundColor: '#f0f9ff'
    }
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Create your own color combination',
    colors: {
      textColor: '#000000',
      backgroundColor: '#ffffff'
    }
  }
];

// Helper to safely lighten/darken a hex color by a given rgb offset
export const adjustColorBrightness = (hex: string, offset: number): string => {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  if (isNaN(num)) return hex;
  
  let r = (num >> 16) + offset;
  let g = ((num >> 8) & 0x00ff) + offset;
  let b = (num & 0x0000ff) + offset;
  
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Helper function to check if a hex color is dark
export const isHexColorDark = (hex: string): boolean => {
  const cleanHex = hex.replace('#', '');
  let r = 255, g = 255, b = 255;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));
  return hsp < 130;
};

// Helper to calculate high-contrast readable accent colors for text and badges
export const getContrastAccentColor = (tintHex: string, isDarkBg: boolean): string => {
  const isTintDark = isHexColorDark(tintHex);
  if (isDarkBg) {
    if (isTintDark) {
      if (tintHex.toLowerCase() === '#0f172a' || tintHex.toLowerCase() === '#000000') {
        return '#38bdf8'; // High contrast sky blue for infinite black
      }
      return adjustColorBrightness(tintHex, 110);
    }
    return tintHex;
  } else {
    if (!isTintDark) {
      return adjustColorBrightness(tintHex, -110);
    }
    return tintHex;
  }
};

// Helper function to extract interface theme colors directly from ReadingPreferences
export const getInterfaceThemeFromPrefs = (prefs: any): InterfaceTheme => {
  if (!prefs) {
    return INTERFACE_THEMES.find(t => t.id === 'light') || INTERFACE_THEMES[0];
  }
  const themeId = prefs.selectedInterfaceTheme || 'light';
  const subTheme = prefs.snowSubTheme || 'night';
  const menuStyle = prefs.menuStyle || 'classic';
  const linkStyle = prefs.linkStyleWithTheme !== false;
  
  const glassEnabled = prefs.glassEnabled ?? false;
  const isTinted = (prefs.menuSubTheme || 'default') === 'tinted';
  const glassReaderAreaOnly = glassEnabled && isTinted ? (prefs.glassReaderAreaOnly ?? false) : false;

  // Interface is glass only if glass is enabled AND we are not in reader area only mode
  const isInterfaceGlass = glassEnabled && !glassReaderAreaOnly;
  const menuSubTheme = isInterfaceGlass ? (prefs.menuSubTheme || 'default') : 'default';
  const neonCustomColor = prefs.neonCustomColor;
  const glassTintColor = prefs.glassTintColor;

  let theme = getInterfaceTheme(
    themeId,
    subTheme,
    menuStyle,
    linkStyle,
    menuSubTheme,
    neonCustomColor,
    isInterfaceGlass,
    glassTintColor
  );

  // If custom theme, override with user customColors if set
  if (themeId === 'custom' && prefs.interfaceColors) {
    theme = { ...theme, colors: { ...theme.colors, ...prefs.interfaceColors } };
  }
  return theme;
};

const themeCache = new Map<string, InterfaceTheme>();

// Helper function to get interface theme by ID with support for Snow sub-themes & universal sub-interfaces/menu styles
export const getInterfaceTheme = (
  themeId: string,
  subTheme: 'day' | 'night' | 'midnight' = 'day',
  menuStyleOrType: 'classic' | 'wood' | 'neon' | 'glass' | 'retro8bit' | 'urban' = 'classic',
  linkStyleWithTheme: boolean = true,
  menuSubTheme: string = 'default',
  neonCustomColor?: string,
  glassEnabled: boolean = false,
  glassTintColor?: string
): InterfaceTheme => {
  const cacheKey = `${themeId}_${subTheme}_${menuStyleOrType}_${linkStyleWithTheme}_${menuSubTheme}_${neonCustomColor || ''}_${glassEnabled}_${glassTintColor || ''}`;
  if (themeCache.has(cacheKey)) {
    return themeCache.get(cacheKey)!;
  }

  // Map old menuType values to new menuStyle
  let menuStyle: 'classic' | 'wood' | 'neon' | 'glass' | 'retro8bit' = 'classic';
  if (menuStyleOrType === 'wood') menuStyle = 'wood';
  else if (menuStyleOrType === 'urban' || menuStyleOrType === 'neon') menuStyle = 'neon';
  else if (menuStyleOrType === 'glass') {
    menuStyle = 'classic';
    glassEnabled = true;
  }
  else if (menuStyleOrType === 'retro8bit') menuStyle = 'retro8bit';

  // Get base theme
  const baseTheme = INTERFACE_THEMES.find(theme => theme.id === themeId) || INTERFACE_THEMES[0];
  let colors = { ...baseTheme.colors };

  // Only apply sub-themes (Day, Night, Midnight) if the selected theme is 'snow', 'rain', or 'aurora'
  const actualSubTheme = (themeId === 'snow' || themeId === 'rain' || themeId === 'aurora') ? subTheme : 'day';

  // 1. Apply Sub-Theme Colors (Day, Night, Midnight) to ANY theme!
  if (actualSubTheme === 'night') {
    if (themeId === 'light' || themeId === 'custom') {
      colors = {
        ...colors,
        headerBackground: '#1e293b',
        headerText: '#f1f5f9',
        headerBorder: '#334155',
        panelBackground: '#1e293b',
        panelText: '#f1f5f9',
        panelBorder: '#334155',
        panelSecondaryBackground: '#0f172a',
        buttonPrimary: '#3b82f6',
        buttonSecondary: '#334155',
        buttonSecondaryText: '#cbd5e1',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        divider: '#334155',
        borderColor: '#334155'
      };
    } else if (themeId === 'sepia') {
      colors = {
        ...colors,
        headerBackground: '#2d241e',
        headerText: '#f4ece1',
        headerBorder: '#3e3229',
        panelBackground: '#2d241e',
        panelText: '#f4ece1',
        panelBorder: '#3e3229',
        panelSecondaryBackground: '#1f1814',
        buttonPrimary: '#b45309',
        buttonSecondary: '#3e3229',
        buttonSecondaryText: '#e7d8c4',
        textPrimary: '#f4ece1',
        textSecondary: '#c0a995',
        textMuted: '#8b735c',
        divider: '#3e3229',
        borderColor: '#3e3229'
      };
    } else if (themeId === 'snow') {
      colors = {
        ...colors,
        headerBackground: '#0b1329',
        headerText: '#38bdf8',
        headerBorder: '#1e293b',
        panelBackground: '#0b1329',
        panelText: '#f1f5f9',
        panelBorder: '#1e293b',
        panelSecondaryBackground: '#1e293b',
        buttonPrimary: '#0ea5e9',
        buttonSecondary: '#1e293b',
        buttonSecondaryText: '#38bdf8',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        divider: '#1e293b',
        borderColor: '#1e293b'
      };
    } else if (themeId === 'rain') {
      colors = {
        ...colors,
        headerBackground: '#0f172a',
        headerText: '#0ea5e9',
        headerBorder: '#1e293b',
        panelBackground: '#0f172a',
        panelText: '#e2e8f0',
        panelBorder: '#1e293b',
        panelSecondaryBackground: '#020617',
        buttonPrimary: '#0ea5e9',
        buttonSecondary: '#1e293b',
        buttonSecondaryText: '#cbd5e1',
        textPrimary: '#e2e8f0',
        textSecondary: '#cbd5e1',
        divider: '#1e293b',
        borderColor: '#1e293b'
      };
    } else if (themeId === 'aurora') {
      colors = {
        ...colors,
        headerBackground: '#0c0a1e',
        headerText: '#e9d5ff',
        headerBorder: '#27215c',
        panelBackground: '#0f0d26',
        panelText: '#e9d5ff',
        panelBorder: '#27215c',
        panelSecondaryBackground: '#151233',
        buttonPrimary: '#8b5cf6',
        buttonSecondary: '#1a163a',
        buttonSecondaryText: '#d8b4fe',
        textPrimary: '#e9d5ff',
        textSecondary: '#d8b4fe',
        divider: '#27215c',
        borderColor: '#27215c'
      };
    }
  } else if (actualSubTheme === 'midnight') {
    if (themeId === 'light' || themeId === 'custom' || themeId === 'highcontrast') {
      colors = {
        ...colors,
        headerBackground: '#020617',
        headerText: '#ffffff',
        headerBorder: '#0f172a',
        panelBackground: '#020617',
        panelText: '#ffffff',
        panelBorder: '#0f172a',
        panelSecondaryBackground: '#000000',
        buttonPrimary: '#0ea5e9',
        buttonSecondary: '#0f172a',
        buttonSecondaryText: '#e2e8f0',
        textPrimary: '#ffffff',
        textSecondary: '#94a3b8',
        divider: '#0f172a',
        borderColor: '#0f172a'
      };
    } else if (themeId === 'sepia') {
      colors = {
        ...colors,
        headerBackground: '#1a120b',
        headerText: '#ffecd6',
        headerBorder: '#271c12',
        panelBackground: '#1a120b',
        panelText: '#ffecd6',
        panelBorder: '#271c12',
        panelSecondaryBackground: '#0a0502',
        buttonPrimary: '#d97706',
        buttonSecondary: '#271c12',
        buttonSecondaryText: '#fed7aa',
        textPrimary: '#ffecd6',
        textSecondary: '#d4b291',
        divider: '#271c12',
        borderColor: '#271c12'
      };
    } else if (themeId === 'snow') {
      colors = {
        ...colors,
        headerBackground: '#020617',
        headerText: '#06b6d4',
        headerBorder: '#0f172a',
        panelBackground: '#020617',
        panelText: '#f8fafc',
        panelBorder: '#0f172a',
        panelSecondaryBackground: '#0f172a',
        buttonPrimary: '#0ea5e9',
        buttonSecondary: '#0f172a',
        buttonSecondaryText: '#38bdf8',
        textPrimary: '#f8fafc',
        textSecondary: '#94a3b8',
        divider: '#0f172a',
        borderColor: '#0f172a'
      };
    } else if (themeId === 'rain') {
      colors = {
        ...colors,
        headerBackground: '#020617',
        headerText: '#0ea5e9',
        headerBorder: '#0f172a',
        panelBackground: '#020617',
        panelText: '#f8fafc',
        panelBorder: '#0f172a',
        panelSecondaryBackground: '#000000',
        buttonPrimary: '#0ea5e9',
        buttonSecondary: '#0f172a',
        buttonSecondaryText: '#38bdf8',
        textPrimary: '#f8fafc',
        textSecondary: '#64748b',
        divider: '#0f172a',
        borderColor: '#0f172a'
      };
    } else if (themeId === 'aurora') {
      colors = {
        ...colors,
        headerBackground: '#020014',
        headerText: '#f3e8ff',
        headerBorder: '#120f30',
        panelBackground: '#03001a',
        panelText: '#f8fafc',
        panelBorder: '#120f30',
        panelSecondaryBackground: '#000000',
        buttonPrimary: '#8b5cf6',
        buttonSecondary: '#120f30',
        buttonSecondaryText: '#d8b4fe',
        textPrimary: '#f8fafc',
        textSecondary: '#a78bfa',
        divider: '#120f30',
        borderColor: '#120f30'
      };
    } else if (themeId === 'ocean' || themeId === 'rain') {
      colors = {
        ...colors,
        headerBackground: '#030712',
        headerText: '#38bdf8',
        headerBorder: '#111827',
        panelBackground: '#030712',
        panelText: '#f3f4f6',
        panelBorder: '#111827',
        panelSecondaryBackground: '#000000',
        buttonPrimary: '#0284c7',
        buttonSecondary: '#111827',
        buttonSecondaryText: '#38bdf8',
        textPrimary: '#f3f4f6',
        textSecondary: '#9ca3af',
        divider: '#111827',
        borderColor: '#111827'
      };
    }
  } else {
    // Day/Default Bright Sub-theme: Ensure Snow has purely clean blue colors
    if (themeId === 'snow') {
      colors = {
        ...colors,
        headerBackground: '#e0f2fe',
        headerText: '#0369a1',
        headerBorder: '#bae6fd',
        panelBackground: '#f0f9ff',
        panelText: '#0c4a6e',
        panelBorder: '#bae6fd',
        panelSecondaryBackground: '#e0f2fe',
        buttonPrimary: '#0284c7',
        buttonPrimaryText: '#ffffff',
        buttonSecondary: '#e0f2fe',
        buttonSecondaryText: '#0369a1',
        buttonHover: '#0369a1',
        inputBackground: '#ffffff',
        inputText: '#0c4a6e',
        inputBorder: '#bae6fd',
        inputFocus: '#0284c7',
        accent: '#38bdf8',
        accentHover: '#0284c7',
        textPrimary: '#0c4a6e',
        textSecondary: '#0369a1',
        textMuted: '#64748b',
        linkColor: '#0284c7',
        linkHover: '#0369a1',
        divider: '#bae6fd',
        borderColor: '#bae6fd',
        shadow: 'rgba(2, 132, 199, 0.1)',
        overlay: 'rgba(12, 74, 110, 0.4)'
      };
    } else if (themeId === 'aurora') {
      colors = {
        ...colors,
        headerBackground: '#f5f3ff',
        headerText: '#4c1d95',
        headerBorder: '#ddd6fe',
        panelBackground: '#faf5ff',
        panelText: '#5b21b6',
        panelBorder: '#ddd6fe',
        panelSecondaryBackground: '#f3e8ff',
        buttonPrimary: '#8b5cf6',
        buttonPrimaryText: '#ffffff',
        buttonSecondary: '#f3e8ff',
        buttonSecondaryText: '#4c1d95',
        buttonHover: '#7c3aed',
        inputBackground: '#ffffff',
        inputText: '#5b21b6',
        inputBorder: '#ddd6fe',
        inputFocus: '#8b5cf6',
        accent: '#8b5cf6',
        accentHover: '#7c3aed',
        textPrimary: '#4c1d95',
        textSecondary: '#6d28d9',
        textMuted: '#8b5cf6',
        linkColor: '#8b5cf6',
        linkHover: '#7c3aed',
        divider: '#ddd6fe',
        borderColor: '#ddd6fe',
        shadow: 'rgba(139, 92, 246, 0.1)',
        overlay: 'rgba(76, 29, 149, 0.4)'
      };
    }
  }

  // 2. Apply Universal MENU STYLE
  const themeAccent = colors.accent || '#3b82f6';
  const isDarkTheme = themeId === 'dark' || themeId === 'ocean' || themeId === 'rain' || themeId === 'aurora' || themeId === 'highcontrast' || actualSubTheme === 'night' || actualSubTheme === 'midnight' || isHexColorDark(colors.panelBackground || '#ffffff');

  if (menuStyle === 'classic') {
    if (menuSubTheme === 'cream') {
      colors.panelBackground = '#fdf6ec';
      colors.headerBackground = '#f4e8d3';
      colors.panelSecondaryBackground = '#fbf0e3';
      colors.textPrimary = '#432a13';
      colors.textSecondary = '#7d5630';
      colors.panelBorder = '#e7cbaf';
      colors.borderColor = '#e7cbaf';
      colors.divider = '#e7cbaf';
      colors.buttonPrimary = '#c2874e';
      colors.buttonSecondary = '#f4e8d3';
      colors.buttonSecondaryText = '#432a13';
    } else if (menuSubTheme === 'charcoal') {
      colors.panelBackground = '#1c1e24';
      colors.headerBackground = '#131519';
      colors.panelSecondaryBackground = '#181a1f';
      colors.textPrimary = '#f3f4f6';
      colors.textSecondary = '#9ca3af';
      colors.panelBorder = '#2e323b';
      colors.borderColor = '#2e323b';
      colors.divider = '#2e323b';
      colors.buttonPrimary = '#3b82f6';
      colors.buttonSecondary = '#131519';
      colors.buttonSecondaryText = '#f3f4f6';
    } else if (menuSubTheme === 'navy') {
      colors.panelBackground = '#0f172a';
      colors.headerBackground = '#090d16';
      colors.panelSecondaryBackground = '#0c111e';
      colors.textPrimary = '#f8fafc';
      colors.textSecondary = '#64748b';
      colors.panelBorder = '#1e293b';
      colors.borderColor = '#1e293b';
      colors.divider = '#1e293b';
      colors.buttonPrimary = '#3b82f6';
      colors.buttonSecondary = '#090d16';
      colors.buttonSecondaryText = '#f8fafc';
    } else if (menuSubTheme === 'sage') {
      colors.panelBackground = '#f4f7f4';
      colors.headerBackground = '#e5eae5';
      colors.panelSecondaryBackground = '#edf2ed';
      colors.textPrimary = '#2c3e2c';
      colors.textSecondary = '#5c785c';
      colors.panelBorder = '#cad3ca';
      colors.borderColor = '#cad3ca';
      colors.divider = '#cad3ca';
      colors.buttonPrimary = '#10b981';
      colors.buttonSecondary = '#e5eae5';
      colors.buttonSecondaryText = '#2c3e2c';
    } else if (menuSubTheme === 'custom') {
      const customCol = neonCustomColor || '#3b82f6';
      colors.panelBackground = customCol + '15';
      colors.headerBackground = customCol + '25';
      colors.panelSecondaryBackground = customCol + '08';
      colors.panelBorder = customCol;
      colors.borderColor = customCol;
      colors.divider = customCol;
      colors.textSecondary = customCol;
      colors.buttonPrimary = customCol;
    }
  } else if (menuStyle === 'wood') {
    const woodAccent = linkStyleWithTheme ? themeAccent : '#854d0e';
    colors.accent = woodAccent;
    colors.accentHover = '#713f12';
    
    // Default sub-theme respects 100% of the active theme colors, adapting borders smoothly to avoid reddish clashing
    if (menuSubTheme === 'default') {
      // Wood style on exact core colors
      if (linkStyleWithTheme) {
        if (isDarkTheme) {
          // Adaptive dark border matching base theme (clean dark slate/neutral, not reddish)
          colors.panelBorder = baseTheme.colors?.panelBorder || 'rgba(255, 255, 255, 0.16)';
          colors.borderColor = baseTheme.colors?.borderColor || 'rgba(255, 255, 255, 0.16)';
          colors.divider = baseTheme.colors?.divider || 'rgba(255, 255, 255, 0.1)';
        } else {
          // Warm neutral wood border adapting to light theme
          colors.panelBorder = baseTheme.colors?.panelBorder || '#c2a690';
          colors.borderColor = baseTheme.colors?.borderColor || '#c2a690';
          colors.divider = baseTheme.colors?.divider || '#c2a690';
        }
      } else {
        if (isDarkTheme) {
          // On dark background when not linking with theme, use a clean dark neutral border instead of clashing reddish
          colors.panelBorder = '#2e2622';
          colors.borderColor = '#2e2622';
          colors.divider = '#2e2622';
        } else {
          colors.panelBorder = '#c2a690';
          colors.borderColor = '#c2a690';
          colors.divider = '#c2a690';
        }
      }
    } else if (menuSubTheme === 'mahogany') {
      if (isDarkTheme) {
        colors.panelBackground = '#180703';
        colors.headerBackground = '#250c05';
        colors.panelSecondaryBackground = '#100402';
        colors.textPrimary = '#f0dcd3';
        colors.buttonSecondary = '#250c05';
        colors.buttonSecondaryText = '#f0dcd3';
        colors.panelBorder = '#541c0e';
        colors.borderColor = '#541c0e';
        colors.divider = '#541c0e';
      } else {
        colors.panelBackground = '#ebdcd3';
        colors.headerBackground = '#dabfae';
        colors.panelSecondaryBackground = '#ccad9a';
        colors.textPrimary = '#4a1504';
        colors.buttonSecondary = '#dabfae';
        colors.buttonSecondaryText = '#4a1504';
        colors.panelBorder = '#a8765e';
        colors.borderColor = '#a8765e';
        colors.divider = '#a8765e';
      }
    } else if (menuSubTheme === 'birch') {
      if (isDarkTheme) {
        colors.panelBackground = '#1a202c';
        colors.headerBackground = '#2d3748';
        colors.panelSecondaryBackground = '#171923';
        colors.textPrimary = '#edf2f7';
        colors.buttonSecondary = '#2d3748';
        colors.buttonSecondaryText = '#edf2f7';
        colors.panelBorder = '#4a5568';
        colors.borderColor = '#4a5568';
        colors.divider = '#4a5568';
      } else {
        colors.panelBackground = '#f7f9fa';
        colors.headerBackground = '#edf2f4';
        colors.panelSecondaryBackground = '#e2e8f0';
        colors.textPrimary = '#1a202c';
        colors.buttonSecondary = '#edf2f4';
        colors.buttonSecondaryText = '#1a202c';
        colors.panelBorder = '#cbd5e1';
        colors.borderColor = '#cbd5e1';
        colors.divider = '#cbd5e1';
      }
    } else if (menuSubTheme === 'cassino') {
      if (isDarkTheme) {
        colors.panelBackground = '#062113';
        colors.headerBackground = '#03140b';
        colors.panelSecondaryBackground = '#020d07';
        colors.textPrimary = '#fef08a';
        colors.buttonSecondary = '#03140b';
        colors.buttonSecondaryText = '#fef08a';
        colors.panelBorder = '#fbbf24';
        colors.borderColor = '#fbbf24';
        colors.divider = '#fbbf24';
        colors.buttonPrimary = '#10b981';
      } else {
        colors.panelBackground = '#f0fbf4';
        colors.headerBackground = '#dcfce7';
        colors.panelSecondaryBackground = '#bbf7d0';
        colors.textPrimary = '#064e3b';
        colors.buttonSecondary = '#dcfce7';
        colors.buttonSecondaryText = '#064e3b';
        colors.panelBorder = '#d97706';
        colors.borderColor = '#d97706';
        colors.divider = '#d97706';
        colors.buttonPrimary = '#059669';
      }
    } else if (menuSubTheme === 'custom') {
      const customColor = neonCustomColor || '#854d0e';
      colors.accent = customColor;
      colors.accentHover = customColor;
      
      if (isDarkTheme) {
        colors.panelBackground = adjustColorBrightness(customColor, -120);
        colors.headerBackground = adjustColorBrightness(customColor, -90);
        colors.panelSecondaryBackground = adjustColorBrightness(customColor, -140);
        colors.textPrimary = adjustColorBrightness(customColor, 120);
        colors.buttonSecondary = adjustColorBrightness(customColor, -90);
        colors.buttonSecondaryText = adjustColorBrightness(customColor, 120);
        colors.panelBorder = customColor;
        colors.borderColor = customColor;
        colors.divider = customColor;
      } else {
        colors.panelBackground = adjustColorBrightness(customColor, 100);
        colors.headerBackground = adjustColorBrightness(customColor, 80);
        colors.panelSecondaryBackground = adjustColorBrightness(customColor, 50);
        colors.textPrimary = adjustColorBrightness(customColor, -120);
        colors.buttonSecondary = adjustColorBrightness(customColor, 80);
        colors.buttonSecondaryText = adjustColorBrightness(customColor, -120);
        colors.panelBorder = customColor;
        colors.borderColor = customColor;
        colors.divider = customColor;
      }
    } else {
      if (isDarkTheme) {
        colors.panelBackground = '#1c0f0a';
        colors.headerBackground = '#27150e';
        colors.panelSecondaryBackground = '#140b07';
        colors.textPrimary = '#fef3c7';
        colors.buttonSecondary = '#27150e';
        colors.buttonSecondaryText = '#fef3c7';
        colors.panelBorder = '#3b1e14';
        colors.borderColor = '#3b1e14';
        colors.divider = '#3b1e14';
      } else {
        colors.panelBackground = '#fdf8f4';
        colors.headerBackground = '#f5e8dd';
        colors.panelSecondaryBackground = '#f0dccb';
        colors.textPrimary = '#451a03';
        colors.buttonSecondary = '#f5e8dd';
        colors.buttonSecondaryText = '#451a03';
        colors.panelBorder = '#c2a690';
        colors.borderColor = '#c2a690';
        colors.divider = '#c2a690';
      }
    }
  } else if (menuStyle === 'neon') {
    let neonAccent = '#ff007f';
    if (menuSubTheme === 'default') {
      neonAccent = themeAccent;
    } else if (menuSubTheme === 'cyberpink') {
      neonAccent = '#ff007f';
    } else if (menuSubTheme === 'cyberblue') {
      neonAccent = '#00f3ff';
    } else if (menuSubTheme === 'cybergreen') {
      neonAccent = '#39ff14';
    } else if (menuSubTheme === 'cyberpurple') {
      neonAccent = '#bc13fe';
    } else if (menuSubTheme === 'cyberorange') {
      neonAccent = '#ff6c00';
    } else if (menuSubTheme === 'cyberred') {
      neonAccent = '#ff073a';
    } else if (menuSubTheme === 'custom') {
      neonAccent = neonCustomColor || themeAccent || '#ff007f';
    }

    colors.accent = neonAccent;
    colors.accentHover = neonAccent;

    if (menuSubTheme === 'default') {
      // Keep exact core colors, only apply neon glows using theme accent
      colors.panelBorder = neonAccent;
      colors.borderColor = neonAccent;
      colors.divider = neonAccent;
      colors.inputBorder = neonAccent;
      colors.textSecondary = neonAccent;
      colors.buttonPrimary = neonAccent;
    } else {
      const isLightMode = !isDarkTheme && (themeId === 'light' || themeId === 'custom' || themeId === 'sepia' || themeId === 'snow');
      if (isLightMode) {
        if (!glassEnabled) {
          colors.panelBackground = '#ffffff';
          colors.headerBackground = '#f3f4f6';
          colors.panelSecondaryBackground = '#e5e7eb';
        }
        colors.panelBorder = neonAccent;
        colors.borderColor = neonAccent;
        colors.divider = neonAccent;
        colors.textPrimary = '#111827';
        colors.textSecondary = neonAccent;
        colors.buttonPrimary = neonAccent;
        colors.buttonPrimaryText = '#ffffff';
        if (!glassEnabled) {
          colors.buttonSecondary = '#f3f4f6';
          colors.inputBackground = '#ffffff';
        }
        colors.buttonSecondaryText = neonAccent;
        colors.inputBorder = neonAccent;
        colors.inputText = '#111827';
      } else {
        if (!glassEnabled) {
          colors.panelBackground = '#18181b';
          colors.headerBackground = '#09090b';
          colors.panelSecondaryBackground = '#0f0f12';
        }
        colors.panelBorder = neonAccent;
        colors.borderColor = neonAccent;
        colors.divider = neonAccent;
        colors.inputBorder = neonAccent;
        colors.textPrimary = colors.textPrimary || neonAccent;
        colors.textSecondary = neonAccent;
        colors.buttonPrimary = neonAccent;
        colors.buttonPrimaryText = '#ffffff';
        if (!glassEnabled) {
          colors.buttonSecondary = colors.headerBackground;
          colors.inputBackground = colors.panelSecondaryBackground;
        }
        colors.buttonSecondaryText = neonAccent;
        colors.inputText = colors.textPrimary || '#ffffff';
      }
    }
  } else if (menuStyle === 'retro8bit') {
    const retroAccent = linkStyleWithTheme ? themeAccent : '#ef4444';
    colors.accent = retroAccent;
    colors.accentHover = '#8b5cf6';

    if (menuSubTheme === 'default') {
      colors.panelBorder = isDarkTheme ? '#ffffff' : '#000000';
      colors.borderColor = isDarkTheme ? '#ffffff' : '#000000';
      colors.divider = isDarkTheme ? '#ffffff' : '#000000';
      colors.inputBorder = isDarkTheme ? '#ffffff' : '#000000';
    } else if (menuSubTheme === 'gameboy') {
      if (isDarkTheme) {
        colors.panelBackground = '#0f1c0f';
        colors.headerBackground = '#1a2e1a';
        colors.panelSecondaryBackground = '#081008';
        colors.textPrimary = '#8bac0f';
        colors.textSecondary = '#306230';
        colors.buttonPrimary = '#8bac0f';
        colors.buttonPrimaryText = '#0f1c0f';
        colors.buttonSecondary = '#1a2e1a';
        colors.buttonSecondaryText = '#8bac0f';
        colors.inputBackground = '#000000';
        colors.inputBorder = '#8bac0f';
        colors.inputText = '#8bac0f';
        colors.panelBorder = '#8bac0f';
        colors.borderColor = '#8bac0f';
        colors.divider = '#8bac0f';
      } else {
        colors.panelBackground = '#cadc9f';
        colors.headerBackground = '#9bbc0f';
        colors.panelSecondaryBackground = '#8bac0f';
        colors.textPrimary = '#0f380f';
        colors.textSecondary = '#306230';
        colors.buttonPrimary = '#306230';
        colors.buttonPrimaryText = '#cadc9f';
        colors.buttonSecondary = '#9bbc0f';
        colors.buttonSecondaryText = '#0f380f';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#0f380f';
        colors.inputText = '#0f380f';
        colors.panelBorder = '#0f380f';
        colors.borderColor = '#0f380f';
        colors.divider = '#0f380f';
      }
    } else if (menuSubTheme === 'arcade') {
      if (isDarkTheme) {
        colors.panelBackground = '#0a0a1a';
        colors.headerBackground = '#121232';
        colors.panelSecondaryBackground = '#02020a';
        colors.textPrimary = '#00ffff';
        colors.textSecondary = '#ffff00';
        colors.buttonPrimary = '#e11d48';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#121232';
        colors.buttonSecondaryText = '#00ffff';
        colors.inputBackground = '#02020a';
        colors.inputBorder = '#00ffff';
        colors.inputText = '#00ffff';
        colors.panelBorder = '#00ffff';
        colors.borderColor = '#00ffff';
        colors.divider = '#00ffff';
      } else {
        colors.panelBackground = '#fffbeb';
        colors.headerBackground = '#fde047';
        colors.panelSecondaryBackground = '#fef08a';
        colors.textPrimary = '#1e3a8a';
        colors.textSecondary = '#ef4444';
        colors.buttonPrimary = '#ef4444';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#fde047';
        colors.buttonSecondaryText = '#1e3a8a';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#1e3a8a';
        colors.inputText = '#1e3a8a';
        colors.panelBorder = '#1e3a8a';
        colors.borderColor = '#1e3a8a';
        colors.divider = '#1e3a8a';
      }
    } else if (menuSubTheme === 'pipboy') {
      if (isDarkTheme) {
        colors.panelBackground = '#000000';
        colors.headerBackground = '#031403';
        colors.panelSecondaryBackground = '#000a00';
        colors.textPrimary = '#39ff14';
        colors.textSecondary = '#15803d';
        colors.buttonPrimary = '#39ff14';
        colors.buttonPrimaryText = '#000000';
        colors.buttonSecondary = '#031403';
        colors.buttonSecondaryText = '#39ff14';
        colors.inputBackground = '#000000';
        colors.inputBorder = '#39ff14';
        colors.inputText = '#39ff14';
        colors.panelBorder = '#39ff14';
        colors.borderColor = '#39ff14';
        colors.divider = '#39ff14';
      } else {
        colors.panelBackground = '#f0fff0';
        colors.headerBackground = '#bbf7d0';
        colors.panelSecondaryBackground = '#dcfce7';
        colors.textPrimary = '#15803d';
        colors.textSecondary = '#16a34a';
        colors.buttonPrimary = '#16a34a';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#bbf7d0';
        colors.buttonSecondaryText = '#15803d';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#15803d';
        colors.inputText = '#15803d';
        colors.panelBorder = '#15803d';
        colors.borderColor = '#15803d';
        colors.divider = '#15803d';
      }
    } else if (menuSubTheme === 'retrowhite') {
      colors.accent = '#000000';
      colors.accentHover = '#333333';
      colors.panelBackground = '#ffffff';
      colors.headerBackground = '#f8fafc';
      colors.panelSecondaryBackground = '#f1f5f9';
      colors.textPrimary = '#000000';
      colors.textSecondary = '#475569';
      colors.buttonPrimary = '#000000';
      colors.buttonPrimaryText = '#ffffff';
      colors.buttonSecondary = '#e2e8f0';
      colors.buttonSecondaryText = '#000000';
      colors.inputBackground = '#ffffff';
      colors.inputBorder = '#000000';
      colors.inputText = '#000000';
      colors.panelBorder = '#000000';
      colors.borderColor = '#000000';
      colors.divider = '#000000';
    } else if (menuSubTheme === 'retroblue') {
      colors.accent = '#00b4d8';
      colors.accentHover = '#90e0ef';
      colors.panelBackground = '#0a1128';
      colors.headerBackground = '#001845';
      colors.panelSecondaryBackground = '#001233';
      colors.textPrimary = '#00b4d8';
      colors.textSecondary = '#90e0ef';
      colors.buttonPrimary = '#0077b6';
      colors.buttonPrimaryText = '#ffffff';
      colors.buttonSecondary = '#001845';
      colors.buttonSecondaryText = '#00b4d8';
      colors.inputBackground = '#0a1128';
      colors.inputBorder = '#00b4d8';
      colors.inputText = '#00b4d8';
      colors.panelBorder = '#00b4d8';
      colors.borderColor = '#00b4d8';
      colors.divider = '#00b4d8';
    } else if (menuSubTheme === 'retropurple') {
      colors.accent = '#a700b3';
      colors.accentHover = '#e25cff';
      colors.panelBackground = '#12001a';
      colors.headerBackground = '#240033';
      colors.panelSecondaryBackground = '#1b0026';
      colors.textPrimary = '#a700b3';
      colors.textSecondary = '#e25cff';
      colors.buttonPrimary = '#a700b3';
      colors.buttonPrimaryText = '#ffffff';
      colors.buttonSecondary = '#240033';
      colors.buttonSecondaryText = '#e25cff';
      colors.inputBackground = '#12001a';
      colors.inputBorder = '#a700b3';
      colors.inputText = '#a700b3';
      colors.panelBorder = '#a700b3';
      colors.borderColor = '#a700b3';
      colors.divider = '#a700b3';
    } else if (menuSubTheme === 'custom') {
      const customColor = neonCustomColor || '#39ff14';
      colors.accent = customColor;
      colors.accentHover = adjustColorBrightness(customColor, -20);
      
      if (isDarkTheme) {
        colors.panelBackground = '#050505';
        colors.headerBackground = '#101015';
        colors.panelSecondaryBackground = '#010101';
        colors.textPrimary = customColor;
        colors.textSecondary = adjustColorBrightness(customColor, -40);
        colors.buttonPrimary = customColor;
        colors.buttonPrimaryText = '#000000';
        colors.buttonSecondary = '#101015';
        colors.buttonSecondaryText = customColor;
        colors.inputBackground = '#000000';
        colors.inputBorder = customColor;
        colors.inputText = customColor;
        colors.panelBorder = customColor;
        colors.borderColor = customColor;
        colors.divider = customColor;
      } else {
        colors.panelBackground = '#f8f9fa';
        colors.headerBackground = adjustColorBrightness(customColor, 120);
        colors.panelSecondaryBackground = adjustColorBrightness(customColor, 100);
        colors.textPrimary = adjustColorBrightness(customColor, -140);
        colors.textSecondary = customColor;
        colors.buttonPrimary = customColor;
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = adjustColorBrightness(customColor, 120);
        colors.buttonSecondaryText = adjustColorBrightness(customColor, -140);
        colors.inputBackground = '#ffffff';
        colors.inputBorder = customColor;
        colors.inputText = adjustColorBrightness(customColor, -140);
        colors.panelBorder = customColor;
        colors.borderColor = customColor;
        colors.divider = customColor;
      }
    } else {
      if (themeId === 'sepia') {
        colors.panelBackground = '#faf6ed';
        colors.headerBackground = '#f0e6d2';
        colors.panelSecondaryBackground = '#e6d7c3';
        colors.panelBorder = '#431407';
        colors.borderColor = '#431407';
        colors.divider = '#431407';
        colors.textPrimary = '#431407';
        colors.textSecondary = '#b45309';
        colors.buttonPrimary = '#b45309';
        colors.buttonPrimaryText = '#faf6ed';
        colors.buttonSecondary = '#f0e6d2';
        colors.buttonSecondaryText = '#431407';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#431407';
        colors.inputText = '#431407';
      } else if (themeId === 'snow' && subTheme === 'day') {
        colors.panelBackground = '#f0f9ff';
        colors.headerBackground = '#e0f2fe';
        colors.panelSecondaryBackground = '#bae6fd';
        colors.panelBorder = '#0c4a6e';
        colors.borderColor = '#0c4a6e';
        colors.divider = '#0c4a6e';
        colors.textPrimary = '#0c4a6e';
        colors.textSecondary = '#0284c7';
        colors.buttonPrimary = '#0284c7';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#e0f2fe';
        colors.buttonSecondaryText = '#0c4a6e';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#0c4a6e';
        colors.inputText = '#0c4a6e';
      } else if (themeId === 'rain' && subTheme === 'day') {
        colors.panelBackground = '#cbd5e1';
        colors.headerBackground = '#94a3b8';
        colors.panelSecondaryBackground = '#e2e8f0';
        colors.panelBorder = '#1e293b';
        colors.borderColor = '#1e293b';
        colors.divider = '#1e293b';
        colors.textPrimary = '#1e293b';
        colors.textSecondary = '#0284c7';
        colors.buttonPrimary = '#0ea5e9';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#94a3b8';
        colors.buttonSecondaryText = '#1e293b';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#1e293b';
        colors.inputText = '#1e293b';
      } else if (!isDarkTheme) {
        colors.panelBackground = '#ffffff';
        colors.headerBackground = '#f3f4f6';
        colors.panelSecondaryBackground = '#e5e7eb';
        colors.panelBorder = '#000000';
        colors.borderColor = '#000000';
        colors.divider = '#000000';
        colors.textPrimary = '#000000';
        colors.textSecondary = '#ef4444';
        colors.buttonPrimary = '#000000';
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = '#f3f4f6';
        colors.buttonSecondaryText = '#000000';
        colors.inputBackground = '#ffffff';
        colors.inputBorder = '#000000';
        colors.inputText = '#000000';
      } else {
        if (themeId === 'dark') {
          colors.panelBackground = '#1f2937';
          colors.headerBackground = '#111827';
          colors.panelSecondaryBackground = '#181f2b';
          colors.panelBorder = '#4b5563';
          colors.borderColor = '#374151';
          colors.divider = '#374151';
        } else if (themeId === 'ocean' || themeId === 'rain') {
          colors.panelBackground = '#0f172a';
          colors.headerBackground = '#070f1e';
          colors.panelSecondaryBackground = '#020617';
          colors.panelBorder = '#38bdf8';
          colors.borderColor = '#38bdf8';
          colors.divider = '#1e293b';
        } else if (themeId === 'highcontrast') {
          colors.panelBackground = '#000000';
          colors.headerBackground = '#121212';
          colors.panelSecondaryBackground = '#1a1a1a';
          colors.panelBorder = '#ffffff';
          colors.borderColor = '#ffffff';
          colors.divider = '#ffffff';
        } else if (themeId === 'aurora') {
          colors.panelBackground = '#0f0d26';
          colors.headerBackground = '#0c0a1e';
          colors.panelSecondaryBackground = '#151233';
          colors.panelBorder = '#8b5cf6';
          colors.borderColor = '#8b5cf6';
          colors.divider = '#27215c';
        } else if (themeId === 'snow') {
          colors.panelBackground = '#0b1329';
          colors.headerBackground = '#050a15';
          colors.panelSecondaryBackground = '#02050c';
          colors.panelBorder = '#0ea5e9';
          colors.borderColor = '#0ea5e9';
          colors.divider = '#1e293b';
        } else {
          colors.panelBackground = '#181824';
          colors.headerBackground = '#24243a';
          colors.panelSecondaryBackground = '#0c0c12';
          colors.panelBorder = '#ffffff';
          colors.borderColor = '#ffffff';
          colors.divider = '#ffffff';
        }

        colors.textPrimary = '#ffffff';
        colors.textSecondary = '#e81e63';
        colors.buttonPrimary = retroAccent;
        colors.buttonPrimaryText = '#ffffff';
        colors.buttonSecondary = colors.headerBackground;
        colors.buttonSecondaryText = '#ffffff';
        colors.inputBackground = '#000000';
        colors.inputBorder = colors.panelBorder;
        colors.inputText = '#ffffff';
      }
    }
  }

  // 3. Apply Glass Overlay colors on top of any menu style if glass is enabled
  if (glassEnabled) {
    const rgb = hexToRgb(colors.panelBackground || '#ffffff');
    if (menuSubTheme === 'frosted') {
      colors.panelBackground = `rgba(${rgb}, 0.75)`;
      colors.headerBackground = `rgba(${rgb}, 0.85)`;
      colors.panelSecondaryBackground = `rgba(${rgb}, 0.45)`;
    } else if (menuSubTheme === 'snowy') {
      colors.panelBackground = `rgba(${rgb}, 0.45)`;
      colors.headerBackground = `rgba(${rgb}, 0.65)`;
      colors.panelSecondaryBackground = `rgba(${rgb}, 0.25)`;
    } else if (menuSubTheme === 'translucent') {
      colors.panelBackground = `rgba(${rgb}, 0.12)`;
      colors.headerBackground = `rgba(${rgb}, 0.22)`;
      colors.panelSecondaryBackground = `rgba(${rgb}, 0.06)`;
    } else if (menuSubTheme === 'tinted') {
      const tintHex = glassTintColor || themeAccent || '#3b82f6';
      const isDarkTint = isHexColorDark(tintHex);
      const accentRgb = hexToRgb(tintHex) || '59,130,246';
      
      const readableAccent = getContrastAccentColor(tintHex, isDarkTint);
      colors.accent = readableAccent;
      colors.accentHover = adjustColorBrightness(readableAccent, isDarkTint ? 25 : -25);
      colors.linkColor = readableAccent;
      colors.linkHover = colors.accentHover;
      
      if (isDarkTint) {
        colors.panelBackground = `rgba(${accentRgb}, 0.70)`;
        colors.headerBackground = `rgba(${accentRgb}, 0.82)`;
        colors.panelSecondaryBackground = `rgba(${accentRgb}, 0.45)`;
        colors.panelBorder = 'rgba(255, 255, 255, 0.20)';
        colors.borderColor = 'rgba(255, 255, 255, 0.20)';
        colors.divider = 'rgba(255, 255, 255, 0.15)';
        
        colors.headerText = '#ffffff';
        colors.panelText = '#ffffff';
        colors.textPrimary = '#ffffff';
        colors.textSecondary = '#e2e8f0';
        colors.textMuted = '#cbd5e1';
        colors.inputText = '#ffffff';
        colors.inputBackground = 'rgba(0, 0, 0, 0.45)';
        colors.inputBorder = 'rgba(255, 255, 255, 0.25)';
        colors.buttonPrimary = readableAccent;
        colors.buttonPrimaryText = isHexColorDark(readableAccent) ? '#ffffff' : '#0f172a';
        colors.buttonSecondary = 'rgba(255, 255, 255, 0.15)';
        colors.buttonSecondaryText = '#ffffff';
      } else {
        colors.panelBackground = `rgba(${accentRgb}, 0.22)`;
        colors.headerBackground = `rgba(${accentRgb}, 0.32)`;
        colors.panelSecondaryBackground = `rgba(${accentRgb}, 0.10)`;
        colors.panelBorder = 'rgba(0, 0, 0, 0.15)';
        colors.borderColor = 'rgba(0, 0, 0, 0.15)';
        colors.divider = 'rgba(0, 0, 0, 0.10)';
        
        colors.headerText = '#0f172a';
        colors.panelText = '#0f172a';
        colors.textPrimary = '#0f172a';
        colors.textSecondary = '#334155';
        colors.textMuted = '#64748b';
        colors.inputText = '#0f172a';
        colors.inputBackground = 'rgba(255, 255, 255, 0.75)';
        colors.inputBorder = 'rgba(0, 0, 0, 0.20)';
        colors.buttonPrimary = readableAccent;
        colors.buttonPrimaryText = isHexColorDark(readableAccent) ? '#ffffff' : '#0f172a';
        colors.buttonSecondary = 'rgba(0, 0, 0, 0.06)';
        colors.buttonSecondaryText = '#0f172a';
      }
    } else if (menuSubTheme === 'aurora') {
      colors.panelBackground = isDarkTheme ? 'rgba(30, 27, 75, 0.5)' : 'rgba(245, 243, 255, 0.6)';
      colors.headerBackground = isDarkTheme ? 'rgba(76, 29, 149, 0.6)' : 'rgba(237, 233, 254, 0.7)';
      colors.panelSecondaryBackground = isDarkTheme ? 'rgba(15, 23, 42, 0.3)' : 'rgba(255, 255, 255, 0.3)';
    } else {
      colors.panelBackground = `rgba(${rgb}, 0.45)`;
      colors.headerBackground = `rgba(${rgb}, 0.65)`;
      colors.panelSecondaryBackground = `rgba(${rgb}, 0.25)`;
    }

    if (menuStyle !== 'neon' && menuStyle !== 'retro8bit' && menuSubTheme !== 'tinted') {
      if (isDarkTheme) {
        colors.panelBorder = 'rgba(255, 255, 255, 0.15)';
        colors.borderColor = 'rgba(255, 255, 255, 0.15)';
        colors.divider = 'rgba(255, 255, 255, 0.1)';
      } else {
        colors.panelBorder = 'rgba(0, 0, 0, 0.08)';
        colors.borderColor = 'rgba(0, 0, 0, 0.08)';
        colors.divider = 'rgba(0, 0, 0, 0.05)';
      }
    }
  }

  const result = {
    ...baseTheme,
    colors
  };
  themeCache.set(cacheKey, result);
  return result;
};

const colorThemeCache = new Map<string, ColorTheme>();

// Helper function to get reading color theme by ID
export const getColorTheme = (
  themeId: string,
  subTheme: 'day' | 'night' | 'midnight' = 'day'
): ColorTheme => {
  const cacheKey = `${themeId}_${subTheme}`;
  if (colorThemeCache.has(cacheKey)) {
    return colorThemeCache.get(cacheKey)!;
  }

  const getThemeRaw = (): ColorTheme => {
    const baseTheme = COLOR_THEMES.find(theme => theme.id === themeId) || COLOR_THEMES[0];
    
    if (themeId === 'snow') {
      if (subTheme === 'day') {
        return {
          id: 'snow',
          name: 'Snow',
          description: 'Cool frosty theme with falling snow',
          colors: {
            textColor: '#0c4a6e', // Pure crisp blue frosty text
            backgroundColor: '#f0f9ff' // Soft icy blue background
          }
        };
      } else if (subTheme === 'night') {
        return {
          id: 'snow',
          name: 'Snow',
          description: 'Cool frosty theme with falling snow',
          colors: {
            textColor: '#f1f5f9', // Clean ice white text
            backgroundColor: '#0b1329' // Deep Norwegian winter night blue
          }
        };
      } else {
        return {
          id: 'snow',
          name: 'Snow',
          description: 'Cool frosty theme with falling snow',
          colors: {
            textColor: '#f8fafc', // Frozen starlight white
            backgroundColor: '#020617' // Frozen cosmic midnight
          }
        };
      }
    }

    if (themeId === 'rain') {
      if (subTheme === 'day') {
        return {
          id: 'rain',
          name: 'Rain',
          description: 'Cozy rain atmosphere with JOWA highlights',
          colors: {
            textColor: '#1f2937', // Dark charcoal text
            backgroundColor: '#cbd5e1' // Overcast rainy slate gray
          }
        };
      } else if (subTheme === 'night') {
        return {
          id: 'rain',
          name: 'Rain',
          description: 'Cozy rain atmosphere with JOWA highlights',
          colors: {
            textColor: '#cbd5e1', // Light gray text
            backgroundColor: '#0f172a' // Classic cozy deep slate rain night
          }
        };
      } else {
        return {
          id: 'rain',
          name: 'Rain',
          description: 'Cozy rain atmosphere with JOWA highlights',
          colors: {
            textColor: '#f8fafc', // Clean bright white text
            backgroundColor: '#020617' // Dark cosmic midnight blue
          }
        };
      }
    }

    if (themeId === 'aurora') {
      if (subTheme === 'day') {
        return {
          id: 'aurora',
          name: 'Elegant Aurora',
          description: 'Cozy boreal aurora atmosphere with sakura/lotus falling petals',
          colors: {
            textColor: '#4c1d95', // Deep purple
            backgroundColor: '#faf5ff' // Soft elegant light violet-white
          }
        };
      } else if (subTheme === 'night') {
        return {
          id: 'aurora',
          name: 'Elegant Aurora',
          description: 'Cozy boreal aurora atmosphere with sakura/lotus falling petals',
          colors: {
            textColor: '#e9d5ff', // Light violet text
            backgroundColor: '#0f0d26' // Elegant dark violet sky
          }
        };
      } else {
        // midnight
        return {
          id: 'aurora',
          name: 'Elegant Aurora',
          description: 'Cozy boreal aurora atmosphere with sakura/lotus falling petals',
          colors: {
            textColor: '#f8fafc', // Near white
            backgroundColor: '#03001a' // Deep indigo/purple midnight
          }
        };
      }
    }
    
    return baseTheme;
  };

  const result = getThemeRaw();
  colorThemeCache.set(cacheKey, result);
  return result;
};

// Helper to convert hex to RGB
const hexToRgb = (hex: string): string => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `${r}, ${g}, ${b}`;
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '255, 255, 255';
};

// Helper function to apply interface theme colors to CSS variables
export const applyInterfaceTheme = (
  theme: InterfaceTheme,
  menuStyle: string = 'classic',
  subTheme: string = 'day',
  glassEnabled: boolean = false,
  glassOpacity: number = 45,
  glassBlur: number = 14,
  themeApplyMode: string = 'both',
  menuSubTheme: string = 'default'
) => {
  const root = document.documentElement;
  
  // Helper to update style property only if changed
  const setStylePropertyIfChanged = (name: string, value: string) => {
    if (root.style.getPropertyValue(name) !== value) {
      root.style.setProperty(name, value);
    }
  };

  // Helper to update attribute only if changed
  const setAttributeIfChanged = (name: string, value: string) => {
    if (root.getAttribute(name) !== value) {
      root.setAttribute(name, value);
    }
  };

  // Toggle Tailwind dark mode class on document element
  const isDark = isHexColorDark(theme.colors.panelBackground || '#ffffff');
  root.classList.toggle('dark', isDark);
  setAttributeIfChanged('data-is-dark', isDark ? 'true' : 'false');

  // Apply all theme colors as CSS custom properties only if they changed
  Object.entries(theme.colors).forEach(([key, value]) => {
    setStylePropertyIfChanged(`--interface-${key}`, value);
  });

  // Expose active state variables
  setStylePropertyIfChanged('--interface-id', theme.id);
  setStylePropertyIfChanged('--interface-subtheme', subTheme);
  setStylePropertyIfChanged('--interface-menustyle', menuStyle);
  
  // Set targeted menu styles based on apply mode
  const interfaceStyle = (themeApplyMode === 'both' || themeApplyMode === 'interface') ? menuStyle : 'classic';
  const readerStyle = (themeApplyMode === 'both' || themeApplyMode === 'reader') ? menuStyle : 'classic';
  
  setAttributeIfChanged('data-interface-menu-style', interfaceStyle);
  setAttributeIfChanged('data-reader-menu-style', readerStyle);
  setAttributeIfChanged('data-menu-style', menuStyle); // Keep for backwards compatibility
  setAttributeIfChanged('data-sub-theme', subTheme);
  setAttributeIfChanged('data-theme-id', theme.id);
  setAttributeIfChanged('data-menu-subtheme', menuSubTheme);

  // Apply glass configurations
  if (glassEnabled) {
    setAttributeIfChanged('data-glass-enabled', 'true');
    const opacity = glassOpacity / 100;
    const blurPx = Math.round((glassBlur / 100) * 40);
    
    let glassBg = '';
    const rawBg = theme.colors.panelBackground || '#ffffff';
    if (rawBg.startsWith('rgba(')) {
      // Correctly parse and preserve rgba background colors for variations like frosted, tinted, aurora
      const matches = rawBg.match(/rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/);
      if (matches) {
        const [, r, g, b] = matches;
        glassBg = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      } else {
        glassBg = rawBg;
      }
    } else {
      const rgb = hexToRgb(rawBg);
      glassBg = `rgba(${rgb}, ${opacity})`;
    }
    
    setStylePropertyIfChanged('--interface-glass-bg', glassBg);
    setStylePropertyIfChanged('--interface-glass-blur', `${blurPx}px`);
  } else {
    if (root.hasAttribute('data-glass-enabled')) {
      root.removeAttribute('data-glass-enabled');
    }
    if (root.style.getPropertyValue('--interface-glass-bg')) {
      root.style.removeProperty('--interface-glass-blur');
      root.style.removeProperty('--interface-glass-bg');
    }
  }
};

// Helper to apply theme directly from reading preferences
export const applyPreferencesTheme = (prefs: any) => {
  if (!prefs) return;
  const themeId = prefs.selectedInterfaceTheme || 'light';
  const subTheme = prefs.snowSubTheme || 'night';
  const menuStyle = prefs.menuStyle || 'classic';
  const linkStyle = prefs.linkStyleWithTheme !== false;
  const themeApplyMode = prefs.themeApplyMode || 'both';
  const neonCustomColor = prefs.neonCustomColor;

  const glassEnabled = prefs.glassEnabled ?? false;
  const isTinted = (prefs.menuSubTheme || 'default') === 'tinted';
  const glassReaderAreaOnly = glassEnabled && isTinted ? (prefs.glassReaderAreaOnly ?? false) : false;

  // Interface is glass only if glass is enabled AND we are not in reader area only mode
  const isInterfaceGlass = glassEnabled && !glassReaderAreaOnly;
  const menuSubTheme = isInterfaceGlass ? (prefs.menuSubTheme || 'default') : 'default';

  const root = document.documentElement;
  
  // Set reader background and text colors for adaptive scrollbars
  const activeColorThemeId = prefs.selectedColorTheme || prefs.theme || 'light';
  const colorThemeObj = COLOR_THEMES.find(t => t.id === activeColorThemeId);
  let readerBg = prefs.colors?.backgroundColor || colorThemeObj?.colors.backgroundColor || '#ffffff';
  const bookBg = prefs.colors?.backgroundColor || colorThemeObj?.colors.backgroundColor || '#ffffff';
  const readerText = prefs.colors?.textColor || colorThemeObj?.colors.textColor || '#000000';

  const isReaderTinted = glassEnabled && (glassReaderAreaOnly || (prefs.glassReaderArea && (prefs.menuSubTheme || 'default') === 'tinted'));

  if (isReaderTinted) {
    const tintHex = prefs.glassTintColor || '#3b82f6';
    const isDark = activeColorThemeId === 'dark' || activeColorThemeId === 'ocean' || activeColorThemeId === 'rain' || activeColorThemeId === 'highcontrast';
    const tintRgb = hexToRgb(tintHex) || '59,130,246';
    const [tr, tg, tb] = tintRgb.split(',').map(Number);
    const glassOpacityVal = prefs.glassReaderOpacity !== undefined ? (prefs.glassReaderOpacity / 100) : 0.65;
    
    // Base background color
    const baseBgHex = prefs.colors?.backgroundColor || colorThemeObj?.colors.backgroundColor || (isDark ? '#0f172a' : '#ffffff');
    const baseRgbStr = hexToRgb(baseBgHex) || (isDark ? '15,23,42' : '255,255,255');
    const [br, bgVal, bb] = baseRgbStr.split(',').map(Number);
    
    const bgR = Math.round(tr * glassOpacityVal + br * (1 - glassOpacityVal));
    const bgG = Math.round(tg * glassOpacityVal + bgVal * (1 - glassOpacityVal));
    const bgB = Math.round(tb * glassOpacityVal + bb * (1 - glassOpacityVal));
    
    readerBg = `#${bgR.toString(16).padStart(2, '0')}${bgG.toString(16).padStart(2, '0')}${bgB.toString(16).padStart(2, '0')}`;
  }

  root.style.setProperty('--reader-bg', readerBg);
  root.style.setProperty('--book-bg', bookBg);
  root.style.setProperty('--reader-text', readerText);

  if (prefs.applyRetroFont && menuStyle === 'retro8bit') {
    root.setAttribute('data-apply-retro-font', 'true');
  } else {
    root.setAttribute('data-apply-retro-font', 'false');
  }

  if (prefs.interfaceSnowyEnabled && (prefs.interfaceSnowyMode === 'interface' || prefs.interfaceSnowyMode === 'both')) {
    root.setAttribute('data-interface-snowy', 'true');
  } else {
    root.removeAttribute('data-interface-snowy');
  }
  
  let theme = getInterfaceTheme(themeId, subTheme, menuStyle, linkStyle, menuSubTheme, neonCustomColor, isInterfaceGlass, prefs.glassTintColor);
  if (themeId === 'custom' && prefs.interfaceColors) {
    theme = { ...theme, colors: prefs.interfaceColors };
  }
  
  applyInterfaceTheme(
    theme,
    menuStyle,
    subTheme,
    isInterfaceGlass,
    prefs.glassOpacity ?? 45,
    prefs.glassBlur ?? 14,
    themeApplyMode,
    menuSubTheme
  );
};

// Helper function to get contrast ratio between two colors
export const getContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want a more robust color parsing library
  const getLuminance = (hex: string) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Validate theme accessibility
export const validateThemeAccessibility = (theme: InterfaceTheme): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];
  
  // Check critical contrast ratios
  const textContrast = getContrastRatio(theme.colors.textPrimary, theme.colors.panelBackground);
  if (textContrast < 4.5) {
    issues.push('Text contrast ratio is below WCAG AA standard (4.5:1)');
  }
  
  const buttonContrast = getContrastRatio(theme.colors.buttonPrimaryText, theme.colors.buttonPrimary);
  if (buttonContrast < 4.5) {
    issues.push('Button text contrast ratio is below WCAG AA standard (4.5:1)');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};
