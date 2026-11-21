import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';
import '../state/asrbox_store.dart';

class CalendarScreen extends StatefulWidget {
  final AsrboxStore store;
  final bool isCompact;

  const CalendarScreen({super.key, required this.store, required this.isCompact});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  String _mode = 'list'; // day, week, month, year, list

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final visibleIds = store.calendars.where((c) => c.visible).map((c) => c.id).toSet();
    final visibleEvents = store.events.where((e) => visibleIds.contains(e.calendarId)).toList()
      ..sort((a, b) => '${a.date} ${a.startTime}'.compareTo('${b.date} ${b.startTime}'));

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _modeBtn('day', 'День'),
                      _modeBtn('week', 'Неделя'),
                      _modeBtn('month', 'Месяц'),
                      _modeBtn('year', 'Год'),
                      _modeBtn('list', 'Список'),
                    ],
                  ),
                ),
              ),
              FilledButton.icon(
                onPressed: () => _addEventDialog(context),
                icon: const Icon(Icons.add, size: 16),
                label: const Text('Событие'),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: store.calendars.map((c) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    avatar: CircleAvatar(backgroundColor: Color(c.colorValue), radius: 5),
                    label: Text(c.name, style: const TextStyle(fontSize: 12)),
                    selected: c.visible,
                    onSelected: (v) {
                      c.visible = v;
                      store.touch();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: visibleEvents.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, idx) {
              final ev = visibleEvents[idx];
              final cal = store.calendars.firstWhere(
                (c) => c.id == ev.calendarId,
                orElse: () => store.calendars.first,
              );
              return Card(
                child: ListTile(
                  leading: CircleAvatar(backgroundColor: Color(cal.colorValue), radius: 6),
                  title: Text(ev.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                  subtitle: Text('${ev.date} · ${ev.startTime}–${ev.endTime} · ${cal.name}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (ev.linkedNoteId != null)
                        TextButton(
                          onPressed: () {
                            store.selectedNoteId = ev.linkedNoteId;
                            store.setActiveModule(AsrModuleId.notes);
                          },
                          child: const Text('Заметка'),
                        ),
                      IconButton(
                        tooltip: 'Тест напоминания поверх окон',
                        icon: const Icon(Icons.notifications_active_outlined, size: 18),
                        onPressed: () => store.triggerReminder(ev),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _modeBtn(String id, String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: _mode == id,
        onSelected: (_) => setState(() => _mode = id),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Future<void> _addEventDialog(BuildContext context) async {
    final titleCtrl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Новое событие'),
        content: TextField(
          controller: titleCtrl,
          autofocus: true,
          decoration: const InputDecoration(hintText: 'Название события...'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Создать')),
        ],
      ),
    );
    if (ok == true && titleCtrl.text.trim().isNotEmpty) {
      widget.store.events.insert(
        0,
        CalendarEventItem(
          id: 'ev-${DateTime.now().millisecondsSinceEpoch}',
          calendarId: widget.store.calendars.first.id,
          title: titleCtrl.text.trim(),
          date: CryptoService.todayIso(0),
          startTime: '14:00',
          endTime: '15:00',
        ),
      );
      widget.store.addLog('info', 'Calendar', 'Добавлено событие «${titleCtrl.text.trim()}»');
      widget.store.touch();
    }
  }
}
