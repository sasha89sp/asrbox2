import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../state/asrbox_store.dart';
import '../widgets/right_calendar_panel.dart';
import '../widgets/rocket_dock.dart';
import 'calendar_screen.dart';
import 'notes_screen.dart';
import 'passwords_screen.dart';
import 'shared_screen.dart';
import 'sync_screen.dart';
import 'tools_diagnostics_screen.dart';

class AsrboxShell extends StatelessWidget {
  final AsrboxStore store;

  const AsrboxShell({super.key, required this.store});

  static const _moduleMeta = <AsrModuleId, ({String label, IconData icon})>{
    AsrModuleId.notes: (label: 'Заметки', icon: Icons.description_outlined),
    AsrModuleId.passwords: (label: 'Пароли', icon: Icons.key_outlined),
    AsrModuleId.calendar: (label: 'Календарь', icon: Icons.calendar_today_outlined),
    AsrModuleId.shared: (label: 'Группы', icon: Icons.group_outlined),
    AsrModuleId.sync: (label: 'Синхронизация', icon: Icons.cloud_outlined),
    AsrModuleId.tools: (label: 'Инструменты', icon: Icons.build_outlined),
    AsrModuleId.diagnostics: (label: 'Диагностика', icon: Icons.monitor_heart_outlined),
  };

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 900;
    final enabledModules = AsrModuleId.values
        .where((m) => store.enabledModules[m] == true)
        .toList();

