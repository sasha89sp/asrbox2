import {
  AndroidBackupItem,
  AppSettings,
  AutoUploadFolder,
  BackupSnapshot,
  CalendarEvent,
  CalendarSource,
  DiagnosticLogEntry,
  DockShortcut,
  KeyRemap,
  Note,
  NoteFolder,
  PasswordEntry,
  PasswordVault,
  SharedGroup,
  SyncConflict,
} from '../types/asrbox';
import { getTodayIso, shiftDateIso } from '../utils/cryptoHelpers';

const today = getTodayIso();
const tomorrow = shiftDateIso(today, 1);
const inTwoDays = shiftDateIso(today, 2);
const inFourDays = shiftDateIso(today, 4);
const yesterday = shiftDateIso(today, -1);

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'light',
  platformView: 'windows',
  portableMode: true,
  zoomPercent: 100,
  showRightPanel: true,
  swapColumns: false,
  leftSidebarWidth: 248,
  rightPanelWidth: 296,
  dockEnabled: true,
  dockPosition: 'bottom',
  dockScale: 1.45,
  dictationHotkey: 'Ctrl + Shift + Space',
  syncProvider: 'webdav_yandex',
  syncEndpoint: 'https://webdav.yandex.ru/ASRbox_Encrypted/',
  syncIntervalMinutes: 15,
  backgroundSync: true,
  enabledModules: {
    notes: true,
    passwords: true,
    calendar: true,
    shared: true,
    sync: true,
    tools: true,
    diagnostics: true,
  },
};

export const INITIAL_FOLDERS: NoteFolder[] = [
  { id: 'f-personal', name: 'Личное', parentId: null },
  { id: 'f-home', name: 'Ремонт и дом', parentId: 'f-personal' },
  { id: 'f-work', name: 'Работа', parentId: null },
  { id: 'f-release', name: 'Релиз 2026', parentId: 'f-work' },
  { id: 'f-finance', name: 'Финансы', parentId: null },
];

