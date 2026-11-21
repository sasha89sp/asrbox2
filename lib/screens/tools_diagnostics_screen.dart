import 'package:flutter/material.dart';
import '../state/asrbox_store.dart';

class ToolsDiagnosticsScreen extends StatefulWidget {
  final AsrboxStore store;
  final bool openDiagnosticsInitially;

  const ToolsDiagnosticsScreen({
    super.key,
    required this.store,
    this.openDiagnosticsInitially = false,
  });

  @override
  State<ToolsDiagnosticsScreen> createState() => _ToolsDiagnosticsScreenState();
}

class _ToolsDiagnosticsScreenState extends State<ToolsDiagnosticsScreen> {
  late int _tabIndex;
  final TextEditingController _dictationCtrl = TextEditingController(
    text: 'Нажмите «Начать диктовку» — распознанный текст автоматически скопируется в буфер обмена.',
  );

  @override
  void initState() {
    super.initState();
    _tabIndex = widget.openDiagnosticsInitially ? 3 : 0;
  }

  @override
  void didUpdateWidget(covariant ToolsDiagnosticsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.openDiagnosticsInitially != oldWidget.openDiagnosticsInitially) {
      _tabIndex = widget.openDiagnosticsInitially ? 3 : 0;
    }
  }

  @override
  void dispose() {
    _dictationCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _tabBtn(0, 'Голосовая диктовка'),
                _tabBtn(1, 'Клавиши (Windows)'),
                _tabBtn(2, 'Док-панель'),
                _tabBtn(3, 'Окно диагностики'),
              ],
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(20),
            children: [
              if (_tabIndex == 0) ...[
                const Text('Голосовая диктовка', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                Text(
                  'На Windows работает по удержанию ${store.dictationHotkey}. Результат сразу попадает в буфер обмена.',
                  style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor),
                ),
                const SizedBox(height: 16),
                TextField(controller: _dictationCtrl, maxLines: 4),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: () {
                        const demo = 'Проверить резервную копию на Яндекс Диске и уточнить доставку материалов в четверг.';
                        _dictationCtrl.text = demo;
                        store.copyToClipboard(demo, 'Текст диктовки');
                        store.addLog('success', 'VoiceDictation', 'Речь распознана и скопирована в буфер');
                      },
                      icon: const Icon(Icons.mic, size: 16),
                      label: const Text('Начать диктовку'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () => store.createNoteFromDictation(_dictationCtrl.text),
                      icon: const Icon(Icons.note_add_outlined, size: 16),
                      label: const Text('В новую заметку'),
                    ),
                  ],
                ),
              ],
              if (_tabIndex == 1) ...[
                const Text('Системное переназначение клавиш (Windows)',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Card(
                  child: Column(
                    children: store.keyRemaps
                        .map((k) => SwitchListTile(
                              title: Text('${k.fromKeys}  →  ${k.toAction}',
                                  style: const TextStyle(fontSize: 13.5, fontFamily: 'monospace')),
                              subtitle: Text(k.scope == 'global' ? 'Глобально в Windows' : 'Только ASRbox'),
                              value: k.enabled,
                              onChanged: (v) {
                                k.enabled = v;
                                store.touch();
                              },
                            ))
                        .toList(),
                  ),
                ),
              ],
              if (_tabIndex == 2) ...[
                const Text('Док-панель у края экрана (RocketDock)',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                Card(
                  child: SwitchListTile(
                    title: const Text('Показывать плавающую док-панель'),
                    subtitle: const Text('Увеличение значков при наведении и быстрый запуск модулей'),
                    value: store.dockEnabled,
                    onChanged: (_) => store.toggleDock(),
                  ),
                ),
              ],
              if (_tabIndex == 3) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Единое окно диагностики',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                    TextButton(
                      onPressed: () {
                        store.logs.clear();
                        store.touch();
                      },
                      child: const Text('Очистить журнал'),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F141D),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: store.logs
                        .map((l) => Padding(
                              padding: const EdgeInsets.only(bottom: 6),
                              child: Text(
                                '[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}',
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 12,
                                  color: Color(0xFFE2E8F0),
                                ),
                              ),
                            ))
                        .toList(),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _tabBtn(int idx, String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label, style: const TextStyle(fontSize: 12)),
        selected: _tabIndex == idx,
        onSelected: (_) => setState(() => _tabIndex = idx),
      ),
    );
  }
}
