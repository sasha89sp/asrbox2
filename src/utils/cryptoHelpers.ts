export interface PasswordGenOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
}

export function generatePassword(opts: PasswordGenOptions): string {
  const similarRegex = /[0O1lI|]/g;
  let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let lower = 'abcdefghijklmnopqrstuvwxyz';
  let nums = '0123456789';
  let syms = '!@#$%^&*()-_=+[]{}';

  if (opts.excludeSimilar) {
    upper = upper.replace(similarRegex, '');
    lower = lower.replace(similarRegex, '');
    nums = nums.replace(similarRegex, '');
    syms = syms.replace(similarRegex, '');
  }

  let pool = '';
  const guaranteed: string[] = [];

  if (opts.uppercase) {
    pool += upper;
    guaranteed.push(upper[randomIndex(upper.length)]);
  }
  if (opts.lowercase) {
    pool += lower;
    guaranteed.push(lower[randomIndex(lower.length)]);
  }
  if (opts.numbers) {
    pool += nums;
    guaranteed.push(nums[randomIndex(nums.length)]);
  }
  if (opts.symbols) {
    pool += syms;
    guaranteed.push(syms[randomIndex(syms.length)]);
  }

  if (!pool) {
    pool = lower + nums;
  }

  const chars: string[] = [...guaranteed];
  while (chars.length < opts.length) {
    chars.push(pool[randomIndex(pool.length)]);
  }

  // Fisher-Yates shuffle with crypto randomness
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.slice(0, opts.length).join('');
}

function randomIndex(max: number): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export interface PasswordStrength {
  score: number; // 0..4
  label: 'Слабый' | 'Уязвимый' | 'Средний' | 'Надёжный' | 'Максимальный';
  tone: 'danger' | 'warn' | 'good' | 'strong';
  entropyBits: number;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Слабый', tone: 'danger', entropyBits: 0 };
  }

  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/[0-9]/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;

  const entropyBits = Math.round(password.length * Math.log2(Math.max(pool, 2)));

  if (password.length < 8 || entropyBits < 36) {
    return { score: 1, label: 'Слабый', tone: 'danger', entropyBits };
  }
  if (entropyBits < 52) {
    return { score: 2, label: 'Уязвимый', tone: 'warn', entropyBits };
  }
  if (entropyBits < 70) {
    return { score: 3, label: 'Средний', tone: 'good', entropyBits };
  }
  if (entropyBits < 95) {
    return { score: 4, label: 'Надёжный', tone: 'strong', entropyBits };
  }
  return { score: 4, label: 'Максимальный', tone: 'strong', entropyBits };
}

export function generateInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () =>
    Array.from({ length: 4 }, () => alphabet[randomIndex(alphabet.length)]).join('');
  return `ASR-${seg()}-${seg()}`;
}

export function playReminderChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.09, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.48);
    });
  } catch {
    // Audio playback may be restricted by browser autoplay policy
  }
}

export function formatTimeNow(): string {
  const d = new Date();
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function shiftDateIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