    return MediaQuery(
      data: MediaQuery.of(context).copyWith(
        textScaler: TextScaler.linear(store.zoomFactor),
      ),
      child: Stack(
        children: [
          isDesktop
              ? _buildDesktopScaffold(context, enabledModules)
              : _buildAndroidScaffold(context, enabledModules),

          // Always-on-top Reminder Popup
          if (store.activeReminder != null)
            Positioned(
              top: 16,
              right: 16,
              child: SizedBox(
                width: 310,
                child: Material(
                  elevation: 10,
                  borderRadius: BorderRadius.circular(16),
                  color: Theme.of(context).colorScheme.surface,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.notifications_active, size: 18, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text('Напоминание ASRbox', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            ),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16),
                              onPressed: store.dismissReminder,
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(store.activeReminder!.title,
                            style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        Text('${store.activeReminder!.date} · ${store.activeReminder!.startTime}',
                            style: TextStyle(fontSize: 12, color: Theme.of(context).hintColor)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () {
                                  store.addLog('info', 'Reminder', 'Отложено на 10 мин');
                                  store.dismissReminder();
                                },
                                child: const Text('+10 мин'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: FilledButton(
                                onPressed: store.dismissReminder,
                                child: const Text('Готово'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Clipboard Auto-Clear Countdown Toast
          if (store.clipboardLabel.isNotEmpty && store.clipboardSecondsLeft > 0)
            Positioned(
              bottom: isDesktop ? 76 : 78,
              right: 16,
              child: Material(
                elevation: 6,
                borderRadius: BorderRadius.circular(12),
                color: const Color(0xFF0F172A),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.shield_outlined, color: Color(0xFF34D399), size: 16),
                      const SizedBox(width: 8),
                      Text(
                        store.clipboardIsSecret
                            ? '${store.clipboardLabel} · очистка через ${store.clipboardSecondsLeft}с'
                            : 'Скопировано: ${store.clipboardLabel}',
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      if (store.clipboardIsSecret) ...[
                        const SizedBox(width: 10),
                        InkWell(
                          onTap: store.clearClipboardNow,
                          child: const Text(
                            'Очистить',
                            style: TextStyle(color: Color(0xFF93C5FD), fontSize: 12, decoration: TextDecoration.underline),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),

          // Floating RocketDock (Windows Desktop)
          if (isDesktop && store.dockEnabled && store.enabledModules[AsrModuleId.tools] == true)
            Positioned(
              bottom: 12,
              left: 0,
              right: 0,
              child: Center(child: RocketDock(store: store)),
            ),
        ],
      ),
    );
  }

  Widget _buildDesktopScaffold(BuildContext context, List<AsrModuleId> enabledModules) {
    final leftNav = SizedBox(
      width: store.leftSidebarWidth,
      child: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(10),
              children: enabledModules.map((mod) {
                final meta = _moduleMeta[mod]!;
                final active = store.activeModule == mod;
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: ListTile(
                    dense: true,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    selected: active,
                    selectedTileColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                    leading: Icon(meta.icon, size: 19),
                    title: Text(meta.label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w500)),
                    onTap: () => store.setActiveModule(mod),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                OutlinedButton.icon(
                  onPressed: () => _openModulesDialog(context),
                  icon: const Icon(Icons.tune, size: 16),
                  label: Text('Модули (${enabledModules.length}/7)'),
                ),
                const SizedBox(height: 8),
                Text(
                  '${store.portableMode ? "USB Portable" : "Профиль"} · Синхр. ${store.lastSyncLabel}',
                  style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ],
      ),
    );

    final rightPanel = store.showRightPanel
        ? SizedBox(width: store.rightPanelWidth, child: RightCalendarPanel(store: store))
        : const SizedBox.shrink();

    return Scaffold(
      body: Column(
        children: [
          // Windows Top Menu Bar
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              children: [
                const Text('ASRbox', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(width: 24),
                PopupMenuButton<String>(
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Text('Файл', style: TextStyle(fontSize: 13)),
                  ),
                  onSelected: (v) {
                    if (v == 'new_note') store.createNote(store.folders.first.id);
                    if (v == 'lock') store.lockAllVaults();
                    if (v == 'portable') store.togglePortableMode();
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'new_note', child: Text('Новая заметка')),
                    const PopupMenuItem(value: 'lock', child: Text('Заблокировать все сейфы')),
                    PopupMenuItem(
                      value: 'portable',
                      child: Text(store.portableMode ? '✓ Портативный режим (USB)' : 'Включить портативный режим'),
                    ),
                  ],
                ),
                PopupMenuButton<String>(
                  child: const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    child: Text('Вид', style: TextStyle(fontSize: 13)),
                  ),
                  onSelected: (v) {
                    if (v == 'panel') store.toggleRightPanel();
                    if (v == 'swap') store.toggleSwapColumns();
                    if (v == 'dock') store.toggleDock();
                    if (v == 'z90') store.setZoom(0.9);
                    if (v == 'z100') store.setZoom(1.0);
                    if (v == 'z115') store.setZoom(1.15);
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: 'panel', child: Text('Панель календаря и дня')),
                    const PopupMenuItem(value: 'swap', child: Text('Поменять колонки местами')),
                    const PopupMenuItem(value: 'dock', child: Text('Док-панель у края экрана')),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'z90', child: Text('Масштаб 90%')),
                    const PopupMenuItem(value: 'z100', child: Text('Масштаб 100%')),
                    const PopupMenuItem(value: 'z115', child: Text('Масштаб 115%')),
                  ],
                ),
                TextButton(
                  onPressed: () => _openModulesDialog(context),
                  child: const Text('Модули', style: TextStyle(fontSize: 13)),
                ),
                TextButton(
                  onPressed: store.triggerSync,
                  child: const Text('Синхронизация', style: TextStyle(fontSize: 13)),
                ),
                const Spacer(),
                OutlinedButton.icon(
                  onPressed: store.toggleTheme,
                  icon: Icon(
                    store.themeMode == ThemeMode.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
                    size: 16,
                  ),
                  label: Text(store.themeMode == ThemeMode.dark ? 'Светлая' : 'Тёмная',
                      style: const TextStyle(fontSize: 12)),
                ),
              ],
            ),
          ),
          Expanded(
            child: Row(
              children: [
                store.swapColumns ? rightPanel : leftNav,
                const VerticalDivider(width: 1),
                Expanded(child: _buildActiveModule(isCompact: false)),
                if (store.showRightPanel || store.swapColumns) const VerticalDivider(width: 1),
                store.swapColumns ? leftNav : rightPanel,
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAndroidScaffold(BuildContext context, List<AsrModuleId> enabledModules) {
    final bottomMods = enabledModules.take(5).toList();
    final currentIndex = bottomMods.indexOf(store.activeModule);

    return Scaffold(
      appBar: AppBar(
        title: const Text('ASRbox', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 17)),
        toolbarHeight: 50,
        actions: [
          IconButton(
            tooltip: 'Модули',
            icon: const Icon(Icons.tune, size: 20),
            onPressed: () => _openModulesDialog(context),
          ),
          IconButton(
            tooltip: 'Тема',
            icon: Icon(
              store.themeMode == ThemeMode.dark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
              size: 20,
            ),
            onPressed: store.toggleTheme,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(26),
          child: InkWell(
            onTap: store.triggerSync,
            child: Container(
              height: 26,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              alignment: Alignment.centerLeft,
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    store.isSyncing
                        ? 'Шифрование и синхронизация WebDAV...'
                        : 'Зашифровано · Синхронизация: ${store.lastSyncLabel}',
                    style: TextStyle(fontSize: 11, color: Theme.of(context).hintColor),
                  ),
                  const Icon(Icons.sync, size: 13),
                ],
              ),
            ),
          ),
        ),
      ),
      body: _buildActiveModule(isCompact: true),
      bottomNavigationBar: NavigationBar(
        height: 64,
        selectedIndex: currentIndex >= 0 ? currentIndex : 0,
        onDestinationSelected: (idx) => store.setActiveModule(bottomMods[idx]),
        destinations: bottomMods.map((mod) {
          final meta = _moduleMeta[mod]!;
          return NavigationDestination(
            icon: Icon(meta.icon),
            label: meta.label,
          );
        }).toList(),
      ),
    );
  }

  Widget _buildActiveModule({required bool isCompact}) {
    switch (store.activeModule) {
      case AsrModuleId.notes:
        return NotesScreen(store: store, isCompact: isCompact);
      case AsrModuleId.passwords:
        return PasswordsScreen(store: store, isCompact: isCompact);
      case AsrModuleId.calendar:
        return CalendarScreen(store: store, isCompact: isCompact);
      case AsrModuleId.shared:
        return SharedScreen(store: store, isCompact: isCompact);
      case AsrModuleId.sync:
        return SyncScreen(store: store);
      case AsrModuleId.tools:
        return ToolsDiagnosticsScreen(store: store, openDiagnosticsInitially: false);
      case AsrModuleId.diagnostics:
        return ToolsDiagnosticsScreen(store: store, openDiagnosticsInitially: true);
    }
  }

  void _openModulesDialog(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Модули ASRbox'),
        content: SizedBox(
          width: 420,
          child: ListenableBuilder(
            listenable: store,
            builder: (_, __) => Column(
              mainAxisSize: MainAxisSize.min,
              children: AsrModuleId.values.map((m) {
                final meta = _moduleMeta[m]!;
                return SwitchListTile(
                  dense: true,
                  title: Text(meta.label),
                  value: store.enabledModules[m] == true,
                  onChanged: (_) => store.toggleModule(m),
                );
              }).toList(),
            ),
          ),
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('Готово')),
        ],
      ),
    );
  }
}
