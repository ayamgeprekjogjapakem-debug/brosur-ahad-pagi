/**
 * Utilitas Hybrid Search, Vector Embeddings (Google text-embedding-004),
 * dan Smart Document Chunking (Preservasi Matan Arab & Terjemah Dalil).
 */

/**
 * Menghapus harakat/tashkeel dan tatweel pada teks Arab agar pencocokan kata
 * (seperti 'سابع' dengan 'السَّابِعِ') selalu cocok 100%.
 */
export function normalizeArabicAndLower(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .toLowerCase();
}
const FIQIH_SYNONYM_MAP: Record<string, string[]> = {
  '7': ['ke-7', 'ketujuh', 'tujuh', 'سابع', 'سابعه', 'السابع', 'samurah'],
  'ke-7': ['7', 'ketujuh', 'tujuh', 'سابع', 'سابعه', 'السابع', 'samurah'],
  'ketujuh': ['ke-7', '7', 'tujuh', 'سابع', 'سابعه', 'السابع', 'samurah'],
  '21': ['ke-21', 'dua puluh satu', '14', 'ke-14', 'ke-7', 'hari ke-7', 'سابع', 'سابعه', 'samurah'],
  'hari': ['hari ke-7', 'ke-7', 'ketujuh', 'سابع', 'سابعه', 'السابع', 'يَوْمَ'],
  'aqiqah': ['aqiqah', 'akikah', "'aqiqah", 'عقيقة', 'عقيقته', 'غلام', 'ke-7', 'سابع', 'سابعه', 'السابع', 'samurah'],
  'akikah': ['aqiqah', 'akikah', "'aqiqah", 'عقيقة', 'عقيقته', 'ke-7', 'سابع', 'سابعه', 'samurah'],
  'nikah': ['nikah', 'pernikahan', 'menikah', 'kawin', 'perkawinan', 'wali', 'mahar', 'maskawin', 'khitbah', 'pinangan', 'meminang', 'walimah', 'walimatul', 'suami', 'istri', 'ijab', 'qabul'],
  'pernikahan': ['nikah', 'pernikahan', 'menikah', 'wali', 'mahar', 'maskawin', 'khitbah', 'pinangan', 'walimah', 'walimatul', 'suami', 'istri'],
  'menikah': ['nikah', 'pernikahan', 'menikah', 'wali', 'mahar', 'maskawin', 'khitbah', 'walimah', 'walimatul'],
  'perkawinan': ['nikah', 'pernikahan', 'perkawinan', 'wali', 'mahar', 'maskawin', 'walimah'],
  'kawin': ['nikah', 'pernikahan', 'kawin', 'wali', 'mahar', 'maskawin', 'walimah'],
  'mahar': ['mahar', 'maskawin', 'nikah', 'pernikahan', 'wali'],
  'wali': ['wali', 'nikah', 'pernikahan', 'mahar', 'pinangan'],
  'khitbah': ['khitbah', 'pinangan', 'meminang', 'nikah', 'pernikahan'],
  'walimah': ['walimah', 'walimatul', 'urs', 'nikah', 'pernikahan'],
  'cerai': ['cerai', 'perceraian', 'talak', 'thalaq', 'iddah', 'rujuk', 'khulu'],
  'talak': ['talak', 'thalaq', 'cerai', 'iddah', 'rujuk'],
  'waris': ['waris', 'warisan', 'faraidh', 'mawaris', 'ahli waris'],
  'qunut': ['qunut', 'kunut', 'قنوت', 'subuh', 'witir', 'nazilah'],
  'tahlilan': ['tahlilan', 'tahlil', 'yasinan', 'selamatan', 'kematian', 'bidah'],
  'yasinan': ['yasin', 'yasinan', 'tahlilan', 'يس'],
  'qurban': ['qurban', 'kurban', 'udhiyah', 'أضحية', 'idul adha', 'sapi', 'kambing'],
  'kurban': ['qurban', 'kurban', 'udhiyah', 'idul adha', 'sapi', 'kambing'],
  'sholat': ['shalat', 'sholat', 'salat', 'صلاة'],
  'shalat': ['shalat', 'sholat', 'salat', 'صلاة'],
  'salat': ['shalat', 'sholat', 'salat', 'صلاة'],
  'jumat': ['jumat', "jum'at", 'jumuah', 'khutbah'],
  'khutbah': ['khutbah', 'khotbah', 'jumat', "jum'at", 'mimbar'],
  'puasa': ['puasa', 'shaum', 'shiyam', 'ramadhan', 'fidyah', 'sahur'],
  'zakat': ['zakat', 'infak', 'infaq', 'sedekah', 'shadaqah', 'fitrah', 'maal'],
  'riba': ['riba', 'bunga', 'bank', 'hutang', 'piutang', 'jual beli'],
};

