enum AsrModuleId {
  notes,
  passwords,
  calendar,
  shared,
  sync,
  tools,
  diagnostics,
}

enum NoteBlockType {
  markdown,
  checklist,
  spreadsheet,
  voice,
  ics,
}

class NoteFolder {
  final String id;
  final String name;
  final String? parentId;

  const NoteFolder({required this.id, required this.name, this.parentId});
}

class ChecklistItem {
  final String id;
  String text;
  bool done;

  ChecklistItem({required this.id, required this.text, this.done = false});
}

class EmbeddedIcsEvent {
  final String id;
  String title;
  String date;
  String time;
  String location;
  bool addedToCalendar;

  EmbeddedIcsEvent({
    required this.id,
    required this.title,
    required this.date,
    required this.time,
    this.location = '',
    this.addedToCalendar = false,
  });
}

class NoteBlock {
  final String id;
  final NoteBlockType type;
  String title;
  String content;
  List<ChecklistItem> checklist;
  List<String> columns;
  List<List<String>> rows;
  int voiceDurationSec;
  String voiceTranscript;
  List<EmbeddedIcsEvent> icsEvents;

  NoteBlock({
    required this.id,
    required this.type,
    this.title = '',
    this.content = '',
    List<ChecklistItem>? checklist,
    List<String>? columns,
    List<List<String>>? rows,
    this.voiceDurationSec = 0,
    this.voiceTranscript = '',
    List<EmbeddedIcsEvent>? icsEvents,
  })  : checklist = checklist ?? [],
        columns = columns ?? [],
        rows = rows ?? [],
        icsEvents = icsEvents ?? [];
}

class NoteVersion {
  final String id;
  final String savedAt;
  final String summary;
  final String title;
  final String firstMarkdown;

  const NoteVersion({
    required this.id,
    required this.savedAt,
    required this.summary,
    required this.title,
    required this.firstMarkdown,
  });
}

class NoteItem {
  final String id;
  String title;
  String folderId;
  List<String> tags;
  bool isFavorite;
  bool isPinned;
  String updatedAt;
  String? trashedAt;
  List<NoteBlock> blocks;
  List<NoteVersion> versions;

  NoteItem({
    required this.id,
    required this.title,
    required this.folderId,
    required this.tags,
    this.isFavorite = false,
    this.isPinned = false,
    required this.updatedAt,
    this.trashedAt,
    required this.blocks,
    List<NoteVersion>? versions,
  }) : versions = versions ?? [];
}

enum PasswordSortKey { title, updatedAt, strength }

class PasswordExtraField {
  final String id;
  String kind; // pin, card, question, custom
  String label;
  String value;
  bool secret;

  PasswordExtraField({
    required this.id,
    required this.kind,
    required this.label,
    required this.value,
    this.secret = false,
  });
}

class PasswordHistoryItem {
  final String id;
  final String changedAt;
  final String previousPassword;
  final String note;

  const PasswordHistoryItem({
    required this.id,
    required this.changedAt,
    required this.previousPassword,
    required this.note,
  });
}

class PasswordEntry {
  final String id;
  final String vaultId;
  String folder;
  String title;
  String username;
  String password;
  String url;
  String notes;
  String updatedAt;
  bool trashed;
  List<PasswordExtraField> extraFields;
  List<PasswordHistoryItem> history;

  PasswordEntry({
    required this.id,
    required this.vaultId,
    required this.folder,
    required this.title,
    required this.username,
    required this.password,
    this.url = '',
    this.notes = '',
    required this.updatedAt,
    this.trashed = false,
    List<PasswordExtraField>? extraFields,
    List<PasswordHistoryItem>? history,
  })  : extraFields = extraFields ?? [],
        history = history ?? [];
}

class PasswordVault {
  final String id;
  String name;
  String masterPassword;
  String hint;
  int autoLockMinutes;
  bool lockOnMinimize;
  String rememberMode; // none, biometrics, autologin
  PasswordSortKey globalSort;
  Map<String, PasswordSortKey> folderSorts;
  int failedAttempts;
  List<String> folders;

  PasswordVault({
    required this.id,
    required this.name,
    required this.masterPassword,
    required this.hint,
    this.autoLockMinutes = 5,
    this.lockOnMinimize = true,
    this.rememberMode = 'biometrics',
    this.globalSort = PasswordSortKey.title,
    Map<String, PasswordSortKey>? folderSorts,
    this.failedAttempts = 0,
    required this.folders,
  }) : folderSorts = folderSorts ?? {};
}