export const INITIAL_NOTES: Note[] = [
  {
    id: 'n-renovation',
    title: 'Смета ремонта и план квартиры',
    folderId: 'f-home',
    tags: ['дом', 'бюджет', 'таблица'],
    isFavorite: true,
    isPinned: true,
    updatedAt: 'Сегодня, 14:20',
    trashedAt: null,
    blocks: [
      {
        id: 'b-md-1',
        type: 'markdown',
        content:
          'Основные договорённости с прорабом зафиксированы локально. Черновая отделка завершается в пятницу, электрика проверена по схеме.\n\n**Ключевое правило:** оплата материалов только по чекам, итоговая таблица пересчитывается автоматически по формулам ниже.',
      },
      {
        id: 'b-sheet-1',
        type: 'spreadsheet',
        title: 'Бюджет материалов (формулы активны)',
        data: {
          columns: ['Статья расходов', 'Кол-во', 'Цена, ₽', 'Сумма, ₽'],
          rows: [
            ['Инженерная доска дуб, м²', '48', '3850', '=B1*C1'],
            ['Керамогранит ванная, м²', '22', '2400', '=B2*C2'],
            ['Освещение трековое, компл.', '4', '14900', '=B3*C3'],
            ['Розетки и щиток ABB', '1', '34500', '=B4*C4'],
            ['Итого по смете', '', '', '=SUM(D1:D4)'],
            ['Средний чек позиции', '', '', '=AVG(D1:D4)'],
          ],
        },
      },
      {
        id: 'b-att-1',
        type: 'attachment',
        data: {
          name: 'plan-kvartiry-1-100.jpg',
          sizeLabel: '1.8 МБ · локально зашифрован',
          kind: 'image',
          url: '/src/assets/images/note_architecture_sketch_1795247829727.jpg',
          caption: 'Актуальная схема перегородок и разводки кухни (масштаб 1:100)',
        },
      },
      {
        id: 'b-chk-1',
        type: 'checklist',
        title: 'Контрольный список перед приёмкой',
        items: [
          { id: 'c1', text: 'Проверить уровень стяжки лазерным нивелиром', done: true },
          { id: 'c2', text: 'Сделать фото скрытой разводки труб до закрытия короба', done: true },
          { id: 'c3', text: 'Согласовать доставку дверей с логистом', done: false },
          { id: 'c4', text: 'Подписать акт этапа №2', done: false },
        ],
      },
      {
        id: 'b-ics-1',
        type: 'ics',
        title: 'События этапа (.ics)',
        events: [
          {
            id: 'ics-1',
            title: 'Приёмка электрики с инженером',
            date: tomorrow,
            time: '11:00',
            location: 'ул. Садовая, кв. 42',
            addedToCalendar: false,
          },
          {
            id: 'ics-2',
            title: 'Доставка паркетной доски',
            date: inTwoDays,
            time: '15:30',
            location: 'Подъезд 2, грузовой лифт',
            addedToCalendar: false,
          },
        ],
      },
    ],
    versions: [
      {
        id: 'v-1',
        savedAt: 'Вчера, 19:45',
        summary: 'Добавлена таблица сметы с формулами SUM и AVG',
        title: 'Смета ремонта и план квартиры',
        blocks: [
          {
            id: 'b-md-v1',
            type: 'markdown',
            content: 'Черновая версия сметы до согласования трекового освещения.',
          },
        ],
      },
      {
        id: 'v-2',
        savedAt: '18 ноя, 10:12',
        summary: 'Первичная структура заметки и чек-лист приёмки',
        title: 'Смета ремонта (черновик)',
        blocks: [
          {
            id: 'b-md-v2',
            type: 'markdown',
            content: 'Замеры комнат и список подрядчиков.',
          },
        ],
      },
    ],
  },
  {
    id: 'n-release',
    title: 'Дорожная карта: синхронизация WebDAV и офлайн-поиск',
    folderId: 'f-release',
    tags: ['архитектура', 'работа'],
    isFavorite: true,
    isPinned: true,
    updatedAt: 'Сегодня, 11:05',
    trashedAt: null,
    blocks: [
      {
        id: 'b-md-2',
        type: 'markdown',
        content:
          'Все пользовательские файлы шифруются алгоритмом **XChaCha20-Poly1305** непосредственно на устройстве до попадания в транспортный слой WebDAV.\n\n- Сервер хранит только обезличенные зашифрованные чанки `.asrb`.\n- При одновременном редактировании на Windows и Android выполняется умное слияние блоков без потери текста.',
      },
      {
        id: 'b-voice-1',
        type: 'voice',
        title: 'Голосовая заметка после утреннего созвона',
        data: {
          durationSec: 42,
          recordedAt: 'Сегодня, 10:48',
          transcript:
            'Напомнить команде, что портативная сборка под Windows должна запускаться прямо с USB-накопителя без записи в реестр и без прав администратора. Также проверить автоочистку буфера обмена через 20 секунд.',
          waveform: [22, 48, 65, 34, 80, 92, 54, 41, 74, 88, 60, 30, 52, 78, 95, 62, 40, 28, 68, 84, 49, 36, 58, 25],
        },
      },
      {
        id: 'b-chk-2',
        type: 'checklist',
        title: 'Задачи перед сборкой',
        items: [
          { id: 'rc1', text: 'Протестировать переподключение Яндекс Диска при обрыве Wi-Fi', done: true },
          { id: 'rc2', text: 'Проверить экспорт таблиц в .xlsx / CSV с кириллицей', done: true },
          { id: 'rc3', text: 'Оптимизировать запуск системных будильников Android 15', done: false },
        ],
      },
    ],
    versions: [
      {
        id: 'v-r1',
        savedAt: 'Вчера, 16:30',
        summary: 'Зафиксированы требования к портативному режиму',
        title: 'Дорожная карта: синхронизация WebDAV',
        blocks: [
          {
            id: 'b-md-vr1',
            type: 'markdown',
            content: 'Черновик спецификации шифрования и портативного запуска.',
          },
        ],
      },
    ],
  },
  {
    id: 'n-finance',
    title: 'Ежемесячные регулярные расходы',
    folderId: 'f-finance',
    tags: ['финансы', 'таблица'],
    isFavorite: false,
    isPinned: false,
    updatedAt: 'Вчера, 21:14',
    trashedAt: null,
    blocks: [
      {
        id: 'b-sheet-fin',
        type: 'spreadsheet',
        title: 'Обязательные платежи (ноябрь)',
        data: {
          columns: ['Категория', 'План, ₽', 'Факт, ₽', 'Разница, ₽'],
          rows: [
            ['Коммунальные услуги', '8500', '8240', '=B1-C1'],
            ['Интернет и связь', '1650', '1650', '=B2-C2'],
            ['Сервер WebDAV / облако', '490', '490', '=B3-C3'],
            ['Спортзал и бассейн', '4200', '4200', '=B4-C4'],
            ['Итого', '=SUM(B1:B4)', '=SUM(C1:C4)', '=SUM(D1:D4)'],
          ],
        },
      },
    ],
    versions: [],
  },
  {
    id: 'n-trashed',
    title: 'Старый список покупок (архив)',
    folderId: 'f-personal',
    tags: ['личное'],
    isFavorite: false,
    isPinned: false,
    updatedAt: '5 дней назад',
    trashedAt: 'Удалено 5 дн. назад · осталось 25 дн.',
    blocks: [
      {
        id: 'b-md-tr',
        type: 'markdown',
        content: 'Заметка находится в корзине и будет автоматически удалена через 25 дней, если её не восстановить.',
      },
    ],
    versions: [],
  },
];

