import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../state/asrbox_store.dart';

class RocketDock extends StatefulWidget {
  final AsrboxStore store;

  const RocketDock({super.key, required this.store});

  @override
  State<RocketDock> createState() => _RocketDockState();
}

class _RocketDockState extends State<RocketDock> {
  int? _hovered;

  IconData _iconFor(AsrModuleId? m) {
    switch (m) {
      case AsrModuleId.notes:
        return Icons.description_outlined;
      case AsrModuleId.passwords:
        return Icons.key_outlined;
      case AsrModuleId.calendar:
        return Icons.calendar_today_outlined;
      case AsrModuleId.shared:
        return Icons.group_outlined;
      case AsrModuleId.sync:
        return Icons.cloud_outlined;
      case AsrModuleId.tools:
        return Icons.mic_none;
      default:
        return Icons.folder_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    return Material(
      elevation: 6,
      borderRadius: BorderRadius.circular(18),
      color: Theme.of(context).colorScheme.surface.withValues(alpha: 0.94),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(store.dockShortcuts.length, (i) {
            final item = store.dockShortcuts[i];
            final scale = _hovered == i
                ? store.dockScale
                : (_hovered != null && (_hovered! - i).abs() == 1 ? 1.15 : 1.0);
            return MouseRegion(
              onEnter: (_) => setState(() => _hovered = i),
              onExit: (_) => setState(() => _hovered = null),
              child: Tooltip(
                message: item.label,
                child: AnimatedScale(
                  scale: scale,
                  duration: const Duration(milliseconds: 140),
                  curve: Curves.easeOutCubic,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () {
                        if (item.moduleTarget != null) {
                          store.setActiveModule(item.moduleTarget!);
                        }
                      },
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(_iconFor(item.moduleTarget), size: 20),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }
}
