import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';

class AsrboxStore extends ChangeNotifier {
  ThemeMode themeMode = ThemeMode.light;
  bool portableMode = true;
  double zoomFactor = 1.0;
  bool showRightPanel = true;
  bool swapColumns = false;
  double leftSidebarWidth = 240;
  double rightPanelWidth = 286;
  bool dockEnabled = true;
  double dockScale = 1.38;
  String dictationHotkey = 'Ctrl + Shift + Space';

  String syncProvider = 'webdav_yandex';
  String syncEndpoint = 'https://webdav.yandex.ru/ASRbox_Encrypted/';
  int syncIntervalMinutes = 15;
  bool backgroundSync = true;
  bool isSyncing = false;
  String lastSyncLabel = '14:20';

  AsrModuleId activeModule = AsrModuleId.notes;
  String? selectedNoteId;
  CalendarEventItem? activeReminder;

  String clipboardLabel = '';
  int clipboardSecondsLeft = 0;
  bool clipboardIsSecret = false;
  Timer? _clipboardTimer;

  final Map<AsrModuleId, bool> enabledModules = {
    AsrModuleId.notes: true,
    AsrModuleId.passwords: true,
    AsrModuleId.calendar: true,
    AsrModuleId.shared: true,
    AsrModuleId.sync: true,
    AsrModuleId.tools: true,
    AsrModuleId.diagnostics: true,
  };

  final Map<String, bool> unlockedVaultIds = {};

  late List<NoteFolder> folders;
  late List<NoteItem> notes;
  late List<PasswordVault> vaults;
  late List<PasswordEntry> passwordEntries;
  late List<CalendarSource> calendars;
  late List<CalendarEventItem> events;
  late List<SharedGroup> groups;
  late List<SyncConflict> conflicts;
  late List<BackupSnapshot> backups;
  late List<AutoUploadFolder> autoUploadFolders;
  late List<AndroidBackupItem> androidBackupItems;
  late List<KeyRemapItem> keyRemaps;
  late List<DockShortcutItem> dockShortcuts;
  late List<DiagnosticLogItem> logs;

  AsrboxStore() {
    _seedInitialData();
  }

