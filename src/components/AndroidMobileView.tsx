import React, { useState } from 'react';
import {
  BellRing,
  Calendar,
  Cloud,
  Copy,
  FileText,
  Fingerprint,
  KeyRound,
  Lock,
  Mic,
  Moon,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Smartphone,
  Sun,
  Users,
} from 'lucide-react';
import {
  AndroidBackupItem,
  AppSettings,
  CalendarEvent,
  CalendarSource,
  ChatMessage,
  ModuleId,
  Note,
  NoteFolder,
  PasswordEntry,
  PasswordVault,
  SharedGroup,
} from '../types/asrbox';
import { evaluateCellDisplay } from '../utils/formulaEngine';
import { getTodayIso } from '../utils/cryptoHelpers';

interface AndroidMobileViewProps {
  settings: AppSettings;
  onToggleTheme: () => void;
  notes: Note[];
  folders: NoteFolder[];
  onCreateNote: (folderId: string) => void;
  onUpdateNote: (note: Note) => void;
  vaults: PasswordVault[];
  entries: PasswordEntry[];
  unlockedVaultIds: Record<string, boolean>;
  onUnlockVault: (id: string) => void;
  onLockVault: (id: string) => void;
  onCopySecret: (value: string, label: string) => void;
  calendars: CalendarSource[];
  events: CalendarEvent[];
  onTriggerReminder: (ev: CalendarEvent) => void;
  groups: SharedGroup[];
  onUpdateGroup: (group: SharedGroup) => void;
  onConvertMessageToNote: (groupName: string, msg: ChatMessage) => void;
  onConvertMessageToEvent: (groupName: string, msg: ChatMessage) => void;
  androidBackupItems: AndroidBackupItem[];
  onRunAndroidBackupNow: () => void;
  isSyncing: boolean;
  lastSyncLabel: string;
  onTriggerSync: () => void;
  onCreateNoteFromDictation: (text: string) => void;
  isEmbeddedPreview?: boolean;
}

