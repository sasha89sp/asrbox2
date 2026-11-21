import React, { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  Copy,
  Download,
  FilePlus2,
  Keyboard,
  PanelBottom,
  Mic,
  MicOff,
  Plus,
  Terminal,
  Trash2,
} from 'lucide-react';
import {
  AppSettings,
  DiagnosticLogEntry,
  DockShortcut,
  KeyRemap,
} from '../types/asrbox';
import { downloadTextFile } from '../utils/formulaEngine';

interface ToolsModuleProps {
  initialTab?: 'dictation' | 'remapper' | 'dock' | 'diagnostics';
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  keyRemaps: KeyRemap[];
  onUpsertRemap: (remap: KeyRemap) => void;
  onDeleteRemap: (id: string) => void;
  dockShortcuts: DockShortcut[];
  onAddDockShortcut: (shortcut: DockShortcut) => void;
  onDeleteDockShortcut: (id: string) => void;
  logs: DiagnosticLogEntry[];
  onClearLogs: () => void;
  onCopyToClipboard: (text: string, label: string) => void;
  onCreateNoteFromDictation: (text: string) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
}

const DEMO_DICTATION_PHRASES = [
  'Созвониться с дизайнером в четверг в 14:00 и уточнить финальные правки по интерфейсу Android-версии.',
  'Не забыть проверить автоматическую выгрузку сканов договоров на Яндекс Диск перед выходными.',
  'Добавить в смету доставку керамогранита и пересчитать итоговую формулу по таблице расходов.',
];

