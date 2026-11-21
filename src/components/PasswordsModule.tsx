import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  Folder,
  History,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  PasswordEntry,
  PasswordExtraField,
  PasswordSortKey,
  PasswordVault,
} from '../types/asrbox';
import {
  evaluatePasswordStrength,
  generatePassword,
} from '../utils/cryptoHelpers';
import { downloadTextFile } from '../utils/formulaEngine';

interface PasswordsModuleProps {
  vaults: PasswordVault[];
  entries: PasswordEntry[];
  unlockedVaultIds: Record<string, boolean>;
  onUnlockVault: (vaultId: string) => void;
  onLockVault: (vaultId: string) => void;
  onUpdateVault: (vault: PasswordVault) => void;
  onCreateVault: (name: string, masterPassword: string, hint: string) => void;
  onUpsertEntry: (entry: PasswordEntry, isNew?: boolean) => void;
  onDeleteEntriesPermanently: (ids: string[]) => void;
  onCopySecret: (value: string, label: string) => void;
  onCreateSafetySnapshot: (reason: string) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
  isAndroidView?: boolean;
  compact?: boolean;
}

export const PasswordsModule: React.FC<PasswordsModuleProps> = ({
  vaults,
  entries,
  unlockedVaultIds,
  onUnlockVault,
  onLockVault,
  onUpdateVault,
  onCreateVault,
  onUpsertEntry,
  onDeleteEntriesPermanently,
  onCopySecret,
  onCreateSafetySnapshot,
  onLog,
  isAndroidView = false,
  compact = false,
}) => {
  const [activeVaultId, setActiveVaultId] = useState<string>(vaults[0]?.id || 'v-personal');
  const [activeFolder, setActiveFolder] = useState<string>('Все');
  const [showTrash, setShowTrash] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [revealPassword, setRevealPassword] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showNewVaultModal, setShowNewVaultModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkIds, setBulkIds] = useState<string[]>([]);
  const [newVaultName, setNewVaultName] = useState('');
  const [newVaultMaster, setNewVaultMaster] = useState('');
  const [newVaultHint, setNewVaultHint] = useState('');

  // Generator options
  const [genLength, setGenLength] = useState(18);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [genExcludeSimilar, setGenExcludeSimilar] = useState(true);

  const activeVault = vaults.find((v) => v.id === activeVaultId) || vaults[0];
  const isUnlocked = Boolean(
    activeVault && (unlockedVaultIds[activeVault.id] || activeVault.rememberMode === 'autologin')
  );

  const vaultEntries = useMemo(
    () => entries.filter((e) => e.vaultId === activeVault?.id),
    [entries, activeVault]
  );

  // Duplicate password detection (within isolated vault only)
  const duplicateMap = useMemo(() => {
    const counts: Record<string, number> = {};
    vaultEntries
      .filter((e) => !e.trashed && e.password)
      .forEach((e) => {
        counts[e.password] = (counts[e.password] || 0) + 1;
      });
    return counts;
  }, [vaultEntries]);

  const auditStats = useMemo(() => {
    const active = vaultEntries.filter((e) => !e.trashed);
    const weak = active.filter((e) => evaluatePasswordStrength(e.password).score <= 2);
    const reused = active.filter((e) => (duplicateMap[e.password] || 0) > 1);
    return { total: active.length, weak, reused };
  }, [vaultEntries, duplicateMap]);

  const activeSortKey: PasswordSortKey =
    (activeFolder !== 'Все' && activeVault?.folderSorts[activeFolder]) ||
    activeVault?.globalSort ||
    'title';

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vaultEntries
      .filter((e) => {
        if (showTrash) return e.trashed;
        if (e.trashed) return false;
        if (activeFolder !== 'Все' && e.folder !== activeFolder) return false;
        if (q) {
          return (
            e.title.toLowerCase().includes(q) ||
            e.username.toLowerCase().includes(q) ||
            e.url.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (activeSortKey === 'title') return a.title.localeCompare(b.title, 'ru');
        if (activeSortKey === 'strength') {
          return evaluatePasswordStrength(a.password).score - evaluatePasswordStrength(b.password).score;
        }
        return a.updatedAt.localeCompare(b.updatedAt, 'ru');
      });
  }, [vaultEntries, showTrash, activeFolder, search, activeSortKey]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((e) => e.id === selectedEntryId) || filteredEntries[0] || null,
    [filteredEntries, selectedEntryId]
  );

  const handleAttemptUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVault) return;
    if (activeVault.failedAttempts >= 10) {
      setUnlockError('Сейф заблокирован после 10 неверных попыток. Сбросьте таймер защиты.');
      return;
    }
    if (passwordInput === activeVault.masterPassword) {
      onUpdateVault({ ...activeVault, failedAttempts: 0, lockedUntil: null });
      onUnlockVault(activeVault.id);
      setPasswordInput('');
      setUnlockError('');
    } else {
      const nextAttempts = activeVault.failedAttempts + 1;
      onUpdateVault({
        ...activeVault,
        failedAttempts: nextAttempts,
        lockedUntil: nextAttempts >= 10 ? Date.now() + 300000 : null,
      });
      setUnlockError(
        nextAttempts >= 10
          ? 'Превышен лимит (10 из 10). Вход временно заблокирован.'
          : `Неверный мастер-пароль. Попытка ${nextAttempts} из 10.`
      );
      onLog('warn', `Vault / ${activeVault.name}`, `Неудачная попытка входа (${nextAttempts}/10)`);
    }
  };

  const handleCreateEntry = () => {
    if (!activeVault) return;
    const generated = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: true,
    });
    const entry: PasswordEntry = {
      id: `p-${Date.now()}`,
      vaultId: activeVault.id,
      folder: activeFolder === 'Все' ? activeVault.folders[1] || 'Документы' : activeFolder,
      title: 'Новая запись',
      username: '',
      password: generated,
      url: 'https://',
      notes: '',
      updatedAt: 'Только что',
      trashed: false,
      extraFields: [],
      history: [],
    };
    onUpsertEntry(entry, true);
    setSelectedEntryId(entry.id);
    setShowTrash(false);
    setRevealPassword(true);
  };

  const handlePasswordChange = (newPassword: string) => {
    if (!selectedEntry) return;
    const shouldArchive =
      selectedEntry.password &&
      selectedEntry.password !== newPassword &&
      selectedEntry.password.length >= 4;
    const nextHistory = shouldArchive
      ? [
          {
            id: `ph-${Date.now()}`,
            changedAt: 'Только что',
            previousPassword: selectedEntry.password,
            note: 'Изменение пароля',
          },
          ...selectedEntry.history.slice(0, 9),
        ]
      : selectedEntry.history;
    onUpsertEntry({
      ...selectedEntry,
      password: newPassword,
      updatedAt: 'Только что',
      history: nextHistory,
    });
  };

  const handleAddExtraField = (kind: PasswordExtraField['kind']) => {
    if (!selectedEntry) return;
    const labelMap = {
      pin: 'PIN-код',
      card: 'Банковская карта',
      question: 'Секретный вопрос',
      custom: 'Доп. поле',
    };
    const nextField: PasswordExtraField = {
      id: `ef-${Date.now()}`,
      kind,
      label: labelMap[kind],
      value: '',
      secret: kind === 'pin' || kind === 'question',
    };
    onUpsertEntry({
      ...selectedEntry,
      updatedAt: 'Только что',
      extraFields: [...selectedEntry.extraFields, nextField],
    });
  };

  const handleBulkTrash = () => {
    if (bulkIds.length === 0) return;
    onCreateSafetySnapshot(`Перед массовым удалением ${bulkIds.length} записей в корзину сейфа`);
    bulkIds.forEach((id) => {
      const target = vaultEntries.find((e) => e.id === id);
      if (target) onUpsertEntry({ ...target, trashed: true });
    });
    setBulkIds([]);
    setBulkMode(false);
    onLog('info', `Vault / ${activeVault.name}`, `В корзину перемещено записей: ${bulkIds.length}`);
  };

  const handleImportExternal = (format: 'Bitwarden' | 'KeePass') => {
    if (!activeVault) return;
    onCreateSafetySnapshot(`Перед импортом из ${format}`);
    const imported: PasswordEntry = {
      id: `p-imp-${Date.now()}`,
      vaultId: activeVault.id,
      folder: activeVault.folders[1] || 'Документы',
      title: `Импорт из ${format} — Личный кабинет`,
      username: 'user@domain.ru',
      password: generatePassword({
        length: 20,
        uppercase: true,
        lowercase: true,
        numbers: true,
        symbols: true,
        excludeSimilar: true,
      }),
      url: 'https://service.example.ru',
      notes: `Импортировано из ${format}. Локально зашифровано ключом сейфа «${activeVault.name}».`,
      updatedAt: 'Только что',
      trashed: false,
      extraFields: [],
      history: [],
    };
    onUpsertEntry(imported, true);
    setSelectedEntryId(imported.id);
    setShowImportModal(false);
    onLog('success', `Vault / ${activeVault.name}`, `Импортирована запись из ${format}`);
  };

  if (!activeVault) return null;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#141A23]">
      {/* Isolated Vault Selector Strip */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {vaults.map((vault) => {
            const unlocked = Boolean(
              unlockedVaultIds[vault.id] || vault.rememberMode === 'autologin'
            );
            const active = vault.id === activeVault.id;
            return (
              <button
                key={vault.id}
                type="button"
                onClick={() => {
                  setActiveVaultId(vault.id);
                  setActiveFolder('Все');
                  setShowTrash(false);
                  setUnlockError('');
                  setPasswordInput('');
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {unlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{vault.name}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setShowNewVaultModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Новый сейф</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          {isUnlocked && (
            <>
              <button
                type="button"
                onClick={() => setShowAudit((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  auditStats.weak.length > 0 || auditStats.reused.length > 0
                    ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>
                  Аудит ({auditStats.weak.length} слаб. · {auditStats.reused.length} повт.)
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Импорт</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateVault({ ...activeVault, rememberMode: 'none' });
                  onLockVault(activeVault.id);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-red-600 hover:border-red-300 dark:hover:border-red-700 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Закрыть сейф</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* LOCKED VAULT SCREEN */}
      {!isUnlocked ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-7 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-blue-600 text-white flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-50">
                  {activeVault.name}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Изолированное хранилище · Локальный ключ Argon2id
                </p>
              </div>
            </div>

            {/* Open Hint */}
            <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171E2A] border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-slate-100">Подсказка: </span>
              {activeVault.hint}
            </div>

            <form onSubmit={handleAttemptUnlock} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Мастер-пароль сейфа
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={activeVault.failedAttempts >= 10}
                  placeholder="Введите мастер-пароль..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#171E2A] border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              {unlockError && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{unlockError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={activeVault.failedAttempts >= 10}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Открыть сейф
                </button>
                {activeVault.rememberMode === 'biometrics' && activeVault.failedAttempts < 10 && (
                  <button
                    type="button"
                    onClick={() => {
                      onUnlockVault(activeVault.id);
                      onLog('success', `Vault / ${activeVault.name}`, 'Сейф разблокирован по биометрии');
                    }}
                    title="Вход по биометрии (Windows Hello / Отпечаток Android)"
                    className="inline-flex items-center gap-1.5 py-2.5 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#171E2A] text-slate-700 dark:text-slate-200 hover:border-blue-500 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Fingerprint className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Биометрия</span>
                  </button>
                )}
              </div>
            </form>

            {activeVault.failedAttempts >= 10 && (
              <button
                type="button"
                onClick={() => {
                  onUpdateVault({ ...activeVault, failedAttempts: 0, lockedUntil: null });
                  setUnlockError('');
                }}
                className="w-full py-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Снять демо-блокировку (сбросить счётчик попыток)
              </button>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 tabular-nums">
              <span>Защита: блок после 10 неверных попыток</span>
              <span>Автоблок: {activeVault.autoLockMinutes} мин</span>
            </div>
          </div>
        </div>
      ) : (
        /* UNLOCKED VAULT WORKSPACE */
        <div className="flex flex-1 min-h-0">
          {/* Left Column: Folders, 2-Level Sorting, Entry List */}
          <div
            className={`flex flex-col border-r border-slate-200 dark:border-slate-800 ${
              compact ? 'w-full' : 'w-[300px] shrink-0'
            } min-h-0 bg-[#FAFBFD] dark:bg-[#11161F]`}
          >
            {/* Search & Create */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск логина или сайта..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-[13px] rounded-lg bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateEntry}
                  className="h-8 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Запись</span>
                </button>
              </div>

              {/* Vault Folders */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
                {activeVault.folders.map((folder) => (
                  <button
                    key={folder}
                    type="button"
                    onClick={() => {
                      setActiveFolder(folder);
                      setShowTrash(false);
                    }}
                    className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      !showTrash && activeFolder === folder
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                    }`}
                  >
                    {folder}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTrash(true)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    showTrash
                      ? 'bg-red-600 text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  Корзина ({vaultEntries.filter((e) => e.trashed).length})
                </button>
              </div>

              {/* Two-Level Sort & Bulk Select */}
              <div className="flex items-center justify-between text-[11.5px] text-slate-500 dark:text-slate-400 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3" />
                  <select
                    value={activeSortKey}
                    onChange={(e) => {
                      const sortVal = e.target.value as PasswordSortKey;
                      if (activeFolder === 'Все') {
                        onUpdateVault({ ...activeVault, globalSort: sortVal });
                      } else {
                        onUpdateVault({
                          ...activeVault,
                          folderSorts: { ...activeVault.folderSorts, [activeFolder]: sortVal },
                        });
                      }
                    }}
                    className="bg-transparent text-slate-700 dark:text-slate-300 font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="title" className="dark:bg-slate-900">
                      {activeFolder === 'Все' ? 'Общая: По имени' : `Папка: По имени`}
                    </option>
                    <option value="updatedAt" className="dark:bg-slate-900">
                      {activeFolder === 'Все' ? 'Общая: По дате' : `Папка: По дате`}
                    </option>
                    <option value="strength" className="dark:bg-slate-900">
                      {activeFolder === 'Все' ? 'Общая: По стойкости' : `Папка: По стойкости`}
                    </option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBulkMode((v) => !v);
                    setBulkIds([]);
                  }}
                  className={`font-medium cursor-pointer ${
                    bulkMode ? 'text-blue-600 dark:text-blue-400' : 'hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {bulkMode ? 'Готово' : 'Выбрать'}
                </button>
              </div>

              {bulkMode && bulkIds.length > 0 && (
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/15 text-xs">
                  <span className="font-medium text-blue-700 dark:text-blue-300 tabular-nums">
                    Выбрано: {bulkIds.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleBulkTrash}
                    className="text-red-600 dark:text-red-400 font-medium hover:underline cursor-pointer"
                  >
                    В корзину
                  </button>
                </div>
              )}
            </div>

            {showTrash && (
              <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
                Корзина сейфа не очищается автоматически — защита от потери доступов.
              </div>
            )}

            {/* Entries List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {filteredEntries.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Записей нет.
                </div>
              ) : (
                filteredEntries.map((entry) => {
                  const isSel = selectedEntry?.id === entry.id;
                  const strength = evaluatePasswordStrength(entry.password);
                  const isDuplicate = !entry.trashed && (duplicateMap[entry.password] || 0) > 1;
                  return (
                    <div
                      key={entry.id}
                      onClick={() => {
                        if (bulkMode) {
                          setBulkIds((prev) =>
                            prev.includes(entry.id)
                              ? prev.filter((id) => id !== entry.id)
                              : [...prev, entry.id]
                          );
                        } else {
                          setSelectedEntryId(entry.id);
                          setRevealPassword(false);
                        }
                      }}
                      className={`px-3.5 py-3 flex items-start gap-2.5 cursor-pointer transition-colors ${
                        isSel
                          ? 'bg-blue-50/80 dark:bg-blue-500/12'
                          : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {bulkMode && (
                        <input
                          type="checkbox"
                          checked={bulkIds.includes(entry.id)}
                          onChange={() => {}}
                          className="mt-1 accent-blue-600"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13.5px] font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {entry.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCopySecret(entry.password, `Пароль «${entry.title}»`);
                            }}
                            title="Копировать пароль (автоочистка буфера)"
                            className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {entry.username || 'Без логина'}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] mt-1.5">
                          <span className="text-slate-400">{entry.folder}</span>
                          <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                          <span
                            className={
                              strength.tone === 'danger'
                                ? 'text-red-600 dark:text-red-400 font-medium'
                                : strength.tone === 'warn'
                                ? 'text-amber-600 dark:text-amber-400 font-medium'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {strength.label}
                          </span>
                          {isDuplicate && (
                            <>
                              <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                              <span className="text-red-600 dark:text-red-400 font-medium">Повтор</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Vault Security Settings Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 space-y-2 text-[11.5px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span>Автоблокировка</span>
                <select
                  value={activeVault.autoLockMinutes}
                  onChange={(e) =>
                    onUpdateVault({ ...activeVault, autoLockMinutes: Number(e.target.value) })
                  }
                  className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value={1} className="dark:bg-slate-900">1 мин</option>
                  <option value={5} className="dark:bg-slate-900">5 мин</option>
                  <option value={15} className="dark:bg-slate-900">15 мин</option>
                  <option value={30} className="dark:bg-slate-900">30 мин</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Вход в сейф</span>
                <select
                  value={activeVault.rememberMode}
                  onChange={(e) =>
                    onUpdateVault({
                      ...activeVault,
                      rememberMode: e.target.value as PasswordVault['rememberMode'],
                    })
                  }
                  className="bg-transparent font-medium text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="none" className="dark:bg-slate-900">Всегда пароль</option>
                  <option value="biometrics" className="dark:bg-slate-900">Биометрия</option>
                  <option value="autologin" className="dark:bg-slate-900">Автовход</option>
                </select>
              </div>
            </div>
          </div>

          {/* Right Column: Entry Editor, Generator, Audit */}
          {!compact && (
            <div className="flex-1 overflow-y-auto p-6 md:p-8 min-w-0">
              {showAudit ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-display font-bold text-slate-900 dark:text-slate-100">
                        Локальный аудит сейфа «{activeVault.name}»
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Проверка выполняется строго офлайн на устройстве. Внешние базы утечек не опрашиваются.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAudit(false)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      К записям
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Всего записей</div>
                      <div className="text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-100 mt-1">
                        {auditStats.total}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Слабые пароли</div>
                      <div className="text-2xl font-display font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                        {auditStats.weak.length}
                      </div>
                    </div>
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                      <div className="text-xs text-slate-500 dark:text-slate-400">Повторы паролей</div>
                      <div className="text-2xl font-display font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
                        {auditStats.reused.length}
                      </div>
                    </div>
                  </div>

                  {auditStats.reused.length > 0 && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
                      <div className="px-4 py-2.5 bg-red-50/60 dark:bg-red-950/20 text-xs font-semibold text-red-700 dark:text-red-300">
                        Повторяющиеся пароли ({auditStats.reused.length})
                      </div>
                      {auditStats.reused.map((item) => (
                        <div key={item.id} className="px-4 py-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              {item.title}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.username}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntryId(item.id);
                              setShowAudit(false);
                              setShowGenerator(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                          >
                            Заменить пароль
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {auditStats.weak.length === 0 && auditStats.reused.length === 0 && (
                    <div className="p-6 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>Все пароли в этом сейфе уникальны и обладают высокой энтропией.</span>
                    </div>
                  )}
                </div>
              ) : !selectedEntry ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-sm text-slate-500 dark:text-slate-400">
                  Выберите запись слева или создайте новую.
                </div>
              ) : (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Entry Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={selectedEntry.title}
                        onChange={(e) =>
                          onUpsertEntry({ ...selectedEntry, title: e.target.value, updatedAt: 'Только что' })
                        }
                        className="w-full text-xl font-display font-bold text-slate-900 dark:text-slate-50 bg-transparent focus:outline-none"
                      />
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <Folder className="w-3.5 h-3.5" />
                        <select
                          value={selectedEntry.folder}
                          onChange={(e) =>
                            onUpsertEntry({ ...selectedEntry, folder: e.target.value, updatedAt: 'Только что' })
                          }
                          className="bg-transparent font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                        >
                          {activeVault.folders
                            .filter((f) => f !== 'Все')
                            .map((f) => (
                              <option key={f} value={f} className="dark:bg-slate-900">
                                {f}
                              </option>
                            ))}
                        </select>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">Изменено: {selectedEntry.updatedAt}</span>
                        {isAndroidView && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-blue-600 dark:text-blue-400">Автозаполнение Android готово</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowHistory((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>История ({selectedEntry.history.length})</span>
                      </button>
                      {selectedEntry.trashed ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onUpsertEntry({ ...selectedEntry, trashed: false })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Восстановить</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntriesPermanently([selectedEntry.id])}
                            className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs font-medium cursor-pointer whitespace-nowrap"
                          >
                            Удалить
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpsertEntry({ ...selectedEntry, trashed: true })}
                          title="В корзину сейфа (без автоочистки)"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Primary Credentials */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/80 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                    {/* Login */}
                    <div className="p-3.5 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <label className="block text-[11px] text-slate-500 dark:text-slate-400">Логин / Email</label>
                        <input
                          type="text"
                          value={selectedEntry.username}
                          onChange={(e) =>
                            onUpsertEntry({ ...selectedEntry, username: e.target.value, updatedAt: 'Только что' })
                          }
                          className="w-full mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onCopySecret(selectedEntry.username, 'Логин')}
                        className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                        title="Копировать логин"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Password */}
                    <div className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[11px] text-slate-500 dark:text-slate-400">Пароль</label>
                          <input
                            type={revealPassword ? 'text' : 'password'}
                            value={selectedEntry.password}
                            onChange={(e) => handlePasswordChange(e.target.value)}
                            className="w-full mt-0.5 font-mono text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setRevealPassword((v) => !v)}
                            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                            title={revealPassword ? 'Скрыть' : 'Показать'}
                          >
                            {revealPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowGenerator((v) => !v)}
                            className={`p-2 rounded-lg transition-colors cursor-pointer ${
                              showGenerator
                                ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400'
                                : 'text-slate-500 hover:text-blue-600'
                            }`}
                            title="Генератор паролей"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onCopySecret(selectedEntry.password, `Пароль «${selectedEntry.title}»`)
                            }
                            className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                            title="Копировать пароль (автоочистка буфера 20с)"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Strength Bar & Duplicate Warning */}
                      {(() => {
                        const st = evaluatePasswordStrength(selectedEntry.password);
                        const isDup = !selectedEntry.trashed && (duplicateMap[selectedEntry.password] || 0) > 1;
                        return (
                          <div className="space-y-1.5">
                            <div className="flex gap-1 h-1">
                              {[1, 2, 3, 4].map((seg) => (
                                <div
                                  key={seg}
                                  className={`flex-1 rounded-full ${
                                    seg <= st.score
                                      ? st.tone === 'danger'
                                        ? 'bg-red-500'
                                        : st.tone === 'warn'
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                      : 'bg-slate-200 dark:bg-slate-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-[11px] tabular-nums">
                              <span className="text-slate-500 dark:text-slate-400">
                                Надёжность: <strong className="text-slate-800 dark:text-slate-200">{st.label}</strong> ({st.entropyBits} бит)
                              </span>
                              {isDup && (
                                <span className="text-red-600 dark:text-red-400 font-medium">
                                  Внимание: пароль используется в другой записи
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Inline Password Generator */}
                      {showGenerator && (
                        <div className="mt-2 p-3.5 rounded-xl bg-white dark:bg-[#171F2C] border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              Генератор паролей
                            </span>
                            <span className="font-mono tabular-nums text-slate-500">Длина: {genLength}</span>
                          </div>
                          <input
                            type="range"
                            min={8}
                            max={48}
                            value={genLength}
                            onChange={(e) => setGenLength(Number(e.target.value))}
                            className="w-full accent-blue-600"
                          />
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={genUpper} onChange={(e) => setGenUpper(e.target.checked)} className="accent-blue-600" />
                              <span>Заглавные (A–Z)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={genLower} onChange={(e) => setGenLower(e.target.checked)} className="accent-blue-600" />
                              <span>Строчные (a–z)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={genNumbers} onChange={(e) => setGenNumbers(e.target.checked)} className="accent-blue-600" />
                              <span>Цифры (0–9)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={genSymbols} onChange={(e) => setGenSymbols(e.target.checked)} className="accent-blue-600" />
                              <span>Символы (!@#$%)</span>
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1 border-t border-slate-100 dark:border-slate-800">
                            <input
                              type="checkbox"
                              checked={genExcludeSimilar}
                              onChange={(e) => setGenExcludeSimilar(e.target.checked)}
                              className="accent-blue-600"
                            />
                            <span>Исключить похожие символы (0, O, 1, l, I)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = generatePassword({
                                length: genLength,
                                uppercase: genUpper,
                                lowercase: genLower,
                                numbers: genNumbers,
                                symbols: genSymbols,
                                excludeSimilar: genExcludeSimilar,
                              });
                              handlePasswordChange(next);
                              setRevealPassword(true);
                              onLog('info', `Vault / ${activeVault.name}`, `Сгенерирован новый пароль (${genLength} симв.)`);
                            }}
                            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
                          >
                            Сгенерировать и применить
                          </button>
                        </div>
                      )}
                    </div>

                    {/* URL */}
                    <div className="p-3.5">
                      <label className="block text-[11px] text-slate-500 dark:text-slate-400">Адрес сайта / Сервера</label>
                      <input
                        type="text"
                        value={selectedEntry.url}
                        onChange={(e) =>
                          onUpsertEntry({ ...selectedEntry, url: e.target.value, updatedAt: 'Только что' })
                        }
                        className="w-full mt-0.5 text-sm text-blue-600 dark:text-blue-400 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Extra Fields (PIN, Cards, Secret Questions) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Дополнительные поля
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => handleAddExtraField('pin')}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          + PIN
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddExtraField('card')}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          + Карта
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddExtraField('question')}
                          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          + Секретный вопрос
                        </button>
                      </div>
                    </div>

                    {selectedEntry.extraFields.length > 0 && (
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                        {selectedEntry.extraFields.map((field) => (
                          <div key={field.id} className="p-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) =>
                                  onUpsertEntry({
                                    ...selectedEntry,
                                    extraFields: selectedEntry.extraFields.map((f) =>
                                      f.id === field.id ? { ...f, label: e.target.value } : f
                                    ),
                                  })
                                }
                                className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-transparent focus:outline-none"
                              />
                              <input
                                type={field.secret && !revealPassword ? 'password' : 'text'}
                                value={field.value}
                                onChange={(e) =>
                                  onUpsertEntry({
                                    ...selectedEntry,
                                    extraFields: selectedEntry.extraFields.map((f) =>
                                      f.id === field.id ? { ...f, value: e.target.value } : f
                                    ),
                                  })
                                }
                                placeholder="Значение..."
                                className="w-full font-mono text-sm text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => onCopySecret(field.value, field.label)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpsertEntry({
                                  ...selectedEntry,
                                  extraFields: selectedEntry.extraFields.filter((f) => f.id !== field.id),
                                })
                              }
                              className="p-1.5 text-slate-400 hover:text-red-500 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1.5">
                      Заметка к записи
                    </label>
                    <textarea
                      value={selectedEntry.notes}
                      onChange={(e) =>
                        onUpsertEntry({ ...selectedEntry, notes: e.target.value, updatedAt: 'Только что' })
                      }
                      rows={3}
                      placeholder="Дополнительные сведения..."
                      className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Entry Change History */}
                  {showHistory && (
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] divide-y divide-slate-200/70 dark:divide-slate-800">
                      <div className="px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                        История изменений пароля
                      </div>
                      {selectedEntry.history.length === 0 ? (
                        <div className="p-4 text-xs text-slate-500 dark:text-slate-400">
                          Изменений пароля ещё не зафиксировано.
                        </div>
                      ) : (
                        selectedEntry.history.map((h) => (
                          <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-3">
                            <div>
                              <div className="font-mono text-xs text-slate-800 dark:text-slate-200">
                                {revealPassword ? h.previousPassword : '••••••••••••'}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                {h.changedAt} · {h.note}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                handlePasswordChange(h.previousPassword);
                                onLog('info', `Vault / ${activeVault.name}`, `Выполнен откат пароля для «${selectedEntry.title}»`);
                              }}
                              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Откатить
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Privacy Philosophy Note */}
                  <div className="text-[11.5px] text-slate-400 dark:text-slate-500 pt-2">
                    Сейф полностью изолирован. Коды 2FA, внешние проверки по базам утечек и общий доступ к паролям намеренно исключены ради автономности.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Vault Modal */}
      {showNewVaultModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowNewVaultModal(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newVaultName.trim() || !newVaultMaster.trim()) return;
              onCreateVault(
                newVaultName.trim(),
                newVaultMaster.trim(),
                newVaultHint.trim() || `Подсказка: ${newVaultMaster.trim()}`
              );
              setNewVaultName('');
              setNewVaultMaster('');
              setNewVaultHint('');
              setShowNewVaultModal(false);
            }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Создать изолированный сейф
              </h3>
              <button
                type="button"
                onClick={() => setShowNewVaultModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Название сейфа
                </label>
                <input
                  type="text"
                  required
                  value={newVaultName}
                  onChange={(e) => setNewVaultName(e.target.value)}
                  placeholder="Например: Криптокошельки или Бизнес"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Мастер-пароль
                </label>
                <input
                  type="password"
                  required
                  value={newVaultMaster}
                  onChange={(e) => setNewVaultMaster(e.target.value)}
                  placeholder="Независимый пароль для этого сейфа"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Открытая подсказка
                </label>
                <input
                  type="text"
                  value={newVaultHint}
                  onChange={(e) => setNewVaultHint(e.target.value)}
                  placeholder="Показывается на экране блокировки"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewVaultModal(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Создать сейф
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Import / Export Vault Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowImportModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Импорт и экспорт сейфа «{activeVault.name}»
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleImportExternal('Bitwarden')}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
              >
                Импорт Bitwarden (.json)
              </button>
              <button
                type="button"
                onClick={() => handleImportExternal('KeePass')}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-200 hover:border-blue-500 cursor-pointer"
              >
                Импорт KeePass (.kdbx / .xml)
              </button>
            </div>
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const payload = JSON.stringify(
                    { vault: activeVault.name, exportedAt: new Date().toISOString(), entries: vaultEntries },
                    null,
                    2
                  );
                  downloadTextFile(`${activeVault.name}.json`, payload, 'application/json');
                  onLog('success', `Vault / ${activeVault.name}`, 'Экспортирована резервная копия сейфа (.json)');
                  setShowImportModal(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium hover:opacity-90 cursor-pointer"
              >
                Экспортировать сейф (JSON)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
