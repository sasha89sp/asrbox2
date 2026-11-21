import React, { useMemo, useState } from 'react';
import {
  Activity,
  BellRing,
  Calendar,
  Cloud,
  FileText,
  HardDrive,
  KeyRound,
  Search,
  Shield,
  Sliders,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import {
  AppSettings,
  CalendarEvent,
  ModuleId,
  Note,
  PasswordEntry,
} from '../types/asrbox';

export interface ContextMenuState {
  x: number;
  y: number;
  items: { label: string; onClick: () => void; danger?: boolean }[];
}

/* 1. CUSTOM RIGHT-CLICK CONTEXT MENU */
export const ContextMenuOverlay: React.FC<{
  menu: ContextMenuState | null;
  onClose: () => void;
}> = ({ menu, onClose }) => {
  if (!menu) return null;
  return (
    <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }}>
      <div
        style={{
          top: Math.min(menu.y, window.innerHeight - 180),
          left: Math.min(menu.x, window.innerWidth - 220),
        }}
        onClick={(e) => e.stopPropagation()}
        className="fixed min-w-[200px] py-1.5 rounded-xl bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 shadow-xl text-xs"
      >
        {menu.items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full text-left px-3.5 py-2 transition-colors cursor-pointer ${
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* 2. MODULAR ARCHITECTURE SWITCHBOARD MODAL */
const MODULE_META: { id: ModuleId; name: string; desc: string; ram: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'notes', name: 'Заметки и таблицы', desc: 'Конструктор Markdown, формулы Excel, голос, вложения и .ics', ram: '14 МБ', icon: FileText },
  { id: 'passwords', name: 'Сейфы паролей', desc: 'Изолированные хранилища, генератор, аудит и автоочистка буфера', ram: '8 МБ', icon: KeyRound },
  { id: 'calendar', name: 'Календарь и напоминания', desc: 'Локальные календари, Google, iCal и будильники поверх окон', ram: '9 МБ', icon: Calendar },
  { id: 'shared', name: 'Общие папки и чат', desc: 'Закрытые E2EE-группы, приглашения с ролями и мгновенный чат', ram: '11 МБ', icon: Users },
  { id: 'sync', name: 'Синхронизация и бэкапы', desc: 'WebDAV, Google Диск, локальная папка, умное слияние и страховка', ram: '6 МБ', icon: Cloud },
  { id: 'tools', name: 'Инструменты Windows', desc: 'Голосовая диктовка, переназначение клавиш и док-панель', ram: '7 МБ', icon: Wrench },
  { id: 'diagnostics', name: 'Окно диагностики', desc: 'Живой журнал процессов, история синхронизации и ошибок', ram: '3 МБ', icon: Activity },
];

export const ModulesManagerModal: React.FC<{
  open: boolean;
  settings: AppSettings;
  onToggleModule: (id: ModuleId) => void;
  onTogglePortable: () => void;
  onClose: () => void;
}> = ({ open, settings, onToggleModule, onTogglePortable, onClose }) => {
  if (!open) return null;
  const activeCount = Object.values(settings.enabledModules).filter(Boolean).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Модульность и автономность ASRbox</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Отключённые модули не загружаются в память и не перегружают интерфейс · Активно {activeCount} из 7
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
            {MODULE_META.map((mod) => {
              const Icon = mod.icon;
              const enabled = settings.enabledModules[mod.id];
              const isLastEnabled = enabled && activeCount <= 1;
              return (
                <label
                  key={mod.id}
                  className="px-4 py-3 flex items-center justify-between gap-4 cursor-pointer hover:bg-white dark:hover:bg-[#161E2B]"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        enabled ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {mod.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {mod.desc} · <span className="font-mono tabular-nums">{enabled ? mod.ram : 'Выгружен'}</span>
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enabled}
                    disabled={isLastEnabled}
                    onChange={() => onToggleModule(mod.id)}
                    className="accent-blue-600 w-4 h-4 shrink-0 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>

          <label className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] flex items-center justify-between gap-4 cursor-pointer">
            <div className="flex items-start gap-3">
              <HardDrive className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Портативный режим Windows (запуск с USB-флешки)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  База, настройки и ключи хранятся рядом с исполняемым файлом без следов в системе.
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.portableMode}
              onChange={onTogglePortable}
              className="accent-blue-600 w-4 h-4 shrink-0"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

/* 3. GLOBAL COMMAND PALETTE (CTRL+K) */
export const CommandPaletteModal: React.FC<{
  open: boolean;
  notes: Note[];
  events: CalendarEvent[];
  unlockedEntries: PasswordEntry[];
  onJumpNote: (id: string) => void;
  onJumpCalendar: () => void;
  onJumpPasswords: () => void;
  onClose: () => void;
}> = ({
  open,
  notes,
  events,
  unlockedEntries,
  onJumpNote,
  onJumpCalendar,
  onJumpPasswords,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedNotes = notes
      .filter((n) => !n.trashedAt && (!q || n.title.toLowerCase().includes(q)))
      .slice(0, 4);
    const matchedEvents = events
      .filter((e) => !q || e.title.toLowerCase().includes(q))
      .slice(0, 3);
    const matchedPasswords = unlockedEntries
      .filter((p) => !p.trashed && (!q || p.title.toLowerCase().includes(q)))
      .slice(0, 3);
    return { matchedNotes, matchedEvents, matchedPasswords };
  }, [query, notes, events, unlockedEntries]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-start justify-center pt-20 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Мгновенный поиск по заметкам, событиям и открытым сейфам..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-2 text-xs">
          {results.matchedNotes.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10.5px] font-medium text-slate-400">Заметки и таблицы</div>
              {results.matchedNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    onJumpNote(n.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{n.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{n.updatedAt}</span>
                </button>
              ))}
            </div>
          )}

          {results.matchedEvents.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10.5px] font-medium text-slate-400">Календарь</div>
              {results.matchedEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    onJumpCalendar();
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{ev.title}</span>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {ev.date} {ev.startTime}
                  </span>
                </button>
              ))}
            </div>
          )}

          {results.matchedPasswords.length > 0 && (
            <div>
              <div className="px-2.5 py-1 text-[10.5px] font-medium text-slate-400">
                Открытые сейфы
              </div>
              {results.matchedPasswords.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onJumpPasswords();
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{p.title}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{p.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* 4. ALWAYS-ON-TOP WINDOWS TRAY / ANDROID ALARM REMINDER POPUP */
export const ReminderPopup: React.FC<{
  event: CalendarEvent | null;
  isAndroid: boolean;
  onSnooze: () => void;
  onDismiss: () => void;
}> = ({ event, isAndroid, onSnooze, onDismiss }) => {
  if (!event) return null;
  return (
    <div className="fixed top-5 right-5 z-50 w-80 rounded-2xl bg-white dark:bg-[#171F2C] border border-slate-200 dark:border-slate-700 shadow-2xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
          <BellRing className="w-4 h-4" />
          <span>{isAndroid ? 'Системный будильник Android' : 'Напоминание поверх всех окон'}</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div>
        <div className="text-sm font-display font-bold text-slate-900 dark:text-slate-50">
          {event.title}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
          {event.date} · {event.startTime}–{event.endTime}
          {event.location ? ` · ${event.location}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onSnooze}
          className="flex-1 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
        >
          Отложить +10 мин
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
        >
          Готово
        </button>
      </div>
    </div>
  );
};

/* 5. CLIPBOARD AUTO-CLEAR TOAST */
export const ClipboardToast: React.FC<{
  label: string;
  secondsLeft: number;
  isSecret: boolean;
  onClearNow: () => void;
}> = ({ label, secondsLeft, isSecret, onClearNow }) => {
  if (!label || secondsLeft <= 0) return null;
  return (
    <div className="fixed bottom-16 right-5 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-lg flex items-center gap-3 text-xs">
      <Shield className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
      <span>
        Скопировано: <strong>{label}</strong>
        {isSecret && (
          <span className="font-mono tabular-nums opacity-80 ml-1.5">
            (очистка буфера через {secondsLeft}с)
          </span>
        )}
      </span>
      {isSecret && (
        <button
          type="button"
          onClick={onClearNow}
          className="underline font-medium opacity-90 hover:opacity-100 cursor-pointer whitespace-nowrap"
        >
          Очистить
        </button>
      )}
    </div>
  );
};
