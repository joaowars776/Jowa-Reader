export interface ReadingPreferences {
  fontFamily: 'Arial' | 'Inter' | 'Georgia' | 'Custom';
  customFontUrl?: string;
  customFontName?: string;
  fontSize: number;
  lineHeight: number;
  marginSize: number; // Letter spacing
  theme: 'light' | 'dark' | 'sepia' | 'highcontrast' | 'ocean' | 'aurora' | 'snow' | 'custom' | 'rain';
  maxWidth: 'phone' | 'normal' | 'full' | 'custom';
  hideMenuWhileReading: boolean;
  colors: {
    textColor: string;
    backgroundColor: string;
  };
  customColors?: {
    textColor: string;
    backgroundColor: string;
  };
  customInterfaceColors?: {
    panelBackground: string;
    panelText: string;
  };
  interfaceTheme: 'light' | 'dark' | 'sepia' | 'highcontrast' | 'ocean' | 'aurora' | 'snow' | 'custom' | 'rain';
  snowDensity?: number; // Density of falling snow/rain (percentage or number of particles)
  snowSpeed?: number; // Speed of falling snow/rain (0% to 100%)
  snowSubTheme?: 'day' | 'night' | 'midnight'; // Sub-themes inside the Snow/Rain theme
  snowMenuType?: 'wood' | 'urban' | 'glass'; // Deprecated - replaced by menuStyle
  menuStyle?: 'classic' | 'wood' | 'neon' | 'glass' | 'retro8bit'; // Universal menu style
  menuSubTheme?: string; // Sub-themes inside the universal Menu Style ('default', 'mahogany', 'birch', 'cassino', 'cyberpunk', etc)
  neonCustomColor?: string; // Custom glow color for neon style
  linkStyleWithTheme?: boolean; // Links menu styles with general themes
  snowInReaderArea?: boolean; // Toggles falling particles in reader area
  interfaceSnowyEnabled?: boolean;
  interfaceSnowyMode?: 'reader' | 'interface' | 'both';
  interfaceSnowyAmount?: number;
  interfaceSnowySpeed?: number;
  interfacePetalsEnabled?: boolean;
  interfacePetalsMode?: 'reader' | 'interface' | 'both';
  interfacePetalsAmount?: number;
  interfacePetalsSpeed?: number;
  interfaceRainEnabled?: boolean;
  interfaceRainMode?: 'reader' | 'interface' | 'both';
  interfaceRainAmount?: number;
  interfaceRainSpeed?: number;
  interfaceEffectsMinimized?: boolean;
  sideBordersEnabled?: boolean;
  sideBordersWidth?: number; // Border thickness from 0 to 100 (representing 0 to 150px)
  sideBordersColor?: string; // Custom color for the margins (hex string)
  sideBordersEffect?: 'none' | 'pulse' | 'snow' | 'sand' | 'thunder' | 'rain'; // Effect style
  sideBordersSnowAmount?: number; // Amount of snow on borders (5 to 50)
  sideBordersThunderAmount?: number; // Frequency of thunder (10 to 100)
  sideBordersPulseAmount?: number; // Pulse speed/intensity (0 to 100)
  glassEnabled?: boolean; // Toggles translucent Glassmorphic style overlay
  glassOpacity?: number; // Translucent opacity from 0 to 100
  glassBlur?: number; // Backdrop filter blur from 0 to 100
  glassReaderArea?: boolean; // Toggles translucent Glassmorphic style for the reading area
  glassReaderOpacity?: number; // Opacity of the reader area glass from 0 to 100
  glassReaderBlur?: number; // Blur of the reader area glass from 0 to 100
  glassTintColor?: string; // Predefined or custom hex color for accent tinted glass
  glassReaderBackdropVariation?: boolean; // Toggles backdrop variation inside the reading area too
  interfaceColors: {
    headerBackground: string;
    headerText: string;
    headerBorder: string;
    panelBackground: string;
    panelText: string;
    panelBorder: string;
    panelSecondaryBackground: string;
    buttonPrimary: string;
    buttonPrimaryText: string;
    buttonSecondary: string;
    buttonSecondaryText: string;
    buttonHover: string;
    inputBackground: string;
    inputText: string;
    inputBorder: string;
    inputFocus: string;
    accent: string;
    accentHover: string;
    success: string;
    warning: string;
    error: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    linkColor: string;
    linkHover: string;
    divider: string;
    shadow: string;
    overlay: string;
    borderColor: string; // Added for consistency with ReaderSettings
  };
  scrollButtons: {
    visible: boolean;
    size: 'small' | 'medium' | 'large' | 'custom';
    customSize: number;
  };
  cornerNavigation: {
    visible: boolean;
  };
  selectedColorTheme: string;
  selectedInterfaceTheme: string;
  useThemeBasedColors: boolean;
  syncInterfaceWithReading: boolean;
  applyFontGlobally: boolean;
  enablePageTurning: boolean;
  enableReadingProgress: boolean;
  enableNightMode: boolean;
  enableFocusMode: boolean;
  enableTextToSpeech: boolean;
  enableFastFavorite: boolean;
  fastFavoriteName: string;
  iconVisibility: IconVisibility;
  paragraphSpacing: number;
  syncAllBookmarks: boolean;
  showTopBarInFullScreen: boolean;
  fixedTopBar: boolean;
  markReadText?: boolean;
  markReadStyle?: 'opacity' | 'underline' | 'strike' | 'highlight';
  bookmarkHighlight: {
    color: string;
    style: 'none' | 'highlight' | 'underline' | 'strike';
  };
  bookmarksSettingsExpanded?: boolean;
  themeApplyMode?: 'both' | 'interface' | 'reader';
  applyRetroFont?: boolean;
  shortcuts?: {
    [key: string]: string[];
  };
  lastSelectedCustomColorTheme?: string;
  lastSelectedCustomInterfaceTheme?: string;
  customTheme?: CustomTheme;
  imageScale?: number;
  imageReadingMode?: 'continuous' | 'paginated';
  showPdfImages?: boolean;
}

