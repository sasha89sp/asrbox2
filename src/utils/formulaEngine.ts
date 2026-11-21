import { SpreadsheetData, EmbeddedIcsEvent } from '../types/asrbox';

export function colIndexToLetter(index: number): string {
  let letter = '';
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

export function letterToColIndex(letters: string): number {
  let result = 0;
  for (let i = 0; i < letters.length; i++) {
    result = result * 26 + (letters.charCodeAt(i) - 64);
  }
  return result - 1;
}

function parseCellRef(ref: string): { row: number; col: number } | null {
  const match = ref.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = letterToColIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  if (row < 0 || col < 0) return null;
  return { row, col };
}

function getNumericCell(
  rows: string[][],
  row: number,
  col: number,
  visited: Set<string>
): number {
  const key = `${row}:${col}`;
  if (visited.has(key)) return 0;
  const raw = rows[row]?.[col];
  if (raw === undefined || raw === null || raw === '') return 0;
  if (raw.trim().startsWith('=')) {
    const nextVisited = new Set(visited);
    nextVisited.add(key);
    const evaluated = evaluateFormulaRaw(raw, rows, nextVisited);
    return typeof evaluated === 'number' && !Number.isNaN(evaluated) ? evaluated : 0;
  }
  const normalized = raw.replace(/\s+/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function collectRangeValues(
  rangeStr: string,
  rows: string[][],
  visited: Set<string>
): number[] {
  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);
  const values: number[] = [];

  for (const part of parts) {
    if (part.includes(':')) {
      const [startStr, endStr] = part.split(':');
      const start = parseCellRef(startStr);
      const end = parseCellRef(endStr);
      if (!start || !end) continue;
      const rMin = Math.min(start.row, end.row);
      const rMax = Math.max(start.row, end.row);
      const cMin = Math.min(start.col, end.col);
      const cMax = Math.max(start.col, end.col);
      for (let r = rMin; r <= rMax; r++) {
        for (let c = cMin; c <= cMax; c++) {
          values.push(getNumericCell(rows, r, c, visited));
        }
      }
    } else {
      const ref = parseCellRef(part);
      if (ref) {
        values.push(getNumericCell(rows, ref.row, ref.col, visited));
      } else {
        const num = parseFloat(part.replace(',', '.'));
        if (!Number.isNaN(num)) values.push(num);
      }
    }
  }
  return values;
}

// Safe arithmetic parser (+, -, *, /, parentheses) without eval
function evaluateSafeArithmetic(expr: string): number {
  const tokens = expr.match(/(\d+\.?\d*|\.\d+|[+\-*/()])/g);
  if (!tokens) return NaN;
  let pos = 0;

  function peek(): string | undefined {
    return tokens![pos];
  }
  function consume(): string {
    return tokens![pos++];
  }

  function parseExpression(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = consume();
      const right = parseFactor();
      val = op === '*' ? val * right : right === 0 ? 0 : val / right;
    }
    return val;
  }

  function parseFactor(): number {
    const token = peek();
    if (token === '(') {
      consume();
      const val = parseExpression();
      if (peek() === ')') consume();
      return val;
    }
    if (token === '-') {
      consume();
      return -parseFactor();
    }
    if (token === '+') {
      consume();
      return parseFactor();
    }
    consume();
    return parseFloat(token ?? '0');
  }

  return parseExpression();
}

function evaluateFormulaRaw(
  formula: string,
  rows: string[][],
  visited: Set<string>
): number | string {
  const body = formula.trim().slice(1).trim();
  if (!body) return '';

  const fnMatch = body.match(/^(SUM|AVG|AVERAGE|MIN|MAX|COUNT|СУММ|СРЗНАЧ)\((.+)\)$/i);
  if (fnMatch) {
    const fnName = fnMatch[1].toUpperCase();
    const values = collectRangeValues(fnMatch[2], rows, visited);
    if (values.length === 0) return 0;
    switch (fnName) {
      case 'SUM':
      case 'СУММ':
        return values.reduce((a, b) => a + b, 0);
      case 'AVG':
      case 'AVERAGE':
      case 'СРЗНАЧ':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'MIN':
        return Math.min(...values);
      case 'MAX':
        return Math.max(...values);
      case 'COUNT':
        return values.length;
      default:
        return '#ОШИБКА';
    }
  }

  // Replace cell references with numeric values
  const substituted = body.replace(/\b([A-Za-z]+)(\d+)\b/g, (match) => {
    const ref = parseCellRef(match);
    if (!ref) return '0';
    return String(getNumericCell(rows, ref.row, ref.col, visited));
  });

  if (/^[\d.+\-*/()\s]+$/.test(substituted)) {
    const result = evaluateSafeArithmetic(substituted);
    if (Number.isNaN(result) || !Number.isFinite(result)) return '#ОШИБКА';
    return result;
  }

  return '#ФОРМУЛА';
}

export function evaluateCellDisplay(raw: string, rows: string[][], r: number, c: number): string {
  if (!raw || !raw.trim().startsWith('=')) return raw;
  const result = evaluateFormulaRaw(raw, rows, new Set([`${r}:${c}`]));
  if (typeof result === 'string') return result;
  if (Number.isInteger(result)) {
    return result.toLocaleString('ru-RU');
  }
  return result.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
}

export function exportSpreadsheetToExcelCsv(title: string, data: SpreadsheetData): void {
  const header = data.columns.map((c) => `"${c.replace(/"/g, '""')}"`).join(';');
  const body = data.rows
    .map((row, rIdx) =>
      row
        .map((cell, cIdx) => {
          const val = cell.trim().startsWith('=')
            ? evaluateCellDisplay(cell, data.rows, rIdx, cIdx)
            : cell;
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(';')
    )
    .join('\r\n');

  // UTF-8 BOM ensures Microsoft Excel opens Cyrillic without garbled characters
  const csvContent = '\uFEFF' + header + '\r\n' + body;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^\wа-яА-ЯёЁ\s-]/g, '').trim() || 'table'}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEventsToIcs(title: string, events: EmbeddedIcsEvent[]): void {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASRbox//Local Calendar//RU',
  ];

  for (const ev of events) {
    const dt = ev.date.replace(/-/g, '');
    const tm = ev.time.replace(':', '') + '00';
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}@asrbox.local`);
    lines.push(`DTSTART:${dt}T${tm}`);
    lines.push(`SUMMARY:${ev.title}`);
    if (ev.location) lines.push(`LOCATION:${ev.location}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/[^\wа-яА-ЯёЁ\s-]/g, '').trim() || 'events'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