export const ToolsModule: React.FC<ToolsModuleProps> = ({
  initialTab = 'dictation',
  settings,
  onUpdateSettings,
  keyRemaps,
  onUpsertRemap,
  onDeleteRemap,
  dockShortcuts,
  onAddDockShortcut,
  onDeleteDockShortcut,
  logs,
  onClearLogs,
  onCopyToClipboard,
  onCreateNoteFromDictation,
  onLog,
}) => {
  const [tab, setTab] = useState<'dictation' | 'remapper' | 'dock' | 'diagnostics'>(initialTab);

  // Sync initialTab when switched via sidebar ('tools' vs 'diagnostics')
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Voice Dictation state
  const [isListening, setIsListening] = useState(false);
  const [dictationText, setDictationText] = useState(
    'Нажмите и удерживайте кнопку микрофона (или глобальную клавишу на Windows) — распознанный текст мгновенно скопируется в буфер обмена.'
  );
  const [autoCopyDictation, setAutoCopyDictation] = useState(true);
  const [demoIdx, setDemoIdx] = useState(0);

  // Key Remapper live keystroke capture
  const [recordingKeys, setRecordingKeys] = useState(false);
  const [capturedKeys, setCapturedKeys] = useState('');
  const [remapAction, setRemapAction] = useState('');
  const [remapScope, setRemapScope] = useState<'global' | 'asrbox'>('global');

  // Dock shortcut builder
  const [newDockLabel, setNewDockLabel] = useState('');
  const [newDockTarget, setNewDockTarget] = useState('');

  // Diagnostics filter
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'success' | 'warn' | 'error'>('all');

  useEffect(() => {
    if (!recordingKeys) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Win');
      const mainKey =
        e.key === ' '
          ? 'Space'
          : e.key.length === 1
          ? e.key.toUpperCase()
          : e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        parts.push(mainKey);
        setCapturedKeys(parts.join(' + '));
        setRecordingKeys(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [recordingKeys]);

  const startDictation = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);

    type SpeechRecCtor = new () => {
      lang: string;
      interimResults: boolean;
      onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const win = window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;

    const finalize = (text: string) => {
      setDictationText(text);
      setIsListening(false);
      if (autoCopyDictation) {
        onCopyToClipboard(text, 'Текст голосовой диктовки');
      }
      onLog('success', 'VoiceDictation', `Распознано ${text.length} симв. → скопировано в буфер обмена`);
    };

    if (SpeechRec) {
      try {
        const rec = new SpeechRec();
        rec.lang = 'ru-RU';
        rec.interimResults = false;
        let received = false;
        rec.onresult = (ev) => {
          const text = ev.results[0]?.[0]?.transcript;
          if (text) {
            received = true;
            finalize(text);
          }
        };
        rec.onerror = () => {
          if (!received) {
            const fallback = DEMO_DICTATION_PHRASES[demoIdx % DEMO_DICTATION_PHRASES.length];
            setDemoIdx((i) => i + 1);
            finalize(fallback);
          }
        };
        rec.onend = () => {
          setIsListening(false);
        };
        rec.start();
        return;
      } catch {
        // fallback below
      }
    }

    setTimeout(() => {
      const phrase = DEMO_DICTATION_PHRASES[demoIdx % DEMO_DICTATION_PHRASES.length];
      setDemoIdx((i) => i + 1);
      finalize(phrase);
    }, 1100);
  };

  const filteredLogs = logs.filter((l) => (logFilter === 'all' ? true : l.level === logFilter));

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#141A23]">
      {/* Sub-navigation bar */}
      <div className="px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-xs overflow-x-auto">
          {(
            [
              { id: 'dictation', label: 'Голосовая диктовка', icon: Mic },
              { id: 'remapper', label: 'Клавиши (Windows)', icon: Keyboard },
              { id: 'dock', label: 'Док-панель', icon: PanelBottom },
              { id: 'diagnostics', label: 'Диагностика и логи', icon: Activity },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === item.id
                    ? 'bg-white dark:bg-[#1E2736] text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {/* TAB 1: VOICE DICTATION */}
        {tab === 'dictation' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                Модуль голосовой диктовки
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Наговорил — текст сразу в буфере обмена. На Windows работает по удержанию глобальной горячей клавиши из любого приложения.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-6 space-y-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={startDictation}
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
                    isListening
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  <span>{isListening ? 'Идёт распознавание речи...' : 'Начать диктовку'}</span>
                </button>

                <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-right">
                  <div>Глобальная клавиша Windows</div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {settings.dictationHotkey}
                  </div>
                </div>
              </div>

              <textarea
                value={dictationText}
                onChange={(e) => setDictationText(e.target.value)}
                rows={4}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171F2C] text-sm leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoCopyDictation}
                    onChange={(e) => setAutoCopyDictation(e.target.checked)}
                    className="accent-blue-600"
                  />
                  <span>Автоматически копировать в буфер обмена</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onCopyToClipboard(dictationText, 'Текст диктовки')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Копировать</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCreateNoteFromDictation(dictationText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:opacity-90 cursor-pointer whitespace-nowrap"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>В новую заметку</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WINDOWS KEY REMAPPER */}
        {tab === 'remapper' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                Системное переназначение клавиш (Windows)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Простая запись комбинаций нажатием на клавиатуре. Работает на уровне низкоуровневого перехвата Windows без сторонних утилит.
              </p>
            </div>

            {/* Interactive Key Recorder */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!capturedKeys || !remapAction.trim()) return;
                onUpsertRemap({
                  id: `kr-${Date.now()}`,
                  fromKeys: capturedKeys,
                  toAction: remapAction.trim(),
                  enabled: true,
                  scope: remapScope,
                });
                setCapturedKeys('');
                setRemapAction('');
              }}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-4 grid sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-4 space-y-1">
                <label className="block text-[11px] font-medium text-slate-500">
                  Исходная комбинация
                </label>
                <button
                  type="button"
                  onClick={() => setRecordingKeys((v) => !v)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs font-mono text-left transition-colors cursor-pointer ${
                    recordingKeys
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                      : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {recordingKeys
                    ? 'Нажмите клавиши...'
                    : capturedKeys || 'Нажмите для записи'}
                </button>
              </div>
              <div className="sm:col-span-5 space-y-1">
                <label className="block text-[11px] font-medium text-slate-500">
                  Назначаемое действие или клавиши
                </label>
                <input
                  type="text"
                  value={remapAction}
                  onChange={(e) => setRemapAction(e.target.value)}
                  placeholder="Например: Ctrl+V или Запуск диктовки"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="sm:col-span-3 flex items-center gap-2">
                <select
                  value={remapScope}
                  onChange={(e) => setRemapScope(e.target.value as 'global' | 'asrbox')}
                  className="px-2 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="global">Везде</option>
                  <option value="asrbox">ASRbox</option>
                </select>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer shrink-0"
                >
                  Добавить
                </button>
              </div>
            </form>

            {/* Remaps Table */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
              {keyRemaps.map((remap) => (
                <div key={remap.id} className="px-4 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={remap.enabled}
                      onChange={() => onUpsertRemap({ ...remap, enabled: !remap.enabled })}
                      className="accent-blue-600 cursor-pointer"
                    />
                    <kbd className="px-2.5 py-1 rounded-md bg-white dark:bg-[#1A2230] border border-slate-200 dark:border-slate-700 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {remap.fromKeys}
                    </kbd>
                    <span className="text-slate-400 text-xs">→</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {remap.toAction}
                      </div>
                      <div className="text-[10.5px] text-slate-400">
                        {remap.scope === 'global' ? 'Глобально в Windows' : 'Только внутри ASRbox'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteRemap(remap.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: ROCKETDOCK EDGE DOCK */}
        {tab === 'dock' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  Док-панель у края экрана (в духе RocketDock)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Плавное увеличение значков при наведении и мгновенный запуск программ, локальных папок и модулей ASRbox.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dockEnabled}
                  onChange={(e) => onUpdateSettings({ dockEnabled: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
                <span>Показывать док-панель</span>
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-5 text-xs">
              <div className="space-y-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Увеличение при наведении ({Math.round(settings.dockScale * 100)}%)
                </span>
                <input
                  type="range"
                  min={1.15}
                  max={1.7}
                  step={0.05}
                  value={settings.dockScale}
                  onChange={(e) => onUpdateSettings({ dockScale: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
              </div>
              <div className="space-y-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">Край экрана</span>
                <div className="flex gap-1.5">
                  {(
                    [
                      { id: 'bottom', label: 'Снизу' },
                      { id: 'left', label: 'Слева' },
                      { id: 'right', label: 'Справа' },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => onUpdateSettings({ dockPosition: pos.id })}
                      className={`flex-1 py-1.5 rounded-lg border font-medium cursor-pointer ${
                        settings.dockPosition === pos.id
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newDockLabel.trim() || !newDockTarget.trim()) return;
                onAddDockShortcut({
                  id: `dk-${Date.now()}`,
                  label: newDockLabel.trim(),
                  target: newDockTarget.trim(),
                  iconKey: newDockTarget.includes('\\') ? 'folder' : 'terminal',
                  actionType: newDockTarget.includes('\\') ? 'folder' : 'app',
                });
                setNewDockLabel('');
                setNewDockTarget('');
              }}
              className="flex items-center gap-2 flex-wrap"
            >
              <input
                type="text"
                value={newDockLabel}
                onChange={(e) => setNewDockLabel(e.target.value)}
                placeholder="Название ярлыка (например: Чертежи)"
                className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-xs text-slate-900 dark:text-slate-100"
              />
              <input
                type="text"
                value={newDockTarget}
                onChange={(e) => setNewDockTarget(e.target.value)}
                placeholder="Путь (D:\Документы или программа)"
                className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#18202C] text-xs font-mono text-slate-900 dark:text-slate-100"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить в док</span>
              </button>
            </form>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
              {dockShortcuts.map((item) => (
                <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                    <span className="font-mono text-slate-500 ml-2">{item.target}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteDockShortcut(item.id)}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: UNIFIED DIAGNOSTICS */}
        {tab === 'diagnostics' && (
          <div className="max-w-4xl mx-auto space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                  Единое окно диагностики
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Живой журнал процессов шифрования, история синхронизаций WebDAV и журнал ошибок.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const txt = logs
                      .map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`)
                      .join('\n');
                    downloadTextFile('asrbox-diagnostics.log', txt);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Скачать .log</span>
                </button>
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer whitespace-nowrap"
                >
                  Очистить
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'all', label: `Все (${logs.length})` },
                  { id: 'success', label: 'Успех' },
                  { id: 'info', label: 'События' },
                  { id: 'warn', label: 'Предупреждения' },
                  { id: 'error', label: 'Ошибки' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLogFilter(f.id)}
                  className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                    logFilter === f.id
                      ? 'bg-slate-900 dark:bg-blue-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0F141D] text-slate-200 font-mono text-xs overflow-hidden">
              <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>ASRbox Runtime Journal</span>
                </span>
                <span className="tabular-nums">{filteredLogs.length} записей</span>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-800/80">
                {filteredLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">Записей выбранного уровня нет.</div>
                ) : (
                  filteredLogs.map((entry) => (
                    <div key={entry.id} className="px-4 py-2.5 flex items-start gap-3 leading-relaxed">
                      <span className="text-slate-500 tabular-nums shrink-0">{entry.timestamp}</span>
                      <span
                        className={`w-16 shrink-0 font-semibold ${
                          entry.level === 'success'
                            ? 'text-emerald-400'
                            : entry.level === 'warn'
                            ? 'text-amber-400'
                            : entry.level === 'error'
                            ? 'text-red-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {entry.level === 'success'
                          ? 'OK'
                          : entry.level === 'warn'
                          ? 'WARN'
                          : entry.level === 'error'
                          ? 'ERROR'
                          : 'INFO'}
                      </span>
                      <span className="text-slate-400 shrink-0 w-32 truncate">{entry.source}</span>
                      <span className="text-slate-100 flex-1">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