export interface IconVisibility {
  showSearchIcon?: boolean;
  showBookmarkIcon?: boolean;
  showFavoriteIcon?: boolean;
  showShareIcon?: boolean;
  showFullscreenIcon?: boolean;
  showShortcutsIcon?: boolean; // New: Show/hide shortcuts icon
  showTranslateIcon?: boolean; // Offline translation icon visibility
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover?: string;
  file: File;
  fileType: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  addedAt?: Date;
  lastRead: Date;
  currentChapter: number;
  progress: number;
  scrollPosition?: number;
  totalPages?: number;
  currentPage?: number;
  metadata?: { [key: string]: any };
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  href?: string | string[];
  order?: number;
  startIndex?: number;
  endIndex?: number;
  pageNumber?: number;
}

export interface Bookmark {
  id: string;
  bookId: string;
  chapterIndex: number;
  position: number; // Scroll position or page number
  text: string; // Snippet of text for context
  label?: string; // User-defined label
  createdAt: Date;
  type?: 'chapter' | 'text' | 'favorite';
  color?: string;
  style?: 'none' | 'highlight' | 'underline' | 'strike';
}

export interface ReadingStats {
  totalTimeRead: number; // in minutes
  booksCompleted: number;
  pagesRead: number;
  averageReadingSpeed: number; // words per minute
  streakDays: number;
  lastReadDate: Date;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // in seconds or milliseconds
  chapterIndex?: number;
  chapterTitle?: string;
  startChapterIndex?: number;
  startChapterTitle?: string;
  endChapterIndex?: number;
  endChapterTitle?: string;
  activityLog?: { timestamp: Date; type: 'read' | 'idle' | 'chapter_change' }[];
  wordsRead?: number;
  completed?: boolean;
  fileType?: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  tags?: string[];
}

export interface SearchResult {
  chapterIndex: number;
  chapterTitle: string;
  text: string;
  position: number; // Relative position within the chapter (e.g., paragraph index, or scrollY)
  matchStart: number; // Start index of the match within the text snippet
  matchEnd: number; // End index of the match within the text snippet
}

export interface ColorTheme {
  id: string;
  name: string;
  description?: string;
  warning?: string;
  colors: {
    chapterTitleColor?: string;
    textColor: string;
    backgroundColor: string;
  };
}

export interface InterfaceTheme {
  id: string;
  name: string;
  colors: {
    headerBackground: string;
    headerText: string;
    headerBorder: string;
    panelBackground: string;
    panelText: string;
    panelBorder: string;
    panelSecondaryBackground: string;
    buttonPrimary: string;
    buttonPrimaryText: string;
    buttonSecondary: string;
    buttonSecondaryText: string;
    buttonHover: string;
    inputBackground: string;
    inputText: string;
    inputBorder: string;
    inputFocus: string;
    accent: string;
    accentHover: string;
    success: string;
    warning: string;
    error: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    linkColor: string;
    linkHover: string;
    divider: string;
    shadow: string;
    overlay: string;
    borderColor: string;
  };
}

export interface CustomTheme {
  background: string;
  text: string;
  accent: string;
}

export interface ChapterHistory {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapterIndex: number;
  chapterTitle: string;
  totalTime: number; // in milliseconds
  firstRead: Date;
  lastRead: Date;
  timesRead: number;
  completed: boolean;
  fileType?: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  tags?: string[];
}

export interface BookHistory {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  totalTime: number; // in milliseconds
  firstRead: Date;
  lastRead: Date;
  chaptersRead: number;
  totalChapters: number;
  completionPercentage: number;
  sessions: ReadingSession[];
  fileType?: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  tags?: string[];
}

export interface ReadingTrend {
  date: string; // YYYY-MM-DD format
  totalTime: number; // in milliseconds
  sessionsCount: number;
  booksRead: string[]; // book IDs
  chaptersCompleted: number;
}

export interface ReadingHistoryStats {
  totalReadingTime: number; // in milliseconds
  totalChaptersCompleted: number;
  totalBooksStarted: number;
  totalBooksCompleted: number;
  averageSessionDuration: number; // in milliseconds
  longestSession: number; // in milliseconds
  currentStreak: number; // days
  longestStreak: number; // days
  dailyAverage: number; // in milliseconds
  weeklyAverage: number; // in milliseconds
  monthlyAverage: number; // in milliseconds
}

export type TimeFormat = 'auto' | 'minutes' | 'hours' | 'detailed';
export type SortOption = 'date' | 'duration' | 'book' | 'chapter';
export type FilterOption = 'all' | 'completed' | 'in-progress' | 'today' | 'week' | 'month';
