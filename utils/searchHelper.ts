/**
 * Utilitas Pencarian Cerdas Hadits & Brosur
 * Mengimplementasikan:
 * 1. Multi-Term Search (Operator AND non-consecutive antar kata)
 * 2. Toleransi Typo berbasis Levenshtein Distance (<= 1 untuk kata >= 4 huruf)
 * 3. Kamus Transliterasi & Sinonim kata serapan Islami
 * 4. Multi-Term Stabilo Highlighting Spans
 */

export interface SearchTermsResult {
  terms: string[];
  originalTerms: string[];
  highlightTerms: string[];
  correctedQuery?: string | null;
  hasCorrection: boolean;
}

/**
 * Menghilangkan harakat Arab
 */
export function stripArabicHarakat(text: string): string {
  if (!text) return text;
  return text.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * Menormalkan teks Arab dengan menghapus harakat (tashkeel)
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u08F0-\u08FF]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');
}

/**
 * Kamus transliterasi dan sinonim serapan kata Arab-Indonesia
 */
export const SYNONYMS_MAP: Record<string, string[]> = {
  'sholat': ['shalat', 'salat', 'solat'],
  'salat': ['shalat', 'sholat', 'solat'],
  'shalat': ['sholat', 'salat', 'solat'],
  'solat': ['shalat', 'sholat', 'salat'],
  'ramadhan': ['ramadan', 'romadhon'],
  'ramadan': ['ramadhan', 'romadhon'],
  'romadhon': ['ramadhan', 'ramadan'],
  'dzikir': ['zikir', 'dzkir'],
  'zikir': ['dzikir', 'dzkir'],
  'ustadz': ['ustaz', 'ustadh'],
  'ustaz': ['ustadz', 'ustadh'],
  'tahajud': ['tahajjud'],
  'tahajjud': ['tahajud'],
  'dhuha': ['duha'],
  'duha': ['dhuha'],
  'subuh': ['shubuh'],
  'shubuh': ['subuh'],
  'maghrib': ['magrib'],
  'magrib': ['maghrib'],
  'isya': ['isyak'],
  'isyak': ['isya'],
  'wudhu': ['wudu', 'wudlu'],
  'wudu': ['wudhu', 'wudlu'],
  'wudlu': ['wudhu', 'wudu'],
  'hadits': ['hadist', 'hadis'],
  'hadist': ['hadits', 'hadis'],
  'hadis': ['hadits', 'hadist'],
  'infaq': ['infak'],
  'infak': ['infaq'],
  'sedekah': ['shadaqah', 'shodaqoh'],
  'shadaqah': ['sedekah', 'shodaqoh'],
  'shodaqoh': ['sedekah', 'shadaqah'],
  'riba': ['bunga'],
  'zakat': ['zakah'],
  'haji': ['hajji'],
  'umrah': ['umroh'],
  'umroh': ['umrah'],
};

/**
 * Kosakata dasar umum dalam hadits & brosur untuk penentuan typo cepat
 */
export const CORE_HADITH_VOCABULARY: string[] = [
  'jarum', 'besi', 'ditikam', 'kepalanya', 'wanita', 'halal', 'haram',
  'sholat', 'shalat', 'salat', 'wudhu', 'wudu', 'puasa', 'zakat', 'sedekah',
  'ramadhan', 'dzikir', 'tahajud', 'thabrani', 'bukhari', 'muslim',
  'tirmidzi', 'nasai', 'abu', 'daud', 'ahmad', 'ibnu', 'majah', 'surga',
  'neraka', 'dosa', 'pahala', 'iman', 'islam', 'ihsan', 'syirik', 'bidah',
  'sunnah', 'nabi', 'rasul', 'allah', 'malaikat', 'kiamat', 'takdir',
  'istighfar', 'taubat', 'kiblat', 'masjid', 'sujud', 'ruku', 'adzan',
  'iqamah', 'khutbah', 'jumat', 'nikah', 'talak', 'waris', 'jenazah',
  'kubur', 'siksa', 'nikmat', 'mandi', 'junub', 'hadas', 'najis', 'suci',
  'bersuci', 'thaharah', 'siwak', 'aurat', 'jilbab', 'hijab', 'dusta',
  'ghibah', 'fitnah', 'sabar', 'syukur', 'tawakal', 'ikhlas', 'ridha',
  'zuhud', 'wara', 'hidayah', 'bimbingan', 'hukum', 'dalil', 'kitab'
];

/**
 * Menghitung jarak Levenshtein antara dua string dengan early-exit
 */
