import { NextResponse, NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { stripArabicHarakat } from '@/utils/searchHelper';
import { computeContentHash } from '@/utils/contentHash';

/**
 * Mengubah HTML / teks mentah brosur menjadi daftar blok paragraf bernomor
 * dengan memisahkan batas Arab <-> Latin dan membuang boilerplate agar
 * DeepSeek cukup mengembalikan indeks blok (hemat ~85% output token & 100% verbatim).
 */
function segmentBrosurToBlocks(rawText: string): string[] {
  const cleaned = (rawText || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/html\s*,\s*body\s*\{[^}]*\}/gi, '\n')
    .replace(/\/\*[^*]*\*\//g, ' ')
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r\n?/g, '\n');

  const rawLines = cleaned
    .split('\n')
    .map(l => l.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean);

  // Filter boilerplate umum header/footer brosur MTA
  const boilerplatePatterns = [
    /^majlis tafsir al-?qur'?an\s*\(mta\)/i,
    /^jl\.\s*ronggowarsito/i,
    /^(website|web|email|telp|fax)\s*:/i,
    /^www\.mta\.or\.id/i,
    /^[-_=*]{3,}\s*(bersambung|selesai)?\s*[-_=*]*$/i,
    /^\d{1,3}$/,
  ];

  const blocks: string[] = [];

  for (const line of rawLines) {
    if (line.length < 2) continue;
    if (boilerplatePatterns.some(rx => rx.test(line))) continue;

    // Jika 1 baris mencampur blok Arab panjang (>= 20 char) dan teks Latin ("Artinya:..."), pecah jadi 2 blok
    const mixedSplit = line.split(/(?=\bArtinya\s*:)/i);
    for (const part of mixedSplit) {
      const p = part.trim();
      if (!p) continue;

      // Pecah juga jika ada teks Arab panjang di awal yang langsung diikuti teks Latin panjang
      const arabPrefixMatch = p.match(
        /^([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF][\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\s\d\.,\-\(\)"':;؛،؟﴾﴿«»\[\]]{18,}[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF])\s+([A-Za-z"'“‘(].{15,})$/
      );
      if (arabPrefixMatch) {
        blocks.push(arabPrefixMatch[1].trim());
        blocks.push(arabPrefixMatch[2].trim());
      } else {
        blocks.push(p);
      }
    }
  }

  return blocks;
}

/**
 * Cek cepat tanpa AI apakah brosur memiliki indikasi ayat Al-Qur'an atau Hadits.
 */
function hasDalilSignal(blocks: string[]): boolean {
  const joined = blocks.join('\n');
  if (/[\u0600-\u06FF]{6,}/.test(joined)) return true;
  if (/\b(qs\.?|q\.s\.?|hr\.?|hadits|hadist|artinya\s*:|rasulullah|nabi\s+saw|firman\s+allah|surat\s+\w+|surah\s+\w+)/i.test(joined)) {
    return true;
  }
  return false;
}

/**
 * Memecah array blok bernomor ke beberapa batch (tetap mempertahankan indeks global [B0]..[Bn])
 * dengan overlap 2 blok agar dalil di perbatasan tidak terputus.
 */
function buildBlockBatches(blocks: string[], maxChars = 11500, maxBlocks = 55): { startIdx: number; endIdx: number; text: string }[] {
  const batches: { startIdx: number; endIdx: number; text: string }[] = [];
  let start = 0;

  while (start < blocks.length) {
    let end = start;
    let charCount = 0;
    const lines: string[] = [];

    while (end < blocks.length && end - start < maxBlocks) {
      const formatted = `[${end}] ${blocks[end]}`;
      if (lines.length > 0 && charCount + formatted.length + 1 > maxChars) {
        break;
      }
      lines.push(formatted);
      charCount += formatted.length + 1;
      end++;
    }

    batches.push({ startIdx: start, endIdx: end - 1, text: lines.join('\n') });
    if (end >= blocks.length) break;
    // Overlap 2 blok agar pasangan Arab + Terjemahan di perbatasan tetap terbaca utuh
    start = Math.max(start + 1, end - 2);
  }

  return batches;
}

/**
 * Parser JSON yang toleran terhadap markdown fence, karakter kontrol ilegal,
 * indeks [B1] tak berpetik, trailing comma, objek kosong {}, maupun JSON terpotong.
 */
function parseDeepSeekItemsJson(rawContent: string): any[] | null {
  if (!rawContent || !rawContent.trim()) return [];

  const sanitizeJsonString = (str: string) =>
    str
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
      // Jika LLM menulis [B1, B2] tanpa tanda kutip, ubah ke integer [1, 2]
      .replace(/([\[,\s])B(\d+)(?=[\],\s])/gi, '$1$2')
      // Hapus trailing comma sebelum } atau ]
      .replace(/,\s*([}\]])/g, '$1')
      .trim();

  const extractArrayFromParsed = (parsed: any): any[] | null => {
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) return parsed.items;
      // Cari properti array pertama (misal "dalil", "data", "hadits", "results")
      for (const val of Object.values(parsed)) {
        if (Array.isArray(val)) return val;
      }
      // Objek JSON valid tanpa array (misal {} saat tidak ada dalil) -> anggap kosong
      return [];
    }
    return null;
  };

  const cleaned = sanitizeJsonString(rawContent);

  try {
    const direct = JSON.parse(cleaned);
    const arr = extractArrayFromParsed(direct);
    if (arr !== null) return arr;
  } catch {}

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      const arr = extractArrayFromParsed(parsed);
      if (arr !== null) return arr;
    } catch {}
  }

  // Pemulihan JSON terpotong: ambil seluruh objek {...} utuh dari array "items"
  const itemsKeyIdx = cleaned.indexOf('"items"');
  const arrayStart = itemsKeyIdx !== -1 ? cleaned.indexOf('[', itemsKeyIdx) : cleaned.indexOf('[');
  if (arrayStart !== -1) {
    const recovered: any[] = [];
    let depth = 0;
    let inString = false;
    let escaped = false;
    let objStart = -1;

    for (let i = arrayStart + 1; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') inString = true;
      else if (ch === '{') {
        if (depth === 0) objStart = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && objStart !== -1) {
          try {
            recovered.push(JSON.parse(sanitizeJsonString(cleaned.slice(objStart, i + 1))));
          } catch {}
          objStart = -1;
        }
      }
    }
    if (recovered.length > 0) return recovered;
  }

  return null;
}

