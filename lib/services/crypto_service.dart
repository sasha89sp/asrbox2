import 'dart:math';

class PasswordStrengthResult {
  final int score; // 0..4
  final String label;
  final int entropyBits;

  const PasswordStrengthResult({
    required this.score,
    required this.label,
    required this.entropyBits,
  });
}

class CryptoService {
  static final Random _secureRandom = Random.secure();

  static String generatePassword({
    int length = 18,
    bool uppercase = true,
    bool lowercase = true,
    bool numbers = true,
    bool symbols = true,
    bool excludeSimilar = true,
  }) {
    final similar = RegExp(r'[0O1lI|]');
    var upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var lower = 'abcdefghijklmnopqrstuvwxyz';
    var nums = '0123456789';
    var syms = '!@#\$%^&*()-_=+[]{}';

    if (excludeSimilar) {
      upper = upper.replaceAll(similar, '');
      lower = lower.replaceAll(similar, '');
      nums = nums.replaceAll(similar, '');
      syms = syms.replaceAll(similar, '');
    }

    var pool = '';
    final chars = <String>[];

    if (uppercase) {
      pool += upper;
      chars.add(upper[_secureRandom.nextInt(upper.length)]);
    }
    if (lowercase) {
      pool += lower;
      chars.add(lower[_secureRandom.nextInt(lower.length)]);
    }
    if (numbers) {
      pool += nums;
      chars.add(nums[_secureRandom.nextInt(nums.length)]);
    }
    if (symbols) {
      pool += syms;
      chars.add(syms[_secureRandom.nextInt(syms.length)]);
    }

    if (pool.isEmpty) pool = lower + nums;

    while (chars.length < length) {
      chars.add(pool[_secureRandom.nextInt(pool.length)]);
    }
    chars.shuffle(_secureRandom);
    return chars.take(length).join();
  }

  static PasswordStrengthResult evaluateStrength(String password) {
    if (password.isEmpty) {
      return const PasswordStrengthResult(score: 0, label: 'Слабый', entropyBits: 0);
    }
    var pool = 0;
    if (RegExp(r'[a-z]').hasMatch(password)) pool += 26;
    if (RegExp(r'[A-Z]').hasMatch(password)) pool += 26;
    if (RegExp(r'[0-9]').hasMatch(password)) pool += 10;
    if (RegExp(r'[^a-zA-Z0-9]').hasMatch(password)) pool += 32;

    final entropy = (password.length * (log(max(pool, 2)) / ln2)).round();

    if (password.length < 8 || entropy < 36) {
      return PasswordStrengthResult(score: 1, label: 'Слабый', entropyBits: entropy);
    }
    if (entropy < 52) {
      return PasswordStrengthResult(score: 2, label: 'Уязвимый', entropyBits: entropy);
    }
    if (entropy < 70) {
      return PasswordStrengthResult(score: 3, label: 'Средний', entropyBits: entropy);
    }
    if (entropy < 95) {
      return PasswordStrengthResult(score: 4, label: 'Надёжный', entropyBits: entropy);
    }
    return PasswordStrengthResult(score: 4, label: 'Максимальный', entropyBits: entropy);
  }

  static String generateInviteCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    String seg() => List.generate(4, (_) => alphabet[_secureRandom.nextInt(alphabet.length)]).join();
    return 'ASR-${seg()}-${seg()}';
  }

  static String generateFingerprint() {
    const hex = '0123456789ABCDEF';
    String seg() => List.generate(4, (_) => hex[_secureRandom.nextInt(hex.length)]).join();
    return 'E2EE-${seg()}-${seg()}-${seg()}-${seg()}';
  }

  static String todayIso([int offsetDays = 0]) {
    final dt = DateTime.now().add(Duration(days: offsetDays));
    final y = dt.year.toString().padLeft(4, '0');
    final m = dt.month.toString().padLeft(2, '0');
    final d = dt.day.toString().padLeft(2, '0');
    return '$y-$m-$d';
  }

  static String nowTimeShort() {
    final dt = DateTime.now();
    return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}:${dt.second.toString().padLeft(2, '0')}';
  }
}