class CalendarSource {
  final String id;
  final String name;
  final int colorValue;
  final String type; // local, google, ical
  bool visible;
  final String? url;

  CalendarSource({
    required this.id,
    required this.name,
    required this.colorValue,
    required this.type,
    this.visible = true,
    this.url,
  });
}

class CalendarEventItem {
  final String id;
  String calendarId;
  String title;
  String date; // YYYY-MM-DD
  String startTime;
  String endTime;
  String location;
  String recurrence; // none, daily, weekly, monthly, yearly
  int reminderMinutes;
  String? linkedNoteId;

  CalendarEventItem({
    required this.id,
    required this.calendarId,
    required this.title,
    required this.date,
    required this.startTime,
    required this.endTime,
    this.location = '',
    this.recurrence = 'none',
    this.reminderMinutes = 15,
    this.linkedNoteId,
  });
}

class SharedInvite {
  final String id;
  final String code;
  final String type; // one_time, multi_use
  final String role; // viewer, own_files, editor
  final String createdAt;

  const SharedInvite({
    required this.id,
    required this.code,
    required this.type,
    required this.role,
    required this.createdAt,
  });
}

class SharedComment {
  final String id;
  final String author;
  final String time;
  final String text;

  const SharedComment({
    required this.id,
    required this.author,
    required this.time,
    required this.text,
  });
}

class SharedNote {
  final String id;
  String title;
  final String author;
  String updatedAt;
  String content;
  List<SharedComment> comments;

  SharedNote({
    required this.id,
    required this.title,
    required this.author,
    required this.updatedAt,
    required this.content,
    List<SharedComment>? comments,
  }) : comments = comments ?? [];
}

class ChatMessageItem {
  final String id;
  final String author;
  final bool isMe;
  final String time;
  final String text;
  String? convertedTo; // note, event

  ChatMessageItem({
    required this.id,
    required this.author,
    required this.isMe,
    required this.time,
    required this.text,
    this.convertedTo,
  });
}

class SharedGroup {
  final String id;
  final String name;
  final String description;
  final String keyFingerprint;
  final List<String> members;
  final List<SharedInvite> invites;
  final List<SharedNote> notes;
  final List<ChatMessageItem> messages;

  SharedGroup({
    required this.id,
    required this.name,
    required this.description,
    required this.keyFingerprint,
    required this.members,
    required this.invites,
    required this.notes,
    required this.messages,
  });
}

class SyncConflict {
  final String id;
  final String itemTitle;
  final String localVersion;
  final String remoteVersion;
  bool resolved;

  SyncConflict({
    required this.id,
    required this.itemTitle,
    required this.localVersion,
    required this.remoteVersion,
    this.resolved = false,
  });
}

class BackupSnapshot {
  final String id;
  final String label;
  final String createdAt;
  final String sizeLabel;
  final String kind; // manual, safety, scheduled

  const BackupSnapshot({
    required this.id,
    required this.label,
    required this.createdAt,
    required this.sizeLabel,
    required this.kind,
  });
}

class AutoUploadFolder {
  final String id;
  final String localPath;
  final String remoteTarget;
  bool enabled;
  String lastUploaded;

  AutoUploadFolder({
    required this.id,
    required this.localPath,
    required this.remoteTarget,
    this.enabled = true,
    required this.lastUploaded,
  });
}

class AndroidBackupItem {
  final String id;
  final String label;
  final String countLabel;
  String lastBackup;
  bool enabled;

  AndroidBackupItem({
    required this.id,
    required this.label,
    required this.countLabel,
    required this.lastBackup,
    this.enabled = true,
  });
}

class KeyRemapItem {
  final String id;
  final String fromKeys;
  final String toAction;
  bool enabled;
  final String scope; // global, asrbox

  KeyRemapItem({
    required this.id,
    required this.fromKeys,
    required this.toAction,
    this.enabled = true,
    this.scope = 'global',
  });
}

class DockShortcutItem {
  final String id;
  final String label;
  final String target;
  final AsrModuleId? moduleTarget;

  const DockShortcutItem({
    required this.id,
    required this.label,
    required this.target,
    this.moduleTarget,
  });
}

class DiagnosticLogItem {
  final String id;
  final String timestamp;
  final String level; // info, success, warn, error
  final String source;
  final String message;

  const DiagnosticLogItem({
    required this.id,
    required this.timestamp,
    required this.level,
    required this.source,
    required this.message,
  });
}
