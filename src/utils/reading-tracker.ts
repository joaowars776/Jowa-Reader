import { initDB } from './storage';
import { logActivity } from './activity-logger';
import type { ReadingSession, ChapterHistory, BookHistory, ReadingTrend, ReadingHistoryStats } from '../types';

// Reading session tracking
let currentSession: {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  chapterIndex: number;
  chapterTitle: string;
  startTime: Date;
  fileType?: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw';
  tags?: string[];
} | null = null;

let sessionTimer: NodeJS.Timeout | null = null;
let lastActivityTime = Date.now();
let activityThrottle = false;

// Start a new reading session
export const startReadingSession = (
  bookId: string,
  bookTitle: string,
  bookAuthor: string,
  chapterIndex: number,
  chapterTitle: string,
  fileType?: 'epub' | 'pdf' | 'txt' | 'mobi' | 'azw3' | 'kfx' | 'azw',
  tags?: string[]
) => {
  // End previous session if exists
  if (currentSession) {
    endReadingSession();
  }

  currentSession = {
    bookId,
    bookTitle,
    bookAuthor,
    chapterIndex,
    chapterTitle,
    startTime: new Date(),
    fileType,
    tags
  };

  logActivity({
    type: 'read_chapter',
    bookId,
    bookTitle,
    chapterTitle,
    chapterIndex
  });

  lastActivityTime = Date.now();

  // Start activity tracking
  sessionTimer = setInterval(() => {
    const now = Date.now();
    // If no activity for 5 minutes, pause the session
    if (now - lastActivityTime > 5 * 60 * 1000) {
      pauseReadingSession();
    }
  }, 30000); // Check every 30 seconds

  console.log('Reading session started:', currentSession);
};

// Update activity timestamp
export const updateReadingActivity = () => {
  // Throttle activity updates to prevent excessive calls
  if (activityThrottle) return;
  
  activityThrottle = true;
  setTimeout(() => { activityThrottle = false; }, 1000);
  
  lastActivityTime = Date.now();
  
  // Resume session if it was paused
  if (currentSession && !sessionTimer) {
    resumeReadingSession();
  }
};

// Pause reading session
export const pauseReadingSession = () => {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }
};

// Resume reading session
export const resumeReadingSession = () => {
  if (currentSession && !sessionTimer) {
    lastActivityTime = Date.now();
    sessionTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityTime > 5 * 60 * 1000) {
        pauseReadingSession();
      }
    }, 30000);
  }
};

// End current reading session
export const endReadingSession = async (completed: boolean = false) => {
  if (!currentSession) return;

  const endTime = new Date();
  const duration = endTime.getTime() - currentSession.startTime.getTime();

  // Only save sessions longer than 10 seconds
  if (duration > 10000) {
    const session: ReadingSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookId: currentSession.bookId,
      bookTitle: currentSession.bookTitle,
      bookAuthor: currentSession.bookAuthor,
      chapterIndex: currentSession.chapterIndex,
      chapterTitle: currentSession.chapterTitle,
      startTime: currentSession.startTime,
      endTime,
      duration,
      completed,
      fileType: currentSession.fileType,
      tags: currentSession.tags
    };

    await saveReadingSession(session);
  }

  // Clear session
  currentSession = null;
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }

  console.log('Reading session ended');
};

// Change chapter within the same session
export const changeChapter = async (
  chapterIndex: number,
  chapterTitle: string,
  completed: boolean = false
) => {
  if (!currentSession) return;

  // Capture current session details before ending
  const bookId = currentSession.bookId;
  const bookTitle = currentSession.bookTitle;
  const bookAuthor = currentSession.bookAuthor;
  const fileType = currentSession.fileType;
  const tags = currentSession.tags;

  // End current chapter session
  await endReadingSession(completed);

  // Start new chapter session with captured details
  startReadingSession(
    bookId,
    bookTitle,
    bookAuthor,
    chapterIndex,
    chapterTitle,
    fileType,
    tags
  );
};