export const INITIAL_VAULTS: PasswordVault[] = [
  {
    id: 'v-personal',
    name: 'Личный сейф',
    masterPassword: '1234',
    hint: 'Демо-пароль для входа: 1234 (или вход по биометрии)',
    autoLockMinutes: 5,
    lockOnMinimize: true,
    rememberMode: 'biometrics',
    globalSort: 'title',
    folderSorts: { Банки: 'updatedAt' },
    failedAttempts: 0,
    lockedUntil: null,
    folders: ['Все', 'Банки', 'Почта и сервисы', 'Документы'],
  },
  {
    id: 'v-work',
    name: 'Рабочие доступы',
    masterPassword: 'work',
    hint: 'Демо-пароль рабочего сейфа: work',
    autoLockMinutes: 15,
    lockOnMinimize: true,
    rememberMode: 'none',
    globalSort: 'updatedAt',
    folderSorts: {},
    failedAttempts: 0,
    lockedUntil: null,
    folders: ['Все', 'Серверы', 'Git и CI', 'Клиенты'],
  },
  {
    id: 'v-family',
    name: 'Дом и документы',
    masterPassword: 'home',
    hint: 'Демо-пароль домашнего сейфа: home',
    autoLockMinutes: 10,
    lockOnMinimize: false,
    rememberMode: 'autologin',
    globalSort: 'title',
    folderSorts: {},
    failedAttempts: 0,
    lockedUntil: null,
    folders: ['Все', 'ЖКХ и роутеры', 'Карты'],
  },
];

