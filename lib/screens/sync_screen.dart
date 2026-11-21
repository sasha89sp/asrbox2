import 'package:flutter/material.dart';
import '../state/asrbox_store.dart';

class SyncScreen extends StatelessWidget {
  final AsrboxStore store;

  const SyncScreen({super.key, required this.store});

  @override
  Widget build(BuildContext context) {
    final unresolved = store.conflicts.where((c) => !c.resolved).toList();
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Синхронизация и страховка данных',
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    'Клиентское шифрование до отправки · Последняя синхронизация: ${store.lastSyncLabel}',
                    style: TextStyle(fontSize: 12.5, color: Theme.of(context).hintColor),
                  ),
                ],
              ),
            ),
            FilledButton.icon(
              onPressed: store.isSyncing ? null : store.triggerSync,
              icon: const Icon(Icons.sync, size: 16),
              label: Text(store.isSyncing ? 'Синхронизация...' : 'Синхронизировать'),
            ),
          ],
        ),
        const SizedBox(height: 18),
        if (unresolved.isNotEmpty) ...[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Умное слияние правок (конфликт без потерь)',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  const SizedBox(height: 8),
                  ...unresolved.map((c) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Объект: ${c.itemTitle}', style: const TextStyle(fontWeight: FontWeight.w600)),
                          Text('• ${c.localVersion}', style: const TextStyle(fontSize: 12.5)),
                          Text('• ${c.remoteVersion}', style: const TextStyle(fontSize: 12.5)),
                          const SizedBox(height: 10),
                          FilledButton.tonal(
                            onPressed: () {
                              c.resolved = true;
                              store.addLog('success', 'SmartMerge', 'Правки Windows и Android объединены без потерь');
                              store.touch();
                            },
                            child: const Text('Объединить обе правки'),
                          ),
                        ],
                      )),
                ],
              ),
            ),
          ),
          const SizedBox(height: 18),
        ],
        const Text('Облако и транспорт (WebDAV / Google Диск / Локальная папка)',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _provChip('webdav_yandex', 'Яндекс Диск (WebDAV)', 'https://webdav.yandex.ru/ASRbox_Encrypted/'),
            _provChip('webdav_mailru', 'Mail.ru (WebDAV)', 'https://webdav.cloud.mail.ru/ASRbox_Vault/'),
            _provChip('gdrive', 'Google Диск', 'gdrive://AppData/ASRbox_Encrypted/'),
            _provChip('local', 'Локальная папка / USB', r'E:\ASRbox_Portable\SyncMirror\'),
          ],
        ),
        const SizedBox(height: 12),
        Card(
          child: SwitchListTile(
            title: const Text('Портативный режим Windows (USB-флешка)', style: TextStyle(fontSize: 14)),
            subtitle: const Text('Хранить базы и ключи рядом с ASRbox.exe без записи в реестр', style: TextStyle(fontSize: 12)),
            value: store.portableMode,
            onChanged: (_) => store.togglePortableMode(),
          ),
        ),
        const SizedBox(height: 18),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Зашифрованные бэкапы и страховочные копии',
                style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
            TextButton(
              onPressed: () => store.createSafetySnapshot('Ручной полный бэкап'),
              child: const Text('+ Создать копию'),
            ),
          ],
        ),
        Card(
          child: Column(
            children: store.backups
                .map((b) => ListTile(
                      dense: true,
                      title: Text(b.label, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600)),
                      subtitle: Text('${b.createdAt} · ${b.sizeLabel}'),
                      trailing: TextButton(
                        onPressed: () {
                          store.createSafetySnapshot('Перед восстановлением ${b.id}');
                          store.addLog('success', 'Backup', 'Восстановление из «${b.label}» завершено');
                        },
                        child: const Text('Восстановить'),
                      ),
                    ))
                .toList(),
          ),
        ),
        const SizedBox(height: 18),
        const Text('Бэкап данных телефона (Android: контакты, звонки, SMS, Wi-Fi)',
            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
        const SizedBox(height: 8),
        Card(
          child: Column(
            children: store.androidBackupItems
                .map((item) => CheckboxListTile(
                      dense: true,
                      title: Text(item.label, style: const TextStyle(fontSize: 13.5)),
                      subtitle: Text('${item.countLabel} · ${item.lastBackup}', style: const TextStyle(fontSize: 12)),
                      value: item.enabled,
                      onChanged: (v) {
                        item.enabled = v ?? false;
                        store.touch();
                      },
                    ))
                .toList(),
          ),
        ),
      ],
    );
  }

  Widget _provChip(String id, String label, String endpoint) {
    return ChoiceChip(
      label: Text(label),
      selected: store.syncProvider == id,
      onSelected: (_) {
        store.syncProvider = id;
        store.syncEndpoint = endpoint;
        store.addLog('info', 'Sync', 'Выбран транспорт: $label');
        store.touch();
      },
    );
  }
}
