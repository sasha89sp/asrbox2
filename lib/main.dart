import 'package:flutter/material.dart';
import 'screens/asrbox_shell.dart';
import 'state/asrbox_store.dart';
import 'theme/asrbox_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const AsrboxApp());
}

class AsrboxApp extends StatefulWidget {
  const AsrboxApp({super.key});

  @override
  State<AsrboxApp> createState() => _AsrboxAppState();
}

class _AsrboxAppState extends State<AsrboxApp> {
  final AsrboxStore _store = AsrboxStore();

  @override
  void dispose() {
    _store.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _store,
      builder: (context, _) {
        return MaterialApp(
          title: 'ASRbox',
          debugShowCheckedModeBanner: false,
          theme: AsrboxTheme.light(),
          darkTheme: AsrboxTheme.dark(),
          themeMode: _store.themeMode,
          home: AsrboxShell(store: _store),
        );
      },
    );
  }
}