/**
 * Standarisasi penulisan nama kitab/rawi agar filter & pencarian selalu rapi.
 */
function normalizeRawiKitab(raw: string | null | undefined, isQuran: boolean): string {
  if (isQuran) return "Al-Qur'an";
  const s = (raw || '').trim();
  if (!s) return 'Sumber Tidak Dikenal';
  const low = s.toLowerCase();

  if (low.includes('qur')) return "Al-Qur'an";
  if (low.includes('bukhari') || low.includes('buchori') || low.includes('bukhori')) return 'Bukhari';
  if (low.includes('muslim')) return 'Muslim';
  if (low.includes('tirmidzi') || low.includes('turmudzi')) return 'Tirmidzi';
  if (low.includes('abu dawud') || low.includes('abu daud') || low.includes('abudaud')) return 'Abu Dawud';
  if (low.includes('nasa')) return "An-Nasa'i";
  if (low.includes('ibnu majah') || low.includes('ibn majah')) return 'Ibnu Majah';
  if (low.includes('ahmad')) return 'Ahmad';
  if (low.includes('malik') || low.includes('muwaththa') || low.includes('muwatha')) return 'Malik';
  if (low.includes('darimi')) return 'Darimi';
  if (low.includes('baihaqi')) return 'Al-Baihaqi';
  if (low.includes('hakim')) return 'Al-Hakim';
  if (low.includes('thabrani') || low.includes('tabrani')) return 'Thabrani';
  if (low.includes('daraquthni') || low.includes('daruquthni')) return 'Daraquthni';
  if (low.includes('ibnu hibban') || low.includes('ibn hibban')) return 'Ibnu Hibban';
  if (low.includes('ibnu khuzaimah')) return 'Ibnu Khuzaimah';

  return s.replace(/^(HR\.?|Imam)\s+/i, '').trim() || 'Sumber Tidak Dikenal';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      brosur_id,
      judul = '',
      teks_bersih = '',
      status_hadist = 'terverifikasi',
      auto_save = false,
      replace_existing = false,
      skip_if_unchanged = true,
    } = body;

    if (!brosur_id) {
      return NextResponse.json({ error: 'brosur_id wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Ambil teks_bersih & konten HTML asli dari DB agar struktur paragraf terjaga penuh
    let sourceTextForHash = teks_bersih;
    let sourceForSegmentation = teks_bersih;
    let sourceJudul = judul;

    const { data: brosurRow } = await supabase
      .from('brosur')
      .select('judul, teks_bersih, konten')
      .eq('id', brosur_id)
      .maybeSingle();

    if (brosurRow) {
      sourceJudul = brosurRow.judul || sourceJudul;
      sourceTextForHash = brosurRow.teks_bersih || sourceTextForHash || '';
      // Prioritaskan konten HTML jika tersedia karena menyimpan batas paragraf <p>/<br> asli
      sourceForSegmentation = brosurRow.konten || brosurRow.teks_bersih || sourceForSegmentation || '';
    } else if (!sourceForSegmentation) {
      return NextResponse.json({ error: 'Data brosur tidak ditemukan.' }, { status: 404 });
    }

    const currentHash = computeContentHash(sourceTextForHash);

    // Cek apakah sudah pernah diekstrak dan isi brosur tidak berubah
    if (skip_if_unchanged) {
      const [{ data: hashRow }, { data: existingRows }] = await Promise.all([
        supabase.from('system_settings').select('value').eq('key', 'hadist_extract_hashes').maybeSingle(),
        supabase.from('hadist_brosur').select('*').eq('brosur_id', brosur_id),
      ]);

      let hashes: Record<string, string> = {};
      if (hashRow?.value) {
        try { hashes = JSON.parse(hashRow.value) || {}; } catch {}
      }

      const hasExisting = existingRows && existingRows.length > 0;
      const isUnchanged = hasExisting && (!hashes[brosur_id] || hashes[brosur_id] === currentHash);
      if (isUnchanged) {
        return NextResponse.json({
          success: true,
          skipped: true,
          reason: 'unchanged',
          items: existingRows,
          savedCount: existingRows.length,
        });
      }
    }

    // STEP 1: Segmentasi lokal ke blok bernomor [B0]..[Bn] (0 token)
    const blocks = segmentBrosurToBlocks(sourceForSegmentation);
    if (blocks.length === 0 || !hasDalilSignal(blocks)) {
      return NextResponse.json({
        success: true,
        items: [],
        savedCount: 0,
        message: 'Tidak ditemukan indikasi dalil Al-Qur\'an atau Hadits di brosur ini.',
      });
    }

    // Ambil token DeepSeek (prioritas utama) atau OpenRouter fallback dari app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('deepseek_token, openrouter_token')
      .eq('id', 1)
      .single();

    const deepseekKey = (settings?.deepseek_token || process.env.DEEPSEEK_API_KEY || '').trim();
    const openrouterKey = (settings?.openrouter_token || process.env.OPENROUTER_API_KEY || '').trim();

    if (!deepseekKey && !openrouterKey) {
      return NextResponse.json(
        { error: 'Token DeepSeek / AI belum dikonfigurasi di Pengaturan AI (/dashboard/ai-settings).' },
        { status: 400 }
      );
    }

    // STEP 2: Prompt Block-Pointer Super Hemat Token (DeepSeek hanya kembalikan indeks integer + metadata)
    const systemPrompt = `Anda adalah ahli ekstraksi struktur dalil Islam (Al-Qur'an dan Hadits) dari naskah Brosur Ahad Pagi Majlis Tafsir Al-Qur'an (MTA).
Input berupa daftar blok teks bernomor [0], [1], [2], dst.

TUGAS: Identifikasi SEMUA kutipan Ayat Al-Qur'an dan Hadits secara berurutan.
JANGAN menyalin ulang teks Arab atau terjemahan! Cukup kembalikan ANGKA INDEKS BLOK (integer murni) dan metadata takhrij dalam JSON valid:
{
  "items": [
    {
      "tipe": "quran" | "hadist",
      "arab_idx": [1],
      "terjemah_idx": [2],
      "rawi_kitab": "Al-Qur'an (jika ayat) atau nama kitab baku: Bukhari, Muslim, Tirmidzi, Abu Dawud, An-Nasa'i, Ibnu Majah, Ahmad, Malik, Darimi, Al-Baihaqi, Al-Hakim, Thabrani, dll.",
      "juz": "nomor juz jika tertera, kosongkan jika tidak ada",
      "halaman": "nomor halaman jika tertera, kosongkan jika tidak ada",
      "no_hadist": "nomor hadits atau surat:ayat (misal 2:183 jika Al-Qur'an)",
      "rawi_teratas": "nama sahabat perawi pertama jika tertera di teks (misal: Abu Hurairah RA), kosongkan jika tidak ada",
      "perawi_sumber": "sitasi lengkap seperti di brosur, misal: 'QS. Al-Baqarah : 183' atau 'HR. Bukhari juz 1, hal. 80, no. 12'",
      "catatan": "ringkasan 1 kalimat singkat konteks dalil (opsional)"
    }
  ]
}

ATURAN KETAT:
1. arab_idx berisi array angka integer indeks blok teks Arab dalil (misal [1] atau [5, 6], boleh [] jika hanya terjemahan).
2. terjemah_idx berisi array angka integer indeks blok terjemahan dalil (boleh [] jika hanya Arab). HANYA masukkan blok terjemahan dalil, JANGAN masukkan blok keterangan/uraian/penjelasan ustadz!
3. JANGAN mengarang indeks di luar daftar blok. Jika tidak ada dalil sama sekali, kembalikan {"items": []}.`;

    const batches = buildBlockBatches(blocks, 11500, 55);
    const useDeepSeek = Boolean(deepseekKey);
    const endpoint = useDeepSeek
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    const authHeader = `Bearer ${useDeepSeek ? deepseekKey : openrouterKey}`;
    const modelName = useDeepSeek ? 'deepseek-chat' : 'deepseek/deepseek-chat';

    const rawList: any[] = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (let bIdx = 0; bIdx < batches.length; bIdx++) {
      const batch = batches[bIdx];
      const partLabel = batches.length > 1 ? ` (Bagian ${bIdx + 1}/${batches.length}, Blok ${batch.startIdx}-${batch.endIdx})` : '';
      const userPrompt = `Judul Brosur: ${sourceJudul}${partLabel}\n\nDaftar Blok Naskah:\n${batch.text}`;

      let parsedItems: any[] | null = null;
      let lastFinishReason = 'unknown';

      for (let attempt = 1; attempt <= 2; attempt++) {
        const aiRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
            ...(useDeepSeek ? {} : { 'HTTP-Referer': 'https://pustaka.mta.or.id', 'X-Title': 'Pustaka MTA Generator' }),
          },
          body: JSON.stringify({
            model: modelName,
            temperature: 0,
            max_tokens: 4096,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              {
                role: 'user',
                content: attempt === 1
                  ? userPrompt
                  : `${userPrompt}\n\nPENTING: Kembalikan HANYA JSON murni valid {"items":[...]} dengan arab_idx dan terjemah_idx berupa angka integer murni.`,
              },
            ],
          }),
        });

        if (!aiRes.ok) {
          const errBody = await aiRes.text();
          console.error('DeepSeek API Error:', aiRes.status, errBody);
          return NextResponse.json(
            { error: `Gagal memanggil DeepSeek API (HTTP ${aiRes.status}).` },
            { status: 502 }
          );
        }

        const aiJson = await aiRes.json();
        totalPromptTokens += aiJson.usage?.prompt_tokens || 0;
        totalCompletionTokens += aiJson.usage?.completion_tokens || 0;

        const choice = aiJson.choices?.[0];
        lastFinishReason = choice?.finish_reason || 'unknown';
        const content = choice?.message?.content || '{"items":[]}';
        parsedItems = parseDeepSeekItemsJson(content);

        if (parsedItems !== null) break;
        console.warn(`DeepSeek JSON parse attempt ${attempt} failed (finish_reason: ${lastFinishReason}):`, content.slice(0, 500));
      }

      if (parsedItems === null) {
        return NextResponse.json(
          { error: `Respons DeepSeek tidak berformat JSON valid (finish_reason: ${lastFinishReason}).` },
          { status: 500 }
        );
      }

      rawList.push(...parsedItems);
    }

    // STEP 3: Reassembly verbatim dari blocks[idx] + normalisasi + deduplikasi
    const extractBlockText = (indices: any): string => {
      if (!Array.isArray(indices)) return '';
      const validNums = Array.from(
        new Set(
          indices
            .map((n: any) => (typeof n === 'number' ? n : parseInt(String(n).replace(/^B/i, ''), 10)))
            .filter((n: number) => Number.isInteger(n) && n >= 0 && n < blocks.length)
        )
      ).sort((a, b) => a - b);
      return validNums.map(i => blocks[i]).join('\n').trim();
    };

    const seenKeys = new Set<string>();
    const normalizedItems: any[] = [];

    for (let idx = 0; idx < rawList.length; idx++) {
      const it = rawList[idx];
      const arabFromBlocks = extractBlockText(it.arab_idx);
      const terjFromBlocks = extractBlockText(it.terjemah_idx);

      // Fallback aman jika model mengembalikan teks langsung
      const arab = (arabFromBlocks || it.kutipan_arab || '').trim();
      const rawTerjemah = (terjFromBlocks || it.terjemahan || '').trim();
      const terjemah = rawTerjemah.replace(/^Artinya\s*:\s*/i, '').trim();

      if (!arab && !terjemah) continue;

      const arabNorm = stripArabicHarakat(arab).replace(/\s+/g, '');
      const terjNorm = terjemah.toLowerCase().replace(/\s+/g, ' ').slice(0, 90);
      const dedupeKey = arabNorm ? `a:${arabNorm.slice(0, 90)}` : `t:${terjNorm}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      const isQuran =
        it.tipe === 'quran' ||
        (it.rawi_kitab || '').toLowerCase().includes('qur') ||
        (it.perawi_sumber || '').toLowerCase().startsWith('qs');

      const rawiKitab = normalizeRawiKitab(it.rawi_kitab, isQuran);

      normalizedItems.push({
        id: `deepseek_${Date.now()}_${normalizedItems.length}`,
        brosur_id,
        sumber_jenis: isQuran ? 'quran' : 'hadist',
        kutipan_arab: arab,
        kutipan_arab_gundul: arab ? stripArabicHarakat(arab) : '',
        terjemahan: terjemah,
        rawi_kitab: rawiKitab,
        juz: (it.juz || '').toString().trim() || null,
        halaman: (it.halaman || '').toString().trim() || null,
        no_hadist: (it.no_hadist || '').toString().trim() || null,
        rawi_teratas: (it.rawi_teratas || '').toString().trim() || null,
        perawi_sumber: (it.perawi_sumber || '').toString().trim() || null,
        catatan: (it.catatan || '').toString().trim() || null,
        status_hadist: status_hadist || 'terverifikasi',
      });
    }

    let savedCount = 0;
    if (auto_save && normalizedItems.length > 0) {
      // Insert baru dulu, baru hapus ID lama setelah insert berhasil (mencegah data hilang jika error)
      let oldIdsToDelete: string[] = [];
      if (replace_existing) {
        const { data: existingRows } = await supabase
          .from('hadist_brosur')
          .select('id')
          .eq('brosur_id', brosur_id);
        oldIdsToDelete = (existingRows || []).map((r: any) => r.id).filter(Boolean);
      }

      const dbPayload = normalizedItems.map((it: any) => ({
        brosur_id: it.brosur_id,
        kutipan_arab: it.kutipan_arab || '-',
        kutipan_arab_gundul: it.kutipan_arab_gundul || null,
        terjemahan: it.terjemahan || null,
        rawi_kitab: it.rawi_kitab,
        juz: it.juz,
        halaman: it.halaman,
        no_hadist: it.no_hadist,
        rawi_teratas: it.rawi_teratas,
        perawi_sumber: it.perawi_sumber,
        catatan: it.catatan,
        status_hadist: it.status_hadist,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from('hadist_brosur')
        .insert(dbPayload)
        .select('id');

      if (insertErr) {
        console.error('Error saving DeepSeek items to DB:', insertErr);
        return NextResponse.json({ error: `Gagal menyimpan ke database: ${insertErr.message}` }, { status: 500 });
      }
      savedCount = inserted?.length || dbPayload.length;

      if (oldIdsToDelete.length > 0) {
        for (let i = 0; i < oldIdsToDelete.length; i += 200) {
          const chunk = oldIdsToDelete.slice(i, i + 200);
          await supabase.from('hadist_brosur').delete().in('id', chunk);
        }
      }

      // Simpan hash isi brosur agar tidak perlu digenerate ulang kecuali isinya berubah
      try {
        const { data: existingHashRow } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'hadist_extract_hashes')
          .maybeSingle();
        let hashes: Record<string, string> = {};
        if (existingHashRow?.value) {
          try { hashes = JSON.parse(existingHashRow.value) || {}; } catch {}
        }
        hashes[brosur_id] = currentHash;
        await supabase
          .from('system_settings')
          .upsert({ key: 'hadist_extract_hashes', value: JSON.stringify(hashes) }, { onConflict: 'key' });
      } catch (hashErr) {
        console.warn('Warning updating extract hash:', hashErr);
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'block-pointer',
      provider: useDeepSeek ? 'deepseek-official' : 'openrouter-deepseek',
      blocks_count: blocks.length,
      batches_count: batches.length,
      token_usage: {
        prompt_tokens: totalPromptTokens,
        completion_tokens: totalCompletionTokens,
      },
      items: normalizedItems,
      savedCount,
    });
  } catch (err: any) {
    console.error('Error POST /api/hadist/generate-ai:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal.' }, { status: 500 });
  }
}
