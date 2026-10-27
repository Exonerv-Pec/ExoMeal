import { fmtNum } from '../core/units';

/** 1935 → "1 935" (Russian grouping with a non-breaking space). */
export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('ru-RU');
}

/** Portions: 1 → "1", 1.5 → "1,5", 0.25 → "0,25". */
export function fmtPortions(n: number): string {
  return fmtNum(n, 2);
}

/** "порция" / "порции" / "порций" for a possibly fractional amount. */
export function portionsWord(n: number): string {
  if (!Number.isInteger(n)) return 'порции';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'порция';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'порции';
  return 'порций';
}

export function fmtMinutes(min: number): string {
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин` : `${h} ч`;
}

export function round1(n: number): string {
  return fmtNum(Math.round(n * 10) / 10, 1);
}

/** Russian plural: plural(5, ['блюдо', 'блюда', 'блюд']) → "блюд". */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
