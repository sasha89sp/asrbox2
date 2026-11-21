export type ModuleId =
  | 'notes'
  | 'passwords'
  | 'calendar'
  | 'shared'
  | 'sync'
  | 'tools'
  | 'diagnostics';

export type PlatformView = 'windows' | 'android';

export type ThemeMode = 'light' | 'dark';

export interface NoteFolder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface SpreadsheetData {
  columns: string[];
  rows: string[][];
}

export interface VoiceMemoData {
  durationSec: number;
  recordedAt: string;
  transcript: string;
  waveform: number[];
}

export interface AttachmentData {
  name: string;
  sizeLabel: string;
  kind: 'image' | 'file';
  url?: string;
  caption?: string;
}

export interface EmbeddedIcsEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location?: string;
  addedToCalendar?: boolean;
}

export type NoteBlock =
  | { id: string; type: 'markdown'; content: string }
  | { id: string; type: 'checklist'; title: string; items: ChecklistItem[] }
  | { id: string; type: 'spreadsheet'; title: string; data: SpreadsheetData }
  | { id: string; type: 'voice'; title: string; data: VoiceMemoData }
  | { id: string; type: 'attachment'; data: AttachmentData }
  | { id: string; type: 'ics'; title: string; events: EmbeddedIcsEvent[] };

export interface NoteVersion {
  id: string;
  savedAt: string;
  summary: string;
  title: string;
  blocks: NoteBlock[];
}

export interface Note {
  id: string;
  title: string;
  folderId: string;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  updatedAt: string;
  trashedAt?: string | null;
  blocks: NoteBlock[];
  versions: NoteVersion[];
}

export type PasswordSortKey = 'title' | 'updatedAt' | 'strength';

export interface PasswordExtraField {
  id: string;
  kind: 'pin' | 'card' | 'question' | 'custom';
  label: string;
  value: string;
  secret?: boolean;
}

export interface PasswordHistoryItem {
  id: string;
  changedAt: string;
  previousPassword: string;
  note: string;
}

export interface PasswordEntry {
  id: string;
  vaultId: string;
  folder: string;
  title: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  updatedAt: string;
  trashed: boolean;
  extraFields: PasswordExtraField[];
  history: PasswordHistoryItem[];
}

export interface PasswordVault {
  id: string;
  name: string;
  masterPassword: string;
  hint: string;
  autoLockMinutes: number;
  lockOnMinimize: boolean;
  rememberMode: 'none' | 'biometrics' | 'autologin';
  globalSort: PasswordSortKey;
  folderSorts: Record<string, PasswordSortKey>;
  failedAttempts: number;
  lockedUntil: number | null;
  folders: string[];
}

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  type: 'local' | 'google' | 'ical';
  visible: boolean;
  url?: string;
}

export type RecurrenceRule = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  location?: string;
  notes?: string;
  recurrence: RecurrenceRule;
  reminderMinutes: number;
  linkedNoteId?: string;
}

export type GroupRole = 'viewer' | 'own_files' | 'editor';

export interface SharedInvite {
  id: string;
  code: string;
  type: 'one_time' | 'multi_use';
  role: GroupRole;
  createdAt: string;
  usedCount: number;
}

export interface SharedComment {
  id: string;
  author: string;
  time: string;
  text: string;
}

export interface SharedNote {
  id: string;
  title: string;
  author: string;
  updatedAt: string;
  content: string;
  comments: SharedComment[];
}

export interface ChatMessage {
  id: string;
  author: string;
  avatar?: string;
  isMe: boolean;
  time: string;
  text: string;
  convertedTo?: 'note' | 'event' | null;
}

export interface SharedGroup {
  id: string;
  name: string;
  description: string;
  keyFingerprint: string;
  members: { name: string; role: GroupRole; avatar?: string }[];
  invites: SharedInvite[];
  notes: SharedNote[];
  messages: ChatMessage[];
}

export interface SyncConflict {
  id: string;
  itemTitle: string;
  module: 'notes' | 'calendar';
  localVersion: string;
  remoteVersion: string;
  localTime: string;
  remoteTime: string;
  resolved: boolean;
}

export interface BackupSnapshot {
  id: string;
  label: string;
  createdAt: string;
  sizeLabel: string;
  kind: 'manual' | 'safety' | 'scheduled';
  encrypted: boolean;
}

export interface AutoUploadFolder {
  id: string;
  localPath: string;
  remoteTarget: string;
  enabled: boolean;
  lastUploaded: string;
}

export interface AndroidBackupItem {
  id: 'contacts' | 'calls' | 'sms' | 'wifi';
  label: string;
  countLabel: string;
  lastBackup: string;
  enabled: boolean;
}

export interface KeyRemap {
  id: string;
  fromKeys: string;
  toAction: string;
  enabled: boolean;
  scope: 'global' | 'asrbox';
}

export interface DockShortcut {
  id: string;
  label: string;
  target: string;
  iconKey: 'notes' | 'passwords' | 'calendar' | 'shared' | 'dictation' | 'folder' | 'terminal' | 'sync';
  actionType: 'module' | 'dictation' | 'lock' | 'folder' | 'app';
  moduleTarget?: ModuleId;
}

export interface DiagnosticLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
}

export interface AppSettings {
  theme: ThemeMode;
  platformView: PlatformView;
  portableMode: boolean;
  zoomPercent: number;
  showRightPanel: boolean;
  swapColumns: boolean;
  leftSidebarWidth: number;
  rightPanelWidth: number;
  dockEnabled: boolean;
  dockPosition: 'bottom' | 'left' | 'right';
  dockScale: number;
  dictationHotkey: string;
  syncProvider: 'webdav_yandex' | 'webdav_mailru' | 'gdrive' | 'local_folder';
  syncEndpoint: string;
  syncIntervalMinutes: number;
  backgroundSync: boolean;
  enabledModules: Record<ModuleId, boolean>;
}