  void _seedInitialData() {
    final today = CryptoService.todayIso(0);
    final tomorrow = CryptoService.todayIso(1);
    final inTwoDays = CryptoService.todayIso(2);

    folders = [
      const NoteFolder(id: 'f-personal', name: 'Личное'),
      const NoteFolder(id: 'f-home', name: 'Ремонт и дом', parentId: 'f-personal'),
      const NoteFolder(id: 'f-work', name: 'Работа'),
      const NoteFolder(id: 'f-release', name: 'Релиз 2026', parentId: 'f-work'),
      const NoteFolder(id: 'f-finance', name: 'Финансы'),
    ];

    notes = [
      NoteItem(
        id: 'n-renovation',
        title: 'Смета ремонта и план квартиры',
        folderId: 'f-home',
        tags: ['дом', 'бюджет', 'таблица'],
        isFavorite: true,
        isPinned: true,
        updatedAt: 'Сегодня, 14:20',
        blocks: [
          NoteBlock(
            id: 'b-md-1',
            type: NoteBlockType.markdown,
            content:
                'Основные договорённости с прорабом зафиксированы локально. Черновая отделка завершается в пятницу, электрика проверена по схеме.\n\nТаблица ниже автоматически пересчитывается по формулам.',
          ),
          NoteBlock(
            id: 'b-sheet-1',
            type: NoteBlockType.spreadsheet,
            title: 'Бюджет материалов (формулы активны)',
            columns: ['Статья расходов', 'Кол-во', 'Цена, ₽', 'Сумма, ₽'],
            rows: [
              ['Инженерная доска дуб, м²', '48', '3850', '=B1*C1'],
              ['Керамогранит ванная, м²', '22', '2400', '=B2*C2'],
              ['Освещение трековое', '4', '14900', '=B3*C3'],
              ['Розетки и щиток ABB', '1', '34500', '=B4*C4'],
              ['Итого по смете', '', '', '=SUM(D1:D4)'],
              ['Средний чек позиции', '', '', '=AVG(D1:D4)'],
            ],
          ),
          NoteBlock(
            id: 'b-chk-1',
            type: NoteBlockType.checklist,
            title: 'Контрольный список перед приёмкой',
            checklist: [
              ChecklistItem(id: 'c1', text: 'Проверить уровень стяжки лазерным нивелиром', done: true),
              ChecklistItem(id: 'c2', text: 'Сделать фото скрытой разводки труб', done: true),
              ChecklistItem(id: 'c3', text: 'Согласовать доставку дверей', done: false),
            ],
          ),
          NoteBlock(
            id: 'b-ics-1',
            type: NoteBlockType.ics,
            title: 'События этапа (.ics)',
            icsEvents: [
              EmbeddedIcsEvent(
                id: 'ics-1',
                title: 'Приёмка электрики с инженером',
                date: tomorrow,
                time: '11:00',
                location: 'ул. Садовая, кв. 42',
              ),
              EmbeddedIcsEvent(
                id: 'ics-2',
                title: 'Доставка паркетной доски',
                date: inTwoDays,
                time: '15:30',
                location: 'Подъезд 2',
              ),
            ],
          ),
        ],
        versions: const [
          NoteVersion(
            id: 'v-1',
            savedAt: 'Вчера, 19:45',
            summary: 'Добавлена таблица сметы с формулами SUM и AVG',
            title: 'Смета ремонта и план квартиры',
            firstMarkdown: 'Черновая версия сметы до согласования освещения.',
          ),
        ],
      ),
      NoteItem(
        id: 'n-release',
        title: 'Дорожная карта: синхронизация WebDAV и офлайн-поиск',
        folderId: 'f-release',
        tags: ['архитектура', 'работа'],
        isFavorite: true,
        isPinned: true,
        updatedAt: 'Сегодня, 11:05',
        blocks: [
          NoteBlock(
            id: 'b-md-2',
            type: NoteBlockType.markdown,
            content:
                'Все пользовательские файлы шифруются на устройстве до отправки на сервер WebDAV. Портативная версия под Windows запускается прямо с USB-флешки без записи в реестр.',
          ),
          NoteBlock(
            id: 'b-voice-1',
            type: NoteBlockType.voice,
            title: 'Голосовая заметка после утреннего созвона',
            voiceDurationSec: 42,
            voiceTranscript:
                'Проверить автоочистку буфера обмена через 20 секунд и протестировать переподключение Яндекс Диска при обрыве Wi-Fi.',
          ),
        ],
      ),
      NoteItem(
        id: 'n-trashed',
        title: 'Старый список покупок (в корзине)',
        folderId: 'f-personal',
        tags: ['личное'],
        updatedAt: '5 дн. назад',
        trashedAt: 'Удалено 5 дн. назад · осталось 25 дн.',
        blocks: [
          NoteBlock(
            id: 'b-tr-1',
            type: NoteBlockType.markdown,
            content: 'Заметка хранится в корзине 30 дней перед автоматической очисткой.',
          ),
        ],
      ),
    ];
    selectedNoteId = notes.first.id;

    vaults = [
      PasswordVault(
        id: 'v-personal',
        name: 'Личный сейф',
        masterPassword: '1234',
        hint: 'Демо-пароль: 1234 (или вход по биометрии)',
        autoLockMinutes: 5,
        rememberMode: 'biometrics',
        folders: ['Все', 'Банки', 'Почта и сервисы', 'Документы'],
      ),
      PasswordVault(
        id: 'v-work',
        name: 'Рабочие доступы',
        masterPassword: 'work',
        hint: 'Демо-пароль: work',
        autoLockMinutes: 15,
        rememberMode: 'none',
        folders: ['Все', 'Серверы', 'Git и CI'],
      ),
      PasswordVault(
        id: 'v-family',
        name: 'Дом и документы',
        masterPassword: 'home',
        hint: 'Демо-пароль: home',
        autoLockMinutes: 10,
        rememberMode: 'autologin',
        folders: ['Все', 'ЖКХ и роутеры', 'Карты'],
      ),
    ];

    passwordEntries = [
      PasswordEntry(
        id: 'p-1',
        vaultId: 'v-personal',
        folder: 'Почта и сервисы',
        title: 'Яндекс ID и WebDAV',
        username: 'alexey.sokolov@yandex.ru',
        password: 'Kq9#mV4!pR7@xN2wZ8',
        url: 'https://id.yandex.ru',
        notes: 'Основной аккаунт для зашифрованной синхронизации ASRbox.',
        updatedAt: 'Сегодня, 09:30',
        extraFields: [
          PasswordExtraField(
            id: 'ef-1',
            kind: 'question',
            label: 'Секретный вопрос',
            value: 'Гимназия №14',
            secret: true,
          ),
        ],
        history: const [
          PasswordHistoryItem(
            id: 'ph-1',
            changedAt: '12 окт, 18:10',
            previousPassword: 'OldYandexPass2024!',
            note: 'Плановая смена пароля',
          ),
        ],
      ),
      PasswordEntry(
        id: 'p-2',
        vaultId: 'v-personal',
        folder: 'Банки',
        title: 'Основная дебетовая карта',
        username: '+7 916 555-01-42',
        password: 'Tr8\$vL3%nB6^yM9c',
        url: 'https://online.bank.local',
        updatedAt: 'Вчера, 16:40',
        extraFields: [
          PasswordExtraField(
            id: 'ef-2',
            kind: 'card',
            label: 'Номер карты',
            value: '2200 7004 8812 4901',
          ),
          PasswordExtraField(
            id: 'ef-3',
            kind: 'pin',
            label: 'PIN-код',
            value: '4829',
            secret: true,
          ),
        ],
      ),
      PasswordEntry(
        id: 'p-3',
        vaultId: 'v-personal',
        folder: 'Почта и сервисы',
        title: 'Форум проектировщиков',
        username: 'asokolov',
        password: 'spring2025',
        url: 'https://arch-club.ru',
        updatedAt: '3 нед. назад',
      ),
      PasswordEntry(
        id: 'p-4',
        vaultId: 'v-personal',
        folder: 'Документы',
        title: 'Портал строймаркета',
        username: 'alexey.sokolov@yandex.ru',
        password: 'spring2025',
        url: 'https://stroymarket.ru',
        updatedAt: '2 нед. назад',
      ),
      PasswordEntry(
        id: 'p-5',
        vaultId: 'v-personal',
        folder: 'Почта и сервисы',
        title: 'Архивный хостинг (в корзине)',
        username: 'admin@oldsite.ru',
        password: 'Zx7!pQ2#mK9\$',
        updatedAt: 'Месяц назад',
        trashed: true,
      ),
      PasswordEntry(
        id: 'p-6',
        vaultId: 'v-work',
        folder: 'Серверы',
        title: 'VPS Производственный кластер',
        username: 'deploy-root',
        password: 'H7&kW9\$pR3!mX5@vC2#zQ8',
        url: 'ssh://185.20.14.90:2222',
        updatedAt: 'Сегодня, 12:15',
      ),
      PasswordEntry(
        id: 'p-7',
        vaultId: 'v-family',
        folder: 'ЖКХ и роутеры',
        title: 'Домашний роутер Keenetic',
        username: 'admin',
        password: 'Kn4#wP8\$rT2!bM6v',
        url: 'http://192.168.1.1',
        updatedAt: 'Неделю назад',
      ),
    ];

    calendars = [
      CalendarSource(id: 'cal-personal', name: 'Личный (локальный)', colorValue: 0xFF2563EB, type: 'local'),
      CalendarSource(id: 'cal-work', name: 'Работа (Google Календарь)', colorValue: 0xFF059669, type: 'google'),
      CalendarSource(id: 'cal-family', name: 'Семья (локальный)', colorValue: 0xFFD97706, type: 'local'),
      CalendarSource(
        id: 'cal-holidays',
        name: 'Праздники (iCal)',
        colorValue: 0xFF7C3AED,
        type: 'ical',
        url: 'https://calendar.local/ru-holidays.ics',
      ),
    ];

    events = [
      CalendarEventItem(
        id: 'ev-1',
        calendarId: 'cal-work',
        title: 'Синхронизация команды по релизу',
        date: today,
        startTime: '10:00',
        endTime: '10:45',
        location: 'Закрытая комната',
        recurrence: 'weekly',
        linkedNoteId: 'n-release',
      ),
      CalendarEventItem(
        id: 'ev-2',
        calendarId: 'cal-personal',
        title: 'Проверка сметы и звонок прорабу',
        date: today,
        startTime: '15:00',
        endTime: '15:40',
        location: 'Телефон',
        linkedNoteId: 'n-renovation',
      ),
      CalendarEventItem(
        id: 'ev-3',
        calendarId: 'cal-family',
        title: 'Ужин с родителями',
        date: today,
        startTime: '19:30',
        endTime: '21:30',
        location: 'Дома',
      ),
      CalendarEventItem(
        id: 'ev-4',
        calendarId: 'cal-work',
        title: 'Аудит резервных копий WebDAV',
        date: tomorrow,
        startTime: '09:30',
        endTime: '10:15',
        recurrence: 'monthly',
      ),
    ];

    groups = [
      SharedGroup(
        id: 'grp-family',
        name: 'Семья — Дом и поездки',
        description: 'Закрытое пространство со сквозным шифрованием.',
        keyFingerprint: 'E2EE-9F4A-71C2-B804-55D1',
        members: ['Вы (Владелец)', 'Елена Соколова (Редактор)', 'Дмитрий (Только свои файлы)'],
        invites: [
          const SharedInvite(
            id: 'inv-1',
            code: 'ASR-7K2M-9P4X',
            type: 'one_time',
            role: 'viewer',
            createdAt: 'Вчера, 18:10',
          ),
        ],
        notes: [
          SharedNote(
            id: 'sn-1',
            title: 'Список покупок для кухни и освещения',
            author: 'Елена Соколова',
            updatedAt: 'Сегодня, 13:10',
            content: '1. Смеситель с выдвижным изливом\n2. Подсветка рабочей зоны 4000K\n3. Фильтр обратного осмоса',
            comments: [
              const SharedComment(
                id: 'cm-1',
                author: 'Елена Соколова',
                time: '13:12',
                text: 'По подсветке лучше взять 4000K, 3000K слишком жёлтый.',
              ),
            ],
          ),
        ],
        messages: [
          ChatMessageItem(
            id: 'msg-1',
            author: 'Елена Соколова',
            isMe: false,
            time: '12:40',
            text: 'Завтра в 16:00 приедет замерщик по шторам, нужно быть на объекте с ключами.',
          ),
          ChatMessageItem(
            id: 'msg-2',
            author: 'Дмитрий (Прораб)',
            isMe: false,
            time: '13:05',
            text: 'Плитка в ванной уложена, потребуется ещё 2 мешка клея Knauf.',
          ),
        ],
      ),
    ];

    conflicts = [
      SyncConflict(
        id: 'conf-1',
        itemTitle: 'Смета ремонта и план квартиры',
        localVersion: 'Добавлена строка «Розетки и щиток ABB — 34 500 ₽» (Windows)',
        remoteVersion: 'Обновлён чек-лист приёмки (Android)',
      ),
    ];

    backups = [
      const BackupSnapshot(
        id: 'bak-1',
        label: 'Полный зашифрованный бэкап (.asrb-bak)',
        createdAt: 'Сегодня, 08:00',
        sizeLabel: '42.6 МБ',
        kind: 'scheduled',
      ),
      const BackupSnapshot(
        id: 'bak-2',
        label: 'Страховочная копия перед импортом KeePass',
        createdAt: 'Вчера, 19:12',
        sizeLabel: '41.9 МБ',
        kind: 'safety',
      ),
    ];

    autoUploadFolders = [
      AutoUploadFolder(
        id: 'au-1',
        localPath: r'D:\Документы\Сканы_и_Договоры',
        remoteTarget: '/ASRbox_Encrypted/AutoUpload/Scans/',
        lastUploaded: 'Сегодня, 13:45',
      ),
    ];

    androidBackupItems = [
      AndroidBackupItem(id: 'contacts', label: 'Контакты', countLabel: '418 записей', lastBackup: 'Сегодня, 07:30'),
      AndroidBackupItem(id: 'calls', label: 'Журнал звонков', countLabel: '1 240 записей', lastBackup: 'Сегодня, 07:30'),
      AndroidBackupItem(id: 'sms', label: 'SMS-сообщения', countLabel: '3 890 сообщений', lastBackup: 'Сегодня, 07:30'),
      AndroidBackupItem(id: 'wifi', label: 'Профили Wi-Fi', countLabel: '19 сетей', lastBackup: 'Вчера, 23:10', enabled: false),
    ];

    keyRemaps = [
      KeyRemapItem(id: 'kr-1', fromKeys: 'CapsLock', toAction: 'Ctrl + Space (смена раскладки)'),
      KeyRemapItem(id: 'kr-2', fromKeys: 'Ctrl + Shift + Space', toAction: 'ASRbox: Голосовая диктовка'),
      KeyRemapItem(id: 'kr-3', fromKeys: 'Ctrl + Alt + L', toAction: 'Заблокировать все сейфы', scope: 'asrbox'),
    ];

    dockShortcuts = const [
      DockShortcutItem(id: 'dk-1', label: 'Заметки', target: 'ASRbox / Заметки', moduleTarget: AsrModuleId.notes),
      DockShortcutItem(id: 'dk-2', label: 'Сейфы', target: 'ASRbox / Пароли', moduleTarget: AsrModuleId.passwords),
      DockShortcutItem(id: 'dk-3', label: 'Календарь', target: 'ASRbox / Календарь', moduleTarget: AsrModuleId.calendar),
      DockShortcutItem(id: 'dk-4', label: 'Группы', target: 'ASRbox / Чат', moduleTarget: AsrModuleId.shared),
      DockShortcutItem(id: 'dk-5', label: 'Диктовка', target: 'Быстрая запись в буфер', moduleTarget: AsrModuleId.tools),
      DockShortcutItem(id: 'dk-6', label: 'Синхр.', target: 'WebDAV', moduleTarget: AsrModuleId.sync),
    ];

    logs = [
      const DiagnosticLogItem(
        id: 'log-1',
        timestamp: '14:20:04',
        level: 'success',
        source: 'CryptoEngine',
        message: 'Заметка «Смета ремонта и план квартиры» зашифрована локально (XChaCha20-Poly1305)',
      ),
      const DiagnosticLogItem(
        id: 'log-2',
        timestamp: '14:20:06',
        level: 'info',
        source: 'Sync / WebDAV',
        message: 'Отправлен закрытый контейнер .asrb на webdav.yandex.ru',
      ),
      const DiagnosticLogItem(
        id: 'log-3',
        timestamp: '09:00:01',
        level: 'info',
        source: 'PortableMode',
        message: 'Запуск в портативном режиме (реестр Windows не затронут)',
      ),
    ];
  }