/**
 * Daftar kata struktural / generik dalam pertanyaan fiqih yang TIDAK BOLEH
 * dijadikan kata kunci pencarian tunggal karena muncul di hampir setiap brosur.
 */
export const STRUCTURAL_FIQIH_STOPWORDS = new Set([
  'rukun', 'syarat', 'sah', 'adab', 'hukum', 'hukumnya', 'tata', 'cara',
  'pengertian', 'definisi', 'arti', 'makna', 'macam', 'jenis', 'pembagian',
  'keutamaan', 'fadilah', 'fadhilah', 'hikmah', 'manfaat', 'tujuan',
  'dalil', 'dalilnya', 'ayat', 'hadits', 'hadis', 'sunnah', 'sunah',
  'islami', 'islam', 'muslim', 'umat', 'agama', 'syariat', 'fiqih', 'fikih',
  'menurut', ' pandangan', ' penjelasan', ' keterangan', ' kajian', ' brosur',
  'mta', 'ahad', 'pagi', 'tentang', 'seputar', 'terkait', 'mengenai',
  'apakah', 'bagaimana', 'mengapa', 'kenapa', 'kapan', 'dimana', 'siapa',
  'carikan', 'tolong', 'jelaskan', 'sebutkan', 'tuliskan', 'berikan',
  'yang', 'dan', 'atau', 'dengan', 'dalam', 'pada', 'untuk', 'dari',
  'ke', 'di', 'ini', 'itu', 'ada', 'tidak', 'bisa', 'boleh', 'wajib',
  'haram', 'makruh', 'mubah', 'kok', 'nya', 'saja', 'apa', 'bila', 'jika',
  'saat', 'ketika', 'hari', 'kata', 'arab', 'arabic', 'terjemah', 'arti'
]);

/**
 * Stemmer ringan Bahasa Indonesia khusus istilah keislaman/fiqih:
 * Mengubah kata berimbuhan ("pernikahan", "menikah", "berpuasa", "menshalatkan")
 * menjadi kata dasar ("nikah", "puasa", "shalat") agar pencarian database akurat.
 */
export function stemIndonesianMateriWord(word: string): string {
  const clean = word.toLowerCase().trim();
  if (clean.length <= 4) return clean;

  // Pemetaan langsung kata berimbuhan populer di fiqih
  const directMap: Record<string, string> = {
    'pernikahan': 'nikah',
    'menikah': 'nikah',
    'menikahkan': 'nikah',
    'dinikahkan': 'nikah',
    'dinikahi': 'nikah',
    'perkawinan': 'kawin',
    'perceraian': 'cerai',
    'bercerai': 'cerai',
    'menceraikan': 'cerai',
    'meminang': 'pinang',
    'pinangan': 'pinang',
    'dipinang': 'pinang',
    'berpuasa': 'puasa',
    'menshalatkan': 'shalat',
    'menyalatkan': 'shalat',
    'shalatnya': 'shalat',
    'sholatnya': 'sholat',
    'berwudhu': 'wudhu',
    'bertayamum': 'tayamum',
    'berqurban': 'qurban',
    'berkurban': 'kurban',
    'beraqiqah': 'aqiqah',
    'berakikah': 'akikah',
    'aqiqahnya': 'aqiqah',
    'berzakat': 'zakat',
    'bersedekah': 'sedekah',
    'berinfak': 'infak',
    'berhaji': 'haji',
    'berumrah': 'umrah',
    'berdoa': 'doa',
    'berdzikir': 'dzikir',
    'berzikir': 'zikir',
    'warisan': 'waris',
    'mewarisi': 'waris',
    'pewaris': 'waris',
    'perdebatan': 'debat',
    'perselisihan': 'selisih',
    'perpecahan': 'pecah',
  };

  if (directMap[clean]) return directMap[clean];

  // Aturan umum pe-...-an / per-...-an / ke-...-an / -nya
  if (clean.endsWith('nya') && clean.length > 6) {
    return clean.slice(0, -3);
  }
  if (clean.startsWith('per') && clean.endsWith('an') && clean.length > 7) {
    return clean.slice(3, -2);
  }
  if (clean.startsWith('ber') && clean.length > 6) {
    return clean.slice(3);
  }
  return clean;
}