export const AndroidMobileView: React.FC<AndroidMobileViewProps> = ({
  settings,
  onToggleTheme,
  notes,
  folders,
  onCreateNote,
  vaults,
  entries,
  unlockedVaultIds,
  onUnlockVault,
  onLockVault,
  onCopySecret,
  calendars,
  events,
  onTriggerReminder,
  groups,
  onUpdateGroup,
  onConvertMessageToNote,
  onConvertMessageToEvent,
  androidBackupItems,
  onRunAndroidBackupNow,
  isSyncing,
  lastSyncLabel,
  onTriggerSync,
  onCreateNoteFromDictation,
  isEmbeddedPreview = false,
}) => {
  const [activeTab, setActiveTab] = useState<'notes' | 'passwords' | 'calendar' | 'shared' | 'sync'>('notes');
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeVaultId, setActiveVaultId] = useState<string>(vaults[0]?.id || 'v-personal');
  const [chatText, setChatText] = useState('');
  const [dictating, setDictating] = useState(false);

  const visibleNotes = notes.filter((n) => !n.trashedAt);
  const openNote = visibleNotes.find((n) => n.id === selectedNoteId) || null;
  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const vaultUnlocked = Boolean(
    activeVault && (unlockedVaultIds[activeVault.id] || activeVault.rememberMode === 'autologin')
  );
  const vaultEntries = entries.filter((e) => e.vaultId === activeVault?.id && !e.trashed);
  const activeGroup = groups[0];
  const todayIso = getTodayIso();

  const handleQuickVoice = () => {
    setDictating(true);
    setTimeout(() => {
      setDictating(false);
      onCreateNoteFromDictation(
        'Голосовая заметка с Android: забрать ключи от объекта после 18:00 и проверить резервную копию контактов.'
      );
      setActiveTab('notes');
    }, 950);
  };

  const navItems: { id: 'notes' | 'passwords' | 'calendar' | 'shared' | 'sync'; label: string; icon: React.ComponentType<{ className?: string }>; mod: ModuleId }[] = [
    { id: 'notes', label: 'Заметки', icon: FileText, mod: 'notes' },
    { id: 'passwords', label: 'Сейфы', icon: KeyRound, mod: 'passwords' },
    { id: 'calendar', label: 'План', icon: Calendar, mod: 'calendar' },
    { id: 'shared', label: 'Чат', icon: Users, mod: 'shared' },
    { id: 'sync', label: 'Облако', icon: Cloud, mod: 'sync' },
  ];

  const enabledNavItems = navItems.filter((item) => settings.enabledModules[item.mod]);

  return (
    <div
      className={`flex flex-col bg-[#F6F7F9] dark:bg-[#0D1117] text-slate-900 dark:text-slate-100 overflow-hidden ${
        isEmbeddedPreview
          ? 'w-[404px] h-[780px] rounded-[34px] border-[6px] border-slate-900 dark:border-slate-700 shadow-2xl mx-auto'
          : 'h-[100dvh] w-full'
      }`}
    >
      {/* Subtle Android Top App Bar + Unobtrusive Sync Status Strip */}
      <div className="shrink-0 bg-white/90 dark:bg-[#141A23]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 h-12 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-50">
              ASRbox
            </span>
            <span className="text-[11px] text-slate-400">· Android</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleQuickVoice}
              title="Быстрая голосовая диктовка"
              className={`min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                dictating
                  ? 'bg-red-600 text-white'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Mic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleTheme}
              title="Сменить тему"
              className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {settings.theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {/* Unobtrusive Sync Strip */}
        <button
          type="button"
          onClick={onTriggerSync}
          className="w-full px-4 py-1.5 bg-slate-50 dark:bg-[#11161F] border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer"
        >
          <span className="truncate">
            {isSyncing
              ? 'Шифрование и синхронизация WebDAV...'
              : `Зашифровано · Синхр.: ${lastSyncLabel}`}
          </span>
          <RefreshCw className={`w-3 h-3 shrink-0 ml-2 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Scrollable Mobile Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* MOBILE NOTES */}
        {activeTab === 'notes' && (
          openNote ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedNoteId(null)}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 min-h-[36px] inline-flex items-center cursor-pointer"
              >
                ← Все заметки
              </button>
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-50">
                {openNote.title}
              </h2>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {folders.find((f) => f.id === openNote.folderId)?.name} · {openNote.updatedAt}
              </div>
              <div className="space-y-3">
                {openNote.blocks.map((b) => {
                  if (b.type === 'markdown') {
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap"
                      >
                        {b.content.replace(/\*\*/g, '')}
                      </div>
                    );
                  }
                  if (b.type === 'spreadsheet') {
                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 overflow-x-auto"
                      >
                        <div className="px-3.5 py-2 text-xs font-semibold border-b border-slate-200 dark:border-slate-800">
                          {b.title}
                        </div>
                        <table className="w-full text-[11px] tabular-nums">
                          <tbody>
                            {b.data.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="border-b last:border-b-0 border-slate-100 dark:border-slate-800">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className={`px-2.5 py-2 ${cIdx === 0 ? 'text-left' : 'text-right font-mono'}`}
                                  >
                                    {evaluateCellDisplay(cell, b.data.rows, rIdx, cIdx)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (b.type === 'checklist') {
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 space-y-2"
                      >
                        <div className="text-xs font-semibold">{b.title}</div>
                        {b.items.map((item) => (
                          <div key={item.id} className="text-xs flex items-center gap-2">
                            <span>{item.done ? '☑' : '☐'}</span>
                            <span className={item.done ? 'line-through text-slate-400' : ''}>
                              {item.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  if (b.type === 'voice') {
                    return (
                      <div
                        key={b.id}
                        className="p-3.5 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="text-xs font-semibold">{b.title}</div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {b.data.transcript}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-display font-bold">Заметки и таблицы</h2>
                <button
                  type="button"
                  onClick={() => onCreateNote(folders[0]?.id || 'f-personal')}
                  className="min-h-[40px] px-3.5 rounded-xl bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Создать</span>
                </button>
              </div>
              {visibleNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedNoteId(note.id)}
                  className="w-full text-left p-4 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 active:scale-[0.99] transition-transform cursor-pointer space-y-1.5"
                >
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {note.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {folders.find((f) => f.id === note.folderId)?.name} · {note.updatedAt} · {note.blocks.length} бл.
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* MOBILE PASSWORDS */}
        {activeTab === 'passwords' && activeVault && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {vaults.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setActiveVaultId(v.id)}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-medium whitespace-nowrap cursor-pointer ${
                    v.id === activeVault.id
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>

            {!vaultUnlocked ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 text-center space-y-4">
                <Lock className="w-8 h-8 mx-auto text-slate-400" />
                <div>
                  <h3 className="text-base font-display font-bold">{activeVault.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{activeVault.hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onUnlockVault(activeVault.id)}
                  className="w-full min-h-[48px] rounded-xl bg-blue-600 text-white text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>Разблокировать отпечатком</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span>Автозаполнение Android активно</span>
                  <button
                    type="button"
                    onClick={() => onLockVault(activeVault.id)}
                    className="text-red-600 dark:text-red-400 font-medium cursor-pointer"
                  >
                    Закрыть сейф
                  </button>
                </div>
                {vaultEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{entry.title}</div>
                      <div className="text-xs text-slate-500 truncate">{entry.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopySecret(entry.password, `Пароль «${entry.title}»`)}
                      className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MOBILE CALENDAR */}
        {activeTab === 'calendar' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-display font-bold">Ближайшие события</h2>
              <span className="text-xs text-slate-500 tabular-nums">{todayIso}</span>
            </div>
            {events.map((ev) => {
              const color = calendars.find((c) => c.id === ev.calendarId)?.color || '#2563EB';
              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-slate-500">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>
                        {ev.date} · {ev.startTime}
                      </span>
                    </div>
                    <div className="text-sm font-semibold">{ev.title}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerReminder(ev)}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer shrink-0"
                    title="Проверить системный будильник"
                  >
                    <BellRing className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* MOBILE SHARED CHAT */}
        {activeTab === 'shared' && activeGroup && (
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-display font-bold">{activeGroup.name}</h2>
              <p className="text-[11px] font-mono text-slate-500">{activeGroup.keyFingerprint}</p>
            </div>
            <div className="space-y-2.5">
              {activeGroup.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                    m.isMe
                      ? 'bg-blue-600 text-white ml-8'
                      : 'bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 mr-6'
                  }`}
                >
                  {!m.isMe && <div className="font-semibold">{m.author}</div>}
                  <p className="leading-relaxed">{m.text}</p>
                  <div className="flex items-center gap-2 pt-1 text-[10.5px] opacity-85">
                    <button
                      type="button"
                      onClick={() => onConvertMessageToNote(activeGroup.name, m)}
                      className="underline cursor-pointer"
                    >
                      В заметку
                    </button>
                    <span>·</span>
                    <button
                      type="button"
                      onClick={() => onConvertMessageToEvent(activeGroup.name, m)}
                      className="underline cursor-pointer"
                    >
                      В календарь
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!chatText.trim()) return;
                onUpdateGroup({
                  ...activeGroup,
                  messages: [
                    ...activeGroup.messages,
                    {
                      id: `m-mob-${Date.now()}`,
                      author: 'Вы',
                      isMe: true,
                      time: 'Сейчас',
                      text: chatText.trim(),
                      convertedTo: null,
                    },
                  ],
                });
                setChatText('');
              }}
              className="flex items-center gap-2 pt-2"
            >
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Зашифрованное сообщение..."
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 text-xs focus:outline-none"
              />
              <button
                type="submit"
                className="min-h-[44px] min-w-[44px] rounded-xl bg-blue-600 text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* MOBILE SYNC & PHONE BACKUP */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Облако WebDAV (E2EE)</span>
              </div>
              <div className="font-mono text-[11px] text-slate-500 break-all">
                {settings.syncEndpoint}
              </div>
              <button
                type="button"
                onClick={onTriggerSync}
                className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white text-xs font-medium cursor-pointer"
              >
                {isSyncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#141A23] border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold inline-flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span>Бэкап телефона</span>
                </span>
                <button
                  type="button"
                  onClick={onRunAndroidBackupNow}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {androidBackupItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.countLabel}</div>
                    </div>
                    <span className="text-[11px] text-slate-400 tabular-nums">{item.lastBackup}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Android Natural Thumb-Zone Bottom Navigation Bar */}
      <nav className="shrink-0 h-16 bg-white/95 dark:bg-[#141A23]/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center px-1">
        {enabledNavItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                setSelectedNoteId(null);
              }}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                active
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10.5px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