  void touch() => notifyListeners();

  void toggleTheme() {
    themeMode = themeMode == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    notifyListeners();
  }

  void setActiveModule(AsrModuleId id) {
    if (enabledModules[id] == true) {
      activeModule = id;
      notifyListeners();
    }
  }

  void toggleModule(AsrModuleId id) {
    final activeCount = enabledModules.values.where((v) => v).length;
    if (enabledModules[id] == true && activeCount <= 1) return;
    enabledModules[id] = !(enabledModules[id] ?? true);
    if (enabledModules[activeModule] == false) {
      activeModule = enabledModules.entries.firstWhere((e) => e.value).key;
    }
    addLog('info', 'Modules', 'Модуль ${id.name}: ${enabledModules[id] == true ? "включён" : "выгружен"}');
    notifyListeners();
  }

  void togglePortableMode() {
    portableMode = !portableMode;
    addLog('info', 'PortableMode', portableMode ? 'Включён портативный режим USB' : 'Системный профиль');
    notifyListeners();
  }

  void setZoom(double z) {
    zoomFactor = z.clamp(0.85, 1.2);
    notifyListeners();
  }

  void toggleRightPanel() {
    showRightPanel = !showRightPanel;
    notifyListeners();
  }

  void toggleSwapColumns() {
    swapColumns = !swapColumns;
    notifyListeners();
  }

