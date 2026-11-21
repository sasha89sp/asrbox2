import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';
import '../state/asrbox_store.dart';

class SharedScreen extends StatefulWidget {
  final AsrboxStore store;
  final bool isCompact;

  const SharedScreen({super.key, required this.store, required this.isCompact});

  @override
  State<SharedScreen> createState() => _SharedScreenState();
}

class _SharedScreenState extends State<SharedScreen> {
  final TextEditingController _chatCtrl = TextEditingController();

  @override
  void dispose() {
    _chatCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final group = store.groups.first;

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(group.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text(
                      'Ключ E2EE: ${group.keyFingerprint} · Участников: ${group.members.length}',
                      style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor),
                    ),
                  ],
                ),
              ),
              OutlinedButton.icon(
                onPressed: () {
                  final code = CryptoService.generateInviteCode();
                  group.invites.insert(
                    0,
                    SharedInvite(
                      id: 'inv-${DateTime.now().millisecondsSinceEpoch}',
                      code: code,
                      type: 'one_time',
                      role: 'own_files',
                      createdAt: 'Только что',
                    ),
                  );
                  store.copyToClipboard(code, 'Приглашение в группу ($code)');
                },
                icon: const Icon(Icons.person_add_alt, size: 16),
                label: const Text('Приглашение'),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              if (group.notes.isNotEmpty) ...[
                const Text('Общая заметка с комментариями', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(group.notes.first.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        const SizedBox(height: 6),
                        Text(group.notes.first.content, style: const TextStyle(fontSize: 13.5, height: 1.5)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 18),
              ],
              const Text('Зашифрованный чат (в заметку или календарь в 1 клик)',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              const SizedBox(height: 8),
              ...group.messages.map((m) => Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${m.author} · ${m.time}',
                              style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor),
                            ),
                            const SizedBox(height: 4),
                            Text(m.text, style: const TextStyle(fontSize: 13.5)),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                TextButton.icon(
                                  onPressed: () => store.convertMessageToNote(group.name, m),
                                  icon: const Icon(Icons.note_add_outlined, size: 15),
                                  label: Text(m.convertedTo == 'note' ? 'Создана заметка' : 'В заметку'),
                                ),
                                TextButton.icon(
                                  onPressed: () => store.convertMessageToEvent(group.name, m),
                                  icon: const Icon(Icons.event_available, size: 15),
                                  label: Text(m.convertedTo == 'event' ? 'В календаре' : 'В календарь'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  )),
            ],
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _chatCtrl,
                  decoration: const InputDecoration(hintText: 'Зашифрованное сообщение...'),
                  onSubmitted: (_) => _send(group),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => _send(group),
                child: const Icon(Icons.send, size: 18),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _send(SharedGroup group) {
    final text = _chatCtrl.text.trim();
    if (text.isEmpty) return;
    group.messages.add(ChatMessageItem(
      id: 'm-${DateTime.now().millisecondsSinceEpoch}',
      author: 'Вы',
      isMe: true,
      time: CryptoService.nowTimeShort().substring(0, 5),
      text: text,
    ));
    _chatCtrl.clear();
    widget.store.addLog('info', 'E2EE Chat', 'Отправлено сообщение в «${group.name}»');
    widget.store.touch();
  }
}
