import type { ReadingPreferences, Bookmark, Book } from '../../../types';

export interface Note {
  id: string;
  title: string;
  content: string; // HTML format
  createdAt: string;
  updatedAt: string;
  color?: string; // card background color
  fontFamily?: string;
  fontSize?: number;
}

export interface NotesInterfaceStyles {
  backgroundColor: string;
  panelBackground: string;
  panelSecondaryBackground: string;
  color: string;
  borderColor: string;
}

export interface NoteCardStyles {
  backgroundColor: string;
  color: string;
  titleColor: string;
  mutedColor: string;
  borderColor: string;
}
