import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  FolderSync,
  GitMerge,
  HardDrive,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
} from 'lucide-react';
import {
  AndroidBackupItem,
  AppSettings,
  AutoUploadFolder,
  BackupSnapshot,
  SyncConflict,
} from '../types/asrbox';
import { downloadTextFile } from '../utils/formulaEngine';

interface SyncModuleProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  conflicts: SyncConflict[];
  onResolveConflict: (id: string, strategy: 'merge_both' | 'keep_local' | 'keep_remote') => void;
  backups: BackupSnapshot[];
  onCreateBackup: (label: string, kind: BackupSnapshot['kind']) => void;
  onRestoreBackup: (id: string) => void;
  autoUploadFolders: AutoUploadFolder[];
  onToggleAutoUpload: (id: string) => void;
  onAddAutoUploadFolder: (localPath: string, remoteTarget: string) => void;
  androidBackupItems: AndroidBackupItem[];
  onToggleAndroidBackup: (id: AndroidBackupItem['id']) => void;
  onRunAndroidBackupNow: () => void;
  isSyncing: boolean;
  lastSyncLabel: string;
  onTriggerSync: () => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
}

const PROVIDERS = [
  {
    id: 'webdav_yandex' as const,
    name: 'Яндекс Диск (WebDAV)',
    endpoint: 'https://webdav.yandex.ru/ASRbox_Encrypted/',
    hint: 'Зашифрованные контейнеры .asrb передаются напрямую по протоколу WebDAV.',
  },
  {
    id: 'webdav_mailru' as const,
    name: 'Облако Mail.ru (WebDAV)',
    endpoint: 'https://webdav.cloud.mail.ru/ASRbox_Vault/',
    hint: 'Поддержка пароля приложений, сервер не видит содержимое файлов.',
  },
  {
    id: 'gdrive' as const,
    name: 'Google Диск',
    endpoint: 'gdrive://AppData/ASRbox_Encrypted/',
    hint: 'Изолированная скрытая папка приложения с клиентским шифрованием.',
  },
  {
    id: 'local_folder' as const,
    name: 'Локальная папка / USB / NAS',
    endpoint: 'E:\\ASRbox_Portable\\SyncMirror\\',
    hint: 'Полностью автономная синхронизация через флешку, локальную сеть или Syncthing.',
  },
];

