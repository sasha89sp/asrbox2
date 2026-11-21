import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';
import '../state/asrbox_store.dart';

class RightCalendarPanel extends StatelessWidget {
  final AsrboxStore store;

  const RightCalendarPanel({super.key, required this.store});

  @override
  Widget build(BuildContext context) {
    final today = CryptoService.todayIso(0);
    final todayEvents = store.events.where((e) => e.date == today).toList();
    final pinnedNotes = store.notes.where((n) => n.trashedAt == null && n.isPinned).toList();

    return Container(
      color: Theme.of(context).brightness == Brightness.dark
          ? const Color(0xFF11161F)
          : const Color(0xFFFAFBFD),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Расписание дня', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
              Text(today, style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor)),
            ],
          ),
          const SizedBox(height: 10),
          if (todayEvents.isEmpty)
            Text('На сегодня событий нет', style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor))
          else
            ...todayEvents.map((ev) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Card(
                    child: ListTile(
                      dense: true,
                      title: Text(ev.title, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600)),
                      subtitle: Text('${ev.startTime}–${ev.endTime}', style: const TextStyle(fontSize: 11.5)),
                      trailing: IconButton(
                        icon: const Icon(Icons.notifications_none, size: 16),
                        onPressed: () => store.triggerReminder(ev),
                      ),
                    ),
                  ),
                )),
          const SizedBox(height: 16),
          const Text('Закреплённые заметки', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13.5)),
          const SizedBox(height: 8),
          ...pinnedNotes.map((n) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Card(
                  child: ListTile(
                    dense: true,
                    title: Text(n.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12.5)),
                    subtitle: Text(n.updatedAt, style: const TextStyle(fontSize: 11)),
                    onTap: () {
                      store.selectedNoteId = n.id;
                      store.setActiveModule(AsrModuleId.notes);
                    },
                  ),
                ),
              )),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => store.setActiveModule(AsrModuleId.tools),
            icon: const Icon(Icons.mic, size: 16),
            label: const Text('Быстрая диктовка'),
          ),
        ],
      ),
    );
  }
}
