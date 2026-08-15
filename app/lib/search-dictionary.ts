export interface IslamicTermEntry {
  /** Bentuk baku standar KBBI / Kemenag */
  standard: string;
  /** Variasi ejaan dan sinonim yang umum digunakan */
  synonyms: string[];
}

export interface NormalizedQueryMeta {
  /** Query asli dari input pengguna */
  originalQuery: string;
  /** Query terkoreksi/baku jika ditemukan koreksi atau ejaan tidak standar */
  correctedQuery: string;
  /** Apakah terjadi koreksi kata (untuk memicu banner "Mungkin maksud Anda / Menampilkan hasil untuk") */
  isCorrected: boolean;
  /** Seluruh kata (termasuk variasi sinonim) untuk di-highlight dengan warna kuning pada cuplikan teks */
  highlightTerms: string[];
  /** Daftar array kata kunci ekspansi untuk pencarian database */
  expandedWords: string[][];
}

/**
 * Daftar kamus istilah Islam Indonesia dan variasi ejaannya.
 * Bisa diperluas dengan istilah, nama ustadz, atau topik keislaman lainnya.
 */
export const ISLAMIC_DICTIONARY: IslamicTermEntry[] = [
  {
    standard: 'salat',
    synonyms: ['salat', 'sholat', 'solat', 'shalat', 'sholah', 'shalla', 'shalaat']
  },
  {
    standard: 'wudu',
    synonyms: ['wudu', 'wudhu', 'wudlu', 'wudoo', 'wudhoe']
  },
  {
    standard: 'hadis',
    synonyms: ['hadis', 'hadist', 'hadits', 'hadith']
  },
  {
    standard: 'al-quran',
    synonyms: ['al-quran', 'quran', 'alquran', "al-qur'an", 'kuran', "alqur'an"]
  },
  {
    standard: 'ustaz',
    synonyms: ['ustaz', 'ustadz', 'ustad', 'ust']
  },
  {
    standard: 'rasul',
    synonyms: ['rasul', 'rosul', 'rasulullah', 'rosulullah', 'rosululloh']
  },
  {
    standard: 'zikir',
    synonyms: ['zikir', 'dzikir', 'dzikr', 'zikr']
  },
  {
    standard: 'ramadan',
    synonyms: ['ramadan', 'ramadhan', 'romadhon', 'ramadhaan']
  },
  {
    standard: 'jumat',
    synonyms: ['jumat', "jum'at", 'jumaat', 'jumah']
  },
  {
    standard: 'sedekah',
    synonyms: ['sedekah', 'shodaqoh', 'sodaqoh', 'shadaqah', 'sedekoh']
  },
  {
    standard: 'zakat',
    synonyms: ['zakat', 'zakaat', 'zakoh', 'zakaah']
  },
  {
    standard: 'sunnah',
    synonyms: ['sunnah', 'sunah', 'sunnat']
  },
  {
    standard: 'dakwah',
    synonyms: ['dakwah', "da'wah", 'dawah', "da'wa"]
  },
  {
    standard: 'surga',
    synonyms: ['surga', 'syurga', 'jannah', 'sorga']
  },
  {
    standard: 'neraka',
    synonyms: ['neraka', 'nar', 'naraka', 'jahannam']
  },
  {
    standard: 'duha',
    synonyms: ['duha', 'dhuha', 'dhoha']
  },
  {
    standard: 'tahajud',
    synonyms: ['tahajud', 'tahajjud']
  },
  {
    standard: 'jenazah',
    synonyms: ['jenazah', 'janazah', 'mayit', 'mayat']
  },
  {
    standard: 'doa',
    synonyms: ['doa', "do'a", "du'a"]
  },
  {
    standard: 'hijrah',
    synonyms: ['hijrah', 'hijroh']
  },
  {
    standard: 'tauhid',
    synonyms: ['tauhid', 'tawhid']
  },
  {
    standard: 'akidah',
    synonyms: ['akidah', 'aqidah', 'aqida']
  },
  {
    standard: 'syariah',
    synonyms: ['syariah', "syari'ah", 'syariat', 'shariah']
  },
  {
    standard: 'ibadah',
    synonyms: ['ibadah', 'ibaadah', 'ibadat']
  },
  {
    standard: 'jamaah',
    synonyms: ['jamaah', "jama'ah", 'jemaah', 'jemaat']
  }
];

/**
 * Menghitung jarak edit Levenshtein antara dua string (untuk Typo Tolerance).
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Mencari apakah sebuah kata ada dalam kamus, atau memiliki kesalahan ketik (typo ringan).
 * Mengembalikan entri kamus yang cocok atau null jika tidak ditemukan.
 */