/**
 * Mengekstrak daftar kata kunci topik inti (Core Topic Keywords) dan kata kunci perluasan
 * dari kueri pengguna & hasil ekstraksi LLM.
 */
export function extractCoreTopicTerms(userMessage: string, llmExtractedQuery: string): {
  primaryRoots: string[];
  expandedTerms: string[];
} {
  const combinedRaw = `${userMessage} ${llmExtractedQuery}`
    .toLowerCase()
    .replace(/\b(or|and)\b/gi, ' ')
    .replace(/[^\w\s\u0600-\u06FF'-]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);

  const primarySet = new Set<string>();
  const expandedSet = new Set<string>();

  for (const rawWord of combinedRaw) {
    if (STRUCTURAL_FIQIH_STOPWORDS.has(rawWord)) continue;

    const root = stemIndonesianMateriWord(rawWord);
    if (STRUCTURAL_FIQIH_STOPWORDS.has(root)) continue;

    primarySet.add(root);
    if (rawWord !== root) {
      primarySet.add(rawWord);
    }

    expandedSet.add(root);
    expandedSet.add(rawWord);

    const syns = FIQIH_SYNONYM_MAP[root] || FIQIH_SYNONYM_MAP[rawWord];
    if (syns) {
      for (const s of syns) {
        expandedSet.add(s.toLowerCase());
      }
    }
  }

  // Fallback jika semua kata kebetulan masuk stopword (misal user hanya bertanya "apa itu adab dan rukun?")
  if (primarySet.size === 0) {
    for (const w of combinedRaw) {
      if (w.length >= 4 && !['yang', 'dari', 'untuk', 'pada', 'dengan', 'carikan'].includes(w)) {
        primarySet.add(w);
        expandedSet.add(w);
      }
    }
  }

  return {
    primaryRoots: Array.from(primarySet),
    expandedTerms: Array.from(expandedSet),
  };
}

/**
 * Mengekstrak judul asli yang informatif dari dalam isi naskah brosur
 * apabila kolom `judul` hanya berupa angka tanggal (misal "20111120" atau "20170507a_2007").
 */
export function extractReadableBrosurTitle(rawTitle: string, rawHtmlOrText: string): string {
  const cleanTitle = (rawTitle || 'Brosur MTA').replace(/\s+/g, ' ').trim();

  // Cek apakah judul hanya berupa kode tanggal/angka (contoh: "20111120", "20000813", "20170507a_2007")
  const isDateOnlyCode = /^\d{6,8}[a-z]?(_\d{4})?$/i.test(cleanTitle);
  if (!isDateOnlyCode || !rawHtmlOrText) {
    return cleanTitle;
  }

  const plainHeader = rawHtmlOrText
    .slice(0, 1400)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/[^\x20-\x7E\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Cari pola "Brosur No. : 1578/1618 / IA <Judul Asli>"
  const brosurNoMatch = plainHeader.match(/Brosur\s*No\.?\s*:?\s*[\d\s\/]+[A-Z]{1,3}\s+([^\u0600-\u06FF]{6,130})/i);
  if (brosurNoMatch && brosurNoMatch[1]) {
    const innerTitle = brosurNoMatch[1]
      .replace(/[:\s]+\d+\s*$/, '')
      .replace(/[:\s]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 88);
    if (innerTitle.length >= 5) {
      return `${cleanTitle} — ${innerTitle}`;
    }
  }

  return cleanTitle;
}

/**
 * Menghitung Skor Kepadatan Relevansi (Relevance Density Score) sebuah brosur
 * terhadap kata kunci utama dan sinonim fiqih.
 * Menjamin brosur yang benar-benar membahas topik utama berada di peringkat teratas
 * dan membuang brosur tidak relevan yang hanya menyebut 1 kata secara kebetulan.
 */
export function scoreBrosurRelevance(
  brosur: { id?: any; judul?: string; tahun?: string; konten?: string; teks_bersih?: string },
  primaryRoots: string[],
  expandedTerms: string[]
): { score: number; readableTitle: string; primaryHits: number } {
  const rawTitle = brosur.judul || '';
  const rawBody = brosur.teks_bersih || brosur.konten || '';
  const readableTitle = extractReadableBrosurTitle(rawTitle, rawBody);

  const lowerTitle = readableTitle.toLowerCase();
  const plainBody = rawBody
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .toLowerCase();
  const openingSection = plainBody.slice(0, 850); // Bagian judul dalam & sub-bab pertama

  let score = 0;
  let primaryHits = 0;

  for (const root of primaryRoots) {
    if (root.length < 3) continue;
    const escaped = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    // 1. Kecocokan pada Judul atau Sub-Judul Pembuka (Bobot Sangat Tinggi)
    if (lowerTitle.includes(root)) {
      score += 65;
      primaryHits += 3;
    }
    if (openingSection.includes(root)) {
      score += 45;
      primaryHits += 2;
    }

    // 2. Frekuensi kemunculan di seluruh isi brosur
    const matches = plainBody.match(regex);
    const count = matches ? matches.length : 0;
    if (count > 0) {
      primaryHits += count;
      // Maksimal kontribusi per kata akar agar seimbang
      score += Math.min(count * 4, 120);
    }
  }

  // 3. Kemunculan kata kunci sinonim/pendamping (misal: wali, mahar, walimah untuk topik nikah)
  for (const syn of expandedTerms) {
    if (primaryRoots.includes(syn) || syn.length < 3) continue;
    if (lowerTitle.includes(syn)) {
      score += 25;
    }
    if (openingSection.includes(syn)) {
      score += 18;
    }
    const escaped = syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = plainBody.match(new RegExp(escaped, 'gi'));
    const count = matches ? matches.length : 0;
    if (count > 0) {
      score += Math.min(count * 2, 40);
    }
  }

  return { score, readableTitle, primaryHits };
}

/**
 * Mengubah HTML brosur menjadi teks terstruktur dengan pemisah paragraf yang rapi
 * tanpa menghilangkan karakter Arab (Unicode \u0600-\u06FF).
 */
export function htmlToStructuredParagraphs(rawHtmlOrText: string): string[] {
  if (!rawHtmlOrText) return [];

  // Ganti tag blok HTML dengan baris baru agar batas paragraf & dalil terjaga
  const withNewlines = rawHtmlOrText
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  const rawLines = withNewlines
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  return rawLines;
}

/**
 * Memecah satu dokumen brosur menjadi potongan-potongan sub-bab (chunks)
 * berukuran ~1200 karakter dengan menjaga keutuhan pasangan Teks Arab + Terjemahannya.
 */
export function chunkBrosurText(rawHtmlOrText: string, targetChunkSize = 1200): string[] {
  const paragraphs = htmlToStructuredParagraphs(rawHtmlOrText);
  if (paragraphs.length === 0) return [];

  const chunks: string[] = [];
  let currentChunk = '';

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const hasArabic = /[\u0600-\u06FF]{10,}/.test(para);

    // Jika paragraf ini adalah teks Arab, usahakan gabungkan dengan 1-2 paragraf berikutnya (terjemahan & perawi)
    let combinedUnit = para;
    if (hasArabic && i + 1 < paragraphs.length) {
      const nextPara = paragraphs[i + 1];
      // Jika paragraf berikutnya bukan teks Arab murni (berarti terjemahan/perawi), satukan!
      if (!/^[\u0600-\u06FF\s.,:;()\-«»]+$/.test(nextPara)) {
        combinedUnit += '\n' + nextPara;
        i++;
      }
    }

    if ((currentChunk.length + combinedUnit.length + 1) <= targetChunkSize || currentChunk.length === 0) {
      currentChunk = currentChunk ? `${currentChunk}\n${combinedUnit}` : combinedUnit;
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = combinedUnit;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Memilih potongan-potongan (multi-chunks) paling relevan dari seluruh isi brosur
 * berdasarkan kata kunci kueri, variasi angka/sinonim, dan keberadaan dalil Arab.
 * Menjamin hadits di bagian tengah/akhir brosur (seperti Hadits Samurah hari ke-7) TIDAK TERPOTONG.
 */
export function extractSmartMultiChunks(
  rawHtmlOrText: string,
  searchQuery: string,
  userRawMessage: string,
  maxCharsBudget = 4800
): string {
  const chunks = chunkBrosurText(rawHtmlOrText, 1100);
  if (chunks.length === 0) return '';

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (totalLength <= maxCharsBudget) {
    return chunks.join('\n\n');
  }

  // Kumpulkan semua kata kunci relevan + sinonimnya
  const baseWords = `${searchQuery} ${userRawMessage}`
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 1 && !['or', 'dan', 'yang', 'di', 'ke', 'dari', 'apa', 'kok', 'nya', 'ada', 'tidak', 'carikan', 'tolong'].includes(w));

  const expandedTerms = new Set<string>();
  for (const w of baseWords) {
    expandedTerms.add(w);
    if (FIQIH_SYNONYM_MAP[w]) {
      for (const syn of FIQIH_SYNONYM_MAP[w]) {
        expandedTerms.add(syn.toLowerCase());
      }
    }
  }

  // Beri skor setiap chunk
  const scoredChunks = chunks.map((chunk, idx) => {
    const lower = normalizeArabicAndLower(chunk);
    let score = 0;

    // Bonus kecil untuk chunk pertama (biasanya definisi/mukadimah brosur)
    if (idx === 0) score += 2;

    for (const term of expandedTerms) {
      const normalizedTerm = normalizeArabicAndLower(term);
      if (normalizedTerm.length >= 2 && lower.includes(normalizedTerm)) {
        // Kata spesifik seperti ke-7, samurah, سابع mendapat bobot ekstra tinggi
        if (['ke-7', 'ketujuh', 'سابع', 'سابعه', 'السابع', 'samurah', 'tirmidzi', 'hibban', 'dawud'].includes(normalizedTerm)) {
          score += 12;
        } else {
          score += 4;
        }
      }
    }

    // Bonus jika chunk mengandung matan Arab + rujukan HR./QS.
    const hasArabicMatan = /[\u0600-\u06FF]{18,}/.test(chunk);
    const hasHadithRef = /\b(hr\.|h\.r\.|riwayat|bukhari|muslim|tirmidzi|abu dawud|nasa'i|ibnu majah|ahmad|ibnu hibban|qs\.)/i.test(chunk);
    if (hasArabicMatan) score += 5;
    if (hasHadithRef) score += 4;
    if (hasArabicMatan && hasHadithRef) score += 4;

    return { idx, chunk, score };
  });

  // Urutkan berdasarkan skor tertinggi
  const sortedByScore = [...scoredChunks].sort((a, b) => b.score - a.score);

  const selectedIndices = new Set<number>();
  let usedChars = 0;

  for (const item of sortedByScore) {
    if (usedChars + item.chunk.length <= maxCharsBudget || selectedIndices.size === 0) {
      selectedIndices.add(item.idx);
      usedChars += item.chunk.length + 2;
    }
  }

  // Susun kembali sesuai urutan halaman brosur asli agar alur bacaan tetap runtut
  const orderedSelected = scoredChunks
    .filter((item) => selectedIndices.has(item.idx))
    .map((item) => item.chunk);

  return orderedSelected.join('\n\n');
}

/**
 * Menghasilkan Vector Embedding 768 dimensi menggunakan Google AI Studio (text-embedding-004).
 * Gratis, cepat (< 100ms), dan mendukung multibahasa (Indonesia + Arab).
 */
export async function generateGoogleEmbedding(
  text: string,
  googleApiKey?: string
): Promise<number[] | null> {
  const apiKey = googleApiKey?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
  if (!apiKey || !text || text.trim().length === 0) return null;

  try {
    const cleanInput = text.replace(/\s+/g, ' ').trim().substring(0, 6000);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: {
            parts: [{ text: cleanInput }],
          },
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const values = data?.embedding?.values;
    if (Array.isArray(values) && values.length === 768) {
      return values;
    }
    return null;
  } catch (err) {
    console.error('Embedding generation error:', err);
    return null;
  }
}
