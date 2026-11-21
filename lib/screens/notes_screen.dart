import 'dart:ui';
import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';
import '../services/formula_engine.dart';
import '../state/asrbox_store.dart';

class NotesScreen extends StatefulWidget {
  final AsrboxStore store;
  final bool isCompact;

  const NotesScreen({super.key, required this.store, required this.isCompact});

  @override
  State<NotesScreen> createState() => _NotesScreenState();
}

class _NotesScreenState extends State<NotesScreen> {
  String _filter = 'all'; // all, pinned, favorites, trash, or folderId
  String _search = '';
  bool _previewMode = false;
  bool _mobileEditorOpen = false;

  List<NoteItem> get _filteredNotes {
    final q = _search.trim().toLowerCase();
    return widget.store.notes.where((n) {
      if (_filter == 'trash') return n.trashedAt != null;
      if (n.trashedAt != null) return false;
      if (_filter == 'pinned' && !n.isPinned) return false;
      if (_filter == 'favorites' && !n.isFavorite) return false;
      if (!{'all', 'pinned', 'favorites', 'trash'}.contains(_filter)) {
        final children = widget.store.folders
            .where((f) => f.parentId == _filter)
            .map((f) => f.id)
            .toSet();
        if (n.folderId != _filter && !children.contains(n.folderId)) return false;
      }
      if (q.isNotEmpty) {
        final inTitle = n.title.toLowerCase().contains(q);
        final inBody = n.blocks.any((b) =>
            b.content.toLowerCase().contains(q) ||
            b.voiceTranscript.toLowerCase().contains(q));
        return inTitle || inBody;
      }
      return true;
    }).toList();
  }

  NoteItem? get _activeNote {
    final list = _filteredNotes;
    for (final n in widget.store.notes) {
      if (n.id == widget.store.selectedNoteId) return n;
    }
    return list.isNotEmpty ? list.first : null;
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final list = _filteredNotes;
    final active = _activeNote;

    if (widget.isCompact && _mobileEditorOpen && active != null) {
      return _buildEditor(context, active, showBack: true);
    }

    if (widget.isCompact) {
      return _buildNoteList(context, list, active);
    }

    return Row(
      children: [
        SizedBox(width: 280, child: _buildNoteList(context, list, active)),
        const VerticalDivider(width: 1),
        Expanded(
          child: active == null
              ? const Center(child: Text('Выберите или создайте заметку'))
              : _buildEditor(context, active, showBack: false),
        ),
      ],
    );
  }

