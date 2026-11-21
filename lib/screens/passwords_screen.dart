import 'package:flutter/material.dart';
import '../models/asrbox_models.dart';
import '../services/crypto_service.dart';
import '../state/asrbox_store.dart';

class PasswordsScreen extends StatefulWidget {
  final AsrboxStore store;
  final bool isCompact;

  const PasswordsScreen({super.key, required this.store, required this.isCompact});

  @override
  State<PasswordsScreen> createState() => _PasswordsScreenState();
}

class _PasswordsScreenState extends State<PasswordsScreen> {
  String _activeVaultId = 'v-personal';
  String _activeFolder = 'Все';
  bool _showTrash = false;
  bool _revealPassword = false;
  String? _selectedEntryId;
  final TextEditingController _masterCtrl = TextEditingController();
  String _unlockError = '';

  @override
  void dispose() {
    _masterCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final vault = store.vaults.firstWhere(
      (v) => v.id == _activeVaultId,
      orElse: () => store.vaults.first,
    );
    final isUnlocked =
        (store.unlockedVaultIds[vault.id] == true) || vault.rememberMode == 'autologin';

    final allVaultEntries = store.passwordEntries.where((e) => e.vaultId == vault.id).toList();
    final dupCounts = <String, int>{};
    for (final e in allVaultEntries.where((x) => !x.trashed && x.password.isNotEmpty)) {
      dupCounts[e.password] = (dupCounts[e.password] ?? 0) + 1;
    }

    final sortKey = (_activeFolder != 'Все' && vault.folderSorts.containsKey(_activeFolder))
        ? vault.folderSorts[_activeFolder]!
        : vault.globalSort;

    final filtered = allVaultEntries.where((e) {
      if (_showTrash) return e.trashed;
      if (e.trashed) return false;
      if (_activeFolder != 'Все' && e.folder != _activeFolder) return false;
      return true;
    }).toList()
      ..sort((a, b) {
        switch (sortKey) {
          case PasswordSortKey.title:
            return a.title.compareTo(b.title);
          case PasswordSortKey.strength:
            return CryptoService.evaluateStrength(a.password)
                .score
                .compareTo(CryptoService.evaluateStrength(b.password).score);
          case PasswordSortKey.updatedAt:
            return a.updatedAt.compareTo(b.updatedAt);
        }
      });

    final selected = filtered.cast<PasswordEntry?>().firstWhere(
          (e) => e?.id == _selectedEntryId,
          orElse: () => filtered.isNotEmpty ? filtered.first : null,
        );

    return Column(
      children: [
        // Isolated Vault Tabs Bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          child: Row(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: store.vaults.map((v) {
                      final active = v.id == vault.id;
                      final unlocked =
                          store.unlockedVaultIds[v.id] == true || v.rememberMode == 'autologin';
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          avatar: Icon(unlocked ? Icons.lock_open : Icons.lock, size: 15),
                          label: Text(v.name),
                          selected: active,
                          onSelected: (_) => setState(() {
                            _activeVaultId = v.id;
                            _activeFolder = 'Все';
                            _showTrash = false;
                            _unlockError = '';
                            _masterCtrl.clear();
                          }),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
              if (isUnlocked)
                OutlinedButton.icon(
                  onPressed: () {
                    vault.rememberMode = 'none';
                    store.unlockedVaultIds[vault.id] = false;
                    store.addLog('info', 'Vault / ${vault.name}', 'Сейф закрыт');
                    store.touch();
                  },
                  icon: const Icon(Icons.lock_outline, size: 16),
                  label: const Text('Закрыть'),
                ),
            ],
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: !isUnlocked
              ? _buildLockScreen(context, vault)
              : _buildUnlockedBody(context, vault, filtered, selected, dupCounts),
        ),
      ],
    );
  }

  Widget _buildLockScreen(BuildContext context, PasswordVault vault) {
    final store = widget.store;
    final lockedOut = vault.failedAttempts >= 10;
    return Center(
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(vault.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text(vault.hint, style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor)),
                const SizedBox(height: 16),
                TextField(
                  controller: _masterCtrl,
                  obscureText: true,
                  enabled: !lockedOut,
                  decoration: const InputDecoration(labelText: 'Мастер-пароль сейфа'),
                  onSubmitted: (_) => _tryUnlock(vault),
                ),
                if (_unlockError.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(_unlockError, style: const TextStyle(fontSize: 12, color: Color(0xFFDC2626))),
                ],
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: FilledButton(
                        onPressed: lockedOut ? null : () => _tryUnlock(vault),
                        child: const Text('Открыть сейф'),
                      ),
                    ),
                    if (vault.rememberMode == 'biometrics' && !lockedOut) ...[
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () {
                          store.unlockedVaultIds[vault.id] = true;
                          store.addLog('success', 'Vault / ${vault.name}', 'Вход по биометрии');
                          store.touch();
                        },
                        icon: const Icon(Icons.fingerprint, size: 18),
                        label: const Text('Биометрия'),
                      ),
                    ],
                  ],
                ),
                if (lockedOut)
                  TextButton(
                    onPressed: () {
                      vault.failedAttempts = 0;
                      setState(() => _unlockError = '');
                    },
                    child: const Text('Сбросить лимит 10 попыток (демо)'),
                  ),
                const SizedBox(height: 10),
                Text(
                  'Защита: блок после 10 неверных попыток · Автоблок: ${vault.autoLockMinutes} мин',
                  style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _tryUnlock(PasswordVault vault) {
    final store = widget.store;
    if (_masterCtrl.text == vault.masterPassword) {
      vault.failedAttempts = 0;
      store.unlockedVaultIds[vault.id] = true;
      _masterCtrl.clear();
      setState(() => _unlockError = '');
      store.addLog('success', 'Vault / ${vault.name}', 'Сейф разблокирован');
      store.touch();
    } else {
      vault.failedAttempts++;
      setState(() {
        _unlockError = vault.failedAttempts >= 10
            ? 'Превышен лимит (10/10). Сейф заблокирован.'
            : 'Неверный пароль. Попытка ${vault.failedAttempts} из 10.';
      });
      store.addLog('warn', 'Vault / ${vault.name}', 'Неверный мастер-пароль (${vault.failedAttempts}/10)');
    }
  }

  Widget _buildUnlockedBody(
    BuildContext context,
    PasswordVault vault,
    List<PasswordEntry> filtered,
    PasswordEntry? selected,
    Map<String, int> dupCounts,
  ) {
    final listWidget = Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(10),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ...vault.folders.map((f) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: ChoiceChip(
                        label: Text(f, style: const TextStyle(fontSize: 12)),
                        selected: !_showTrash && _activeFolder == f,
                        onSelected: (_) => setState(() {
                          _showTrash = false;
                          _activeFolder = f;
                        }),
                        visualDensity: VisualDensity.compact,
                      ),
                    )),
                ChoiceChip(
                  label: const Text('Корзина', style: TextStyle(fontSize: 12)),
                  selected: _showTrash,
                  onSelected: (_) => setState(() => _showTrash = true),
                  visualDensity: VisualDensity.compact,
                ),
              ],
            ),
          ),
        ),
        const Divider(height: 1),
        Expanded(
          child: ListView.separated(
            itemCount: filtered.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, idx) {
              final e = filtered[idx];
              final st = CryptoService.evaluateStrength(e.password);
              final isDup = !e.trashed && (dupCounts[e.password] ?? 0) > 1;
              return ListTile(
                selected: selected?.id == e.id,
                title: Text(e.title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text(
                  '${e.username} · ${st.label}${isDup ? " · Повтор" : ""}',
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: IconButton(
                  tooltip: 'Копировать пароль (автоочистка 20с)',
                  icon: const Icon(Icons.copy, size: 18),
                  onPressed: () =>
                      widget.store.copyToClipboard(e.password, 'Пароль «${e.title}»', isSecret: true),
                ),
                onTap: () => setState(() {
                  _selectedEntryId = e.id;
                  _revealPassword = false;
                }),
              );
            },
          ),
        ),
      ],
    );

    if (widget.isCompact) {
      return listWidget;
    }

    return Row(
      children: [
        SizedBox(width: 300, child: listWidget),
        const VerticalDivider(width: 1),
        Expanded(
          child: selected == null
              ? const Center(child: Text('Выберите запись в сейфе'))
              : _buildDetail(context, selected, dupCounts),
        ),
      ],
    );
  }

  Widget _buildDetail(
    BuildContext context,
    PasswordEntry entry,
    Map<String, int> dupCounts,
  ) {
    final st = CryptoService.evaluateStrength(entry.password);
    final isDup = !entry.trashed && (dupCounts[entry.password] ?? 0) > 1;
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Row(
          children: [
            Expanded(
              child: Text(entry.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            ),
            OutlinedButton.icon(
              onPressed: () {
                final generated = CryptoService.generatePassword(length: 18, excludeSimilar: true);
                entry.history.insert(
                  0,
                  PasswordHistoryItem(
                    id: 'ph-${DateTime.now().millisecondsSinceEpoch}',
                    changedAt: 'Только что',
                    previousPassword: entry.password,
                    note: 'Сгенерирован новый пароль',
                  ),
                );
                entry.password = generated;
                entry.updatedAt = 'Только что';
                widget.store.touch();
              },
              icon: const Icon(Icons.refresh, size: 16),
              label: const Text('Сгенерировать пароль'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              ListTile(
                title: const Text('Логин', style: TextStyle(fontSize: 12)),
                subtitle: Text(entry.username, style: const TextStyle(fontSize: 14)),
                trailing: IconButton(
                  icon: const Icon(Icons.copy, size: 18),
                  onPressed: () => widget.store.copyToClipboard(entry.username, 'Логин'),
                ),
              ),
              const Divider(height: 1),
              ListTile(
                title: const Text('Пароль', style: TextStyle(fontSize: 12)),
                subtitle: Text(
                  _revealPassword ? entry.password : '••••••••••••••••',
                  style: const TextStyle(fontFamily: 'monospace', fontSize: 14),
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(_revealPassword ? Icons.visibility_off : Icons.visibility, size: 18),
                      onPressed: () => setState(() => _revealPassword = !_revealPassword),
                    ),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 18),
                      onPressed: () => widget.store.copyToClipboard(
                        entry.password,
                        'Пароль «${entry.title}»',
                        isSecret: true,
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Надёжность: ${st.label} (${st.entropyBits} бит)', style: const TextStyle(fontSize: 12)),
                    if (isDup)
                      const Text(
                        'Повтор пароля в другой записи',
                        style: TextStyle(fontSize: 12, color: Color(0xFFDC2626), fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (entry.extraFields.isNotEmpty) ...[
          const SizedBox(height: 16),
          const Text('Дополнительные поля (PIN, карты, секретные вопросы)',
              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: entry.extraFields
                  .map((f) => ListTile(
                        dense: true,
                        title: Text(f.label, style: const TextStyle(fontSize: 12)),
                        subtitle: Text(
                          f.secret && !_revealPassword ? '••••••' : f.value,
                          style: const TextStyle(fontFamily: 'monospace', fontSize: 13.5),
                        ),
                      ))
                  .toList(),
            ),
          ),
        ],
        const SizedBox(height: 16),
        Text(
          'Коды 2FA (TOTP), проверка по базам утечек и общий доступ к паролям намеренно отсутствуют ради полной автономности.',
          style: TextStyle(fontSize: 11.5, color: Theme.of(context).hintColor),
        ),
      ],
    );
  }
}