// Database operations
export const saveReadingSession = async (session: ReadingSession) => {
  try {
    const db = await initDB();
    await db.put('readingSessions', session);
    console.log('Reading session saved:', session);
  } catch (error) {
    console.error('Error saving reading session:', error);
  }
};

export const getReadingSessions = async (bookId?: string): Promise<ReadingSession[]> => {
  try {
    const db = await initDB();
    const sessions = await db.getAll('readingSessions');
    
    if (bookId) {
      return sessions.filter(session => session.bookId === bookId);
    }
    
    return sessions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  } catch (error) {
    console.error('Error getting reading sessions:', error);
    return [];
  }
};

export const deleteReadingSession = async (sessionId: string) => {
  try {
    const db = await initDB();
    await db.delete('readingSessions', sessionId);
  } catch (error) {
    console.error('Error deleting reading session:', error);
  }
};

// Analytics functions
export const getChapterHistory = async (bookId?: string): Promise<ChapterHistory[]> => {
  const sessions = await getReadingSessions(bookId);
  const chapterMap = new Map<string, ChapterHistory>();

  sessions.forEach(session => {
    const key = `${session.bookId}-${session.chapterIndex}`;
    
    if (chapterMap.has(key)) {
      const existing = chapterMap.get(key)!;
      existing.totalTime += session.duration;
      existing.lastRead = session.endTime > existing.lastRead ? session.endTime : existing.lastRead;
      existing.timesRead += 1;
      if (session.completed) {
        existing.completed = true;
      }
    } else {
      chapterMap.set(key, {
        bookId: session.bookId,
        bookTitle: session.bookTitle,
        bookAuthor: session.bookAuthor,
        chapterIndex: session.chapterIndex,
        chapterTitle: session.chapterTitle,
        totalTime: session.duration,
        firstRead: session.startTime,
        lastRead: session.endTime,
        timesRead: 1,
        completed: session.completed,
        fileType: session.fileType,
        tags: session.tags
      });
    }
  });

  return Array.from(chapterMap.values()).sort((a, b) => b.lastRead.getTime() - a.lastRead.getTime());
};

export const getBookHistory = async (): Promise<BookHistory[]> => {
  const sessions = await getReadingSessions();
  const bookMap = new Map<string, BookHistory>();

  sessions.forEach(session => {
    if (bookMap.has(session.bookId)) {
      const existing = bookMap.get(session.bookId)!;
      existing.totalTime += session.duration;
      existing.lastRead = session.endTime > existing.lastRead ? session.endTime : existing.lastRead;
      existing.sessions.push(session);
      
      // Count unique chapters
      const uniqueChapters = new Set(existing.sessions.map(s => s.chapterIndex));
      existing.chaptersRead = uniqueChapters.size;
    } else {
      bookMap.set(session.bookId, {
        bookId: session.bookId,
        bookTitle: session.bookTitle,
        bookAuthor: session.bookAuthor,
        totalTime: session.duration,
        firstRead: session.startTime,
        lastRead: session.endTime,
        chaptersRead: 1,
        totalChapters: 0, // Will be updated when we have book data
        completionPercentage: 0,
        sessions: [session],
        fileType: session.fileType,
        tags: session.tags
      });
    }
  });

  return Array.from(bookMap.values()).sort((a, b) => b.lastRead.getTime() - a.lastRead.getTime());
};

