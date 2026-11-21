class FormulaEngine {
  static String colIndexToLetter(int index) {
    var letter = '';
    var n = index;
    while (n >= 0) {
      letter = String.fromCharCode((n % 26) + 65) + letter;
      n = (n ~/ 26) - 1;
    }
    return letter;
  }

  static int _letterToColIndex(String letters) {
    var result = 0;
    for (var i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.codeUnitAt(i) - 64);
    }
    return result - 1;
  }

  static ({int row, int col})? _parseCellRef(String ref) {
    final match = RegExp(r'^([A-Z]+)(\d+)$').firstMatch(ref.trim().toUpperCase());
    if (match == null) return null;
    final col = _letterToColIndex(match.group(1)!);
    final row = int.parse(match.group(2)!) - 1;
    if (row < 0 || col < 0) return null;
    return (row: row, col: col);
  }

  static double _getNumericCell(
    List<List<String>> rows,
    int row,
    int col,
    Set<String> visited,
  ) {
    final key = '$row:$col';
    if (visited.contains(key)) return 0;
    if (row < 0 || row >= rows.length) return 0;
    if (col < 0 || col >= rows[row].length) return 0;
    final raw = rows[row][col].trim();
    if (raw.isEmpty) return 0;
    if (raw.startsWith('=')) {
      final nextVisited = {...visited, key};
      final eval = _evaluateRaw(raw, rows, nextVisited);
      return eval is double && !eval.isNaN ? eval : 0;
    }
    final cleaned = raw.replaceAll(' ', '').replaceAll(',', '.').replaceAll(RegExp(r'[^\d.-]'), '');
    return double.tryParse(cleaned) ?? 0;
  }

  static List<double> _collectRange(
    String rangeStr,
    List<List<String>> rows,
    Set<String> visited,
  ) {
    final parts = rangeStr.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty);
    final values = <double>[];
    for (final part in parts) {
      if (part.contains(':')) {
        final bounds = part.split(':');
        if (bounds.length != 2) continue;
        final start = _parseCellRef(bounds[0]);
        final end = _parseCellRef(bounds[1]);
        if (start == null || end == null) continue;
        final rMin = start.row < end.row ? start.row : end.row;
        final rMax = start.row > end.row ? start.row : end.row;
        final cMin = start.col < end.col ? start.col : end.col;
        final cMax = start.col > end.col ? start.col : end.col;
        for (var r = rMin; r <= rMax; r++) {
          for (var c = cMin; c <= cMax; c++) {
            values.add(_getNumericCell(rows, r, c, visited));
          }
        }
      } else {
        final ref = _parseCellRef(part);
        if (ref != null) {
          values.add(_getNumericCell(rows, ref.row, ref.col, visited));
        } else {
          final parsed = double.tryParse(part.replaceAll(',', '.'));
          if (parsed != null) values.add(parsed);
        }
      }
    }
    return values;
  }

  static double _evalArithmetic(String expr) {
    final tokens = RegExp(r'(\d+\.?\d*|\.\d+|[+\-*/()])')
        .allMatches(expr)
        .map((m) => m.group(0)!)
        .toList();
    if (tokens.isEmpty) return double.nan;
    var pos = 0;

    String? peek() => pos < tokens.length ? tokens[pos] : null;
    String consume() => tokens[pos++];

    late double Function() parseExpr;
    late double Function() parseTerm;
    late double Function() parseFactor;

    parseFactor = () {
      final t = peek();
      if (t == '(') {
        consume();
        final v = parseExpr();
        if (peek() == ')') consume();
        return v;
      }
      if (t == '-') {
        consume();
        return -parseFactor();
      }
      if (t == '+') {
        consume();
        return parseFactor();
      }
      if (t == null) return 0;
      consume();
      return double.tryParse(t) ?? 0;
    };

    parseTerm = () {
      var val = parseFactor();
      while (peek() == '*' || peek() == '/') {
        final op = consume();
        final right = parseFactor();
        val = op == '*' ? val * right : (right == 0 ? 0 : val / right);
      }
      return val;
    };

    parseExpr = () {
      var val = parseTerm();
      while (peek() == '+' || peek() == '-') {
        final op = consume();
        final right = parseTerm();
        val = op == '+' ? val + right : val - right;
      }
      return val;
    };

    return parseExpr();
  }

  static Object _evaluateRaw(
    String formula,
    List<List<String>> rows,
    Set<String> visited,
  ) {
    final body = formula.trim().substring(1).trim();
    if (body.isEmpty) return '';

    final fnMatch =
        RegExp(r'^(SUM|AVG|AVERAGE|MIN|MAX|COUNT|СУММ|СРЗНАЧ)\((.+)\)$', caseSensitive: false)
            .firstMatch(body);
    if (fnMatch != null) {
      final fn = fnMatch.group(1)!.toUpperCase();
      final vals = _collectRange(fnMatch.group(2)!, rows, visited);
      if (vals.isEmpty) return 0.0;
      switch (fn) {
        case 'SUM':
        case 'СУММ':
          return vals.fold<double>(0, (a, b) => a + b);
        case 'AVG':
        case 'AVERAGE':
        case 'СРЗНАЧ':
          return vals.fold<double>(0, (a, b) => a + b) / vals.length;
        case 'MIN':
          return vals.reduce((a, b) => a < b ? a : b);
        case 'MAX':
          return vals.reduce((a, b) => a > b ? a : b);
        case 'COUNT':
          return vals.length.toDouble();
        default:
          return '#ОШИБКА';
      }
    }

    final substituted = body.replaceAllMapped(RegExp(r'\b([A-Za-z]+)(\d+)\b'), (m) {
      final ref = _parseCellRef(m.group(0)!);
      if (ref == null) return '0';
      return _getNumericCell(rows, ref.row, ref.col, visited).toString();
    });

    if (RegExp(r'^[\d.+\-*/()\s]+$').hasMatch(substituted)) {
      final res = _evalArithmetic(substituted);
      if (res.isNaN || !res.isFinite) return '#ОШИБКА';
      return res;
    }
    return '#ФОРМУЛА';
  }

  static String evaluateCellDisplay(String raw, List<List<String>> rows, int r, int c) {
    if (!raw.trim().startsWith('=')) return raw;
    final res = _evaluateRaw(raw, rows, {'$r:$c'});
    if (res is String) return res;
    if (res is double) {
      if (res == res.roundToDouble()) {
        return _formatIntSpaces(res.round());
      }
      return res.toStringAsFixed(2).replaceAll('.', ',');
    }
    return raw;
  }

  static String _formatIntSpaces(int n) {
    final neg = n < 0;
    final s = n.abs().toString();
    final buf = StringBuffer();
    for (var i = 0; i < s.length; i++) {
      if (i > 0 && (s.length - i) % 3 == 0) buf.write(' ');
      buf.write(s[i]);
    }
    return neg ? '-${buf.toString()}' : buf.toString();
  }

  static String exportCsv(List<String> columns, List<List<String>> rows) {
    final buf = StringBuffer('\uFEFF');
    buf.writeln(columns.map((c) => '"${c.replaceAll('"', '""')}"').join(';'));
    for (var r = 0; r < rows.length; r++) {
      final cells = <String>[];
      for (var c = 0; c < rows[r].length; c++) {
        final v = evaluateCellDisplay(rows[r][c], rows, r, c);
        cells.add('"${v.replaceAll('"', '""')}"');
      }
      buf.writeln(cells.join(';'));
    }
    return buf.toString();
  }
}
