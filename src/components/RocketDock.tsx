import React, { useState } from 'react';
import {
  Calendar,
  Cloud,
  FileText,
  Folder,
  KeyRound,
  Mic,
  Terminal,
  Users,
} from 'lucide-react';
import { DockShortcut } from '../types/asrbox';

interface RocketDockProps {
  shortcuts: DockShortcut[];
  position: 'bottom' | 'left' | 'right';
  maxScale: number;
  onLaunch: (shortcut: DockShortcut) => void;
}

const ICON_MAP: Record<DockShortcut['iconKey'], React.ComponentType<{ className?: string }>> = {
  notes: FileText,
  passwords: KeyRound,
  calendar: Calendar,
  shared: Users,
  dictation: Mic,
  folder: Folder,
  terminal: Terminal,
  sync: Cloud,
};

export const RocketDock: React.FC<RocketDockProps> = ({
  shortcuts,
  position,
  maxScale,
  onLaunch,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isVertical = position === 'left' || position === 'right';

  const getScale = (idx: number) => {
    if (hoveredIndex === null) return 1;
    const dist = Math.abs(hoveredIndex - idx);
    if (dist === 0) return maxScale;
    if (dist === 1) return 1 + (maxScale - 1) * 0.45;
    return 1;
  };

  const posClasses =
    position === 'bottom'
      ? 'fixed bottom-3 left-1/2 -translate-x-1/2 flex-row'
      : position === 'left'
      ? 'fixed left-3 top-1/2 -translate-y-1/2 flex-col'
      : 'fixed right-3 top-1/2 -translate-y-1/2 flex-col';

  return (
    <div
      onMouseLeave={() => setHoveredIndex(null)}
      className={`${posClasses} z-40 hidden lg:flex items-center gap-1.5 px-2.5 py-2 rounded-2xl bg-white/85 dark:bg-[#161D29]/90 backdrop-blur-md border border-slate-200/90 dark:border-slate-700/80 shadow-lg shadow-slate-900/10`}
    >
      {shortcuts.map((item, idx) => {
        const Icon = ICON_MAP[item.iconKey] || Folder;
        const scale = getScale(idx);
        const isHovered = hoveredIndex === idx;
        return (
          <div key={item.id} className="relative flex items-center justify-center">
            {isHovered && (
              <div
                className={`pointer-events-none absolute whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-medium shadow-md ${
                  position === 'bottom'
                    ? '-top-10 left-1/2 -translate-x-1/2'
                    : position === 'left'
                    ? 'left-14 top-1/2 -translate-y-1/2'
                    : 'right-14 top-1/2 -translate-y-1/2'
                }`}
              >
                {item.label}
              </div>
            )}
            <button
              type="button"
              onMouseEnter={() => setHoveredIndex(idx)}
              onClick={() => onLaunch(item)}
              style={{
                transform: `scale(${scale}) ${
                  !isVertical && isHovered ? 'translateY(-4px)' : ''
                }`,
                transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1F293A] hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200/70 dark:border-slate-700/70 cursor-pointer"
              aria-label={item.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