export function levenshteinDistance(s1: string, s2: string, maxDistance: number = 2): number {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;
  if (Math.abs(s1.length - s2.length) > maxDistance) return maxDistance + 1;

  const a = s1.toLowerCase();
  const b = s2.toLowerCase();

  let v0 = new Array(b.length + 1).fill(0).map((_, i) => i);
  let v1 = new Array(b.length + 1).fill(0);

  for (let i = 0; i < a.length; i++) {
    v1[0] = i + 1;
    let minDistance = v1[0];

    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(
        v1[j] + 1,       // insertion
        v0[j + 1] + 1,   // deletion
        v0[j] + cost     // substitution
      );

      if (v1[j + 1] < minDistance) {
        minDistance = v1[j + 1];
      }
    }

    if (minDistance > maxDistance) return maxDistance + 1;

    for (let j = 0; j <= b.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v0[b.length];
}

/**
 * Menemukan kata terdekat dalam kosakata
 */
export function findClosestWord(
  term: string,
  vocabulary: Iterable<string>,
  maxDistance: number = 1
): string | null {
  const cleanTerm = term.toLowerCase().trim();
  if (cleanTerm.length < 4) return null; // Kata pendek (< 4 huruf) abaikan agar tidak over-correct

  let bestMatch: string | null = null;
  const effectiveMax = cleanTerm.length >= 8 ? 2 : maxDistance;
  let bestDist = effectiveMax + 1;

  for (const word of vocabulary) {
    const cleanWord = word.toLowerCase().trim();
    if (Math.abs(cleanWord.length - cleanTerm.length) > effectiveMax) continue;

    const dist = levenshteinDistance(cleanTerm, cleanWord, effectiveMax);
    if (dist <= effectiveMax && dist < bestDist) {
      bestDist = dist;
      bestMatch = cleanWord;
      if (dist === 1) break; // Cukup 1 edit distance terdekat
    }
  }

  return bestMatch;
}

/**
 * Memecah query menjadi daftar kata (term)
 * Frasa dengan tanda kutip ganda dipertahankan sebagai 1 term utuh.
 */
export function parseSearchTerms(query: string): string[] {
  if (!query || !query.trim()) return [];

  const regex = /"([^"]*)"|([^\s"]+)/g;
  const terms: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(query)) !== null) {
    if (match[1]) {
      const term = match[1].trim();
      if (term.length > 0) terms.push(term);
    } else if (match[2]) {
      const raw = match[2].trim();
      // Bersihkan tanda baca tepi
      const clean = raw.replace(/^[^\w\u0600-\u06FF]+|[^\w\u0600-\u06FF]+$/g, '');
      if (clean.length > 0) terms.push(clean);
    }
  }

  return terms.length ? terms : [query.trim()];
}

/**
 * Ekstraksi kata unik dari sebuah teks untuk membangun kosakata dinamis
 */
export function extractWords(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .split(/[^\w\u0600-\u06FF]+/)
    .filter(w => w.length >= 3 && !/^\d+$/.test(w));
  return new Set(words);
}

/**
 * Memproses query pencarian:
 * - Memecah multi-term
 * - Mengecek sinonim / transliterasi
 * - Memperbaiki typo berdasarkan kosakata
 * - Mengumpulkan daftar highlight terms
 */
export function expandSearchTerms(
  query: string,
  dynamicVocabulary?: Iterable<string>
): SearchTermsResult {
  const rawTerms = parseSearchTerms(query);
  if (!rawTerms.length) {
    return {
      terms: [],
      originalTerms: [],
      highlightTerms: [],
      hasCorrection: false
    };
  }

  // Gabungkan kosakata inti dan kosakata dinamis
  const vocabSet = new Set<string>(CORE_HADITH_VOCABULARY);
  if (dynamicVocabulary) {
    for (const v of dynamicVocabulary) {
      vocabSet.add(v.toLowerCase().trim());
    }
  }

  const effectiveTerms: string[] = [];
  const highlightTerms: string[] = [];
  const corrections: Record<string, string> = {};

  for (const raw of rawTerms) {
    const clean = raw.toLowerCase().trim();
    if (!clean) continue;

    highlightTerms.push(clean);

    // 1. Cek sinonim / transliterasi
    const synonyms = SYNONYMS_MAP[clean];
    if (synonyms && synonyms.length > 0) {
      effectiveTerms.push(clean);
      effectiveTerms.push(...synonyms);
      highlightTerms.push(...synonyms);
      continue;
    }

    // 2. Cek apakah ada typo jika kata >= 4 huruf dan belum ada di kamus
    if (!vocabSet.has(clean) && clean.length >= 4) {
      const closest = findClosestWord(clean, vocabSet, 1);
      if (closest && closest !== clean) {
        corrections[clean] = closest;
        effectiveTerms.push(closest);
        highlightTerms.push(closest);
        continue;
      }
    }

    effectiveTerms.push(clean);
  }

  let correctedQuery: string | null = null;
  const hasCorrection = Object.keys(corrections).length > 0;
  if (hasCorrection) {
    let tempQ = query;
    for (const [typo, fix] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${typo}\\b`, 'gi');
      tempQ = tempQ.replace(regex, fix);
    }
    correctedQuery = tempQ;
  }

  return {
    terms: Array.from(new Set(effectiveTerms)),
    originalTerms: rawTerms,
    highlightTerms: Array.from(new Set(highlightTerms)),
    correctedQuery,
    hasCorrection
  };
}

/**
 * Memecah teks menjadi potongan (tokens) untuk rendering Stabilo Kuning / Emas
 */
export interface HighlightSpanPart {
  text: string;
  isMatch: boolean;
}

export function buildHighlightSpans(
  text: string,
  highlightTerms: string | string[]
): HighlightSpanPart[] {
  if (!text) return [];

  const rawList = Array.isArray(highlightTerms) ? highlightTerms : [highlightTerms];
  const terms = Array.from(
    new Set(
      rawList
        .flatMap(item => {
          if (!item) return [];
          // Pecah jika ada spasi dalam term kecuali diapit kutip
          return item.split(/\s+/).map(t => t.trim().toLowerCase());
        })
        .filter(t => t.length >= 2)
    )
  ).sort((a, b) => b.length - a.length);

  if (terms.length === 0) {
    return [{ text, isMatch: false }];
  }

  // Escape regex special chars
  const pattern = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  const parts = text.split(regex);
  const result: HighlightSpanPart[] = [];

  for (const part of parts) {
    if (!part) continue;
    const isMatch = terms.some(t => t.toLowerCase() === part.toLowerCase());
    result.push({ text: part, isMatch });
  }

  return result;
}
