import React, { useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  History,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Search,
  Square,
  Star,
  Table2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CalendarEvent,
  EmbeddedIcsEvent,
  Note,
  NoteBlock,
  NoteFolder,
} from '../types/asrbox';
import {
  colIndexToLetter,
  downloadTextFile,
  evaluateCellDisplay,
  exportEventsToIcs,
  exportSpreadsheetToExcelCsv,
} from '../utils/formulaEngine';
import { getTodayIso } from '../utils/cryptoHelpers';

interface NotesModuleProps {
  notes: Note[];
  folders: NoteFolder[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onUpdateNote: (note: Note, logSummary?: string) => void;
  onCreateNote: (folderId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onTrashNote: (id: string) => void;
  onRestoreNote: (id: string) => void;
  onDeleteNotePermanently: (id: string) => void;
  onAddEventFromIcs: (ev: EmbeddedIcsEvent) => void;
  onContextMenu: (e: React.MouseEvent, items: { label: string; onClick: () => void; danger?: boolean }[]) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
  onCreateSafetySnapshot: (reason: string) => void;
  compact?: boolean;
}

type FilterView = 'all' | 'pinned' | 'favorites' | 'trash' | string;

function renderMarkdownProse(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-2.5" />;
    if (trimmed.startsWith('### ')) {
      return (
        <h4 key={idx} className="text-base font-semibold text-slate-900 dark:text-slate-100 mt-3 mb-1">
          {trimmed.slice(4)}
        </h4>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h3 key={idx} className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-4 mb-1.5">
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={idx} className="flex items-start gap-2.5 pl-1 my-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          <span>{formatInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      );
    }
    return (
      <p key={idx} className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 my-1.5">
        {formatInlineMarkdown(line)}
      </p>
    );
  });
}

function formatInlineMarkdown(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="font-mono text-[12.5px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const NotesModule: React.FC<NotesModuleProps> = ({
  notes,
  folders,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onCreateNote,
  onCreateFolder,
  onTrashNote,
  onRestoreNote,
  onDeleteNotePermanently,
  onAddEventFromIcs,
  onContextMenu,
  onLog,
  onCreateSafetySnapshot,
  compact = false,
}) => {
  const [filterView, setFilterView] = useState<FilterView>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'f-personal': true,
    'f-work': true,
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);
  const [activeCell, setActiveCell] = useState<{ blockId: string; r: number; c: number } | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [recordingBlockId, setRecordingBlockId] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState('');
  const [mobileShowEditor, setMobileShowEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.filter((n) => !n.trashedAt).forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes
      .filter((note) => {
        if (filterView === 'trash') return Boolean(note.trashedAt);
        if (note.trashedAt) return false;
        if (filterView === 'pinned' && !note.isPinned) return false;
        if (filterView === 'favorites' && !note.isFavorite) return false;
        if (
          filterView !== 'all' &&
          filterView !== 'pinned' &&
          filterView !== 'favorites'
        ) {
          // Include nested child folders
          const childIds = folders.filter((f) => f.parentId === filterView).map((f) => f.id);
          if (note.folderId !== filterView && !childIds.includes(note.folderId)) return false;
        }
        if (selectedTag && !note.tags.includes(selectedTag)) return false;
        if (q) {
          const inTitle = note.title.toLowerCase().includes(q);
          const inTags = note.tags.some((t) => t.toLowerCase().includes(q));
          const inBlocks = note.blocks.some((b) => {
            if (b.type === 'markdown') return b.content.toLowerCase().includes(q);
            if (b.type === 'checklist') return b.items.some((i) => i.text.toLowerCase().includes(q));
            if (b.type === 'voice') return b.data.transcript.toLowerCase().includes(q);
            if (b.type === 'spreadsheet')
              return b.data.rows.some((row) => row.some((cell) => cell.toLowerCase().includes(q)));
            return false;
          });
          return inTitle || inTags || inBlocks;
        }
        return true;
      })
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
  }, [notes, filterView, selectedTag, searchQuery, folders]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || filteredNotes[0] || null,
    [notes, selectedNoteId, filteredNotes]
  );

  const updateBlock = (blockId: string, updater: (block: NoteBlock) => NoteBlock) => {
    if (!activeNote) return;
    const nextBlocks = activeNote.blocks.map((b) => (b.id === blockId ? updater(b) : b));
    onUpdateNote({
      ...activeNote,
      updatedAt: 'Только что',
      blocks: nextBlocks,
    });
  };

  const removeBlock = (blockId: string) => {
    if (!activeNote) return;
    onUpdateNote(
      {
        ...activeNote,
        updatedAt: 'Только что',
        blocks: activeNote.blocks.filter((b) => b.id !== blockId),
      },
      'Удалён блок из заметки'
    );
  };

  const addBlock = (type: NoteBlock['type']) => {
    if (!activeNote) return;
    const id = `blk-${Date.now()}`;
    let newBlock: NoteBlock;
    switch (type) {
      case 'markdown':
        newBlock = { id, type: 'markdown', content: 'Новый текстовый блок с поддержкой **Markdown**.' };
        break;
      case 'checklist':
        newBlock = {
          id,
          type: 'checklist',
          title: 'Чек-лист',
          items: [{ id: `ci-${Date.now()}`, text: 'Первый пункт задачи', done: false }],
        };
        break;
      case 'spreadsheet':
        newBlock = {
          id,
          type: 'spreadsheet',
          title: 'Новая таблица с формулами',
          data: {
            columns: ['Позиция', 'Кол-во', 'Цена', 'Итого'],
            rows: [
              ['Позиция 1', '2', '1500', '=B1*C1'],
              ['Позиция 2', '3', '900', '=B2*C2'],
              ['Сумма', '', '', '=SUM(D1:D2)'],
            ],
          },
        };
        break;
      case 'voice':
        newBlock = {
          id,
          type: 'voice',
          title: 'Голосовая заметка',
          data: {
            durationSec: 12,
            recordedAt: 'Только что',
            transcript: 'Нажмите «Записать речь» для локальной расшифровки голоса в текст.',
            waveform: [18, 36, 52, 28, 70, 62, 44, 30, 58, 76, 48, 26, 42, 66, 50, 32],
          },
        };
        break;
      case 'ics':
        newBlock = {
          id,
          type: 'ics',
          title: 'Встроенные события календаря (.ics)',
          events: [
            {
              id: `ics-${Date.now()}`,
              title: 'Новое событие из заметки',
              date: getTodayIso(),
              time: '16:00',
              location: 'Указать место',
              addedToCalendar: false,
            },
          ],
        };
        break;
      case 'attachment':
      default:
        fileInputRef.current?.click();
        return;
    }

    onUpdateNote(
      {
        ...activeNote,
        updatedAt: 'Только что',
        blocks: [...activeNote.blocks, newBlock],
      },
      `Добавлен блок (${type})`
    );
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeNote) return;
    const isImage = file.type.startsWith('image/');
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    const sizeLabel = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} МБ` : `${sizeKb} КБ`;

    const appendAttachment = (url?: string) => {
      const newBlock: NoteBlock = {
        id: `att-${Date.now()}`,
        type: 'attachment',
        data: {
          name: file.name,
          sizeLabel: `${sizeLabel} · зашифрован локально`,
          kind: isImage ? 'image' : 'file',
          url,
          caption: isImage ? file.name : undefined,
        },
      };
      onUpdateNote(
        {
          ...activeNote,
          updatedAt: 'Только что',
          blocks: [...activeNote.blocks, newBlock],
        },
        `Прикреплён файл ${file.name}`
      );
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = () => appendAttachment(typeof reader.result === 'string' ? reader.result : undefined);
      reader.readAsDataURL(file);
    } else {
      appendAttachment();
    }
    e.target.value = '';
  };

  const handleVoiceRecordBlock = (blockId: string) => {
    if (recordingBlockId === blockId) {
      setRecordingBlockId(null);
      return;
    }
    setRecordingBlockId(blockId);

    type SpeechRecCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const win = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    const SpeechRecognitionCtor = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = 'ru-RU';
        recognition.interimResults = false;
        recognition.onresult = (event) => {
          const transcript = event.results[0]?.[0]?.transcript || '';
          if (transcript) {
            updateBlock(blockId, (b) =>
              b.type === 'voice'
                ? {
                    ...b,
                    data: {
                      ...b.data,
                      recordedAt: 'Только что',
                      durationSec: Math.max(4, Math.round(transcript.length / 8)),
                      transcript,
                    },
                  }
                : b
            );
            onLog('success', 'VoiceNotes', 'Голосовая запись расшифрована и сохранена в заметку');
          }
        };
        recognition.onerror = () => {
          setRecordingBlockId(null);
        };
        recognition.onend = () => {
          setRecordingBlockId(null);
        };
        recognition.start();
        return;
      } catch {
        // Fallback below
      }
    }

    // Graceful offline demo transcription
    setTimeout(() => {
      updateBlock(blockId, (b) =>
        b.type === 'voice'
          ? {
              ...b,
              data: {
                ...b.data,
                recordedAt: 'Только что',
                durationSec: 18,
                transcript:
                  'Уточнить сроки поставки материалов до четверга и перепроверить резервную копию на Яндекс Диске перед поездкой.',
              },
            }
          : b
      );
      setRecordingBlockId(null);
      onLog('success', 'VoiceNotes', 'Расшифровка речи завершена локально');
    }, 1400);
  };

  const handleSaveSnapshotVersion = () => {
    if (!activeNote) return;
    const version = {
      id: `ver-${Date.now()}`,
      savedAt: 'Только что',
      summary: `Ручная точка сохранения (${activeNote.blocks.length} блоков)`,
      title: activeNote.title,
      blocks: JSON.parse(JSON.stringify(activeNote.blocks)) as NoteBlock[],
    };
    onUpdateNote(
      {
        ...activeNote,
        versions: [version, ...activeNote.versions],
      },
      `Сохранена версия заметки «${activeNote.title}»`
    );
  };

  const handleRollbackVersion = (verId: string) => {
    if (!activeNote) return;
    const target = activeNote.versions.find((v) => v.id === verId);
    if (!target) return;
    onCreateSafetySnapshot(`Перед откатом заметки «${activeNote.title}»`);
    onUpdateNote(
      {
        ...activeNote,
        title: target.title,
        blocks: JSON.parse(JSON.stringify(target.blocks)) as NoteBlock[],
        updatedAt: 'Восстановлено только что',
      },
      `Выполнен откат заметки к версии от ${target.savedAt}`
    );
    setShowHistory(false);
  };

  const handleExportMarkdown = () => {
    if (!activeNote) return;
    const parts: string[] = [`# ${activeNote.title}`, `Теги: ${activeNote.tags.join(', ')}`, ''];
    activeNote.blocks.forEach((b) => {
      if (b.type === 'markdown') parts.push(b.content, '');
      if (b.type === 'checklist') {
        parts.push(`## ${b.title}`);
        b.items.forEach((i) => parts.push(`- [${i.done ? 'x' : ' '}] ${i.text}`));
        parts.push('');
      }
      if (b.type === 'spreadsheet') {
        parts.push(`## ${b.title}`);
        parts.push(`| ${b.data.columns.join(' | ')} |`);
        parts.push(`| ${b.data.columns.map(() => '---').join(' | ')} |`);
        b.data.rows.forEach((r, rIdx) => {
          const rendered = r.map((cell, cIdx) => evaluateCellDisplay(cell, b.data.rows, rIdx, cIdx));
          parts.push(`| ${rendered.join(' | ')} |`);
        });
        parts.push('');
      }
      if (b.type === 'voice') {
        parts.push(`> Голосовая расшифровка (${b.data.durationSec}с): ${b.data.transcript}`, '');
      }
    });
    downloadTextFile(`${activeNote.title}.md`, parts.join('\n'), 'text/markdown;charset=utf-8');
    onLog('success', 'Export', `Заметка экспортирована в Markdown (${activeNote.title}.md)`);
    setShowImportExport(false);
  };

  const handleSimulatedImport = (sourceName: string) => {
    onCreateSafetySnapshot(`Перед импортом из ${sourceName}`);
    const folderId = folders[0]?.id || 'f-personal';
    const imported: Note = {
      id: `n-imp-${Date.now()}`,
      title: `Импортировано из ${sourceName}`,
      folderId,
      tags: ['импорт', sourceName.toLowerCase()],
      isFavorite: false,
      isPinned: false,
      updatedAt: 'Только что',
      trashedAt: null,
      blocks: [
        {
          id: `b-imp-${Date.now()}`,
          type: 'markdown',
          content: `Заметка успешно конвертирована из формата **${sourceName}** и зашифрована локально в базе ASRbox.\n\nСохранены вложенные списки, теги и исходная структура документа.`,
        },
      ],
      versions: [],
    };
    onUpdateNote(imported, `Импорт заметки из ${sourceName}`);
    onSelectNote(imported.id);
    setShowImportExport(false);
  };

  const rootFolders = folders.filter((f) => f.parentId === null);

  const renderFolderBranch = (folder: NoteFolder, depth = 0) => {
    const children = folders.filter((f) => f.parentId === folder.id);
    const isExpanded = expandedFolders[folder.id];
    const isActive = filterView === folder.id;
    const count = notes.filter(
      (n) => !n.trashedAt && (n.folderId === folder.id || children.some((c) => c.id === n.folderId))
    ).length;

    return (
      <div key={folder.id}>
        <div
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          className={`group flex items-center justify-between pr-2 py-1.5 rounded-lg text-[13px] cursor-pointer transition-colors ${
            isActive
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 font-medium'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70'
          }`}
          onClick={() => {
            setFilterView(folder.id);
            setSelectedTag(null);
          }}
          onContextMenu={(e) =>
            onContextMenu(e, [
              { label: 'Создать заметку в папке', onClick: () => onCreateNote(folder.id) },
              {
                label: 'Создать вложенную папку',
                onClick: () => {
                  setExpandedFolders((prev) => ({ ...prev, [folder.id]: true }));
                  onCreateFolder('Новая подпапка', folder.id);
                },
              },
            ])
          }
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedFolders((prev) => ({ ...prev, [folder.id]: !prev[folder.id] }));
                }}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            {isActive ? (
              <FolderOpen className="w-3.5 h-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
            ) : (
              <Folder className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            )}
            <span className="truncate">{folder.name}</span>
          </div>
          <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500 ml-2">{count}</span>
        </div>
        {children.length > 0 && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {children.map((child) => renderFolderBranch(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0 bg-white dark:bg-[#141A23]">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />

      {/* Notes Folder & List Column */}
      <div
        className={`${
          compact && mobileShowEditor ? 'hidden' : 'flex'
        } flex-col border-r border-slate-200 dark:border-slate-800 ${
          compact ? 'w-full' : 'w-[285px] shrink-0'
        } min-h-0 bg-[#FAFBFD] dark:bg-[#11161F]`}
      >
        {/* Search & New Note */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по заметкам и таблицам..."
                className="w-full pl-8 pr-2.5 py-1.5 text-[13px] rounded-lg bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const targetFolder =
                  folders.some((f) => f.id === filterView) ? filterView : folders[0]?.id || 'f-personal';
                onCreateNote(targetFolder);
                if (compact) setMobileShowEditor(true);
              }}
              title="Новая заметка"
              className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Новая</span>
            </button>
          </div>

          {/* Smart Views */}
          <div className="grid grid-cols-4 gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-[11.5px]">
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'pinned', label: 'Главные' },
                { id: 'favorites', label: 'Избр.' },
                { id: 'trash', label: 'Корзина' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setFilterView(tab.id);
                  setSelectedTag(null);
                }}
                className={`py-1 px-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  filterView === tab.id
                    ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Nested Folders & Tags */}
        <div className="px-2.5 py-2 border-b border-slate-200/80 dark:border-slate-800/80 max-h-44 overflow-y-auto">
          <div className="flex items-center justify-between px-1.5 mb-1">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Папки</span>
            <button
              type="button"
              onClick={() => setAddingFolder((v) => !v)}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              + Папка
            </button>
          </div>

          {addingFolder && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newFolderName.trim()) {
                  onCreateFolder(newFolderName.trim(), null);
                  setNewFolderName('');
                  setAddingFolder(false);
                }
              }}
              className="flex items-center gap-1 mb-1.5 px-1"
            >
              <input
                type="text"
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Название папки"
                className="flex-1 text-xs px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-slate-900 dark:text-slate-100 focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 py-1 rounded bg-blue-600 text-white text-xs cursor-pointer"
              >
                Ок
              </button>
            </form>
          )}

          <div className="space-y-0.5">{rootFolders.map((f) => renderFolderBranch(f))}</div>

          {allTags.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-800/70 px-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px]">
                <span className="text-slate-400">Теги:</span>
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`transition-colors cursor-pointer ${
                      selectedTag === tag
                        ? 'text-blue-600 dark:text-blue-400 font-semibold underline underline-offset-2'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/70">
          {filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {filterView === 'trash'
                ? 'Корзина пуста. Удалённые заметки хранятся 30 дней.'
                : 'Заметок по выбранному фильтру нет.'}
            </div>
          ) : (
            filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              const folderName = folders.find((f) => f.id === note.folderId)?.name || 'Личное';
              const hasSheet = note.blocks.some((b) => b.type === 'spreadsheet');
              const hasVoice = note.blocks.some((b) => b.type === 'voice');
              const previewText =
                note.blocks.find((b) => b.type === 'markdown')?.content.replace(/\*\*/g, '') ||
                (hasSheet ? 'Таблица с формулами и расчётами' : 'Конструктор блоков');

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    onSelectNote(note.id);
                    if (compact) setMobileShowEditor(true);
                  }}
                  onContextMenu={(e) =>
                    onContextMenu(e, [
                      {
                        label: note.isPinned ? 'Открепить с главной' : 'Закрепить на главную',
                        onClick: () =>
                          onUpdateNote({ ...note, isPinned: !note.isPinned }, 'Обновлено закрепление'),
                      },
                      {
                        label: note.isFavorite ? 'Убрать из избранного' : 'В избранное',
                        onClick: () =>
                          onUpdateNote({ ...note, isFavorite: !note.isFavorite }),
                      },
                      {
                        label: note.trashedAt ? 'Восстановить из корзины' : 'Переместить в корзину (30 дн.)',
                        onClick: () => (note.trashedAt ? onRestoreNote(note.id) : onTrashNote(note.id)),
                        danger: !note.trashedAt,
                      },
                    ])
                  }
                  className={`px-3.5 py-3 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-500/12'
                      : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                      {note.title || 'Без названия'}
                    </h4>
                    <div className="flex items-center gap-1 shrink-0 pt-0.5">
                      {note.isPinned && <Pin className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
                      {note.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {previewText}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mt-2 truncate">
                    <span>{folderName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{note.trashedAt || note.updatedAt}</span>
                    {hasSheet && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Таблица</span>
                      </>
                    )}
                    {hasVoice && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Голос</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Import/Export trigger */}
        <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span className="tabular-nums">{filteredNotes.length} заметок</span>
          <button
            type="button"
            onClick={() => setShowImportExport(true)}
            className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Импорт / Экспорт</span>
          </button>
        </div>
      </div>

      {/* Main Note & Spreadsheet Constructor */}
      <div
        className={`${
          compact && !mobileShowEditor ? 'hidden' : 'flex'
        } flex-1 flex-col min-w-0 min-h-0 relative`}
      >
        {!activeNote ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Выберите или создайте заметку
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Объединяйте текст, чек-листы, таблицы с формулами Excel, голосовые записи и события календаря в одном окне.
            </p>
            <button
              type="button"
              onClick={() => onCreateNote(folders[0]?.id || 'f-personal')}
              className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium cursor-pointer"
            >
              Создать первую заметку
            </button>
          </div>
        ) : (
          <>
            {/* Note Toolbar */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {compact && (
                  <button
                    type="button"
                    onClick={() => setMobileShowEditor(false)}
                    className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer"
                  >
                    ← Список
                  </button>
                )}

                {/* Edit / Preview Segmented Toggle */}
                <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode('edit')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'edit'
                        ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Правка</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('preview')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      mode === 'preview'
                        ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Просмотр</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNote({ ...activeNote, isPinned: !activeNote.isPinned }, 'Обновлено закрепление')
                  }
                  title="Закрепить на главную"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeNote.isPinned
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateNote({ ...activeNote, isFavorite: !activeNote.isFavorite })
                  }
                  title="Избранное"
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeNote.isFavorite
                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/10'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Star className={`w-4 h-4 ${activeNote.isFavorite ? 'fill-amber-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  title="История версий"
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    showHistory
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Версии ({activeNote.versions.length})</span>
                </button>
                {activeNote.trashedAt ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onRestoreNote(activeNote.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Восстановить</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteNotePermanently(activeNote.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-medium cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить навсегда</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onTrashNote(activeNote.id)}
                    title="В корзину (хранится 30 дней)"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {activeNote.trashedAt && (
              <div className="px-6 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>Заметка находится в корзине ({activeNote.trashedAt}). Автоочистка через 30 дней.</span>
              </div>
            )}

            {/* Main Scrollable Document Canvas */}
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10">
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Title & Quiet Metadata */}
                <div>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) =>
                        onUpdateNote({ ...activeNote, title: e.target.value, updatedAt: 'Только что' })
                      }
                      placeholder="Название заметки..."
                      className="w-full text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-50 bg-transparent focus:outline-none"
                    />
                  ) : (
                    <h1 className="text-2xl font-display font-bold tracking-tight text-slate-900 dark:text-slate-50">
                      {activeNote.title || 'Без названия'}
                    </h1>
                  )}

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{folders.find((f) => f.id === activeNote.folderId)?.name || 'Личное'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">Обновлено: {activeNote.updatedAt}</span>
                    <span aria-hidden="true">·</span>
                    <span>Шифрование на устройстве</span>
                    <span aria-hidden="true">·</span>
                    <div className="inline-flex items-center gap-1.5 flex-wrap">
                      {activeNote.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-0.5 text-slate-600 dark:text-slate-300">
                          #{tag}
                          {mode === 'edit' && (
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateNote({
                                  ...activeNote,
                                  tags: activeNote.tags.filter((t) => t !== tag),
                                })
                              }
                              className="text-slate-400 hover:text-red-500 ml-0.5 cursor-pointer"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))}
                      {mode === 'edit' && (
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTagInput.trim()) {
                              e.preventDefault();
                              const clean = newTagInput.trim().replace(/^#/, '');
                              if (!activeNote.tags.includes(clean)) {
                                onUpdateNote({ ...activeNote, tags: [...activeNote.tags, clean] });
                              }
                              setNewTagInput('');
                            }
                          }}
                          placeholder="+ тег"
                          className="w-16 bg-transparent text-xs text-slate-600 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:w-24 transition-all"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Blocks */}
                <div className="space-y-6">
                  {activeNote.blocks.map((block) => (
                    <div key={block.id} className="group relative">
                      {mode === 'edit' && (
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          title="Удалить блок"
                          className="opacity-0 group-hover:opacity-100 absolute -right-2 -top-2 p-1 rounded-md bg-white dark:bg-[#1C2432] border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 transition-opacity z-10 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* MARKDOWN BLOCK */}
                      {block.type === 'markdown' &&
                        (mode === 'edit' ? (
                          <textarea
                            value={block.content}
                            onChange={(e) =>
                              updateBlock(block.id, (b) =>
                                b.type === 'markdown' ? { ...b, content: e.target.value } : b
                              )
                            }
                            rows={Math.max(3, block.content.split('\n').length + 1)}
                            placeholder="Текст заметки (поддерживается **жирный**, `код`, - списки, ## заголовки)..."
                            className="w-full p-3.5 rounded-xl bg-[#FAFBFD] dark:bg-[#10151D] border border-slate-200/80 dark:border-slate-800 text-[15px] leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500/60 resize-y"
                          />
                        ) : (
                          <div className="py-1">{renderMarkdownProse(block.content)}</div>
                        ))}

                      {/* SPREADSHEET BLOCK WITH LIVE FORMULAS */}
                      {block.type === 'spreadsheet' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11161F] overflow-hidden">
                          <div className="px-3.5 py-2.5 bg-slate-50/90 dark:bg-[#161D29] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              {mode === 'edit' ? (
                                <input
                                  type="text"
                                  value={block.title}
                                  onChange={(e) =>
                                    updateBlock(block.id, (b) =>
                                      b.type === 'spreadsheet' ? { ...b, title: e.target.value } : b
                                    )
                                  }
                                  className="text-xs font-semibold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                                />
                              ) : (
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {block.title}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {mode === 'edit' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBlock(block.id, (b) =>
                                      b.type === 'spreadsheet'
                                        ? {
                                            ...b,
                                            data: {
                                              ...b.data,
                                              rows: [
                                                ...b.data.rows,
                                                b.data.columns.map(() => ''),
                                              ],
                                            },
                                          }
                                        : b
                                    )
                                  }
                                  className="text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer whitespace-nowrap"
                                >
                                  + Строка
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  exportSpreadsheetToExcelCsv(block.title, block.data);
                                  onLog('success', 'Spreadsheet', `Таблица «${block.title}» экспортирована для Excel (.csv)`);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Экспорт в Excel</span>
                              </button>
                            </div>
                          </div>

                          {/* Formula Bar when cell is focused */}
                          {mode === 'edit' && activeCell?.blockId === block.id && (
                            <div className="px-3.5 py-1.5 bg-blue-50/60 dark:bg-blue-950/30 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-mono">
                              <span className="text-blue-700 dark:text-blue-300 font-semibold w-10 shrink-0">
                                {colIndexToLetter(activeCell.c)}
                                {activeCell.r + 1}
                              </span>
                              <span className="text-slate-400">fx</span>
                              <input
                                type="text"
                                value={block.data.rows[activeCell.r]?.[activeCell.c] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBlock(block.id, (b) => {
                                    if (b.type !== 'spreadsheet') return b;
                                    const nextRows = b.data.rows.map((row, rIdx) =>
                                      rIdx === activeCell.r
                                        ? row.map((cell, cIdx) => (cIdx === activeCell.c ? val : cell))
                                        : row
                                    );
                                    return { ...b, data: { ...b.data, rows: nextRows } };
                                  });
                                }}
                                placeholder="Введите значение или формулу (=SUM(D1:D4), =B1*C1)"
                                className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                              />
                            </div>
                          )}

                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50/70 dark:bg-[#151C27] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                                  <th className="w-8 py-2 text-center font-mono text-[10px] border-r border-slate-200/80 dark:border-slate-800">
                                    #
                                  </th>
                                  {block.data.columns.map((col, cIdx) => (
                                    <th
                                      key={cIdx}
                                      className={`py-2 px-3 font-medium border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 ${
                                        cIdx === 0 ? 'text-left' : 'text-right'
                                      }`}
                                    >
                                      <span className="text-[10px] font-mono text-slate-400 mr-1.5">
                                        {colIndexToLetter(cIdx)}
                                      </span>
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
                                {block.data.rows.map((row, rIdx) => {
                                  const isSummaryRow =
                                    row[0]?.toLowerCase().includes('итого') ||
                                    row[0]?.toLowerCase().includes('средн');
                                  return (
                                    <tr
                                      key={rIdx}
                                      className={
                                        isSummaryRow
                                          ? 'bg-slate-50/90 dark:bg-slate-800/40 font-semibold'
                                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'
                                      }
                                    >
                                      <td className="py-2 text-center font-mono text-[10px] text-slate-400 border-r border-slate-200/80 dark:border-slate-800 tabular-nums">
                                        {rIdx + 1}
                                      </td>
                                      {row.map((cell, cIdx) => {
                                        const isFormula = cell.trim().startsWith('=');
                                        const isFocused =
                                          activeCell?.blockId === block.id &&
                                          activeCell.r === rIdx &&
                                          activeCell.c === cIdx;
                                        const displayVal = evaluateCellDisplay(
                                          cell,
                                          block.data.rows,
                                          rIdx,
                                          cIdx
                                        );

                                        return (
                                          <td
                                            key={cIdx}
                                            onClick={() =>
                                              mode === 'edit' &&
                                              setActiveCell({ blockId: block.id, r: rIdx, c: cIdx })
                                            }
                                            className={`p-0 border-r last:border-r-0 border-slate-200/70 dark:border-slate-800 ${
                                              isFocused ? 'ring-2 ring-inset ring-blue-500' : ''
                                            }`}
                                          >
                                            {mode === 'edit' && isFocused ? (
                                              <input
                                                type="text"
                                                autoFocus
                                                value={cell}
                                                onChange={(e) => {
                                                  const val = e.target.value;
                                                  updateBlock(block.id, (b) => {
                                                    if (b.type !== 'spreadsheet') return b;
                                                    const nextRows = b.data.rows.map((rw, ri) =>
                                                      ri === rIdx
                                                        ? rw.map((cl, ci) => (ci === cIdx ? val : cl))
                                                        : rw
                                                    );
                                                    return { ...b, data: { ...b.data, rows: nextRows } };
                                                  });
                                                }}
                                                className={`w-full px-3 py-2 bg-white dark:bg-[#192231] text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none ${
                                                  cIdx === 0 ? 'text-left' : 'text-right'
                                                }`}
                                              />
                                            ) : (
                                              <div
                                                className={`px-3 py-2 tabular-nums ${
                                                  cIdx === 0 ? 'text-left' : 'text-right font-mono'
                                                } ${
                                                  isFormula
                                                    ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-slate-800 dark:text-slate-200'
                                                }`}
                                                title={isFormula ? `Формула: ${cell}` : undefined}
                                              >
                                                {displayVal || '—'}
                                              </div>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* CHECKLIST BLOCK */}
                      {block.type === 'checklist' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-[#FAFBFD] dark:bg-[#11161F]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {block.title}
                            </span>
                            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                              Выполнено {block.items.filter((i) => i.done).length} из {block.items.length}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {block.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBlock(block.id, (b) =>
                                      b.type === 'checklist'
                                        ? {
                                            ...b,
                                            items: b.items.map((it) =>
                                              it.id === item.id ? { ...it, done: !it.done } : it
                                            ),
                                          }
                                        : b
                                    )
                                  }
                                  className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                                    item.done
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                                  }`}
                                >
                                  {item.done && <Check className="w-3 h-3" />}
                                </button>
                                {mode === 'edit' ? (
                                  <input
                                    type="text"
                                    value={item.text}
                                    onChange={(e) =>
                                      updateBlock(block.id, (b) =>
                                        b.type === 'checklist'
                                          ? {
                                              ...b,
                                              items: b.items.map((it) =>
                                                it.id === item.id ? { ...it, text: e.target.value } : it
                                              ),
                                            }
                                          : b
                                      )
                                    }
                                    className={`flex-1 bg-transparent text-sm focus:outline-none ${
                                      item.done
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  />
                                ) : (
                                  <span
                                    className={`text-sm ${
                                      item.done
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-200'
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                          {mode === 'edit' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateBlock(block.id, (b) =>
                                  b.type === 'checklist'
                                    ? {
                                        ...b,
                                        items: [
                                          ...b.items,
                                          { id: `ci-${Date.now()}`, text: 'Новая задача', done: false },
                                        ],
                                      }
                                    : b
                                )
                              }
                              className="mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                            >
                              + Добавить пункт
                            </button>
                          )}
                        </div>
                      )}

                      {/* VOICE MEMO BLOCK */}
                      {block.type === 'voice' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-[#FAFBFD] dark:bg-[#11161F] space-y-3">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingVoiceId(playingVoiceId === block.id ? null : block.id)
                                }
                                className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                              >
                                {playingVoiceId === block.id ? (
                                  <Square className="w-3.5 h-3.5 fill-white" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                                )}
                              </button>
                              <div>
                                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {block.title}
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                                  0:{String(block.data.durationSec).padStart(2, '0')} · {block.data.recordedAt} · Локальная расшифровка
                                </div>
                              </div>
                            </div>
                            {mode === 'edit' && (
                              <button
                                type="button"
                                onClick={() => handleVoiceRecordBlock(block.id)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                                  recordingBlockId === block.id
                                    ? 'bg-red-600 text-white'
                                    : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <Mic className="w-3.5 h-3.5" />
                                <span>
                                  {recordingBlockId === block.id ? 'Слушаю речь...' : 'Перезаписать речь'}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Waveform bars */}
                          <div className="flex items-end gap-1 h-8 px-1">
                            {block.data.waveform.map((h, i) => (
                              <div
                                key={i}
                                style={{ height: `${Math.max(15, h)}%` }}
                                className={`flex-1 rounded-full transition-colors ${
                                  playingVoiceId === block.id && i % 2 === 0
                                    ? 'bg-blue-600 dark:bg-blue-400'
                                    : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                            {block.data.transcript}
                          </div>
                        </div>
                      )}

                      {/* IMAGE / FILE ATTACHMENT BLOCK */}
                      {block.type === 'attachment' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#FAFBFD] dark:bg-[#11161F]">
                          {block.data.kind === 'image' && block.data.url ? (
                            <figure>
                              <img
                                src={block.data.url}
                                alt={block.data.caption || block.data.name}
                                referrerPolicy="no-referrer"
                                className="w-full max-h-[340px] object-cover"
                              />
                              <figcaption className="px-4 py-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-800">
                                <span>{block.data.caption || block.data.name}</span>
                                <span className="font-mono text-[11px]">{block.data.sizeLabel}</span>
                              </figcaption>
                            </figure>
                          ) : (
                            <div className="px-4 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <Paperclip className="w-4 h-4 text-slate-500 shrink-0" />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {block.data.name}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    {block.data.sizeLabel}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* EMBEDDED CALENDAR (.ICS) BLOCK */}
                      {block.type === 'ics' && (
                        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-[#FAFBFD] dark:bg-[#11161F]">
                          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {block.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                exportEventsToIcs(block.title, block.events);
                                onLog('success', 'Calendar / ICS', `Экспортирован файл .ics (${block.events.length} событий)`);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Скачать .ics</span>
                            </button>
                          </div>
                          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
                            {block.events.map((ev) => (
                              <div
                                key={ev.id}
                                className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                              >
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {ev.title}
                                  </div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                                    {ev.date} · {ev.time}
                                    {ev.location ? ` · ${ev.location}` : ''}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  disabled={ev.addedToCalendar}
                                  onClick={() => {
                                    onAddEventFromIcs(ev);
                                    updateBlock(block.id, (b) =>
                                      b.type === 'ics'
                                        ? {
                                            ...b,
                                            events: b.events.map((item) =>
                                              item.id === ev.id
                                                ? { ...item, addedToCalendar: true }
                                                : item
                                            ),
                                          }
                                        : b
                                    );
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                                    ev.addedToCalendar
                                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 cursor-default'
                                      : 'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                                  }`}
                                >
                                  <CalendarPlus className="w-3.5 h-3.5" />
                                  <span>{ev.addedToCalendar ? 'В календаре' : 'В календарь'}</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Block Constructor Bar */}
                {mode === 'edit' && !activeNote.trashedAt && (
                  <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-slate-400 mr-1">Добавить блок:</span>
                      <button
                        type="button"
                        onClick={() => addBlock('markdown')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Текст</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('checklist')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Чек-лист</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('spreadsheet')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Table2 className="w-3.5 h-3.5" />
                        <span>Таблица Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('voice')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>Голос</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('attachment')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Фото / Файл</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => addBlock('ics')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>События .ics</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Version History Slide-over */}
            {showHistory && (
              <div className="absolute right-0 top-12 bottom-0 w-72 bg-white dark:bg-[#161D29] border-l border-slate-200 dark:border-slate-800 shadow-lg z-20 flex flex-col">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    История версий
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowHistory(false)}
                    className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSaveSnapshotVersion}
                    className="w-full py-2 px-3 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    Сохранить текущую версию
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800">
                  {activeNote.versions.length === 0 ? (
                    <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                      Пока нет сохранённых точек отката.
                    </div>
                  ) : (
                    activeNote.versions.map((ver) => (
                      <div key={ver.id} className="p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ver.savedAt}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{ver.summary}</p>
                        <button
                          type="button"
                          onClick={() => handleRollbackVersion(ver.id)}
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          Восстановить эту версию
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import / Export Modal */}
      {showImportExport && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowImportExport(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Импорт и экспорт заметок
              </h3>
              <button
                type="button"
                onClick={() => setShowImportExport(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Импорт из сторонних баз (с авто-страховкой)
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['Joplin (.jex)', 'Evernote (.enex)', 'Obsidian (.md)'].map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => handleSimulatedImport(src.split(' ')[0])}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                  >
                    {src}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Экспорт текущей заметки
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportMarkdown}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  Скачать Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportExport(false);
                    setMode('preview');
                    setTimeout(() => window.print(), 150);
                  }}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Печать / Сохранить PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