export const getReadingTrends = async (days: number = 30, bookId?: string): Promise<ReadingTrend[]> => {
  let sessions = await getReadingSessions();
  if (bookId && bookId !== 'all') {
    sessions = sessions.filter(session => session.bookId === bookId);
  }
  const trendMap = new Map<string, ReadingTrend>();

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

  // Initialize all dates in range
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    trendMap.set(dateStr, {
      date: dateStr,
      totalTime: 0,
      sessionsCount: 0,
      booksRead: [],
      chaptersCompleted: 0
    });
  }

  sessions.forEach(session => {
    const dateStr = session.startTime.toISOString().split('T')[0];
    
    if (trendMap.has(dateStr)) {
      const trend = trendMap.get(dateStr)!;
      trend.totalTime += session.duration;
      trend.sessionsCount += 1;
      
      if (!trend.booksRead.includes(session.bookId)) {
        trend.booksRead.push(session.bookId);
      }
      
      if (session.completed) {
        trend.chaptersCompleted += 1;
      }
    }
  });

  return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getReadingHistoryStats = async (bookId?: string): Promise<ReadingHistoryStats> => {
  let sessions = await getReadingSessions();
  let bookHistory = await getBookHistory();

  if (bookId && bookId !== 'all') {
    sessions = sessions.filter(session => session.bookId === bookId);
    bookHistory = bookHistory.filter(book => book.bookId === bookId);
  }
  
  if (sessions.length === 0) {
    return {
      totalReadingTime: 0,
      totalChaptersCompleted: 0,
      totalBooksStarted: 0,
      totalBooksCompleted: 0,
      averageSessionDuration: 0,
      longestSession: 0,
      currentStreak: 0,
      longestStreak: 0,
      dailyAverage: 0,
      weeklyAverage: 0,
      monthlyAverage: 0
    };
  }

  const totalReadingTime = sessions.reduce((sum, session) => sum + session.duration, 0);
  const totalChaptersCompleted = sessions.filter(session => session.completed).length;
  const totalBooksStarted = bookHistory.length;
  const totalBooksCompleted = bookHistory.filter(book => book.completionPercentage >= 100).length;
  const averageSessionDuration = totalReadingTime / sessions.length;
  const longestSession = Math.max(...sessions.map(session => session.duration));

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateReadingStreaks(sessions);

  // Calculate averages
  const trends = await getReadingTrends(90, bookId); // Last 90 days for this book or all books
  const dailyTimes = trends.map(trend => trend.totalTime);
  const dailyAverage = dailyTimes.reduce((sum, time) => sum + time, 0) / dailyTimes.length;
  const weeklyAverage = dailyAverage * 7;
  const monthlyAverage = dailyAverage * 30;

  return {
    totalReadingTime,
    totalChaptersCompleted,
    totalBooksStarted,
    totalBooksCompleted,
    averageSessionDuration,
    longestSession,
    currentStreak,
    longestStreak,
    dailyAverage,
    weeklyAverage,
    monthlyAverage
  };
};

const calculateReadingStreaks = (sessions: ReadingSession[]): { currentStreak: number; longestStreak: number } => {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Group sessions by date
  const dateMap = new Map<string, boolean>();
  sessions.forEach(session => {
    const dateStr = session.startTime.toISOString().split('T')[0];
    dateMap.set(dateStr, true);
  });

  const dates = Array.from(dateMap.keys()).sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Calculate current streak
  if (dateMap.has(today) || dateMap.has(yesterday)) {
    const checkDate = new Date();
    if (!dateMap.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dateMap.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Calculate longest streak
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) {
      tempStreak = 1;
    } else {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const diffDays = (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
};

// Export reading data
export const exportReadingData = async () => {
  const sessions = await getReadingSessions();
  const chapterHistory = await getChapterHistory();
  const bookHistory = await getBookHistory();
  const stats = await getReadingHistoryStats();
  const trends = await getReadingTrends(365); // Last year

  return {
    sessions,
    chapterHistory,
    bookHistory,
    stats,
    trends,
    exportedAt: new Date().toISOString()
  };
};

// Cleanup old sessions (optional)
export const cleanupOldSessions = async (daysToKeep: number = 365) => {
  try {
    const db = await initDB();
    const sessions = await db.getAll('readingSessions');
    const cutoffDate = new Date(Date.now() - (daysToKeep * 24 * 60 * 60 * 1000));

    const sessionsToDelete = sessions.filter(session => session.startTime < cutoffDate);
    
    for (const session of sessionsToDelete) {
      await db.delete('readingSessions', session.id);
    }

    console.log(`Cleaned up ${sessionsToDelete.length} old reading sessions`);
  } catch (error) {
    console.error('Error cleaning up old sessions:', error);
  }
};
