import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

// Helper Regex: Mengecek apakah suatu string mengandung aksara Arab
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

// Helper: Mengecek apakah teks dominan karakter Latin / Indonesia
function isMostlyIndonesian(text: string): boolean {
  const latinCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return latinCount >= arabicCount;
}

// Helper: Meminta teks dari HTML atau plain text dengan ekstraksi komprehensif
// Helper: Meminta teks dari HTML atau plain text dengan ekstraksi komprehensif tanpa memotong teks Arab
function extractParagraphs(contentHtml: string, teksBersih?: string): string[] {
  const blocks: string[] = [];

  // 1. Dari HTML jika ada (ambil teks penuh setiap elemen blok tanpa memotong di <br> atau newline tunggal)
  if (contentHtml && contentHtml.trim()) {
    try {
      const $ = cheerio.load(contentHtml);
      $('p, div, li, blockquote, td').each((_, el) => {
        // Ganti <br> dengan spasi agar kalimat tidak terpotong
        $(el).find('br').replaceWith(' ');
        const txt = $(el).text().replace(/\s+/g, ' ').trim();
        if (txt.length >= 8) {
          blocks.push(txt);
        }
      });
    } catch (e) {
      // Fallback
    }
  }

  // 2. Prioritaskan/gabungkan teks_bersih (pecah berdasarkan paragraf ganda / double newline, bukan single newline)
  if (teksBersih && teksBersih.trim()) {
    // Pecah berdasarkan double newline atau enter antar-paragraf
    const paragraphs = teksBersih
      .split(/\r?\n\s*\r?\n+/)
      .map((p) => p.replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim())
      .filter((p) => p.length >= 8);
    blocks.push(...paragraphs);

    // Jika masih ada baris per-line tunggal (opsional fallback jika formatnya tanpa double newline)
    const singleLines = teksBersih
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length >= 8);
    blocks.push(...singleLines);
  }

  // Deduplikasi blok yang sama persis agar tidak diproses ganda
  return Array.from(new Set(blocks));
}