  void toggleDock() {
    dockEnabled = !dockEnabled;
    notifyListeners();
  }

  void addLog(String level, String source, String message) {
    logs.insert(
      0,
      DiagnosticLogItem(
        id: 'log-${DateTime.now().microsecondsSinceEpoch}',
        timestamp: CryptoService.nowTimeShort(),
        level: level,
        source: source,
        message: message,
      ),
    );
    if (logs.length > 100) logs.removeLast();
    notifyListeners();
  }

  void createSafetySnapshot(String reason) {
    backups.insert(
      0,
      BackupSnapshot(
        id: 'bak-${DateTime.now().millisecondsSinceEpoch}',
        label: 'Страховочная копия: $reason',
        createdAt: 'Сегодня, ${CryptoService.nowTimeShort().substring(0, 5)}',
        sizeLabel: '42.9 МБ',
        kind: 'safety',
      ),
    );
    addLog('info', 'SafetySnapshot', 'Создана авто-страховка: $reason');
    notifyListeners();
  }

  Future<void> copyToClipboard(String value, String label, {bool isSecret = false}) async {
    await Clipboard.setData(ClipboardData(text: value));
    clipboardLabel = label;
    clipboardIsSecret = isSecret;
    clipboardSecondsLeft = isSecret ? 20 : 4;
    _clipboardTimer?.cancel();
    _clipboardTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      clipboardSecondsLeft--;
      if (clipboardSecondsLeft <= 0) {
        timer.cancel();
        if (clipboardIsSecret) {
          Clipboard.setData(const ClipboardData(text: ''));
        }
        clipboardLabel = '';
      }
      notifyListeners();
    });
    if (isSecret) {
      addLog('info', 'ClipboardGuard', 'Секрет скопирован ($label) — автоочистка через 20с');
    }
    notifyListeners();
  }

  void clearClipboardNow() {
    _clipboardTimer?.cancel();
    Clipboard.setData(const ClipboardData(text: ''));
    clipboardLabel = '';
    clipboardSecondsLeft = 0;
    notifyListeners();
  }

  Future<void> triggerSync() async {
    if (isSyncing) return;
    isSyncing = true;
    addLog('info', 'Sync', 'Локальное шифрование и отправка на $syncEndpoint');
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 850));
    isSyncing = false;
    lastSyncLabel = CryptoService.nowTimeShort().substring(0, 5);
    addLog('success', 'Sync', 'Синхронизация завершена ($lastSyncLabel)');
    notifyListeners();
  }

  void createNote(String folderId) {
    final created = NoteItem(
      id: 'n-${DateTime.now().millisecondsSinceEpoch}',
      title: 'Новая заметка',
      folderId: folderId,
      tags: ['новое'],
      updatedAt: 'Только что',
      blocks: [
        NoteBlock(
          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
          type: NoteBlockType.markdown,
          content: 'Текст заметки. Можно добавить чек-лист, таблицу с формулами Excel или события .ics.',
        ),
      ],
    );
    notes.insert(0, created);
    selectedNoteId = created.id;
    activeModule = AsrModuleId.notes;
    addLog('info', 'Notes', 'Создана новая заметка');
    notifyListeners();
  }

  void addEventFromIcs(EmbeddedIcsEvent ics) {
    ics.addedToCalendar = true;
    events.insert(
      0,
      CalendarEventItem(
        id: 'ev-ics-${DateTime.now().millisecondsSinceEpoch}',
        calendarId: calendars.first.id,
        title: ics.title,
        date: ics.date,
        startTime: ics.time,
        endTime: '18:00',
        location: ics.location,
        linkedNoteId: selectedNoteId,
      ),
    );
    addLog('success', 'Calendar', 'Событие «${ics.title}» добавлено из .ics блока');
    notifyListeners();
  }

  void convertMessageToNote(String groupName, ChatMessageItem msg) {
    msg.convertedTo = 'note';
    final created = NoteItem(
      id: 'n-chat-${DateTime.now().millisecondsSinceEpoch}',
      title: 'Из чата «$groupName» (${msg.author})',
      folderId: folders.first.id,
      tags: ['чат'],
      updatedAt: 'Только что',
      blocks: [
        NoteBlock(
          id: 'b-chat-${DateTime.now().millisecondsSinceEpoch}',
          type: NoteBlockType.markdown,
          content: '${msg.author} (${msg.time}):\n\n${msg.text}',
        ),
      ],
    );
    notes.insert(0, created);
    selectedNoteId = created.id;
    addLog('success', 'Shared → Notes', 'Создана заметка из сообщения чата');
    notifyListeners();
  }

  void convertMessageToEvent(String groupName, ChatMessageItem msg) {
    msg.convertedTo = 'event';
    events.insert(
      0,
      CalendarEventItem(
        id: 'ev-chat-${DateTime.now().millisecondsSinceEpoch}',
        calendarId: calendars.first.id,
        title: msg.text.length > 48 ? '${msg.text.substring(0, 48)}…' : msg.text,
        date: CryptoService.todayIso(0),
        startTime: '16:00',
        endTime: '17:00',
        location: 'Из чата «$groupName»',
      ),
    );
    addLog('success', 'Shared → Calendar', 'Создано событие из сообщения чата');
    notifyListeners();
  }

  void createNoteFromDictation(String text) {
    final created = NoteItem(
      id: 'n-voice-${DateTime.now().millisecondsSinceEpoch}',
      title: 'Диктовка (${CryptoService.nowTimeShort().substring(0, 5)})',
      folderId: folders.first.id,
      tags: ['диктовка'],
      updatedAt: 'Только что',
      blocks: [
        NoteBlock(
          id: 'b-v-${DateTime.now().millisecondsSinceEpoch}',
          type: NoteBlockType.markdown,
          content: text,
        ),
      ],
    );
    notes.insert(0, created);
    selectedNoteId = created.id;
    activeModule = AsrModuleId.notes;
    addLog('success', 'VoiceDictation', 'Создана заметка из голосовой диктовки');
    notifyListeners();
  }

  void triggerReminder(CalendarEventItem ev) {
    activeReminder = ev;
    addLog('info', 'Reminder', 'Напоминание: «${ev.title}» (${ev.startTime})');
    notifyListeners();
  }

  void dismissReminder() {
    activeReminder = null;
    notifyListeners();
  }

  void lockAllVaults() {
    unlockedVaultIds.clear();
    addLog('info', 'Security', 'Все сейфы паролей заблокированы');
    notifyListeners();
  }

  @override
  void dispose() {
    _clipboardTimer?.cancel();
    super.dispose();
  }
}
