/**
 * arabic-normalizer.ts
 * 
 * Standarisasi & normalisasi teks Arab standar Microsoft (MS Word, Windows PDF, CP-1256 / UTF-8)
 * - Mengubah Arabic Presentation Forms ke standar Unicode (\u0600-\u06FF)
 * - Menangani ligatur Microsoft Word (الله, بسم الله الرحمن الرحيم, dll.)
 * - Membersihkan karakter spasi kerning & huruf terbalik dari hasil ekspor Visual Order PDF Microsoft
 * - Memperbaiki urutan kata dan nomor ayat (misal: ayah 10 dan ayah 11) agar dibaca dengan sempurna dari kanan-ke-kiri
 * - Membungkus teks Arab dalam tag semantik HTML (dir="rtl", lang="ar", class="arabic")
 */

// REGEX untuk mendeteksi karakter Arab (termasuk harakat & presentation forms)
export const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
export const ARABIC_BLOCK_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u064B-\u065F\s.,؛،؟!()-]+/g;

/**
 * Cek apakah sebuah baris merupakan teks Arab Visual/Disjointed terbalik (ekspor dari Microsoft Word/PDF)
 */
function isMicrosoftVisualDisjointedArabic(text: string): boolean {
  if (!text) return false;
  const arabicMatch = text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g);
  if (!arabicMatch || arabicMatch.length < 5) return false;
  
  // Split oleh SEMUA whitespace (spasi maupun newline \n)
  const tokens = text.trim().split(/\s+/);
  if (tokens.length === 0) return false;
  
  // Jika mayoritas token berukuran 1-3 karakter akibat kerning spasi atau pemecahan baris per huruf di PDF
  const singleCharTokens = tokens.filter(t => t.length <= 3 && /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(t)).length;
  return (singleCharTokens / tokens.length) > 0.30;
}

/**
 * Normalisasi dan rekonstruksi baris teks Arab ekspor Microsoft Visual Order
 */
export function cleanMicrosoftVisualArabic(text: string): string {
  if (!text || !/[\u0600-\u06FF]/.test(text)) return text;
  
  // 1. Balik urutan karakter (Visual RTL -> Logical LTR string)
  let rev = Array.from(text).reverse().join('');
  
  // 2. Format nomor ayat terbalik: )10( -> (10)
  rev = rev.replace(/\)(\d+)\(/g, (_m, digits) => '(' + Array.from(digits).reverse().join('') + ')');
  
  // 3. Urutkan kembali harakat dan tanda baca alif khanjariyah/madda
  rev = rev.replace(/([\u064B-\u065F\u0670\u0651\u0640])([^\u064B-\u065F\u0670\u0651\u0640\s])/g, '$2$1');
  
  // 4. Tempelkan harakat ke huruf dasar
  rev = rev.replace(/ +([\u064B-\u065F\u0670\u0651\u0640])/g, '$1');

  // 5. Normalisasi pemetaan harakat khusus Microsoft Word Uthmani (ha kecil sebagai khanjariyah/madda)
  rev = rev.replace(/ذ\s*ه\s*ل/g, 'ذَٰل');
  rev = rev.replace(/ل\s*ه\s*ى/g, 'لَىٰ');
  rev = rev.replace(/ا\s*ه\s*م/g, 'آم');
  
  // 6. Sambungkan huruf Arab yang terpisah oleh spasi kerning di dalam kata
  let joined = rev.replace(/([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]) +(?=[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF])/g, '$1');
  
  // 7. Sisipkan spasi setelah Tanwin (\u064B-\u064D), Ta Marbuta (\u0629), atau tanda waqaf Al-Qur'an
  joined = joined.replace(/([\u064B\u064C\u064D\u0629\u06D6-\u06ED])(?=[^\s,.?!)]|$)/g, '$1 ');
  joined = joined.replace(/(\u0629)(?=[^\u064B-\u065F\u0670\u0651\s,.?!)]|$)/g, '$1 ');
  
  // 8. Sisipkan batas kata (spasi) sebelum kata/partikel umum bahasa Arab & Al-Qur'an
  const START_WORDS = [
    'ال[\u0600-\u06FF]{2,}',
    '[\u0623\u0625\u0622][\u0600-\u06FF]{2,}',
    'هَلْ', 'اَدُلُّكُم', 'عَلَى', 'تِجَارَة', 'تَِِارَة', 'تُنْجِي', 'مِٰن', 'مِنَ', 'عَذَاب', 'أَلِيْم', 'اَلِيْم',
    'بِأَمْوَال', 'بَِمْوَال', 'وَأَنفُس', 'وَاَنْفُس', 'سَبِيْل', 'رَسُوْل', 'لَّكُم', 'اِنْ', 'اِنَّ', 'خَيْر', 
    'ذَٰلِك', 'تُؤْمِنُوْن', 'تَعْلَمُوْن', 'كُنْتُم', 'فِِْو', 'وَتَُِاهِدُوْن',
    'بَِنَّ', 'لََُمُ', 'يُقَاتِلُوْن', 'فَيَقْتُلُوْن', 'وَيُقْتَلُوْن', 'وَعْدً', 'حَقًّ', 'اشْتََهى', 'فَاسْتَبْشِرُوْا', 'بِبَيْعِكُم', 'بَيَعْتُم', 'وَمَنْ', 'اَوْفِه',
    'وَالْ', 'فِي', 'فِِ', 'بِهٖ'
  ];
  const lookaheadRegex = new RegExp('([^\s])(?=' + START_WORDS.join('|') + ')', 'g');
  joined = joined.replace(lookaheadRegex, '$1 ');
  
  // 9. Pindahkan nomor ayat dan kata terakhir jika berada di awal string terbalik
  const leadingAyahMatch = joined.match(/^(\(\d+\))\s*([^\s]+)\s+(.+)$/);
  if (leadingAyahMatch) {
    joined = leadingAyahMatch[3] + ' ' + leadingAyahMatch[2] + ' ' + leadingAyahMatch[1];
  }
  const onlyAyahMatch = joined.match(/^(\(\d+\))\s+(.+)$/);
  if (onlyAyahMatch) {
    joined = onlyAyahMatch[2] + ' ' + onlyAyahMatch[1];
  }

  return joined.replace(/\s+/g, ' ').trim();
}