export const INITIAL_PASSWORD_ENTRIES: PasswordEntry[] = [
  {
    id: 'p-1',
    vaultId: 'v-personal',
    folder: 'Почта и сервисы',
    title: 'Яндекс ID и WebDAV',
    username: 'alexey.sokolov@yandex.ru',
    password: 'Kq9#mV4!pR7@xN2wZ8',
    url: 'https://id.yandex.ru',
    notes: 'Основной аккаунт для зашифрованной синхронизации ASRbox.',
    updatedAt: 'Сегодня, 09:30',
    trashed: false,
    extraFields: [
      { id: 'ef-1', kind: 'question', label: 'Секретный вопрос (первая школа)', value: 'Гимназия №14', secret: true },
    ],
    history: [
      {
        id: 'ph-1',
        changedAt: '12 окт, 18:10',
        previousPassword: 'OldYandexPass2024!',
        note: 'Плановая смена пароля',
      },
    ],
  },
  {
    id: 'p-2',
    vaultId: 'v-personal',
    folder: 'Банки',
    title: 'Основная дебетовая карта',
    username: '+7 916 555-01-42',
    password: 'Tr8$vL3%nB6^yM9c',
    url: 'https://online.bank.local',
    notes: 'Карта для повседневных расчётов и оплаты ремонта.',
    updatedAt: 'Вчера, 16:40',
    trashed: false,
    extraFields: [
      { id: 'ef-2', kind: 'card', label: 'Номер карты', value: '2200 7004 8812 4901', secret: false },
      { id: 'ef-3', kind: 'pin', label: 'PIN-код банкомата', value: '4829', secret: true },
    ],
    history: [],
  },
  {
    id: 'p-3',
    vaultId: 'v-personal',
    folder: 'Почта и сервисы',
    title: 'Форум проектировщиков',
    username: 'asokolov',
    password: 'spring2025',
    url: 'https://arch-club.ru',
    notes: 'Используется слабый пароль — отобразится в проверке надёжности.',
    updatedAt: '3 нед. назад',
    trashed: false,
    extraFields: [],
    history: [],
  },
  {
    id: 'p-4',
    vaultId: 'v-personal',
    folder: 'Документы',
    title: 'Портал строительного магазина',
    username: 'alexey.sokolov@yandex.ru',
    password: 'spring2025',
    url: 'https://stroymarket.ru',
    notes: 'Совпадает с паролем форума — сработает детектор повторов.',
    updatedAt: '2 нед. назад',
    trashed: false,
    extraFields: [],
    history: [],
  },
  {
    id: 'p-5',
    vaultId: 'v-personal',
    folder: 'Почта и сервисы',
    title: 'Архивный хостинг (в корзине)',
    username: 'admin@oldsite.ru',
    password: 'Zx7!pQ2#mK9$',
    url: 'https://panel.oldhost.ru',
    notes: 'Корзина сейфа не очищается автоматически — данные защищены от случайной потери.',
    updatedAt: 'Месяц назад',
    trashed: true,
    extraFields: [],
    history: [],
  },
  {
    id: 'p-6',
    vaultId: 'v-work',
    folder: 'Серверы',
    title: 'VPS Производственный кластер',
    username: 'deploy-root',
    password: 'H7&kW9$pR3!mX5@vC2#zQ8',
    url: 'ssh://185.20.14.90:2222',
    notes: 'Доступ только по локальному ключу + резервный пароль.',
    updatedAt: 'Сегодня, 12:15',
    trashed: false,
    extraFields: [
      { id: 'ef-w1', kind: 'pin', label: 'Аппаратный PIN токена', value: '904182', secret: true },
    ],
    history: [],
  },
  {
    id: 'p-7',
    vaultId: 'v-family',
    folder: 'ЖКХ и роутеры',
    title: 'Домашний роутер Keenetic',
    username: 'admin',
    password: 'Kn4#wP8$rT2!bM6v',
    url: 'http://192.168.1.1',
    notes: 'Гостевая сеть отключена, DNS-over-HTTPS включён.',
    updatedAt: 'Неделю назад',
    trashed: false,
    extraFields: [
      { id: 'ef-f1', kind: 'custom', label: 'Wi-Fi 5 ГГц (ASR_Home)', value: 'SilentCedar-4928', secret: true },
    ],
    history: [],
  },
];

export const INITIAL_CALENDARS: CalendarSource[] = [
  { id: 'cal-personal', name: 'Личный (локальный)', color: '#2563EB', type: 'local', visible: true },
  { id: 'cal-work', name: 'Работа (Google Календарь)', color: '#059669', type: 'google', visible: true },
  { id: 'cal-family', name: 'Семья (локальный)', color: '#D97706', type: 'local', visible: true },
  {
    id: 'cal-holidays',
    name: 'Производственный календарь (iCal)',
    color: '#7C3AED',
    type: 'ical',
    visible: true,
    url: 'https://calendar.local/ru-holidays.ics',
  },
];

