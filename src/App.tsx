import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  Cloud,
  FileText,
  KeyRound,
  Monitor,
  Moon,
  PanelRight,
  RefreshCw,
  Search,
  Sliders,
  Smartphone,
  Sun,
  Users,
  Wrench,
} from 'lucide-react';
import {
  AndroidBackupItem,
  AppSettings,
  AutoUploadFolder,
  BackupSnapshot,
  CalendarEvent,
  CalendarSource,
  ChatMessage,
  DiagnosticLogEntry,
  DockShortcut,
  EmbeddedIcsEvent,
  KeyRemap,
  ModuleId,
  Note,
  NoteFolder,
  PasswordEntry,
  PasswordVault,
  SharedGroup,
  SyncConflict,
} from './types/asrbox';
import {
  INITIAL_ANDROID_BACKUP,
  INITIAL_AUTO_UPLOAD,
  INITIAL_BACKUPS,
  INITIAL_CALENDARS,
  INITIAL_DOCK_SHORTCUTS,
  INITIAL_EVENTS,
  INITIAL_FOLDERS,
  INITIAL_KEY_REMAPS,
  INITIAL_LOGS,
  INITIAL_NOTES,
  INITIAL_PASSWORD_ENTRIES,
  INITIAL_SETTINGS,
  INITIAL_SHARED_GROUPS,
  INITIAL_SYNC_CONFLICTS,
  INITIAL_VAULTS,
} from './data/initialData';
import { NotesModule } from './components/NotesModule';
import { PasswordsModule } from './components/PasswordsModule';
import { CalendarModule } from './components/CalendarModule';
import { SharedModule } from './components/SharedModule';
import { SyncModule } from './components/SyncModule';
import { ToolsModule } from './components/ToolsModule';
import { RightCalendarPanel } from './components/RightCalendarPanel';
import { RocketDock } from './components/RocketDock';
import { AndroidMobileView } from './components/AndroidMobileView';
import {
  ClipboardToast,
  CommandPaletteModal,
  ContextMenuOverlay,
  ContextMenuState,
  ModulesManagerModal,
  ReminderPopup,
} from './components/Overlays';
import { formatTimeNow, getTodayIso, playReminderChime } from './utils/cryptoHelpers';

const STORAGE_KEY = 'asrbox_workspace_state_v1';

interface PersistedState {
  settings: AppSettings;
  folders: NoteFolder[];
  notes: Note[];
  vaults: PasswordVault[];
  entries: PasswordEntry[];
  calendars: CalendarSource[];
  events: CalendarEvent[];
  groups: SharedGroup[];
  conflicts: SyncConflict[];
  backups: BackupSnapshot[];
  autoUploadFolders: AutoUploadFolder[];
  androidBackupItems: AndroidBackupItem[];
  keyRemaps: KeyRemap[];
  dockShortcuts: DockShortcut[];
  logs: DiagnosticLogEntry[];
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) },
        folders: parsed.folders || INITIAL_FOLDERS,
        notes: parsed.notes || INITIAL_NOTES,
        vaults: parsed.vaults || INITIAL_VAULTS,
        entries: parsed.entries || INITIAL_PASSWORD_ENTRIES,
        calendars: parsed.calendars || INITIAL_CALENDARS,
        events: parsed.events || INITIAL_EVENTS,
        groups: parsed.groups || INITIAL_SHARED_GROUPS,
        conflicts: parsed.conflicts || INITIAL_SYNC_CONFLICTS,
        backups: parsed.backups || INITIAL_BACKUPS,
        autoUploadFolders: parsed.autoUploadFolders || INITIAL_AUTO_UPLOAD,
        androidBackupItems: parsed.androidBackupItems || INITIAL_ANDROID_BACKUP,
        keyRemaps: parsed.keyRemaps || INITIAL_KEY_REMAPS,
        dockShortcuts: parsed.dockShortcuts || INITIAL_DOCK_SHORTCUTS,
        logs: parsed.logs || INITIAL_LOGS,
      };
    }
  } catch {
    // Ignore storage parse error and load defaults
  }
  return {
    settings: INITIAL_SETTINGS,
    folders: INITIAL_FOLDERS,
    notes: INITIAL_NOTES,
    vaults: INITIAL_VAULTS,
    entries: INITIAL_PASSWORD_ENTRIES,
    calendars: INITIAL_CALENDARS,
    events: INITIAL_EVENTS,
    groups: INITIAL_SHARED_GROUPS,
    conflicts: INITIAL_SYNC_CONFLICTS,
    backups: INITIAL_BACKUPS,
    autoUploadFolders: INITIAL_AUTO_UPLOAD,
    androidBackupItems: INITIAL_ANDROID_BACKUP,
    keyRemaps: INITIAL_KEY_REMAPS,
    dockShortcuts: INITIAL_DOCK_SHORTCUTS,
    logs: INITIAL_LOGS,
  };
}

