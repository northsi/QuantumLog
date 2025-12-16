export enum CodeStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  OPTIMIZE = 'OPTIMIZE'
}

export enum EntryType {
  LITERATURE = 'LITERATURE',
  DERIVATION = 'DERIVATION',
  CODE = 'CODE',
  INSPIRATION = 'INSPIRATION'
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  title: string;
  type: 'CONFERENCE' | 'DEADLINE' | 'MEETING' | 'OTHER';
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
  date: string; // ISO string YYYY-MM-DD
}

export interface Attachment {
  type: 'IMAGE';
  data: string; // Base64
}

export interface NotebookEntry {
  id: string;
  projectId: string;
  type: EntryType;
  title: string;
  content: string;
  createdAt: number;
  // Specific fields based on type
  codeStatus?: CodeStatus; // For CODE
  attachments: Attachment[]; // For Multi-modal
  linkedEntryIds?: string[]; // For INSPIRATION to link to others
}

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: number;
}

export interface AppState {
  projects: Project[];
  entries: NotebookEntry[];
  todos: TodoItem[];
  events: CalendarEvent[];
}