export const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'ev-1',
    calendarId: 'cal-work',
    title: 'Синхронизация команды по релизу',
    date: today,
    startTime: '10:00',
    endTime: '10:45',
    location: 'Закрытая комната',
    notes: 'Обсуждение портативного режима Windows и WebDAV.',
    recurrence: 'weekly',
    reminderMinutes: 15,
    linkedNoteId: 'n-release',
  },
  {
    id: 'ev-2',
    calendarId: 'cal-personal',
    title: 'Проверка сметы и звонок прорабу',
    date: today,
    startTime: '15:00',
    endTime: '15:40',
    location: 'Телефон / Квартира',
    notes: 'Сверить итоговую сумму по инженерной доске.',
    recurrence: 'none',
    reminderMinutes: 10,
    linkedNoteId: 'n-renovation',
  },
  {
    id: 'ev-3',
    calendarId: 'cal-family',
    title: 'Ужин с родителями',
    date: today,
    startTime: '19:30',
    endTime: '21:30',
    location: 'Дома',
    recurrence: 'none',
    reminderMinutes: 30,
  },
  {
    id: 'ev-4',
    calendarId: 'cal-work',
    title: 'Аудит резервных копий WebDAV',
    date: tomorrow,
    startTime: '09:30',
    endTime: '10:15',
    recurrence: 'monthly',
    reminderMinutes: 15,
  },
  {
    id: 'ev-5',
    calendarId: 'cal-personal',
    title: 'Стоматолог — плановый осмотр',
    date: inTwoDays,
    startTime: '13:00',
    endTime: '14:00',
    location: 'Клиника «Свет», каб. 8',
    recurrence: 'none',
    reminderMinutes: 60,
  },
  {
    id: 'ev-6',
    calendarId: 'cal-family',
    title: 'Поездка за город',
    date: inFourDays,
    startTime: '10:00',
    endTime: '18:00',
    location: 'Дача',
    recurrence: 'none',
    reminderMinutes: 120,
  },
  {
    id: 'ev-7',
    calendarId: 'cal-holidays',
    title: 'Сдача квартального отчёта',
    date: yesterday,
    startTime: '12:00',
    endTime: '13:00',
    recurrence: 'yearly',
    reminderMinutes: 30,
  },
];

export const INITIAL_SHARED_GROUPS: SharedGroup[] = [
  {
    id: 'grp-family',
    name: 'Семья — Дом и поездки',
    description: 'Закрытое пространство со сквозным шифрованием. Общие списки, чеки ремонта и быстрый чат.',
    keyFingerprint: 'E2EE-9F4A-71C2-B804-55D1',
    members: [
      { name: 'Вы (Владелец)', role: 'editor' },
      { name: 'Елена Соколова', role: 'editor', avatar: '/src/assets/images/avatar_elena_1795247828079.jpg' },
      { name: 'Дмитрий (Прораб)', role: 'own_files', avatar: '/src/assets/images/avatar_dmitry_1795247829437.jpg' },
    ],
    invites: [
      {
        id: 'inv-1',
        code: 'ASR-7K2M-9P4X',
        type: 'one_time',
        role: 'viewer',
        createdAt: 'Вчера, 18:10',
        usedCount: 0,
      },
    ],
    notes: [
      {
        id: 'sn-1',
        title: 'Список покупок для кухни и освещения',
        author: 'Елена Соколова',
        updatedAt: 'Сегодня, 13:10',
        content:
          '1. Смеситель с выдвижным изливом (матовая сталь)\n2. Подсветка рабочей зоны 4000K с профилем\n3. Фильтр обратного осмоса под мойку\n\nСсылки и размеры проверены по чертежу кухни.',
        comments: [
          {
            id: 'cm-1',
            author: 'Елена Соколова',
            time: '13:12',
            text: 'По подсветке лучше взять 4000K, 3000K слишком жёлтый на светлой столешнице.',
          },
          {
            id: 'cm-2',
            author: 'Вы',
            time: '13:24',
            text: 'Согласен, добавил 4000K в заказ и приложил схему.',
          },
        ],
      },
    ],
    messages: [
      {
        id: 'msg-1',
        author: 'Елена Соколова',
        avatar: '/src/assets/images/avatar_elena_1795247828079.jpg',
        isMe: false,
        time: '12:40',
        text: 'Завтра в 16:00 приедет замерщик по шторам, нужно быть на объекте с ключами.',
        convertedTo: null,
      },
      {
        id: 'msg-2',
        author: 'Дмитрий (Прораб)',
        avatar: '/src/assets/images/avatar_dmitry_1795247829437.jpg',
        isMe: false,
        time: '13:05',
        text: 'Плитка в ванной уложена полностью, затирку начинаем утром. Потребуется ещё 2 мешка клея Knauf.',
        convertedTo: null,
      },
      {
        id: 'msg-3',
        author: 'Вы',
        isMe: true,
        time: '13:18',
        text: 'Отлично, занесу встречу с замерщиком в календарь и куплю клей по пути.',
        convertedTo: null,
      },
    ],
  },
  {
    id: 'grp-team',
    name: 'Команда разработки',
    description: 'Зашифрованные заметки спринта, релизные заметки и защищённый чат без сторонних серверов.',
    keyFingerprint: 'E2EE-3A8C-10E9-44F2-7D2B',
    members: [
      { name: 'Вы (Владелец)', role: 'editor' },
      { name: 'Дмитрий (Системный инженер)', role: 'editor', avatar: '/src/assets/images/avatar_dmitry_1795247829437.jpg' },
    ],
    invites: [
      {
        id: 'inv-2',
        code: 'ASR-4R8V-2N6W',
        type: 'multi_use',
        role: 'own_files',
        createdAt: '18 ноя, 09:00',
        usedCount: 2,
      },
    ],
    notes: [
      {
        id: 'sn-2',
        title: 'Чек-лист безопасности перед выпуском v2.4',
        author: 'Дмитрий',
        updatedAt: 'Сегодня, 10:15',
        content:
          '- Проверить Argon2id параметры для Android-устройств\n- Протестировать блокировку сейфа после 10 неверных попыток\n- Убедиться, что временные файлы диктовки очищаются из RAM',
        comments: [],
      },
    ],
    messages: [
      {
        id: 'msg-t1',
        author: 'Дмитрий',
        avatar: '/src/assets/images/avatar_dmitry_1795247829437.jpg',
        isMe: false,
        time: '11:20',
        text: 'Сборка для Windows Portable готова, размер архива 18.4 МБ. Нужно провести нагрузочный тест синхронизации 500 заметок.',
        convertedTo: null,
      },
    ],
  },
];

