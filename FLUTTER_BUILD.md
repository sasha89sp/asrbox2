# Сборка Flutter-версии ASRbox (Windows и Android)

Проект содержит полный исходный код Flutter в корне репозитория (`pubspec.yaml`, `lib/`, `android/`, `windows/`) и настроенный GitHub Actions workflow (`.github/workflows/flutter_build.yml`).

## Локальная компиляция

1. Установите [Flutter SDK 3.22+](https://docs.flutter.dev/get-started/install) (для Windows также нужен Visual Studio с компонентом «Разработка классических приложений на C++»).
2. В корне репозитория выполните команду для генерации системных файлов-раннеров под вашу версию Flutter SDK (существующие `lib/` и `pubspec.yaml` сохранятся):

```bash
flutter create --platforms=windows,android --org com.asrbox --project-name asrbox .
flutter pub get
```

3. Запуск и сборка:

- **Windows (портативная папка с `.exe`):**
  ```bash
  flutter build windows --release
  ```
  Готовая папка появится в `build/windows/x64/runner/Release/`.

- **Android (APK):**
  ```bash
  flutter build apk --release
  ```
  Готовый APK появится в `build/app/outputs/flutter-apk/app-release.apk`.

## Автоматическая сборка на GitHub

После отправки репозитория на GitHub откройте вкладку **Actions → Build ASRbox (Windows & Android)** и скачайте готовые артефакты `ASRbox-Windows-Portable` и `ASRbox-Android-APK`.