/**
 * Normalisasi string teks Arab standar Microsoft (menangani per-baris visual maupun per-paragraf)
 */
export function normalizeMicrosoftArabic(text: string): string {
  if (!text) return '';

  // 1. Cek apakah SELURUH blok teks adalah Microsoft Visual Disjointed Arabic
  let cleaned = text.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF]/g, '');

  if (isMicrosoftVisualDisjointedArabic(cleaned)) {
    // Jika disjointed terbalik, HAPUS semua newline menjadi spasi lalu bersihkan
    return cleanMicrosoftVisualArabic(cleaned.replace(/\r?\n+/g, ' '));
  }

  // 2. Jika bukan disjointed (teks Indonesia / Arab normal), proses per paragraf / blok
  const blocks = cleaned.split(/\r?\n\s*\r?\n/);
  const processedBlocks = blocks.map((block) => {
    if (isMicrosoftVisualDisjointedArabic(block)) {
      return cleanMicrosoftVisualArabic(block.replace(/\r?\n+/g, ' '));
    }
    const LIGATURES: [string, string][] = [
      ['\uFDF2', 'الله'],
      ['\uFDFD', 'بسم الله الرحمن الرحيم'],
      ['\uFDFA', 'صلى الله عليه وسلم'],
      ['\uFDFB', 'جل جلاله'],
      ['ﷹ', 'صلى الله عليه وسلم'],
      ['ﷸ', 'صلى الله عليه وسلم'],
    ];
    let b = block;
    for (const [lig, rep] of LIGATURES) {
      b = b.split(lig).join(rep);
    }
    b = b.normalize('NFKC').normalize('NFC');
    return b.replace(/\s+/g, ' ').trim();
  });

  return processedBlocks.join('\n\n');
}

/**
 * Memformat paragraf teks hasil ekstraksi PDF ke dalam HTML semantik yang mendukung standar Arabic Microsoft & CSS aplikasi
 */
export function formatParagraphWithArabic(text: string): string {
  if (!text || !text.trim()) return '';

  const normalized = normalizeMicrosoftArabic(text.trim());

  // Hitung persentase karakter Arab dalam satu paragraf
  const totalChars = normalized.replace(/\s/g, '').length;
  if (totalChars === 0) return `<p>${normalized}</p>`;

  const arabicCharsCount = (normalized.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const arabicRatio = arabicCharsCount / totalChars;

  // 1. Jika mayoritas (>40%) adalah teks Arab (misal: ayat Al-Qur'an, Hadits, doa, judul bab Arab):
  // Jadikan seluruh paragraf berarah RTL dengan atribut lang="ar" dan class="arabic"
  if (arabicRatio >= 0.4) {
    // Gunakan spasi biasa untuk ganti baris agar ayat Al-Qur'an mengalir mulus tanpa <br/> di tengah kata
    return `<p dir="rtl" lang="ar" class="arabic" style="text-align: right; direction: rtl; font-family: var(--arabic-font-family, 'Amiri', serif); font-size: 28px; line-height: 2;">${normalized.replace(/\r?\n+/g, ' ')}</p>`;
  }

  // 2. Jika paragraf campuran (Indonesia/Latin + kutipan Arab di dalamnya):
  // Ganti setiap frasa Arab dengan <span dir="rtl" lang="ar" class="arabic">frasa</span>
  let html = normalized.replace(/\r?\n/g, '<br/>');
  
  // Bungkus frasa Arab (minimal 2 huruf Arab) agar dirender dengan font Amiri & direction RTL di dalam kalimat Indonesia
  html = html.replace(
    /([\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u064B-\u065F][\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u064B-\u065F\s.,؛،؟!()-]*[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\u064B-\u065F])/g,
    (match) => {
      if (!ARABIC_REGEX.test(match)) return match;
      const cleanMatch = match.trim();
      if (!cleanMatch) return match;
      return `<span dir="rtl" lang="ar" class="arabic" style="direction: rtl; display: inline-block; font-family: var(--arabic-font-family, 'Amiri', serif); font-size: 26px;">${cleanMatch}</span>`;
    }
  );

  return `<p dir="auto">${html}</p>`;
}