export const INITIAL_SYNC_CONFLICTS: SyncConflict[] = [
  {
    id: 'conf-1',
    itemTitle: 'Смета ремонта и план квартиры',
    module: 'notes',
    localVersion: 'Добавлена строка «Розетки и щиток ABB — 34 500 ₽» (Windows, 14:20)',
    remoteVersion: 'Обновлён пункт чек-листа «Согласовать доставку дверей» (Android, 14:18)',
    localTime: '14:20 (Windows)',
    remoteTime: '14:18 (Android)',
    resolved: false,
  },
];

export const INITIAL_BACKUPS: BackupSnapshot[] = [
  {
    id: 'bak-1',
    label: 'Полный зашифрованный бэкап (.asrb-bak)',
    createdAt: 'Сегодня, 08:00',
    sizeLabel: '42.6 МБ',
    kind: 'scheduled',
    encrypted: true,
  },
  {
    id: 'bak-2',
    label: 'Страховочная копия перед импортом KeePass',
    createdAt: 'Вчера, 19:12',
    sizeLabel: '41.9 МБ',
    kind: 'safety',
    encrypted: true,
  },
  {
    id: 'bak-3',
    label: 'Ручная копия на USB-носитель (Portable)',
    createdAt: '17 ноя, 22:05',
    sizeLabel: '39.4 МБ',
    kind: 'manual',
    encrypted: true,
  },
];

export const INITIAL_AUTO_UPLOAD: AutoUploadFolder[] = [
  {
    id: 'au-1',
    localPath: 'D:\\Документы\\Сканы_и_Договоры',
    remoteTarget: '/ASRbox_Encrypted/AutoUpload/Scans/',
    enabled: true,
    lastUploaded: 'Сегодня, 13:45',
  },
  {
    id: 'au-2',
    localPath: 'D:\\Проекты\\Чертежи_2026',
    remoteTarget: '/ASRbox_Encrypted/AutoUpload/Blueprints/',
    enabled: true,
    lastUploaded: 'Вчера, 20:10',
  },
];

