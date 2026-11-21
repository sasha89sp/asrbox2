import React, { useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  FilePlus2,
  KeyRound,
  Lock,
  MessageSquare,
  Plus,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ChatMessage, GroupRole, SharedGroup } from '../types/asrbox';
import { generateInviteCode } from '../utils/cryptoHelpers';

interface SharedModuleProps {
  groups: SharedGroup[];
  onUpdateGroup: (group: SharedGroup) => void;
  onCreateGroup: (name: string, description: string) => void;
  onConvertMessageToNote: (groupName: string, message: ChatMessage) => void;
  onConvertMessageToEvent: (groupName: string, message: ChatMessage) => void;
  onCopyText: (value: string, label: string) => void;
  onLog: (level: 'info' | 'success' | 'warn' | 'error', source: string, message: string) => void;
  compact?: boolean;
}

const ROLE_LABELS: Record<GroupRole, string> = {
  viewer: 'Только просмотр',
  own_files: 'Только свои файлы',
  editor: 'Полное редактирование',
};

export const SharedModule: React.FC<SharedModuleProps> = ({
  groups,
  onUpdateGroup,
  onCreateGroup,
  onConvertMessageToNote,
  onConvertMessageToEvent,
  onCopyText,
  onLog,
  compact = false,
}) => {
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || 'grp-family');
  const [chatInput, setChatInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [selectedSharedNoteId, setSelectedSharedNoteId] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [inviteType, setInviteType] = useState<'one_time' | 'multi_use'>('one_time');
  const [inviteRole, setInviteRole] = useState<GroupRole>('own_files');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [mobilePane, setMobilePane] = useState<'chat' | 'notes'>('chat');

  const activeGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const activeSharedNote =
    activeGroup?.notes.find((n) => n.id === selectedSharedNoteId) || activeGroup?.notes[0] || null;

  if (!activeGroup) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const msg: ChatMessage = {
      id: `msg-${Date.now()}`,
      author: 'Вы',
      isMe: true,
      time,
      text: chatInput.trim(),
      convertedTo: null,
    };
    onUpdateGroup({
      ...activeGroup,
      messages: [...activeGroup.messages, msg],
    });
    setChatInput('');
    onLog('info', `E2EE Chat / ${activeGroup.name}`, 'Отправлено зашифрованное сообщение в группу');
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !activeSharedNote) return;
    const now = new Date();
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const nextNotes = activeGroup.notes.map((n) =>
      n.id === activeSharedNote.id
        ? {
            ...n,
            comments: [
              ...n.comments,
              { id: `cm-${Date.now()}`, author: 'Вы', time, text: commentInput.trim() },
            ],
          }
        : n
    );
    onUpdateGroup({ ...activeGroup, notes: nextNotes });
    setCommentInput('');
  };

  const handleGenerateInvite = () => {
    const code = generateInviteCode();
    const nextInvite = {
      id: `inv-${Date.now()}`,
      code,
      type: inviteType,
      role: inviteRole,
      createdAt: 'Только что',
      usedCount: 0,
    };
    onUpdateGroup({
      ...activeGroup,
      invites: [nextInvite, ...activeGroup.invites],
    });
    onCopyText(code, 'Код приглашения в группу');
    onLog('success', `Group / ${activeGroup.name}`, `Создано приглашение (${ROLE_LABELS[inviteRole]})`);
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#141A23]">
      {/* Group Selector & Key Fingerprint Header */}
      <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {groups.map((grp) => (
            <button
              key={grp.id}
              type="button"
              onClick={() => {
                setActiveGroupId(grp.id);
                setSelectedSharedNoteId(null);
              }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                grp.id === activeGroup.id
                  ? 'bg-slate-900 dark:bg-blue-600 text-white'
                  : 'bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{grp.name}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowNewGroupModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Создать группу</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs shrink-0">
          {!compact && (
            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{activeGroup.keyFingerprint}</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Приглашения и роли</span>
          </button>
        </div>
      </div>

      {compact && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex gap-2">
          <button
            type="button"
            onClick={() => setMobilePane('chat')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              mobilePane === 'chat'
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Зашифрованный чат
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('notes')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              mobilePane === 'notes'
                ? 'bg-slate-900 dark:bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Общие заметки ({activeGroup.notes.length})
          </button>
        </div>
      )}

      {/* Split View: Shared Notes with Comments + Instant E2EE Chat */}
      <div className="flex-1 flex min-h-0">
        {/* Shared Notes & Comments */}
        <div
          className={`${
            compact && mobilePane !== 'notes' ? 'hidden' : 'flex'
          } flex-1 flex-col min-w-0 min-h-0 border-r border-slate-200 dark:border-slate-800`}
        >
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                Общие заметки группы
              </h3>
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400">
                Участников: {activeGroup.members.length} · Сквозное шифрование ключом группы
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const newNote = {
                  id: `sn-${Date.now()}`,
                  title: 'Новая общая заметка',
                  author: 'Вы',
                  updatedAt: 'Только что',
                  content: 'Зашифрованный документ, доступный участникам группы согласно их ролям.',
                  comments: [],
                };
                onUpdateGroup({ ...activeGroup, notes: [newNote, ...activeGroup.notes] });
                setSelectedSharedNoteId(newNote.id);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              + Заметка
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeGroup.notes.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {activeGroup.notes.map((sn) => (
                  <button
                    key={sn.id}
                    type="button"
                    onClick={() => setSelectedSharedNoteId(sn.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer ${
                      activeSharedNote?.id === sn.id
                        ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {sn.title}
                  </button>
                ))}
              </div>
            )}

            {activeSharedNote && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={activeSharedNote.title}
                    onChange={(e) => {
                      const nextNotes = activeGroup.notes.map((n) =>
                        n.id === activeSharedNote.id
                          ? { ...n, title: e.target.value, updatedAt: 'Только что' }
                          : n
                      );
                      onUpdateGroup({ ...activeGroup, notes: nextNotes });
                    }}
                    className="w-full text-lg font-display font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Автор: {activeSharedNote.author} · Обновлено: {activeSharedNote.updatedAt}
                  </div>
                  <textarea
                    value={activeSharedNote.content}
                    onChange={(e) => {
                      const nextNotes = activeGroup.notes.map((n) =>
                        n.id === activeSharedNote.id
                          ? { ...n, content: e.target.value, updatedAt: 'Только что' }
                          : n
                      );
                      onUpdateGroup({ ...activeGroup, notes: nextNotes });
                    }}
                    rows={6}
                    className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#FAFBFD] dark:bg-[#11161F] text-sm leading-relaxed text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Comments Thread */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Комментарии ({activeSharedNote.comments.length})</span>
                  </div>

                  <div className="space-y-2.5">
                    {activeSharedNote.comments.map((cm) => (
                      <div
                        key={cm.id}
                        className="p-3 rounded-xl bg-[#FAFBFD] dark:bg-[#11161F] border border-slate-200/80 dark:border-slate-800"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {cm.author}
                          </span>
                          <span className="tabular-nums">{cm.time}</span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                          {cm.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleAddComment} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      placeholder="Добавить комментарий к заметке..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18202C] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
                    >
                      Отправить
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Encrypted Instant Chat with 1-click Note / Event conversion */}
        <div
          className={`${
            compact && mobilePane !== 'chat' ? 'hidden' : 'flex'
          } flex-col min-h-0 ${compact ? 'w-full' : 'w-[400px] shrink-0'} bg-[#FAFBFD] dark:bg-[#11161F]`}
        >
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                Зашифрованный чат
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Из любого сообщения — заметка или событие в 1 клик
              </p>
            </div>
            <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {activeGroup.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!msg.isMe && (
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 shrink-0 flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-200">
                    {msg.avatar ? (
                      <img
                        src={msg.avatar}
                        alt={msg.author}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      msg.author[0]
                    )}
                  </div>
                )}

                <div className={`max-w-[82%] space-y-1.5 ${msg.isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                      msg.isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white dark:bg-[#18202C] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm'
                    }`}
                  >
                    {!msg.isMe && (
                      <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-100 mb-0.5">
                        {msg.author}
                      </div>
                    )}
                    <p>{msg.text}</p>
                    <div
                      className={`text-[10px] tabular-nums mt-1 ${
                        msg.isMe ? 'text-blue-100 text-right' : 'text-slate-400'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>

                  {/* 1-Click Cross-Module Conversion Actions */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        onConvertMessageToNote(activeGroup.name, msg);
                        onUpdateGroup({
                          ...activeGroup,
                          messages: activeGroup.messages.map((m) =>
                            m.id === msg.id ? { ...m, convertedTo: 'note' } : m
                          ),
                        });
                      }}
                      className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                    >
                      {msg.convertedTo === 'note' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <FilePlus2 className="w-3 h-3" />
                      )}
                      <span>{msg.convertedTo === 'note' ? 'Создана заметка' : 'В заметку'}</span>
                    </button>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        onConvertMessageToEvent(activeGroup.name, msg);
                        onUpdateGroup({
                          ...activeGroup,
                          messages: activeGroup.messages.map((m) =>
                            m.id === msg.id ? { ...m, convertedTo: 'event' } : m
                          ),
                        });
                      }}
                      className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 font-medium cursor-pointer"
                    >
                      {msg.convertedTo === 'event' ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <CalendarPlus className="w-3 h-3" />
                      )}
                      <span>{msg.convertedTo === 'event' ? 'В календаре' : 'В календарь'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#141A23] flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Зашифрованное сообщение..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#FAFBFD] dark:bg-[#18202C] text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shrink-0"
              title="Отправить"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Invitations & Roles Modal */}
      {showInviteModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                  Доступ и приглашения — {activeGroup.name}
                </h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">
                  Ключ группы: {activeGroup.keyFingerprint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Участники ({activeGroup.members.length})
              </div>
              <div className="divide-y divide-slate-200/70 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
                {activeGroup.members.map((m, idx) => (
                  <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{m.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">{ROLE_LABELS[m.role]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Invite */}
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Создать новое приглашение
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={inviteType}
                  onChange={(e) => setInviteType(e.target.value as 'one_time' | 'multi_use')}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-slate-900 dark:text-slate-100"
                >
                  <option value="one_time">Одноразовое приглашение</option>
                  <option value="multi_use">Многоразовое приглашение</option>
                </select>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as GroupRole)}
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-slate-900 dark:text-slate-100"
                >
                  <option value="viewer">Роль: Только просмотр</option>
                  <option value="own_files">Роль: Только свои файлы</option>
                  <option value="editor">Роль: Полное редактирование</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleGenerateInvite}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Сгенерировать и скопировать код приглашения
              </button>

              {activeGroup.invites.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {activeGroup.invites.map((inv) => (
                    <div
                      key={inv.id}
                      className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#11161F] border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {inv.code}
                        </span>
                        <span className="text-slate-500 ml-2">
                          {inv.type === 'one_time' ? 'Одноразовое' : 'Многоразовое'} · {ROLE_LABELS[inv.role]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onCopyText(inv.code, 'Код приглашения')}
                        className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Group Modal */}
      {showNewGroupModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setShowNewGroupModal(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!newGroupName.trim()) return;
              onCreateGroup(
                newGroupName.trim(),
                newGroupDesc.trim() || 'Защищённое пространство со своим ключом шифрования.'
              );
              setNewGroupName('');
              setNewGroupDesc('');
              setShowNewGroupModal(false);
            }}
            className="w-full max-w-md rounded-2xl bg-white dark:bg-[#161D29] border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-slate-900 dark:text-slate-100">
                Новая закрытая группа
              </h3>
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              required
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Название группы (например: Путешествие 2026)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-sm text-slate-900 dark:text-slate-100"
            />
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              rows={2}
              placeholder="Описание пространства..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#11161F] text-xs text-slate-900 dark:text-slate-100"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewGroupModal(false)}
                className="px-3.5 py-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium cursor-pointer"
              >
                Создать с ключом E2EE
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