const NAV_MODULES: { id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'notes', label: 'Заметки и таблицы', icon: FileText },
  { id: 'passwords', label: 'Пароли и сейфы', icon: KeyRound },
  { id: 'calendar', label: 'Календарь', icon: Calendar },
  { id: 'shared', label: 'Общие группы', icon: Users },
  { id: 'sync', label: 'Синхронизация', icon: Cloud },
  { id: 'tools', label: 'Инструменты', icon: Wrench },
  { id: 'diagnostics', label: 'Диагностика', icon: Activity },
];

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [settings, setSettings] = useState<AppSettings>(initial.settings);
  const [folders, setFolders] = useState<NoteFolder[]>(initial.folders);
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [vaults, setVaults] = useState<PasswordVault[]>(initial.vaults);
  const [entries, setEntries] = useState<PasswordEntry[]>(initial.entries);
  const [calendars, setCalendars] = useState<CalendarSource[]>(initial.calendars);
  const [events, setEvents] = useState<CalendarEvent[]>(initial.events);
  const [groups, setGroups] = useState<SharedGroup[]>(initial.groups);
  const [conflicts, setConflicts] = useState<SyncConflict[]>(initial.conflicts);
  const [backups, setBackups] = useState<BackupSnapshot[]>(initial.backups);
  const [autoUploadFolders, setAutoUploadFolders] = useState<AutoUploadFolder[]>(
    initial.autoUploadFolders
  );
  const [androidBackupItems, setAndroidBackupItems] = useState<AndroidBackupItem[]>(
    initial.androidBackupItems
  );
  const [keyRemaps, setKeyRemaps] = useState<KeyRemap[]>(initial.keyRemaps);
  const [dockShortcuts, setDockShortcuts] = useState<DockShortcut[]>(initial.dockShortcuts);
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>(initial.logs);

  const [activeModule, setActiveModule] = useState<ModuleId>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initial.notes[0]?.id || null);
  const [unlockedVaultIds, setUnlockedVaultIds] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showModulesModal, setShowModulesModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeReminder, setActiveReminder] = useState<CalendarEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncLabel, setLastSyncLabel] = useState('14:20');
  const [clipboardState, setClipboardState] = useState<{
    label: string;
    secondsLeft: number;
    isSecret: boolean;
  }>({ label: '', secondsLeft: 0, isSecret: false });
  const [isNarrowViewport, setIsNarrowViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  // Column resize drag tracking
  const resizingRef = useRef<'left' | 'right' | null>(null);

  // Persist to localStorage
  useEffect(() => {
    try {
      const payload: PersistedState = {
        settings,
        folders,
        notes,
        vaults,
        entries,
        calendars,
        events,
        groups,
        conflicts,
        backups,
        autoUploadFolders,
        androidBackupItems,
        keyRemaps,
        dockShortcuts,
        logs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota issues
    }
  }, [
    settings,
    folders,
    notes,
    vaults,
    entries,
    calendars,
    events,
    groups,
    conflicts,
    backups,
    autoUploadFolders,
    androidBackupItems,
    keyRemaps,
    dockShortcuts,
    logs,
  ]);

  // Apply light/dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Responsive viewport listener
  useEffect(() => {
    const onResize = () => setIsNarrowViewport(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Global keyboard shortcuts (Ctrl+K, Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((v) => !v);
      } else if (e.key === 'Escape') {
        setOpenMenu(null);
        setContextMenu(null);
        setShowCommandPalette(false);
        setShowModulesModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Column drag resizing
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      if (resizingRef.current === 'left') {
        const raw = settings.swapColumns ? window.innerWidth - e.clientX : e.clientX;
        const clamped = Math.max(190, Math.min(340, raw));
        setSettings((prev) => ({ ...prev, leftSidebarWidth: clamped }));
      } else if (resizingRef.current === 'right') {
        const raw = settings.swapColumns ? e.clientX : window.innerWidth - e.clientX;
        const clamped = Math.max(240, Math.min(390, raw));
        setSettings((prev) => ({ ...prev, rightPanelWidth: clamped }));
      }
    };
    const onMouseUp = () => {
      resizingRef.current = null;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [settings.swapColumns]);

  // Clipboard auto-clear countdown timer
  useEffect(() => {
    if (clipboardState.secondsLeft <= 0) return;
    const timer = setInterval(() => {
      setClipboardState((prev) => {
        if (prev.secondsLeft <= 1) {
          if (prev.isSecret && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
          }
          return { label: '', secondsLeft: 0, isSecret: false };
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [clipboardState.secondsLeft]);

  const addLog = useCallback(
    (level: DiagnosticLogEntry['level'], source: string, message: string) => {
      const entry: DiagnosticLogEntry = {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: formatTimeNow(),
        level,
        source,
        message,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 120));
    },
    []
  );

  const createSafetySnapshot = useCallback(
    (reason: string) => {
      const snap: BackupSnapshot = {
        id: `bak-safe-${Date.now()}`,
        label: `Страховочная копия: ${reason}`,
        createdAt: `Сегодня, ${formatTimeNow().slice(0, 5)}`,
        sizeLabel: '42.8 МБ',
        kind: 'safety',
        encrypted: true,
      };
      setBackups((prev) => [snap, ...prev]);
      addLog('info', 'SafetySnapshot', `Создана авто-страховка: ${reason}`);
    },
    [addLog]
  );

  const handleCopyToClipboard = useCallback(
    (value: string, label: string, isSecret = false) => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(value).catch(() => {});
      }
      setClipboardState({
        label,
        secondsLeft: isSecret ? 20 : 4,
        isSecret,
      });
      if (isSecret) {
        addLog('info', 'ClipboardGuard', `Секрет скопирован («${label}») — автоочистка через 20 сек.`);
      }
    },
    [addLog]
  );

  const handleTriggerSync = useCallback(() => {
    if (isSyncing) return;
    setIsSyncing(true);
    addLog('info', 'Sync', `Шифрование изменённых блоков перед отправкой (${settings.syncEndpoint})`);
    setTimeout(() => {
      const nowShort = formatTimeNow().slice(0, 5);
      setIsSyncing(false);
      setLastSyncLabel(nowShort);
      addLog(
        'success',
        'Sync',
        `Синхронизация завершена (${nowShort}). Сервер получил только закрытые файлы .asrb.`
      );
    }, 950);
  }, [isSyncing, settings.syncEndpoint, addLog]);

  const handleCreateNote = useCallback(
    (folderId: string) => {
      const created: Note = {
        id: `n-${Date.now()}`,
        title: 'Новая заметка',
        folderId,
        tags: ['новое'],
        isFavorite: false,
        isPinned: false,
        updatedAt: 'Только что',
        trashedAt: null,
        blocks: [
          {
            id: `b-${Date.now()}`,
            type: 'markdown',
            content: 'Начните писать текст или добавьте чек-лист, таблицу с формулами, голос либо события `.ics` ниже.',
          },
        ],
        versions: [],
      };
      setNotes((prev) => [created, ...prev]);
      setSelectedNoteId(created.id);
      setActiveModule('notes');
      addLog('info', 'Notes', 'Создана новая зашифрованная заметка');
    },
    [addLog]
  );

  const handleUpdateNote = useCallback(
    (updated: Note, logSummary?: string) => {
      setNotes((prev) => {
        const exists = prev.some((n) => n.id === updated.id);
        return exists
          ? prev.map((n) => (n.id === updated.id ? updated : n))
          : [updated, ...prev];
      });
      if (logSummary) addLog('info', 'Notes', logSummary);
    },
    [addLog]
  );

  const handleAddEventFromIcs = useCallback(
    (ics: EmbeddedIcsEvent) => {
      const ev: CalendarEvent = {
        id: `ev-ics-${Date.now()}`,
        calendarId: calendars[0]?.id || 'cal-personal',
        title: ics.title,
        date: ics.date,
        startTime: ics.time,
        endTime: `${String(Math.min(23, Number(ics.time.split(':')[0]) + 1)).padStart(2, '0')}:${ics.time.split(':')[1] || '00'}`,
        location: ics.location,
        recurrence: 'none',
        reminderMinutes: 15,
        linkedNoteId: selectedNoteId || undefined,
      };
      setEvents((prev) => [ev, ...prev]);
      addLog('success', 'Calendar', `Событие «${ics.title}» добавлено из заметки (.ics)`);
    },
    [calendars, selectedNoteId, addLog]
  );

  const handleConvertMessageToNote = useCallback(
    (groupName: string, msg: ChatMessage) => {
      const created: Note = {
        id: `n-chat-${Date.now()}`,
        title: `Из чата «${groupName}» (${msg.author})`,
        folderId: folders[0]?.id || 'f-personal',
        tags: ['чат', 'группа'],
        isFavorite: false,
        isPinned: false,
        updatedAt: 'Только что',
        trashedAt: null,
        blocks: [
          {
            id: `b-chat-${Date.now()}`,
            type: 'markdown',
            content: `**Источник:** Закрытая группа «${groupName}» · ${msg.author} (${msg.time})\n\n${msg.text}`,
          },
        ],
        versions: [],
      };
      setNotes((prev) => [created, ...prev]);
      setSelectedNoteId(created.id);
      addLog('success', 'Shared → Notes', `Из сообщения чата создана заметка «${created.title}»`);
    },
    [folders, addLog]
  );

  const handleConvertMessageToEvent = useCallback(
    (groupName: string, msg: ChatMessage) => {
      const ev: CalendarEvent = {
        id: `ev-chat-${Date.now()}`,
        calendarId: calendars[0]?.id || 'cal-personal',
        title: msg.text.length > 52 ? `${msg.text.slice(0, 52)}…` : msg.text,
        date: getTodayIso(),
        startTime: '16:00',
        endTime: '17:00',
        location: `Из чата «${groupName}»`,
        recurrence: 'none',
        reminderMinutes: 15,
      };
      setEvents((prev) => [ev, ...prev]);
      addLog('success', 'Shared → Calendar', `Из сообщения чата создано событие на ${ev.date}`);
    },
    [calendars, addLog]
  );

  const handleCreateNoteFromDictation = useCallback(
    (text: string) => {
      const created: Note = {
        id: `n-voice-${Date.now()}`,
        title: `Диктовка (${formatTimeNow().slice(0, 5)})`,
        folderId: folders[0]?.id || 'f-personal',
        tags: ['диктовка'],
        isFavorite: false,
        isPinned: false,
        updatedAt: 'Только что',
        trashedAt: null,
        blocks: [
          {
            id: `b-v-${Date.now()}`,
            type: 'markdown',
            content: text,
          },
        ],
        versions: [],
      };
      setNotes((prev) => [created, ...prev]);
      setSelectedNoteId(created.id);
      setActiveModule('notes');
      addLog('success', 'VoiceDictation', 'Создана заметка из голосовой диктовки');
    },
    [folders, addLog]
  );

  const handleTriggerReminder = useCallback(
    (ev: CalendarEvent) => {
      playReminderChime();
      setActiveReminder(ev);
      addLog('info', 'Reminder', `Сработало напоминание: «${ev.title}» (${ev.startTime})`);
    },
    [addLog]
  );

  const handleToggleModule = (id: ModuleId) => {
    setSettings((prev) => {
      const next = { ...prev.enabledModules, [id]: !prev.enabledModules[id] };
      if (!next[activeModule]) {
        const fallback = (Object.keys(next) as ModuleId[]).find((k) => next[k]);
        if (fallback) setActiveModule(fallback);
      }
      return { ...prev, enabledModules: next };
    });
    addLog('info', 'Modules', `Состояние модуля «${id}» переключено`);
  };

  const enabledNavModules = NAV_MODULES.filter((m) => settings.enabledModules[m.id]);
  const pinnedNotes = useMemo(
    () => notes.filter((n) => !n.trashedAt && n.isPinned),
    [notes]
  );

  const unlockedEntriesForSearch = useMemo(
    () =>
      entries.filter((e) => {
        const v = vaults.find((vt) => vt.id === e.vaultId);
        return v && (unlockedVaultIds[v.id] || v.rememberMode === 'autologin');
      }),
    [entries, vaults, unlockedVaultIds]
  );

  // On actual mobile viewports (<768px), render native full-screen Android mode directly
  if (isNarrowViewport) {
    return (
      <>
        <AndroidMobileView
          settings={settings}
          onToggleTheme={() =>
            setSettings((prev) => ({
              ...prev,
              theme: prev.theme === 'dark' ? 'light' : 'dark',
            }))
          }
          notes={notes}
          folders={folders}
          onCreateNote={handleCreateNote}
          onUpdateNote={handleUpdateNote}
          vaults={vaults}
          entries={entries}
          unlockedVaultIds={unlockedVaultIds}
          onUnlockVault={(id) => setUnlockedVaultIds((prev) => ({ ...prev, [id]: true }))}
          onLockVault={(id) => setUnlockedVaultIds((prev) => ({ ...prev, [id]: false }))}
          onCopySecret={(val, label) => handleCopyToClipboard(val, label, true)}
          calendars={calendars}
          events={events}
          onTriggerReminder={handleTriggerReminder}
          groups={groups}
          onUpdateGroup={(g) => setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))}
          onConvertMessageToNote={handleConvertMessageToNote}
          onConvertMessageToEvent={handleConvertMessageToEvent}
          androidBackupItems={androidBackupItems}
          onRunAndroidBackupNow={() => {
            setAndroidBackupItems((prev) =>
              prev.map((i) => (i.enabled ? { ...i, lastBackup: 'Только что' } : i))
            );
            addLog('success', 'AndroidBackup', 'Зашифрованный бэкап телефона завершён');
          }}
          isSyncing={isSyncing}
          lastSyncLabel={lastSyncLabel}
          onTriggerSync={handleTriggerSync}
          onCreateNoteFromDictation={handleCreateNoteFromDictation}
        />
        <ReminderPopup
          event={activeReminder}
          isAndroid={true}
          onSnooze={() => {
            addLog('info', 'Reminder', 'Напоминание отложено на 10 минут');
            setActiveReminder(null);
          }}
          onDismiss={() => setActiveReminder(null)}
        />
        <ClipboardToast
          label={clipboardState.label}
          secondsLeft={clipboardState.secondsLeft}
          isSecret={clipboardState.isSecret}
          onClearNow={() => {
            navigator.clipboard?.writeText('').catch(() => {});
            setClipboardState({ label: '', secondsLeft: 0, isSecret: false });
          }}
        />
      </>
    );
  }

  // Left Navigation Sidebar block (can be placed on left OR swapped to right!)
  const leftSidebarEl = (
    <aside
      style={{ width: `${settings.leftSidebarWidth}px` }}
      className="shrink-0 flex flex-col bg-[#F6F7F9] dark:bg-[#0F141D] border-r border-slate-200 dark:border-slate-800 select-none"
    >
      {/* Quick Search Trigger */}
      <div className="p-3">
        <button
          type="button"
          onClick={() => setShowCommandPalette(true)}
          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 truncate">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>Быстрый поиск...</span>
          </span>
          <kbd className="font-mono text-[10px] text-slate-400 shrink-0">Ctrl K</kbd>
        </button>
      </div>

      {/* Modular Primary Navigation */}
      <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto">
        {enabledNavModules.map((mod) => {
          const Icon = mod.icon;
          const active = activeModule === mod.id;
          return (
            <button
              key={mod.id}
              type="button"
              onClick={() => setActiveModule(mod.id)}
              className={`w-full px-3 py-2.5 rounded-xl flex items-center justify-between text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-white dark:bg-[#192230] text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/80 dark:border-slate-700/70'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <span className="inline-flex items-center gap-2.5 truncate">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{mod.label}</span>
              </span>
              {mod.id === 'sync' && conflicts.some((c) => !c.resolved) && (
                <span className="text-[10.5px] font-mono font-semibold text-amber-600 dark:text-amber-400">
                  1
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Bottom Controls: Platform Mode, Modules, Sync */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
        {/* Windows / Android Live Workspace Preview Switcher */}
        <div className="p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 grid grid-cols-2 gap-0.5">
          <button
            type="button"
            onClick={() => setSettings((p) => ({ ...p, platformView: 'windows' }))}
            className={`py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              settings.platformView === 'windows'
                ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Windows</span>
          </button>
          <button
            type="button"
            onClick={() => setSettings((p) => ({ ...p, platformView: 'android' }))}
            className={`py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              settings.platformView === 'android'
                ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowModulesModal(true)}
          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161D29] hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-between text-slate-700 dark:text-slate-300 cursor-pointer"
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Модули</span>
          </span>
          <span className="font-mono text-[11px] tabular-nums text-slate-400">
            {enabledNavModules.length}/7
          </span>
        </button>

        {/* Quiet Sync & Portable Info */}
        <div className="px-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">
            {settings.portableMode ? 'USB Portable' : 'Локальный профиль'} · {lastSyncLabel}
          </span>
          <button
            type="button"
            onClick={handleTriggerSync}
            title="Синхронизировать сейчас"
            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>
    </aside>
  );

  // Right Calendar & Schedule Panel block
  const rightPanelEl = settings.showRightPanel ? (
    <aside
      style={{ width: `${settings.rightPanelWidth}px` }}
      className="hidden xl:flex shrink-0 flex-col border-l border-slate-200 dark:border-slate-800"
    >
      <RightCalendarPanel
        calendars={calendars}
        events={events}
        pinnedNotes={pinnedNotes}
        onOpenNote={(id) => {
          setSelectedNoteId(id);
          setActiveModule('notes');
        }}
        onOpenCalendarDay={() => setActiveModule('calendar')}
        onTriggerReminder={handleTriggerReminder}
        onQuickDictation={() => setActiveModule('tools')}
      />
    </aside>
  ) : null;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden bg-[#F6F7F9] dark:bg-[#0D1117] text-slate-900 dark:text-slate-100"
      onClick={() => openMenu && setOpenMenu(null)}
    >
      {/* WINDOWS NATIVE TOP MENU BAR (Clean 3-Zone Contract) */}
      <header className="h-11 shrink-0 px-4 bg-[#F6F7F9] dark:bg-[#0D1117] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-8 select-none z-30">
        {/* Zone 1: Single text wordmark */}
        <div className="font-display font-bold text-[15px] tracking-tight text-slate-900 dark:text-slate-50 whitespace-nowrap shrink-0">
          ASRbox
        </div>

        {/* Zone 2: 5 concise native Windows desktop dropdown menus */}
        <nav className="flex items-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300 relative">
          {/* Файл */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'file' ? null : 'file');
              }}
              className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Файл
            </button>
            {openMenu === 'file' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-8 w-56 py-1.5 rounded-xl bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 shadow-xl z-40"
              >
                <button
                  type="button"
                  onClick={() => {
                    handleCreateNote(folders[0]?.id || 'f-personal');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Новая заметка
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUnlockedVaultIds({});
                    addLog('info', 'Security', 'Все сейфы паролей немедленно заблокированы');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Заблокировать все сейфы
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettings((p) => ({ ...p, portableMode: !p.portableMode }));
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {settings.portableMode ? '✓ Портативный режим (USB)' : 'Включить портативный режим'}
                </button>
              </div>
            )}
          </div>

          {/* Вид */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'view' ? null : 'view');
              }}
              className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Вид
            </button>
            {openMenu === 'view' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-8 w-64 py-1.5 rounded-xl bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 shadow-xl z-40"
              >
                <button
                  type="button"
                  onClick={() => {
                    setSettings((p) => ({ ...p, showRightPanel: !p.showRightPanel }));
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span>Панель календаря и дня</span>
                  <PanelRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettings((p) => ({ ...p, swapColumns: !p.swapColumns }));
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                >
                  <span>Поменять колонки местами</span>
                  <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSettings((p) => ({ ...p, dockEnabled: !p.dockEnabled }));
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {settings.dockEnabled ? '✓ Док-панель у края экрана' : 'Показать док-панель'}
                </button>
                <div className="px-3.5 py-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                  <div className="text-[11px] text-slate-400 mb-1.5">Масштаб интерфейса</div>
                  <div className="grid grid-cols-5 gap-1">
                    {[85, 90, 100, 110, 120].map((z) => (
                      <button
                        key={z}
                        type="button"
                        onClick={() => setSettings((p) => ({ ...p, zoomPercent: z }))}
                        className={`py-1 rounded text-[11px] font-mono tabular-nums cursor-pointer ${
                          settings.zoomPercent === z
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {z}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Модули */}
          <button
            type="button"
            onClick={() => setShowModulesModal(true)}
            className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Модули
          </button>

          {/* Синхронизация */}
          <button
            type="button"
            onClick={() => {
              if (settings.enabledModules.sync) setActiveModule('sync');
              handleTriggerSync();
            }}
            className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Синхронизация
          </button>

          {/* Справка */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu(openMenu === 'help' ? null : 'help');
              }}
              className="py-1 hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Справка
            </button>
            {openMenu === 'help' && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-8 w-60 py-1.5 rounded-xl bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 shadow-xl z-40"
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('diagnostics');
                    setOpenMenu(null);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Окно диагностики и логов
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(STORAGE_KEY);
                    window.location.reload();
                  }}
                  className="w-full text-left px-3.5 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                >
                  Сбросить демо-данные
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Single Primary Action (Theme Switch) */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() =>
              setSettings((prev) => ({
                ...prev,
                theme: prev.theme === 'dark' ? 'light' : 'dark',
              }))
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#161D29] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {settings.theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Светлая</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span>Тёмная</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE VIEWPORT (Scaled smoothly by Zoom %) */}
      <div
        className="flex-1 flex min-h-0 overflow-hidden"
        style={{
          fontSize: `${settings.zoomPercent}%`,
        }}
      >
        {/* Left/Swapped Sidebar */}
        {!settings.swapColumns ? leftSidebarEl : rightPanelEl}

        {/* Drag Resizer Handle 1 */}
        <div
          onMouseDown={() => {
            resizingRef.current = settings.swapColumns ? 'right' : 'left';
            document.body.style.cursor = 'col-resize';
          }}
          title="Потяните, чтобы изменить ширину колонки"
          className="w-1 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500 transition-colors shrink-0"
        />

        {/* Center Content Canvas: Either Windows Active Module OR Live Android Pocket Preview */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden relative">
          {settings.platformView === 'android' ? (
            <div className="flex-1 overflow-y-auto bg-[#EEF1F5] dark:bg-[#0A0E14] flex flex-col items-center justify-center p-6 gap-4">
              <div className="text-center max-w-md space-y-1">
                <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                  Карманный режим Android (общая живая база с Windows)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Любое изменение здесь мгновенно отражается на десктопе. Нижняя навигация адаптирована под большой палец.
                </p>
              </div>
              <AndroidMobileView
                isEmbeddedPreview={true}
                settings={settings}
                onToggleTheme={() =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: prev.theme === 'dark' ? 'light' : 'dark',
                  }))
                }
                notes={notes}
                folders={folders}
                onCreateNote={handleCreateNote}
                onUpdateNote={handleUpdateNote}
                vaults={vaults}
                entries={entries}
                unlockedVaultIds={unlockedVaultIds}
                onUnlockVault={(id) => setUnlockedVaultIds((prev) => ({ ...prev, [id]: true }))}
                onLockVault={(id) => setUnlockedVaultIds((prev) => ({ ...prev, [id]: false }))}
                onCopySecret={(val, label) => handleCopyToClipboard(val, label, true)}
                calendars={calendars}
                events={events}
                onTriggerReminder={handleTriggerReminder}
                groups={groups}
                onUpdateGroup={(g) =>
                  setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))
                }
                onConvertMessageToNote={handleConvertMessageToNote}
                onConvertMessageToEvent={handleConvertMessageToEvent}
                androidBackupItems={androidBackupItems}
                onRunAndroidBackupNow={() => {
                  setAndroidBackupItems((prev) =>
                    prev.map((i) => (i.enabled ? { ...i, lastBackup: 'Только что' } : i))
                  );
                  addLog('success', 'AndroidBackup', 'Выполнен зашифрованный бэкап контактов, звонков и SMS');
                }}
                isSyncing={isSyncing}
                lastSyncLabel={lastSyncLabel}
                onTriggerSync={handleTriggerSync}
                onCreateNoteFromDictation={handleCreateNoteFromDictation}
              />
            </div>
          ) : (
            <>
              {activeModule === 'notes' && (
                <NotesModule
                  notes={notes}
                  folders={folders}
                  selectedNoteId={selectedNoteId}
                  onSelectNote={setSelectedNoteId}
                  onUpdateNote={handleUpdateNote}
                  onCreateNote={handleCreateNote}
                  onCreateFolder={(name, parentId) => {
                    setFolders((prev) => [
                      ...prev,
                      { id: `f-${Date.now()}`, name, parentId },
                    ]);
                    addLog('info', 'Notes', `Создана папка «${name}»`);
                  }}
                  onTrashNote={(id) => {
                    setNotes((prev) =>
                      prev.map((n) =>
                        n.id === id
                          ? { ...n, trashedAt: 'Удалено только что · осталось 30 дн.' }
                          : n
                      )
                    );
                    addLog('info', 'Notes', 'Заметка перемещена в корзину на 30 дней');
                  }}
                  onRestoreNote={(id) => {
                    setNotes((prev) =>
                      prev.map((n) => (n.id === id ? { ...n, trashedAt: null } : n))
                    );
                    addLog('success', 'Notes', 'Заметка восстановлена из корзины');
                  }}
                  onDeleteNotePermanently={(id) => {
                    createSafetySnapshot('Перед безвозвратным удалением заметки');
                    setNotes((prev) => prev.filter((n) => n.id !== id));
                  }}
                  onAddEventFromIcs={handleAddEventFromIcs}
                  onContextMenu={(e, items) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, items });
                  }}
                  onLog={addLog}
                  onCreateSafetySnapshot={createSafetySnapshot}
                />
              )}

              {activeModule === 'passwords' && (
                <PasswordsModule
                  vaults={vaults}
                  entries={entries}
                  unlockedVaultIds={unlockedVaultIds}
                  onUnlockVault={(id) => {
                    setUnlockedVaultIds((prev) => ({ ...prev, [id]: true }));
                    addLog('success', 'Vault', 'Изолированный сейф разблокирован');
                  }}
                  onLockVault={(id) => {
                    setUnlockedVaultIds((prev) => ({ ...prev, [id]: false }));
                    addLog('info', 'Vault', 'Сейф заблокирован, ключи очищены из памяти');
                  }}
                  onUpdateVault={(updated) =>
                    setVaults((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
                  }
                  onCreateVault={(name, masterPassword, hint) => {
                    const created: PasswordVault = {
                      id: `v-${Date.now()}`,
                      name,
                      masterPassword,
                      hint,
                      autoLockMinutes: 5,
                      lockOnMinimize: true,
                      rememberMode: 'none',
                      globalSort: 'title',
                      folderSorts: {},
                      failedAttempts: 0,
                      lockedUntil: null,
                      folders: ['Все', 'Личное', 'Документы'],
                    };
                    setVaults((prev) => [...prev, created]);
                    setUnlockedVaultIds((prev) => ({ ...prev, [created.id]: true }));
                    addLog('success', 'Vault', `Создан новый изолированный сейф «${name}»`);
                  }}
                  onUpsertEntry={(entry, isNew) => {
                    setEntries((prev) =>
                      isNew ? [entry, ...prev] : prev.map((e) => (e.id === entry.id ? entry : e))
                    );
                  }}
                  onDeleteEntriesPermanently={(ids) => {
                    createSafetySnapshot('Перед удалением записей из корзины сейфа');
                    setEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
                  }}
                  onCopySecret={(val, label) => handleCopyToClipboard(val, label, true)}
                  onCreateSafetySnapshot={createSafetySnapshot}
                  onLog={addLog}
                />
              )}

              {activeModule === 'calendar' && (
                <CalendarModule
                  calendars={calendars}
                  events={events}
                  notes={notes}
                  onToggleCalendar={(id) =>
                    setCalendars((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c))
                    )
                  }
                  onAddCalendar={(cal) => {
                    setCalendars((prev) => [...prev, cal]);
                    addLog('success', 'Calendar', `Подключён календарь «${cal.name}»`);
                  }}
                  onUpsertEvent={(ev, isNew) => {
                    setEvents((prev) =>
                      isNew ? [ev, ...prev] : prev.map((e) => (e.id === ev.id ? ev : e))
                    );
                    addLog('info', 'Calendar', `${isNew ? 'Создано' : 'Обновлено'} событие «${ev.title}»`);
                  }}
                  onDeleteEvent={(id) => {
                    setEvents((prev) => prev.filter((e) => e.id !== id));
                    addLog('info', 'Calendar', 'Событие удалено из календаря');
                  }}
                  onOpenLinkedNote={(noteId) => {
                    setSelectedNoteId(noteId);
                    setActiveModule('notes');
                  }}
                  onTriggerReminder={handleTriggerReminder}
                  onLog={addLog}
                />
              )}

              {activeModule === 'shared' && (
                <SharedModule
                  groups={groups}
                  onUpdateGroup={(g) =>
                    setGroups((prev) => prev.map((x) => (x.id === g.id ? g : x)))
                  }
                  onCreateGroup={(name, description) => {
                    const seg = () =>
                      Math.floor(0x1000 + Math.random() * 0xefff)
                        .toString(16)
                        .toUpperCase();
                    const created: SharedGroup = {
                      id: `grp-${Date.now()}`,
                      name,
                      description,
                      keyFingerprint: `E2EE-${seg()}-${seg()}-${seg()}-${seg()}`,
                      members: [{ name: 'Вы (Владелец)', role: 'editor' }],
                      invites: [],
                      notes: [
                        {
                          id: `sn-${Date.now()}`,
                          title: 'Добро пожаловать в защищённую группу',
                          author: 'Вы',
                          updatedAt: 'Только что',
                          content: 'Все заметки и сообщения в этой группе шифруются отдельным групповым ключом.',
                          comments: [],
                        },
                      ],
                      messages: [],
                    };
                    setGroups((prev) => [...prev, created]);
                    addLog('success', 'SharedGroups', `Создана E2EE-группа «${name}»`);
                  }}
                  onConvertMessageToNote={handleConvertMessageToNote}
                  onConvertMessageToEvent={handleConvertMessageToEvent}
                  onCopyText={(val, label) => handleCopyToClipboard(val, label, false)}
                  onLog={addLog}
                />
              )}

              {activeModule === 'sync' && (
                <SyncModule
                  settings={settings}
                  onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                  conflicts={conflicts}
                  onResolveConflict={(id, strategy) => {
                    setConflicts((prev) =>
                      prev.map((c) => (c.id === id ? { ...c, resolved: true } : c))
                    );
                    addLog(
                      'success',
                      'SmartMerge',
                      strategy === 'merge_both'
                        ? 'Конфликт решён: объединены обе правки Windows и Android без потерь'
                        : `Конфликт решён (${strategy})`
                    );
                  }}
                  backups={backups}
                  onCreateBackup={(label, kind) => {
                    const snap: BackupSnapshot = {
                      id: `bak-${Date.now()}`,
                      label,
                      createdAt: `Сегодня, ${formatTimeNow().slice(0, 5)}`,
                      sizeLabel: '43.1 МБ',
                      kind,
                      encrypted: true,
                    };
                    setBackups((prev) => [snap, ...prev]);
                    addLog('success', 'Backup', `Создан зашифрованный бэкап: ${label}`);
                  }}
                  onRestoreBackup={(id) => {
                    const target = backups.find((b) => b.id === id);
                    if (!target) return;
                    createSafetySnapshot(`Перед восстановлением «${target.label}»`);
                    addLog('success', 'Backup', `Восстановление из копии «${target.label}» выполнено`);
                  }}
                  autoUploadFolders={autoUploadFolders}
                  onToggleAutoUpload={(id) =>
                    setAutoUploadFolders((prev) =>
                      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
                    )
                  }
                  onAddAutoUploadFolder={(localPath, remoteTarget) => {
                    setAutoUploadFolders((prev) => [
                      ...prev,
                      {
                        id: `au-${Date.now()}`,
                        localPath,
                        remoteTarget,
                        enabled: true,
                        lastUploaded: 'Ожидает выгрузки',
                      },
                    ]);
                    addLog('info', 'AutoUpload', `Добавлена папка автовыгрузки: ${localPath}`);
                  }}
                  androidBackupItems={androidBackupItems}
                  onToggleAndroidBackup={(id) =>
                    setAndroidBackupItems((prev) =>
                      prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i))
                    )
                  }
                  onRunAndroidBackupNow={() => {
                    setAndroidBackupItems((prev) =>
                      prev.map((i) => (i.enabled ? { ...i, lastBackup: 'Только что' } : i))
                    );
                    addLog('success', 'AndroidBackup', 'Зашифрованный бэкап контактов, звонков и SMS завершён');
                  }}
                  isSyncing={isSyncing}
                  lastSyncLabel={lastSyncLabel}
                  onTriggerSync={handleTriggerSync}
                  onLog={addLog}
                />
              )}

              {(activeModule === 'tools' || activeModule === 'diagnostics') && (
                <ToolsModule
                  initialTab={activeModule === 'diagnostics' ? 'diagnostics' : 'dictation'}
                  settings={settings}
                  onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
                  keyRemaps={keyRemaps}
                  onUpsertRemap={(remap) => {
                    setKeyRemaps((prev) => {
                      const exists = prev.some((r) => r.id === remap.id);
                      return exists
                        ? prev.map((r) => (r.id === remap.id ? remap : r))
                        : [remap, ...prev];
                    });
                    addLog('info', 'KeyRemapper', `Клавиша ${remap.fromKeys} → ${remap.toAction}`);
                  }}
                  onDeleteRemap={(id) => setKeyRemaps((prev) => prev.filter((r) => r.id !== id))}
                  dockShortcuts={dockShortcuts}
                  onAddDockShortcut={(s) => {
                    setDockShortcuts((prev) => [...prev, s]);
                    addLog('info', 'RocketDock', `Добавлен ярлык в док-панель: ${s.label}`);
                  }}
                  onDeleteDockShortcut={(id) =>
                    setDockShortcuts((prev) => prev.filter((s) => s.id !== id))
                  }
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                  onCopyToClipboard={(text, label) => handleCopyToClipboard(text, label, false)}
                  onCreateNoteFromDictation={handleCreateNoteFromDictation}
                  onLog={addLog}
                />
              )}
            </>
          )}
        </main>

        {/* Drag Resizer Handle 2 */}
        {settings.showRightPanel && (
          <div
            onMouseDown={() => {
              resizingRef.current = settings.swapColumns ? 'left' : 'right';
              document.body.style.cursor = 'col-resize';
            }}
            title="Потяните, чтобы изменить ширину панели"
            className="hidden xl:block w-1 cursor-col-resize hover:bg-blue-500/40 active:bg-blue-500 transition-colors shrink-0"
          />
        )}

        {/* Right/Swapped Calendar & Schedule Panel */}
        {!settings.swapColumns ? rightPanelEl : leftSidebarEl}
      </div>

      {/* RocketDock Floating Edge Panel (Windows Desktop Mode) */}
      {settings.platformView === 'windows' &&
        settings.dockEnabled &&
        settings.enabledModules.tools && (
          <RocketDock
            shortcuts={dockShortcuts}
            position={settings.dockPosition}
            maxScale={settings.dockScale}
            onLaunch={(item) => {
              if (item.actionType === 'module' && item.moduleTarget) {
                if (settings.enabledModules[item.moduleTarget]) {
                  setActiveModule(item.moduleTarget);
                }
              } else if (item.actionType === 'dictation') {
                setActiveModule('tools');
                addLog('info', 'RocketDock', 'Запущен модуль быстрой голосовой диктовки');
              } else {
                addLog('info', 'RocketDock', `Быстрый запуск: ${item.label} (${item.target})`);
                handleCopyToClipboard(item.target, `Путь «${item.label}»`, false);
              }
            }}
          />
        )}

      {/* Global Modals & Overlays */}
      <ModulesManagerModal
        open={showModulesModal}
        settings={settings}
        onToggleModule={handleToggleModule}
        onTogglePortable={() =>
          setSettings((p) => ({ ...p, portableMode: !p.portableMode }))
        }
        onClose={() => setShowModulesModal(false)}
      />

      <CommandPaletteModal
        open={showCommandPalette}
        notes={notes}
        events={events}
        unlockedEntries={unlockedEntriesForSearch}
        onJumpNote={(id) => {
          setSelectedNoteId(id);
          setActiveModule('notes');
        }}
        onJumpCalendar={() => setActiveModule('calendar')}
        onJumpPasswords={() => setActiveModule('passwords')}
        onClose={() => setShowCommandPalette(false)}
      />

      <ContextMenuOverlay
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
      />

      <ReminderPopup
        event={activeReminder}
        isAndroid={settings.platformView === 'android'}
        onSnooze={() => {
          addLog('info', 'Reminder', 'Напоминание отложено на 10 минут');
          setActiveReminder(null);
        }}
        onDismiss={() => setActiveReminder(null)}
      />

      <ClipboardToast
        label={clipboardState.label}
        secondsLeft={clipboardState.secondsLeft}
        isSecret={clipboardState.isSecret}
        onClearNow={() => {
          navigator.clipboard?.writeText('').catch(() => {});
          setClipboardState({ label: '', secondsLeft: 0, isSecret: false });
        }}
      />
    </div>
  );
}