export const INITIAL_ANDROID_BACKUP: AndroidBackupItem[] = [
  { id: 'contacts', label: 'Контакты', countLabel: '418 записей (.vcf.asrb)', lastBackup: 'Сегодня, 07:30', enabled: true },
  { id: 'calls', label: 'Журнал звонков', countLabel: '1 240 записей', lastBackup: 'Сегодня, 07:30', enabled: true },
  { id: 'sms', label: 'SMS-сообщения', countLabel: '3 890 сообщений', lastBackup: 'Сегодня, 07:30', enabled: true },
  { id: 'wifi', label: 'Профили Wi-Fi', countLabel: '19 сетей', lastBackup: 'Вчера, 23:10', enabled: false },
];

export const INITIAL_KEY_REMAPS: KeyRemap[] = [
  { id: 'kr-1', fromKeys: 'CapsLock', toAction: 'Ctrl + Space (смена раскладки)', enabled: true, scope: 'global' },
  { id: 'kr-2', fromKeys: 'Ctrl + Shift + Space', toAction: 'ASRbox: Голосовая диктовка (удержание)', enabled: true, scope: 'global' },
  { id: 'kr-3', fromKeys: 'Alt + D', toAction: 'Вставить текущую дату (ГГГГ-ММ-ДД)', enabled: true, scope: 'global' },
  { id: 'kr-4', fromKeys: 'Ctrl + Alt + L', toAction: 'Мгновенно заблокировать все сейфы', enabled: true, scope: 'asrbox' },
];

export const INITIAL_DOCK_SHORTCUTS: DockShortcut[] = [
  { id: 'dk-1', label: 'Заметки', target: 'ASRbox / Заметки', iconKey: 'notes', actionType: 'module', moduleTarget: 'notes' },
  { id: 'dk-2', label: 'Сейфы', target: 'ASRbox / Пароли', iconKey: 'passwords', actionType: 'module', moduleTarget: 'passwords' },
  { id: 'dk-3', label: 'Календарь', target: 'ASRbox / Календарь', iconKey: 'calendar', actionType: 'module', moduleTarget: 'calendar' },
  { id: 'dk-4', label: 'Группы', target: 'ASRbox / Чат', iconKey: 'shared', actionType: 'module', moduleTarget: 'shared' },
  { id: 'dk-5', label: 'Диктовка', target: 'Быстрая запись в буфер', iconKey: 'dictation', actionType: 'dictation' },
  { id: 'dk-6', label: 'Синхр.', target: 'WebDAV синхронизация', iconKey: 'sync', actionType: 'module', moduleTarget: 'sync' },
  { id: 'dk-7', label: 'Проекты', target: 'D:\\Проекты\\2026', iconKey: 'folder', actionType: 'folder' },
  { id: 'dk-8', label: 'Терминал', target: 'Windows Terminal', iconKey: 'terminal', actionType: 'app' },
];

export const INITIAL_LOGS: DiagnosticLogEntry[] = [
  {
    id: 'log-1',
    timestamp: '14:20:04',
    level: 'success',
    source: 'CryptoEngine',
    message: 'Заметка «Смета ремонта и план квартиры» зашифрована локально (XChaCha20-Poly1305, 18.2 КБ)',
  },
  {
    id: 'log-2',
    timestamp: '14:20:06',
    level: 'info',
    source: 'Sync / WebDAV',
    message: 'Отправлен 1 изменённый блок на webdav.yandex.ru (сервер получил закрытый контейнер .asrb)',
  },
  {
    id: 'log-3',
    timestamp: '14:18:52',
    level: 'warn',
    source: 'SmartMerge',
    message: 'Обнаружено параллельное изменение с Android — подготовлено безопасное слияние без потерь',
  },
  {
    id: 'log-4',
    timestamp: '13:45:11',
    level: 'success',
    source: 'AutoUpload',
    message: 'Папка «Сканы_и_Договоры» синхронизирована: загружено 2 новых файла',
  },
  {
    id: 'log-5',
    timestamp: '09:00:01',
    level: 'info',
    source: 'PortableMode',
    message: 'Запуск в портативном режиме с E:\\ASRbox_Portable\\ (реестр Windows не затронут)',
  },
];