// Helper: Mempartisi & mendeteksi Takhrij (Kitab Rawi, Juz, Hal, No. Hadist) dari teks
function detectTakhrij(text: string): {
  rawi_kitab: string;
  juz: string;
  halaman: string;
  no_hadist: string;
  rawi_teratas: string;
  confidence: number;
} {
  let rawi_kitab = 'Muslim'; // default fallback jika tidak terdeteksi
  let juz = '';
  let halaman = '';
  let no_hadist = '';
  let rawi_teratas = '';
  let confidence = 0.6;

  // 1. Deteksi Kitab Rawi Utama
  const kitabPatterns = [
    { name: 'Muslim', regex: /Muslim/i },
    { name: 'Bukhari', regex: /Bukhari|Bukho?ri/i },
    { name: 'Tirmidzi', regex: /Tirmidzi|Tirmidi/i },
    { name: 'Abu Dawud', regex: /Abu\s*Dawud|Abu\s*Dawood/i },
    { name: 'An-Nasa\'i', regex: /(?:An-?)?Nasa['']?i/i },
    { name: 'Ibnu Majah', regex: /Ibn(?:u)?\s*Maja?h/i },
    { name: 'Ahmad', regex: /Ahmad|Musnad\s*Ahmad/i },
    { name: 'Malik', regex: /Malik|Muwath?th?a['']?/i },
    { name: 'Ad-Darimi', regex: /(?:Ad-?)?Darimi/i },
    { name: 'Al-Hakim', regex: /Hakim|Al-Hakim|Mustadrak/i },
    { name: 'Ad-Darudquthni', regex: /Darud?quth?ni/i },
    { name: 'Al-Baihaqi', regex: /Baihaqi|Al-Baihaqi/i },
    { name: 'Ath-Thabrani', regex: /Thabrani|Ath-Thabrani/i },
    { name: 'Ibnu Hibban', regex: /Ibn(?:u)?\s*Hibban/i },
    { name: 'Ibnu Khuzaimah', regex: /Ibn(?:u)?\s*Khuzaimah/i },
    { name: 'Asy-Syafi\'i', regex: /Syafi['']?i|Asy-Syafi['']?i/i },
    { name: 'Abdurrazzaq', regex: /Abdurrazzaq/i },
    { name: 'Ibnu Abi Syaibah', regex: /Ibn(?:u)?\s*Abi\s*Syaibah/i },
  ];

  for (const item of kitabPatterns) {
    if (item.regex.test(text)) {
      rawi_kitab = item.name;
      confidence += 0.15;
      break;
    }
  }

  // 2. Deteksi Juz (misal: "juz 1", "jilid 1", "juz : 1", "1 : 227")
  const juzMatch = text.match(/(?:juz|jilid)\s*[:=]?\s*(\d+)/i) || text.match(/(Muslim|Bukhari|Ahmad)[^0-9]*?(\d+)\s*:/i);
  if (juzMatch) {
    juz = juzMatch[1] || juzMatch[2] || '';
    if (juz) confidence += 0.05;
  }

  // 3. Deteksi Halaman (misal: "hal. 227", "hlm 227", "halaman 227", ": 227")
  const halMatch =
    text.match(/(?:hal|hlm|halaman)\.?\s*[:=]?\s*(\d+)/i) ||
    text.match(/juz\s*\d+\s*(?:,|\.|:)\s*(?:hal\.?\s*)?(\d+)/i);
  if (halMatch) {
    halaman = halMatch[1] || '';
    if (halaman) confidence += 0.05;
  }

  // 4. Deteksi No Hadist (misal: "no. 70", "nomor 70", "rabi' 70", "#70")
  const noMatch =
    text.match(/(?:no|nomor|#)\.?\s*[:=]?\s*(\d+)/i) ||
    text.match(/hal\.?\s*\d+\s*(?:,|\.|)\s*(?:no\.?\s*)?(\d+)/i);
  if (noMatch) {
    no_hadist = noMatch[1] || '';
    if (no_hadist) confidence += 0.1;
  }

  // 5. Deteksi Rawi Teratas / Sahabat (misal: "Dari Anas bin Maalik, ia berkata:")
  const sahabatMatch = text.match(
    /(?:Dari|'An)\s+([A-Z][a-zA-Z\s\-']{3,30})(?:\s*,|\s+r\.?a\.?|\s+ia\s+berkata|\s+berkata)/i
  );
  if (sahabatMatch && sahabatMatch[1]) {
    rawi_teratas = sahabatMatch[1].trim();
    confidence += 0.05;
  }

  return {
    rawi_kitab,
    juz,
    halaman,
    no_hadist,
    rawi_teratas,
    confidence: Math.min(1.0, Number(confidence.toFixed(2))),
  };
}

// Helper: Mendeteksi apakah kutipan adalah Ayat Al-Qur'an (QS) atau Hadist (HR) beserta metadata takhrijnya
function detectDalilType(text: string, arabText: string): {
  sumber_jenis: 'hadist' | 'quran';
  nama_surat: string | null;
  no_ayat: string | null;
  rawi_kitab: string | null;
  juz: string | null;
  halaman: string | null;
  no_hadist: string | null;
  rawi_teratas: string | null;
  confidence: number;
} {
  const combinedText = `${text} ${arabText}`;

  // 0. Cek tanda-tanda kuat Hadist (HR, Kitab, Riwayat, Juz, Hal, Mukharij) - jika ada, TIDAK MUNGKIN Al-Qur'an
  const hasHadistKeyword = /HR\.?|Hadist|Riwayat|Muslim|Bukhari|Tirmidzi|Ahmad|Abu\s*Dawud|Nasa['']?i|Majah|Malik|Darimi|Hakim|Baihaqi|Thabrani|Darudquthni|Hibban|Khuzaimah|Syafi['']?i|Abdurrazzaq|Syaibah|Juz|Hal\.|Hlm|Muttafaqun/i.test(
    combinedText
  );

  // 1. Deteksi Pola Ayat Al-Qur'an (hanya jika eksplisit memakai kata QS / Surat / Surah / Al-Qur'an atau format (سورة ... : ...))
  const arabicQuranMatch = combinedText.match(/\((?:سورة\s*)?([\u0600-\u06FF\s]{2,20})\s*[:=]\s*(\d+(?:-\d+)?)\)/);
  const indQuranMatch =
    combinedText.match(/(?:QS\.?|Q\.?S\.?|Surat|Surah|Al-Qur'an|Qur'an)\.?\s*([A-Za-z\s\-']+?)(?:\s*:|\s*ayat|\s+)\s*(\d+(?:-\d+)?)/i);

  if (!hasHadistKeyword && (arabicQuranMatch || (indQuranMatch && indQuranMatch[1] && indQuranMatch[2]))) {
    const rawSurat = arabicQuranMatch ? arabicQuranMatch[1].trim() : (indQuranMatch ? indQuranMatch[1].trim() : '');
    const rawAyat = arabicQuranMatch ? arabicQuranMatch[2].trim() : (indQuranMatch ? indQuranMatch[2].trim() : '');

    if (rawSurat && rawAyat) {
      return {
        sumber_jenis: 'quran',
        nama_surat: rawSurat,
        no_ayat: rawAyat,
        rawi_kitab: null,
        juz: null,
        halaman: null,
        no_hadist: null,
        rawi_teratas: null,
        confidence: 0.95,
      };
    }
  }

  // 2. Jika bukan Al-Qur'an, proses sebagai Hadist (HR)
  const takhrij = detectTakhrij(text);
  return {
    sumber_jenis: 'hadist',
    nama_surat: null,
    no_ayat: null,
    rawi_kitab: takhrij.rawi_kitab,
    juz: takhrij.juz,
    halaman: takhrij.halaman,
    no_hadist: takhrij.no_hadist,
    rawi_teratas: takhrij.rawi_teratas,
    confidence: takhrij.confidence,
  };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { brosur_id, brosur_ids, folder_id, tahun, semua = false, limit = 5000, metadata_only = false } = body;

    // Langkah 1: Jika hanya meminta daftar ID/Metadata brosur (ringan & cepat tanpa konten/HTML agar tidak timeout)
    if (metadata_only) {
      let metaQuery = supabase
        .from('brosur')
        .select('id, judul, tahun')
        .order('tahun', { ascending: false })
        .order('judul', { ascending: true })
        .limit(5000);

      if (tahun && tahun !== 'all') {
        metaQuery = metaQuery.eq('tahun', tahun);
      } else if (folder_id) {
        metaQuery = metaQuery.eq('folder_id', folder_id);
      }

      const { data: metaList, error: metaErr } = await metaQuery;
      if (metaErr) {
        return NextResponse.json({ error: metaErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, brosurs: metaList || [] });
    }

    let query = supabase
      .from('brosur')
      .select('id, judul, tahun, konten, teks_bersih, created_at')
      .order('tahun', { ascending: false })
      .order('judul', { ascending: true })
      .limit(limit);

    if (brosur_ids && Array.isArray(brosur_ids) && brosur_ids.length > 0) {
      query = query.in('id', brosur_ids);
    } else if (brosur_id) {
      query = query.eq('id', brosur_id);
    } else if (tahun && tahun !== 'all') {
      query = query.eq('tahun', tahun);
    } else if (folder_id) {
      query = query.eq('folder_id', folder_id);
    }

    const { data: brosurList, error: fetchErr } = await query;
    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!brosurList || brosurList.length === 0) {
      return NextResponse.json({ items: [], message: 'Tidak ada brosur ditemukan untuk diproses.' });
    }

    const generatedItems: any[] = [];

    // Scan setiap brosur untuk menemukan kutipan hadist / QS (Pasangan: [Teks Arab] -> [Terjemahan])
    for (const bro of brosurList) {
      const blocks = extractParagraphs(bro.konten || '', bro.teks_bersih || '');
      
      for (let i = 0; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        
        // Cek apakah blok saat ini mengandung teks Arab dengan panjang cukup
        if (containsArabic(currentBlock) && currentBlock.length >= 8) {
          let terjemahan = '';
          let takhrijText = currentBlock; // untuk dicari HR/QS-nya
          let kutipanArab = currentBlock;

          // 0. Gabungkan jika blok berikutnya masih kelanjutan teks Arab yang terpecah baris (bukan terjemahan/nomor baru)
          while (
            i + 1 < blocks.length &&
            containsArabic(blocks[i + 1]) &&
            !isMostlyIndonesian(blocks[i + 1]) &&
            !/^[0-9]+[\.\)]/.test(blocks[i + 1])
          ) {
            i++;
            kutipanArab += ' ' + blocks[i];
            takhrijText += ' ' + blocks[i];
          }

          // 1. Cek apakah blok saat ini adalah gabungan Arab & Terjemahan dalam 1 paragraf
          if (/[a-zA-Z]{10,}/.test(kutipanArab) && kutipanArab.length > 30) {
            const arabicSegments = kutipanArab.match(/[\u0600-\u06FF\s،.,!؟()]+/g);
            if (arabicSegments && arabicSegments.join(' ').trim().length >= 8) {
              const fullArabic = arabicSegments.join(' ').trim();
              const cleanedLatin = kutipanArab.replace(/[\u0600-\u06FF]/g, '').trim();
              if (cleanedLatin.length > 10) {
                terjemahan = cleanedLatin;
                kutipanArab = fullArabic;
              }
            }
          }

          // 2. Cari terjemahan & keterangan HR/QS di 4 blok berikutnya
          for (let step = 1; step <= 4; step++) {
            if (i + step < blocks.length) {
              const nextBlock = blocks[i + step];
              // Jika blok berikutnya dominan teks Latin/Indonesia atau memuat keterangan HR/QS
              if (!containsArabic(nextBlock) || isMostlyIndonesian(nextBlock)) {
                if (!terjemahan && nextBlock.length > 10) {
                  terjemahan = nextBlock;
                } else if (
                  terjemahan &&
                  !/HR\.|Hadist|Riwayat|Muslim|Bukhari|Tirmidzi|Ahmad|Abu\s*Dawud|Nasa['']?i|Majah|Malik|Darimi|QS|Surat/i.test(nextBlock) &&
                  nextBlock.length > 15
                ) {
                  // Sambung kelanjutan kalimat terjemahan jika terpecah baris
                  terjemahan += ' ' + nextBlock;
                }
                takhrijText += ' ' + nextBlock;
              }
            }
          }

          const parsedDalil = detectDalilType(takhrijText, kutipanArab);

          // Hanya masukkan yang terdeteksi sebagai HADIST (bukan ayat Al-Qur'an / QS)
          if (parsedDalil.sumber_jenis === 'hadist') {
            generatedItems.push({
              id: `temp-${bro.id}-${i}`,
              brosur_id: bro.id,
              brosur_judul: bro.judul,
              brosur_tahun: bro.tahun,
              sumber_jenis: parsedDalil.sumber_jenis,
              nama_surat: parsedDalil.nama_surat,
              no_ayat: parsedDalil.no_ayat,
              kutipan_arab: kutipanArab,
              terjemahan: terjemahan || 'Terjemahan tidak terpisah otomatis',
              rawi_kitab: parsedDalil.rawi_kitab,
              juz: parsedDalil.juz,
              halaman: parsedDalil.halaman,
              no_hadist: parsedDalil.no_hadist,
              rawi_teratas: parsedDalil.rawi_teratas,
              confidence: parsedDalil.confidence,
              status_hadist: 'mentah',
            });
          }
        }
      }
    }

    // Default auto_save aktif agar setiap hasil generate langsung simpan ke database hadist_brosur
    const shouldAutoSave = body.auto_save !== false;
    if (shouldAutoSave && generatedItems.length > 0) {
      const rowsToInsert = generatedItems.map((item) => ({
        brosur_id: item.brosur_id,
        kutipan_arab: item.kutipan_arab,
        terjemahan: item.terjemahan,
        perawi_sumber:
          item.sumber_jenis === 'quran'
            ? `QS. ${item.nama_surat || 'Al-Qur\'an'} : ${item.no_ayat || ''}`
            : `HR. ${item.rawi_kitab || 'Muslim'} juz ${item.juz || '1'}, hal. ${item.halaman || '1'}, no. ${item.no_hadist || '-'}`,
        rawi_kitab: item.rawi_kitab,
        juz: item.juz,
        halaman: item.halaman,
        no_hadist: item.no_hadist,
        rawi_teratas: item.rawi_teratas,
        status_hadist: 'mentah',
      }));

      const { error: insertErr } = await supabase.from('hadist_brosur').insert(rowsToInsert);
      if (insertErr) {
        console.error('Error auto_save to hadist_brosur:', insertErr);
      } else {
        // Otomatis daftarkan Kitab HR dan Sahabat/Rawi yang baru dideteksi ke tabel master_rawi
        try {
          const { data: existingRawi } = await supabase.from('master_rawi').select('nama_rawi');
          const existingNames = new Set((existingRawi || []).map((r: any) => (r.nama_rawi || '').trim().toLowerCase()));

          const newRawiRows: any[] = [];
          for (const item of generatedItems) {
            if (item.rawi_kitab && item.sumber_jenis !== 'quran') {
              const name = item.rawi_kitab.trim();
              if (name && !existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                newRawiRows.push({
                  nama_rawi: name,
                  kategori_rawi: 'mukharij',
                  kredibilitas: 'Thiqah',
                  thabaqat: 'Kitab Hadist / HR',
                  biografi: `Kitab hadist riwayat ${name} yang dideteksi otomatis dari brosur.`
                });
              }
            }
            if (item.rawi_teratas && item.sumber_jenis !== 'quran') {
              const name = item.rawi_teratas.trim();
              if (name && !existingNames.has(name.toLowerCase())) {
                existingNames.add(name.toLowerCase());
                newRawiRows.push({
                  nama_rawi: name,
                  kategori_rawi: 'sahabat',
                  kredibilitas: 'Shahabi',
                  thabaqat: 'Sahabat Nabi ﷺ',
                  biografi: `Sahabat/perawi ${name} yang dideteksi otomatis dari brosur.`
                });
              }
            }
          }

          if (newRawiRows.length > 0) {
            await supabase.from('master_rawi').insert(newRawiRows);
          }
        } catch (rawiErr) {
          console.error('Error auto-sync master_rawi:', rawiErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: generatedItems.length,
      brosurCount: brosurList.length,
      items: generatedItems,
    });
  } catch (e: any) {
    console.error('Error in Auto-Generate Hadist:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