export function findDictionaryEntry(word: string): { entry: IslamicTermEntry; matchedWord: string; isTypo: boolean } | null {
  const cleanWord = word.toLowerCase().trim();
  if (!cleanWord || cleanWord.length < 2) return null;

  // 1. Cek Exact Match terlebih dahulu (pada standard atau synonyms)
  for (const entry of ISLAMIC_DICTIONARY) {
    if (entry.standard === cleanWord || entry.synonyms.includes(cleanWord)) {
      return { entry, matchedWord: cleanWord, isTypo: false };
    }
  }

  // 2. Cek Typo Tolerance (Levenshtein Distance) jika panjang kata >= 4 karakter
  if (cleanWord.length >= 4) {
    let bestMatch: { entry: IslamicTermEntry; matchedWord: string; distance: number } | null = null;

    for (const entry of ISLAMIC_DICTIONARY) {
      // Periksa standard dan setiap sinonim
      const allWords = [entry.standard, ...entry.synonyms];
      for (const targetWord of allWords) {
        if (Math.abs(targetWord.length - cleanWord.length) <= 2) {
          const dist = levenshteinDistance(cleanWord, targetWord);
          // Batas toleransi typo: jarak maksimal 2, dan perbandingan jarak terhadap panjang kata <= 0.35
          const maxAllowedDist = cleanWord.length <= 5 ? 1 : 2;
          if (dist <= maxAllowedDist && dist / cleanWord.length <= 0.35) {
            if (!bestMatch || dist < bestMatch.distance) {
              bestMatch = { entry, matchedWord: targetWord, distance: dist };
            }
          }
        }
      }
    }

    if (bestMatch) {
      return { entry: bestMatch.entry, matchedWord: bestMatch.matchedWord, isTypo: true };
    }
  }

  return null;
}

/**
 * Menormalisasi query pencarian ala Google ("Did you mean / Menampilkan hasil untuk").
 * 
 * @param rawQuery Kata kunci asli dari pengguna
 * @param exactMode Jika true (pengguna menekan "Cari sebaliknya untuk ..."), tidak mengoreksi kata
 */
export function normalizeSearchQuery(rawQuery: string, exactMode = false): NormalizedQueryMeta {
  const trimmed = rawQuery.trim();
  if (!trimmed) {
    return {
      originalQuery: '',
      correctedQuery: '',
      isCorrected: false,
      highlightTerms: [],
      expandedWords: []
    };
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  const correctedWords: string[] = [];
  const highlightTermsSet = new Set<string>();
  const expandedWords: string[][] = [];
  let hasCorrection = false;

  for (const word of words) {
    const cleanWord = word.toLowerCase();
    highlightTermsSet.add(cleanWord);

    if (exactMode) {
      // Mode exact ("Cari sebaliknya untuk ...") -> gunakan kata literal tanpa koreksi
      correctedWords.push(word);
      const match = findDictionaryEntry(cleanWord);
      if (match) {
        // Tetap sertakan sinonim ke highlightTerms agar mudah dicari di snippet
        match.entry.synonyms.forEach(syn => highlightTermsSet.add(syn.toLowerCase()));
        expandedWords.push(match.entry.synonyms);
      } else {
        expandedWords.push([cleanWord]);
      }
      continue;
    }

    const match = findDictionaryEntry(cleanWord);
    if (match) {
      // Gunakan bentuk standard sebagai kata terkoreksi (baku)
      const standardWord = match.entry.standard;
      correctedWords.push(standardWord);

      // Jika kata yang diketik pengguna TIDAK SAMA persis dengan bentuk standard (misal: "sholat" vs "salat"),
      // atau jika terdeteksi typo ("shlaat"), maka kita tandai isCorrected = true ala Google!
      if (cleanWord !== standardWord || match.isTypo) {
        hasCorrection = true;
      }

      // Semua sinonim dimasukkan ke highlight & expand words
      match.entry.synonyms.forEach(syn => highlightTermsSet.add(syn.toLowerCase()));
      expandedWords.push(match.entry.synonyms);
    } else {
      correctedWords.push(word);
      expandedWords.push([cleanWord]);
    }
  }

  const correctedQuery = correctedWords.join(' ');

  return {
    originalQuery: trimmed,
    correctedQuery,
    isCorrected: hasCorrection,
    highlightTerms: Array.from(highlightTermsSet),
    expandedWords
  };
}
