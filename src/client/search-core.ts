// Pure text helpers for page search. No DOM, no RegExp built from user input (S-02).

const MARK_START = 0x0300;
const MARK_END = 0x036f;

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
export const MAX_HIGHLIGHTS = 500;

export interface Folded {
  folded: string;
  /** For each code unit of `folded`, the index of its source code point in the input text. */
  map: number[];
}

/** Lowercase and strip diacritics per code point, keeping an offset map to the source (F-11). */
export function fold(text: string): Folded {
  let folded = "";
  const map: number[] = [];
  let i = 0;
  while (i < text.length) {
    const cp = text.codePointAt(i)!;
    const ch = String.fromCodePoint(cp);
    const lowered = ch.toLowerCase().normalize("NFD");
    for (let k = 0; k < lowered.length; k++) {
      const u = lowered.charCodeAt(k);
      if (u >= MARK_START && u <= MARK_END) continue;
      folded += lowered[k];
      map.push(i);
    }
    i += ch.length;
  }
  return { folded, map };
}

/** Trim, cap at 100 characters, fold. Null when the result is under 2 characters. */
export function normalizeQuery(q: string): string | null {
  const folded = fold(q.trim().slice(0, MAX_QUERY)).folded;
  return folded.length < MIN_QUERY ? null : folded;
}

export interface Range {
  start: number;
  end: number;
}

/** All non-overlapping literal matches. Keeps `limit` ranges, counts every match. */
export function findAll(
  folded: string,
  query: string,
  limit = MAX_HIGHLIGHTS,
): { ranges: Range[]; total: number } {
  const ranges: Range[] = [];
  let total = 0;
  if (query.length === 0) return { ranges, total };
  let from = 0;
  for (;;) {
    const at = folded.indexOf(query, from);
    if (at < 0) break;
    total++;
    if (ranges.length < limit) ranges.push({ start: at, end: at + query.length });
    from = at + query.length;
  }
  return { ranges, total };
}

export interface Part {
  seg: number;
  from: number;
  to: number;
}

/**
 * Turn a folded range into per-segment source ranges. `map` covers the whole block text;
 * `segLengths` are the source lengths of its text nodes, in order, so a match can span inline elements.
 */
export function locate(map: number[], segLengths: number[], start: number, end: number): Part[] {
  if (end <= start || start < 0 || end > map.length) return [];
  const total = segLengths.reduce((a, b) => a + b, 0);
  const srcStart = map[start];
  const srcEnd = Math.max(end < map.length ? map[end] : total, map[end - 1] + 1);
  const parts: Part[] = [];
  let off = 0;
  for (let seg = 0; seg < segLengths.length; seg++) {
    const len = segLengths[seg];
    const from = Math.max(srcStart, off);
    const to = Math.min(srcEnd, off + len);
    if (to > from) parts.push({ seg, from: from - off, to: to - off });
    off += len;
  }
  return parts;
}