  Widget _buildNoteList(BuildContext context, List<NoteItem> list, NoteItem? active) {
    final store = widget.store;
    final cs = Theme.of(context).colorScheme;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      onChanged: (v) => setState(() => _search = v),
                      decoration: const InputDecoration(
                        hintText: 'Поиск заметок...',
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    onPressed: () {
                      store.createNote(store.folders.first.id);
                      if (widget.isCompact) setState(() => _mobileEditorOpen = true);
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Новая'),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _filterTab('all', 'Все'),
                    _filterTab('pinned', 'Главные'),
                    _filterTab('favorites', 'Избранное'),
                    _filterTab('trash', 'Корзина'),
                    ...store.folders.map((f) => _filterTab(f.id, f.name)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: list.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('Заметок по фильтру нет', style: TextStyle(fontSize: 13)),
                  ),
                )
              : ListView.separated(
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final note = list[idx];
                    final selected = active?.id == note.id;
                    return ListTile(
                      selected: selected,
                      selectedTileColor: cs.primary.withValues(alpha: 0.08),
                      title: Text(
                        note.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                      subtitle: Text(
                        '${note.trashedAt ?? note.updatedAt} · ${note.blocks.length} бл.',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (note.isPinned) Icon(Icons.push_pin, size: 14, color: cs.primary),
                          if (note.isFavorite)
                            const Padding(
                              padding: EdgeInsets.only(left: 4),
                              child: Icon(Icons.star, size: 14, color: Colors.amber),
                            ),
                        ],
                      ),
                      onTap: () {
                        store.selectedNoteId = note.id;
                        store.touch();
                        if (widget.isCompact) setState(() => _mobileEditorOpen = true);
                      },
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _filterTab(String id, String label) {
    final active = _filter == id;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: active,
        onSelected: (_) => setState(() => _filter = id),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildEditor(BuildContext context, NoteItem note, {required bool showBack}) {
    final store = widget.store;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            children: [
              if (showBack)
                TextButton.icon(
                  onPressed: () => setState(() => _mobileEditorOpen = false),
                  icon: const Icon(Icons.arrow_back, size: 16),
                  label: const Text('Список'),
                ),
              SegmentedButton<bool>(
                segments: const [
                  ButtonSegment(value: false, label: Text('Правка')),
                  ButtonSegment(value: true, label: Text('Просмотр')),
                ],
                selected: {_previewMode},
                onSelectionChanged: (s) => setState(() => _previewMode = s.first),
                style: const ButtonStyle(visualDensity: VisualDensity.compact),
              ),
              const Spacer(),
              IconButton(
                tooltip: 'Закрепить',
                onPressed: () {
                  note.isPinned = !note.isPinned;
                  store.touch();
                },
                icon: Icon(note.isPinned ? Icons.push_pin : Icons.push_pin_outlined, size: 18),
              ),
              IconButton(
                tooltip: 'Избранное',
                onPressed: () {
                  note.isFavorite = !note.isFavorite;
                  store.touch();
                },
                icon: Icon(note.isFavorite ? Icons.star : Icons.star_border, size: 18),
              ),
              if (note.trashedAt != null)
                TextButton(
                  onPressed: () {
                    note.trashedAt = null;
                    store.touch();
                  },
                  child: const Text('Восстановить'),
                )
              else
                IconButton(
                  tooltip: 'В корзину (30 дн.)',
                  onPressed: () {
                    note.trashedAt = 'Удалено только что · осталось 30 дн.';
                    store.addLog('info', 'Notes', 'Заметка «${note.title}» перемещена в корзину');
                    store.touch();
                  },
                  icon: const Icon(Icons.delete_outline, size: 18),
                ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (!_previewMode)
                TextFormField(
                  key: ValueKey('title-${note.id}'),
                  initialValue: note.title,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  decoration: const InputDecoration(
                    border: InputBorder.none,
                    enabledBorder: InputBorder.none,
                    focusedBorder: InputBorder.none,
                    filled: false,
                    contentPadding: EdgeInsets.zero,
                    hintText: 'Заголовок заметки...',
                  ),
                  onChanged: (v) {
                    note.title = v;
                    note.updatedAt = 'Только что';
                    store.touch();
                  },
                )
              else
                Text(note.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(
                'Обновлено: ${note.updatedAt} · Шифрование на устройстве · #${note.tags.join(" #")}',
                style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor),
              ),
              const SizedBox(height: 20),
              ...note.blocks.map((block) => Padding(
                    padding: const EdgeInsets.only(bottom: 18),
                    child: _buildBlock(context, note, block),
                  )),
              if (!_previewMode && note.trashedAt == null)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: () {
                        note.blocks.add(NoteBlock(
                          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
                          type: NoteBlockType.markdown,
                          content: 'Новый текстовый блок Markdown.',
                        ));
                        store.touch();
                      },
                      icon: const Icon(Icons.notes, size: 16),
                      label: const Text('Текст'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        note.blocks.add(NoteBlock(
                          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
                          type: NoteBlockType.checklist,
                          title: 'Чек-лист',
                          checklist: [
                            ChecklistItem(id: 'ci-1', text: 'Новая задача'),
                          ],
                        ));
                        store.touch();
                      },
                      icon: const Icon(Icons.check_box_outlined, size: 16),
                      label: const Text('Чек-лист'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        note.blocks.add(NoteBlock(
                          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
                          type: NoteBlockType.spreadsheet,
                          title: 'Таблица с формулами',
                          columns: ['Позиция', 'Кол-во', 'Цена', 'Итого'],
                          rows: [
                            ['Товар 1', '2', '1200', '=B1*C1'],
                            ['Товар 2', '3', '850', '=B2*C2'],
                            ['Итого', '', '', '=SUM(D1:D2)'],
                          ],
                        ));
                        store.touch();
                      },
                      icon: const Icon(Icons.table_chart_outlined, size: 16),
                      label: const Text('Таблица Excel'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        note.blocks.add(NoteBlock(
                          id: 'b-${DateTime.now().millisecondsSinceEpoch}',
                          type: NoteBlockType.ics,
                          title: 'События (.ics)',
                          icsEvents: [
                            EmbeddedIcsEvent(
                              id: 'ics-${DateTime.now().millisecondsSinceEpoch}',
                              title: 'Новое событие из заметки',
                              date: CryptoService.todayIso(0),
                              time: '16:00',
                            ),
                          ],
                        ));
                        store.touch();
                      },
                      icon: const Icon(Icons.event_note, size: 16),
                      label: const Text('События .ics'),
                    ),
                  ],
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBlock(BuildContext context, NoteItem note, NoteBlock block) {
    final store = widget.store;
    switch (block.type) {
      case NoteBlockType.markdown:
        if (_previewMode) {
          return SelectableText(block.content, style: const TextStyle(fontSize: 15, height: 1.55));
        }
        return TextFormField(
          key: ValueKey('md-${block.id}'),
          initialValue: block.content,
          maxLines: null,
          minLines: 3,
          onChanged: (v) {
            block.content = v;
            note.updatedAt = 'Только что';
          },
        );

      case NoteBlockType.checklist:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(block.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 8),
                ...block.checklist.map((item) => CheckboxListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      value: item.done,
                      title: Text(
                        item.text,
                        style: TextStyle(
                          fontSize: 13.5,
                          decoration: item.done ? TextDecoration.lineThrough : null,
                        ),
                      ),
                      onChanged: (v) {
                        item.done = v ?? false;
                        store.touch();
                      },
                    )),
              ],
            ),
          ),
        );

      case NoteBlockType.spreadsheet:
        return Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                child: Row(
                  children: [
                    const Icon(Icons.grid_on, size: 16, color: Color(0xFF16A34A)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(block.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    ),
                    TextButton(
                      onPressed: () {
                        final csv = FormulaEngine.exportCsv(block.columns, block.rows);
                        store.copyToClipboard(csv, 'CSV/Excel таблица «${block.title}»');
                      },
                      child: const Text('Экспорт CSV/Excel', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowHeight: 36,
                  dataRowMinHeight: 36,
                  dataRowMaxHeight: 42,
                  columns: [
                    const DataColumn(label: Text('#', style: TextStyle(fontSize: 11))),
                    ...List.generate(
                      block.columns.length,
                      (c) => DataColumn(
                        label: Text(
                          '${FormulaEngine.colIndexToLetter(c)} ${block.columns[c]}',
                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ),
                  ],
                  rows: List.generate(block.rows.length, (r) {
                    return DataRow(
                      cells: [
                        DataCell(Text('${r + 1}', style: const TextStyle(fontSize: 11))),
                        ...List.generate(block.rows[r].length, (c) {
                          final raw = block.rows[r][c];
                          final display = FormulaEngine.evaluateCellDisplay(raw, block.rows, r, c);
                          return DataCell(
                            Text(
                              display.isEmpty ? '—' : display,
                              style: TextStyle(
                                fontSize: 12.5,
                                fontFeatures: const [FontFeature.tabularFigures()],
                                color: raw.trim().startsWith('=')
                                    ? Theme.of(context).colorScheme.primary
                                    : null,
                              ),
                            ),
                            onTap: _previewMode
                                ? null
                                : () => _editCellDialog(context, block, r, c),
                          );
                        }),
                      ],
                    );
                  }),
                ),
              ),
            ],
          ),
        );

      case NoteBlockType.voice:
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.mic, size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '${block.title} · 0:${block.voiceDurationSec.toString().padLeft(2, "0")}',
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(block.voiceTranscript, style: const TextStyle(fontSize: 13.5, height: 1.5)),
              ],
            ),
          ),
        );

      case NoteBlockType.ics:
        return Card(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(12),
                child: Text(block.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
              ),
              const Divider(height: 1),
              ...block.icsEvents.map((ev) => ListTile(
                    dense: true,
                    title: Text(ev.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                    subtitle: Text('${ev.date} · ${ev.time} ${ev.location}'),
                    trailing: FilledButton.tonal(
                      onPressed: ev.addedToCalendar ? null : () => store.addEventFromIcs(ev),
                      child: Text(ev.addedToCalendar ? 'В календаре' : 'В календарь'),
                    ),
                  )),
            ],
          ),
        );
    }
  }

  Future<void> _editCellDialog(BuildContext context, NoteBlock block, int r, int c) async {
    final ctrl = TextEditingController(text: block.rows[r][c]);
    final saved = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Ячейка ${FormulaEngine.colIndexToLetter(c)}${r + 1}'),
        content: TextField(
          controller: ctrl,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'Число, текст или формула (=SUM(D1:D4))',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Отмена')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text), child: const Text('Сохранить')),
        ],
      ),
    );
    if (saved != null) {
      block.rows[r][c] = saved;
      widget.store.touch();
    }
  }
}