export const SyncModule: React.FC<SyncModuleProps> = ({
  settings,
  onUpdateSettings,
  conflicts,
  onResolveConflict,
  backups,
  onCreateBackup,
  onRestoreBackup,
  autoUploadFolders,
  onToggleAutoUpload,
  onAddAutoUploadFolder,
  androidBackupItems,
  onToggleAndroidBackup,
  onRunAndroidBackupNow,
  isSyncing,
  lastSyncLabel,
  onTriggerSync,
  onLog,
}) => {
  const [newFolderPath, setNewFolderPath] = useState('');
  const [addingFolder, setAddingFolder] = useState(false);

  const unresolvedConflicts = conflicts.filter((c) => !c.resolved);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-[#141A23] p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header & Manual Sync CTA */}
        <div className="flex items-start justify-between gap-4 flex-wrap pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h1 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
              Синхронизация и страховка данных
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Шифрование XChaCha20-Poly1305 выполняется на устройстве до отправки · Последняя синхронизация: {lastSyncLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onCreateBackup('Ручной полный бэкап (.asrb-bak)', 'manual')}
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Создать бэкап</span>
            </button>
            <button
              type="button"
              onClick={onTriggerSync}
              disabled={isSyncing}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Шифрование и отправка...' : 'Синхронизировать сейчас'}</span>
            </button>
          </div>
        </div>

        {/* Smart Conflict Merge Panel (if any unresolved) */}
        {unresolvedConflicts.length > 0 && (
          <div className="rounded-xl border border-amber-300/80 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
              <GitMerge className="w-4 h-4" />
              <span>Умное слияние правок — ничего не потеряется</span>
            </div>
            {unresolvedConflicts.map((conf) => (
              <div key={conf.id} className="space-y-3">
                <div className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  Объект: «{conf.itemTitle}»
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400 mb-1">
                      Локальная правка · {conf.localTime}
                    </div>
                    <div className="text-slate-800 dark:text-slate-200">{conf.localVersion}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-mono text-slate-400 mb-1">
                      Облачная правка · {conf.remoteTime}
                    </div>
                    <div className="text-slate-800 dark:text-slate-200">{conf.remoteVersion}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onResolveConflict(conf.id, 'merge_both')}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer"
                  >
                    Объединить обе правки (рекомендуется)
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveConflict(conf.id, 'keep_local')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Оставить версию Windows
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveConflict(conf.id, 'keep_remote')}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Оставить версию Android
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cloud Provider Selection & Schedule */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
              Свобода выбора облака
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {PROVIDERS.map((prov) => {
                const selected = settings.syncProvider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => {
                      onUpdateSettings({ syncProvider: prov.id, syncEndpoint: prov.endpoint });
                      onLog('info', 'Sync', `Выбран транспорт синхронизации: ${prov.name}`);
                    }}
                    className={`text-left p-4 rounded-xl border transition-colors cursor-pointer space-y-1.5 ${
                      selected
                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {prov.name}
                      </span>
                      {selected && <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />}
                    </div>
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {prov.hint}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="pt-1">
              <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                Адрес хранилища / Путь к папке
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={settings.syncEndpoint}
                  onChange={(e) => onUpdateSettings({ syncEndpoint: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#FAFBFD] dark:bg-[#11161F] font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium whitespace-nowrap">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Zero-Knowledge</span>
                </span>
              </div>
            </div>
          </div>

          {/* Schedule & Portable Settings */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] p-5 space-y-4">
            <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
              Расписание и режим
            </h2>
            <div className="space-y-3 text-xs">
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <span className="text-slate-700 dark:text-slate-300">Фоновая синхронизация</span>
                <input
                  type="checkbox"
                  checked={settings.backgroundSync}
                  onChange={(e) => onUpdateSettings({ backgroundSync: e.target.checked })}
                  className="accent-blue-600 w-4 h-4"
                />
              </label>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-700 dark:text-slate-300">Интервал проверки</span>
                <select
                  value={settings.syncIntervalMinutes}
                  onChange={(e) => onUpdateSettings({ syncIntervalMinutes: Number(e.target.value) })}
                  className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18202C] text-slate-800 dark:text-slate-200"
                >
                  <option value={5}>Каждые 5 мин</option>
                  <option value={15}>Каждые 15 мин</option>
                  <option value={60}>Каждый час</option>
                  <option value={0}>Только вручную</option>
                </select>
              </div>
              <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 cursor-pointer">
                <div>
                  <div className="text-slate-800 dark:text-slate-200 font-medium">
                    Портативный режим (USB)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Все ключи и базы рядом с ASRbox.exe
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.portableMode}
                  onChange={(e) => {
                    onUpdateSettings({ portableMode: e.target.checked });
                    onLog(
                      'info',
                      'PortableMode',
                      e.target.checked
                        ? 'Включён портативный режим: хранение данных в локальной папке запуска'
                        : 'Переключено на системный профиль пользователя'
                    );
                  }}
                  className="accent-blue-600 w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Backups & Safety Snapshots */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                Зашифрованные бэкапы и страховочные копии
              </h2>
              <span className="text-[11px] text-slate-500 tabular-nums">{backups.length} копий</span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
              {backups.map((bak) => (
                <div key={bak.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {bak.label}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                      {bak.createdAt} · {bak.sizeLabel} ·{' '}
                      {bak.kind === 'safety'
                        ? 'Авто-страховка'
                        : bak.kind === 'scheduled'
                        ? 'По расписанию'
                        : 'Ручной'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        downloadTextFile(
                          `ASRbox-backup-${bak.id}.asrb-bak`,
                          `ASRBOX_ENCRYPTED_ARCHIVE_V2\nID:${bak.id}\nCREATED:${bak.createdAt}\nCIPHER:XChaCha20-Poly1305`
                        );
                        onLog('info', 'Backup', `Скачан архив бэкапа «${bak.label}»`);
                      }}
                      title="Скачать зашифрованный архив"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestoreBackup(bak.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 cursor-pointer whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Восстановить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Auto-Upload Local Folders + Android Phone Backup */}
          <div className="space-y-6">
            {/* Auto-upload folders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-slate-400" />
                  <span>Автовыгрузка выбранных папок на сервер</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setAddingFolder((v) => !v)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Папка
                </button>
              </div>

              {addingFolder && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newFolderPath.trim()) return;
                    onAddAutoUploadFolder(
                      newFolderPath.trim(),
                      `/ASRbox_Encrypted/AutoUpload/${newFolderPath.split(/[\\/]/).pop() || 'Folder'}/`
                    );
                    setNewFolderPath('');
                    setAddingFolder(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={newFolderPath}
                    onChange={(e) => setNewFolderPath(e.target.value)}
                    placeholder="Например: D:\Архив\Чеки"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs font-mono text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium cursor-pointer"
                  >
                    Добавить
                  </button>
                </form>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                {autoUploadFolders.map((folder) => (
                  <div key={folder.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {folder.localPath}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        → {folder.remoteTarget} · {folder.lastUploaded}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={folder.enabled}
                      onChange={() => onToggleAutoUpload(folder.id)}
                      className="accent-blue-600 w-4 h-4 shrink-0 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Android Phone Backup */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-400" />
                  <span>Бэкап данных смартфона (Android)</span>
                </h2>
                <button
                  type="button"
                  onClick={onRunAndroidBackupNow}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Сохранить сейчас
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800 bg-[#FAFBFD] dark:bg-[#11161F]">
                {androidBackupItems.map((item) => (
                  <label
                    key={item.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-white dark:hover:bg-[#161E2B]"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {item.countLabel} · {item.lastBackup}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={() => onToggleAndroidBackup(item.id)}
                      className="accent-blue-600 w-4 h-4 shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
