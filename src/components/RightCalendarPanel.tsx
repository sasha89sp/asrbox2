import React, { useMemo, useState } from 'react';
import {
  BellRing,
  ChevronLeft,
  ChevronRight,
  FileText,
  Mic,
  Pin,
  Plus,
} from 'lucide-react';
import { CalendarEvent, CalendarSource, Note } from '../types/asrbox';
import { getTodayIso } from '../utils/cryptoHelpers';

interface RightCalendarPanelProps {
  calendars: CalendarSource[];
  events: CalendarEvent[];
  pinnedNotes: Note[];
  onOpenNote: (noteId: string) => void;
  onOpenCalendarDay: () => void;
  onTriggerReminder: (ev: CalendarEvent) => void;
  onQuickDictation: () => void;
}

const MONTHS_RU = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WD_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const RightCalendarPanel: React.FC<RightCalendarPanelProps> = ({
  calendars,
  events,
  pinnedNotes,
  onOpenNote,
  onOpenCalendarDay,
  onTriggerReminder,
  onQuickDictation,
}) => {
  const todayIso = getTodayIso();
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [viewYear, setViewYear] = useState(() => Number(todayIso.split('-')[0]));
  const [viewMonth, setViewMonth] = useState(() => Number(todayIso.split('-')[1]));

  const visibleCalIds = useMemo(
    () => new Set(calendars.filter((c) => c.visible).map((c) => c.id)),
    [calendars]
  );

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => e.date === selectedDate && visibleCalIds.has(e.calendarId))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDate, visibleCalIds]
  );

  const monthDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1);
    const offset = (first.getDay() + 6) % 7;
    const total = new Date(viewYear, viewMonth, 0).getDate();
    const list: ({ iso: string; day: number } | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= total; d++) {
      list.push({
        iso: `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
      });
    }
    return list;
  }, [viewYear, viewMonth]);

  const shiftMonth = (dir: -1 | 1) => {
    const dt = new Date(viewYear, viewMonth - 1 + dir, 1);
    setViewYear(dt.getFullYear());
    setViewMonth(dt.getMonth() + 1);
  };

  return (
    <div className="h-full flex flex-col bg-[#FAFBFD] dark:bg-[#11161F] overflow-y-auto">
      {/* Mini Calendar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedDate(todayIso);
              setViewYear(Number(todayIso.split('-')[0]));
              setViewMonth(Number(todayIso.split('-')[1]));
            }}
            className="text-xs font-display font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 cursor-pointer"
          >
            {MONTHS_RU[viewMonth - 1]} {viewYear}
          </button>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-slate-400">
          {WD_RU.map((d) => (
            <span key={d} className="py-1 font-medium">
              {d}
            </span>
          ))}
          {monthDays.map((cell, idx) => {
            if (!cell) return <span key={`empty-${idx}`} />;
            const hasEvents = events.some(
              (e) => e.date === cell.iso && visibleCalIds.has(e.calendarId)
            );
            const isSelected = cell.iso === selectedDate;
            const isToday = cell.iso === todayIso;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() => setSelectedDate(cell.iso)}
                className={`relative h-7 rounded-md text-[11.5px] tabular-nums transition-colors cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white font-semibold'
                    : isToday
                    ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                }`}
              >
                {cell.day}
                {hasEvents && !isSelected && (
                  <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day Schedule */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {selectedDate === todayIso ? 'Расписание на сегодня' : `План на ${selectedDate}`}
          </span>
          <button
            type="button"
            onClick={onOpenCalendarDay}
            className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Открыть</span>
          </button>
        </div>

        {dayEvents.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
            Свободный день — событий не запланировано.
          </p>
        ) : (
          <div className="space-y-2">
            {dayEvents.map((ev) => {
              const color = calendars.find((c) => c.id === ev.calendarId)?.color || '#2563EB';
              return (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl bg-white dark:bg-[#171E2A] border border-slate-200/80 dark:border-slate-800 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>
                        {ev.startTime}–{ev.endTime}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onTriggerReminder(ev)}
                      title="Проверить всплывающее напоминание"
                      className="text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    {ev.title}
                  </div>
                  {ev.linkedNoteId && (
                    <button
                      type="button"
                      onClick={() => onOpenNote(ev.linkedNoteId!)}
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      <FileText className="w-3 h-3" />
                      <span>Перейти к заметке</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned Notes */}
      <div className="p-4 space-y-2.5 flex-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
          <Pin className="w-3.5 h-3.5 text-slate-400" />
          <span>Закреплённые на главную</span>
        </div>
        {pinnedNotes.length === 0 ? (
          <p className="text-xs text-slate-500 dark:text-slate-400">Нет закреплённых заметок.</p>
        ) : (
          <div className="space-y-1.5">
            {pinnedNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onOpenNote(note.id)}
                className="w-full text-left px-3 py-2 rounded-lg bg-white dark:bg-[#171E2A] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 transition-colors cursor-pointer"
              >
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                  {note.title}
                </div>
                <div className="text-[10.5px] text-slate-400 tabular-nums mt-0.5">
                  {note.updatedAt}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Dictation Footer Trigger */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onQuickDictation}
          className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171E2A] hover:border-blue-500 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Быстрая диктовка в буфер</span>
        </button>
      </div>
    </div>
  );
};
