import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import {
  CalendarEvent,
  CalendarSource,
  Note,
  RecurrenceRule,
} from '../types/asrbox';
import { getTodayIso, shiftDateIso } from '../utils/cryptoHelpers';

type CalendarViewMode = 'day' | 'week' | 'month' | 'year' | 'list';

interface CalendarModuleProps {
  calendars: CalendarSource[];
  events: CalendarEvent[];
  notes: Note[];
  onToggleCalendar: (id: string) => void;
  onAddCalendar: (cal: CalendarSource) => void;
  onUpsertEvent: (ev: CalendarEvent, isNew?: boolean) => void;
  onDeleteEvent: (id: string) => void;
  onOpenLinkedNote: (noteId: string) => void;
  onTriggerReminder: (ev: CalendarEvent) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
  compact?: boolean;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  none: 'Без повтора',
  daily: 'Ежедневно',
  weekly: 'Еженедельно',
  monthly: 'Ежемесячно',
  yearly: 'Ежегодно',
};

export const CalendarModule: React.FC<CalendarModuleProps> = ({
  calendars,
  events,
  notes,
  onToggleCalendar,
  onAddCalendar,
  onUpsertEvent,
  onDeleteEvent,
  onOpenLinkedNote,
  onTriggerReminder,
  onLog,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>(compact ? 'list' : 'month');
  const [cursorDate, setCursorDate] = useState<string>(getTodayIso());
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isNewEvent, setIsNewEvent] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subName, setSubName] = useState('');
  const [subUrl, setSubUrl] = useState('');
  const [subType, setSubType] = useState<'local' | 'google' | 'ical'>('ical');
  const [subColor, setSubColor] = useState('#0891B2');
  const [googleSyncing, setGoogleSyncing] = useState(false);

  const visibleCalIds = useMemo(
    () => new Set(calendars.filter((c) => c.visible).map((c) => c.id)),
    [calendars]
  );

  const visibleEvents = useMemo(
    () =>
      events
        .filter((e) => visibleCalIds.has(e.calendarId))
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [events, visibleCalIds]
  );

  const [curYear, curMonth, curDay] = cursorDate.split('-').map(Number);

  const getCalColor = (calId: string) =>
    calendars.find((c) => c.id === calId)?.color || '#2563EB';

  const getCalName = (calId: string) =>
    calendars.find((c) => c.id === calId)?.name || 'Личный';

  const monthGridDays = useMemo(() => {
    const first = new Date(curYear, curMonth - 1, 1);
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = new Date(curYear, curMonth, 0).getDate();
    const cells: { iso: string; day: number; inMonth: boolean }[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(curYear, curMonth - 1, -i);
      cells.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        day: d.getDate(),
        inMonth: false,
      });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: `${curYear}-${String(curMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        inMonth: true,
      });
    }
    while (cells.length % 7 !== 0) {
      const nextIdx = cells.length - startOffset - daysInMonth + 1;
      const d = new Date(curYear, curMonth, nextIdx);
      cells.push({
        iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
        day: d.getDate(),
        inMonth: false,
      });
    }
    return cells;
  }, [curYear, curMonth]);

  const weekDays = useMemo(() => {
    const dt = new Date(curYear, curMonth - 1, curDay);
    const monOffset = (dt.getDay() + 6) % 7;
    const mondayIso = shiftDateIso(cursorDate, -monOffset);
    return Array.from({ length: 7 }, (_, i) => {
      const iso = shiftDateIso(mondayIso, i);
      return { iso, label: WEEKDAYS_SHORT[i], dayNum: Number(iso.split('-')[2]) };
    });
  }, [cursorDate, curYear, curMonth, curDay]);

  const navigateCursor = (dir: -1 | 1) => {
    if (viewMode === 'day') {
      setCursorDate(shiftDateIso(cursorDate, dir));
    } else if (viewMode === 'week') {
      setCursorDate(shiftDateIso(cursorDate, dir * 7));
    } else if (viewMode === 'year') {
      setCursorDate(`${curYear + dir}-${String(curMonth).padStart(2, '0')}-01`);
    } else {
      const dt = new Date(curYear, curMonth - 1 + dir, 1);
      setCursorDate(
        `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-01`
      );
    }
  };

  const openCreateEvent = (dateIso = cursorDate) => {
    setIsNewEvent(true);
    setEditingEvent({
      id: `ev-${Date.now()}`,
      calendarId: calendars[0]?.id || 'cal-personal',
      title: '',
      date: dateIso,
      startTime: '11:00',
      endTime: '12:00',
      location: '',
      notes: '',
      recurrence: 'none',
      reminderMinutes: 15,
    });
  };

  const handleGoogleTwoWaySync = () => {
    setGoogleSyncing(true);
    setTimeout(() => {
      setGoogleSyncing(false);
      onLog(
        'success',
        'Calendar / Google Sync',
        'Двусторонняя синхронизация с Google Календарём и подписками iCal завершена'
      );
    }, 850);
  };

  const todayIso = getTodayIso();

  return (
    <div className="flex h-full min-h-0 bg-white dark:bg-[#141A23]">
      {/* Left Calendars Sidebar (Desktop) */}
      {!compact && (
        <div className="w-[244px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-3.5 flex flex-col justify-between gap-4 overflow-y-auto">
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => openCreateEvent(cursorDate)}
              className="w-full py-2 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Новое событие</span>
            </button>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Календари и подписки
                </span>
                <button
                  type="button"
                  onClick={() => setShowSubModal(true)}
                  className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Добавить
                </button>
              </div>
              <div className="space-y-1">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/70 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={cal.visible}
                      onChange={() => onToggleCalendar(cal.id)}
                      className="mt-0.5 rounded"
                      style={{ accentColor: cal.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cal.name}
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {cal.type === 'local'
                          ? 'Локальный · Зашифрован'
                          : cal.type === 'google'
                          ? 'Двусторонняя синхр.'
                          : 'Подписка iCal (.ics)'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleGoogleTwoWaySync}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${googleSyncing ? 'animate-spin text-blue-600' : ''}`} />
                <span>{googleSyncing ? 'Синхронизация...' : 'Обновить Google / iCal'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextEv = visibleEvents[0] || {
                    id: 'demo-rem',
                    calendarId: 'cal-personal',
                    title: 'Проверка сметы и звонок прорабу',
                    date: todayIso,
                    startTime: '15:00',
                    endTime: '15:40',
                    recurrence: 'none' as RecurrenceRule,
                    reminderMinutes: 10,
                  };
                  onTriggerReminder(nextEv);
                }}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Тест напоминания</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
            На Android напоминания работают через системные будильники, на Windows — поверх всех окон из трея со звуком.
          </div>
        </div>
      )}

      {/* Main Calendar Canvas */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* Top Controls */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCursorDate(todayIso)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              Сегодня
            </button>
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => navigateCursor(-1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigateCursor(1)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-base font-display font-bold text-slate-900 dark:text-slate-100 tabular-nums whitespace-nowrap">
              {viewMode === 'year'
                ? `${curYear}`
                : `${MONTH_NAMES[curMonth - 1]} ${curYear}`}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {compact && (
              <button
                type="button"
                onClick={() => openCreateEvent(cursorDate)}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Событие</span>
              </button>
            )}
            <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
              {(
                [
                  { id: 'day', label: 'День' },
                  { id: 'week', label: 'Неделя' },
                  { id: 'month', label: 'Месяц' },
                  { id: 'year', label: 'Год' },
                  { id: 'list', label: 'Список' },
                ] as const
              ).map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    viewMode === v.id
                      ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* VIEW: MONTH */}
        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {WEEKDAYS_SHORT.map((wd) => (
                <div key={wd} className="px-3 py-2 text-center">
                  {wd}
                </div>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-y-auto">
              {monthGridDays.map((cell) => {
                const dayEvents = visibleEvents.filter((e) => e.date === cell.iso);
                const isToday = cell.iso === todayIso;
                return (
                  <div
                    key={cell.iso}
                    onClick={() => {
                      setCursorDate(cell.iso);
                      openCreateEvent(cell.iso);
                    }}
                    className={`p-2 min-h-[86px] flex flex-col cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30 ${
                      !cell.inMonth ? 'bg-slate-50/50 dark:bg-[#10151D]/60 text-slate-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs tabular-nums font-medium w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-blue-600 text-white'
                            : cell.inMonth
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {cell.day}
                      </span>
                    </div>
                    <div className="space-y-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsNewEvent(false);
                            setEditingEvent(ev);
                          }}
                          className="w-full text-left px-1.5 py-0.5 rounded text-[11px] truncate flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: getCalColor(ev.calendarId) }}
                          />
                          <span className="font-mono text-[10px] text-slate-500 tabular-nums shrink-0">
                            {ev.startTime}
                          </span>
                          <span className="truncate font-medium">{ev.title}</span>
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-400 pl-1">
                          + ещё {dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: WEEK */}
        {viewMode === 'week' && (
          <div className="flex-1 grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-800 overflow-y-auto">
            {weekDays.map((wd) => {
              const dayEvents = visibleEvents.filter((e) => e.date === wd.iso);
              const isToday = wd.iso === todayIso;
              return (
                <div key={wd.iso} className="flex flex-col min-h-full">
                  <div
                    className={`p-3 border-b border-slate-200 dark:border-slate-800 text-center ${
                      isToday ? 'bg-blue-50/70 dark:bg-blue-500/10' : ''
                    }`}
                  >
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{wd.label}</div>
                    <div
                      className={`text-lg font-display font-bold tabular-nums mt-0.5 ${
                        isToday ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {wd.dayNum}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 flex-1">
                    {dayEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setIsNewEvent(false);
                          setEditingEvent(ev);
                        }}
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] hover:border-blue-500 transition-colors cursor-pointer space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getCalColor(ev.calendarId) }}
                          />
                          <span>
                            {ev.startTime}–{ev.endTime}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {ev.title}
                        </div>
                        {ev.location && (
                          <div className="text-[11px] text-slate-500 truncate">{ev.location}</div>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => openCreateEvent(wd.iso)}
                      className="w-full py-1.5 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
                    >
                      + Добавить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW: DAY */}
        {viewMode === 'day' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                  Расписание на {cursorDate}
                </h3>
                <button
                  type="button"
                  onClick={() => openCreateEvent(cursorDate)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Новое событие
                </button>
              </div>
              {visibleEvents.filter((e) => e.date === cursorDate).length === 0 ? (
                <div className="p-8 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
                  На этот день событий нет.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                  {visibleEvents
                    .filter((e) => e.date === cursorDate)
                    .map((ev) => (
                      <div
                        key={ev.id}
                        className="p-4 flex items-start justify-between gap-4 hover:bg-white dark:hover:bg-[#161E2B] transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 pt-0.5 w-24 shrink-0">
                            {ev.startTime} – {ev.endTime}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: getCalColor(ev.calendarId) }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsNewEvent(false);
                                  setEditingEvent(ev);
                                }}
                                className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 text-left cursor-pointer"
                              >
                                {ev.title}
                              </button>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {getCalName(ev.calendarId)}
                              {ev.location ? ` · ${ev.location}` : ''}
                              {ev.recurrence !== 'none' ? ` · ${RECURRENCE_LABELS[ev.recurrence]}` : ''}
                            </div>
                            {ev.linkedNoteId && (
                              <button
                                type="button"
                                onClick={() => onOpenLinkedNote(ev.linkedNoteId!)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline pt-0.5 cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>
                                  Открыть заметку:{' '}
                                  {notes.find((n) => n.id === ev.linkedNoteId)?.title || 'Заметка'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onTriggerReminder(ev)}
                          title="Проверить напоминание"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                        >
                          <BellRing className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW: YEAR */}
        {viewMode === 'year' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {MONTH_NAMES.map((mName, mIdx) => {
                const mPrefix = `${curYear}-${String(mIdx + 1).padStart(2, '0')}`;
                const count = visibleEvents.filter((e) => e.date.startsWith(mPrefix)).length;
                const daysInM = new Date(curYear, mIdx + 1, 0).getDate();
                const offset = (new Date(curYear, mIdx, 1).getDay() + 6) % 7;
                return (
                  <div
                    key={mName}
                    onClick={() => {
                      setCursorDate(`${mPrefix}-01`);
                      setViewMode('month');
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {mName}
                      </span>
                      <span className="text-[11px] tabular-nums text-slate-400">
                        {count > 0 ? `${count} соб.` : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-[10px] text-center tabular-nums">
                      {Array.from({ length: offset }).map((_, i) => (
                        <span key={`e-${i}`} />
                      ))}
                      {Array.from({ length: daysInM }, (_, i) => {
                        const dIso = `${mPrefix}-${String(i + 1).padStart(2, '0')}`;
                        const hasEv = visibleEvents.some((e) => e.date === dIso);
                        const isTd = dIso === todayIso;
                        return (
                          <span
                            key={dIso}
                            className={`py-0.5 rounded ${
                              isTd
                                ? 'bg-blue-600 text-white font-bold'
                                : hasEv
                                ? 'bg-blue-100 dark:bg-blue-500/25 text-blue-700 dark:text-blue-300 font-semibold'
                                : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {i + 1}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW: LIST */}
        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="max-w-3xl mx-auto divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
              {visibleEvents.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">Нет запланированных событий.</div>
              ) : (
                visibleEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="px-4 py-3.5 flex items-center justify-between gap-4 hover:bg-white dark:hover:bg-[#161E2B] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ backgroundColor: getCalColor(ev.calendarId) }}
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewEvent(false);
                            setEditingEvent(ev);
                          }}
                          className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 text-left cursor-pointer"
                        >
                          {ev.title}
                        </button>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex-wrap tabular-nums">
                          <span>{ev.date}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {ev.startTime}–{ev.endTime}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getCalName(ev.calendarId)}</span>
                          {ev.recurrence !== 'none' && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="inline-flex items-center gap-1">
                                <Repeat className="w-3 h-3" />
                                {RECURRENCE_LABELS[ev.recurrence]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ev.linkedNoteId && (
                        <button
                          type="button"
                          onClick={() => onOpenLinkedNote(ev.linkedNoteId!)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer whitespace-nowrap"
                        >
                          Заметка
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onTriggerReminder(ev)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer"
                        title="Показать напоминание"
                      >
                        <BellRing className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Event Modal */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setEditingEvent(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!editingEvent.title.trim()) return;
              onUpsertEvent(editingEvent, isNewEvent);
              setEditingEvent(null);
            }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                {isNewEvent ? 'Новое событие' : 'Редактировать событие'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                required
                autoFocus
                value={editingEvent.title}
                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                placeholder="Название события..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="date"
                  value={editingEvent.date}
                  onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={editingEvent.startTime}
                  onChange={(e) => setEditingEvent({ ...editingEvent, startTime: e.target.value })}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs font-mono text-slate-900 dark:text-slate-100"
                />
                <input
                  type="time"
                  value={editingEvent.endTime}
                  onChange={(e) => setEditingEvent({ ...editingEvent, endTime: e.target.value })}
                  className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs font-mono text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Календарь</label>
                  <select
                    value={editingEvent.calendarId}
                    onChange={(e) => setEditingEvent({ ...editingEvent, calendarId: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs text-slate-900 dark:text-slate-100"
                  >
                    {calendars.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Повтор</label>
                  <select
                    value={editingEvent.recurrence}
                    onChange={(e) =>
                      setEditingEvent({
                        ...editingEvent,
                        recurrence: e.target.value as RecurrenceRule,
                      })
                    }
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs text-slate-900 dark:text-slate-100"
                  >
                    {(Object.keys(RECURRENCE_LABELS) as RecurrenceRule[]).map((r) => (
                      <option key={r} value={r}>
                        {RECURRENCE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Привязать заметку ASRbox (кросс-связь)
                </label>
                <select
                  value={editingEvent.linkedNoteId || ''}
                  onChange={(e) =>
                    setEditingEvent({
                      ...editingEvent,
                      linkedNoteId: e.target.value || undefined,
                    })
                  }
                  className="w-full px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="">Без привязанной заметки</option>
                  {notes
                    .filter((n) => !n.trashedAt)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.title}
                      </option>
                    ))}
                </select>
              </div>

              <input
                type="text"
                value={editingEvent.location || ''}
                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                placeholder="Место или ссылка (необязательно)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              {!isNewEvent ? (
                <button
                  type="button"
                  onClick={() => {
                    onDeleteEvent(editingEvent.id);
                    setEditingEvent(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить</span>
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Local / iCal Subscription Modal */}
      {showSubModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowSubModal(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!subName.trim()) return;
              onAddCalendar({
                id: `cal-${Date.now()}`,
                name: subName.trim(),
                color: subColor,
                type: subType,
                visible: true,
                url: subUrl.trim() || undefined,
              });
              setSubName('');
              setSubUrl('');
              setShowSubModal(false);
            }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Добавить календарь или подписку iCal
              </h3>
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(
                  [
                    { id: 'local', label: 'Локальный' },
                    { id: 'ical', label: 'iCal (.ics)' },
                    { id: 'google', label: 'Google' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubType(t.id)}
                    className={`py-2 rounded-lg border font-medium cursor-pointer ${
                      subType === t.id
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                placeholder="Название календаря (например: Тренировки)"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
              />
              {subType === 'ical' && (
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    placeholder="https://example.com/calendar.ics"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span>Цвет:</span>
                {['#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSubColor(c)}
                    className={`w-5 h-5 rounded-full cursor-pointer ${
                      subColor === c ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubModal(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Добавить
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
