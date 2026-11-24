import { NextResponse, NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

async function enrichPerawiWithDeepSeek(
  supabase: ReturnType<typeof createAdminClient>,
  namaRawi: string
) {
  const { data: settings } = await supabase
    .from('app_settings')
    .select('deepseek_token, openrouter_token')
    .eq('id', 1)
    .maybeSingle();

  const deepseekKey = (settings?.deepseek_token || process.env.DEEPSEEK_API_KEY || '').trim();
  const openrouterKey = (settings?.openrouter_token || process.env.OPENROUTER_API_KEY || '').trim();

  if (!deepseekKey && !openrouterKey) {
    throw new Error('Token DeepSeek / AI belum dikonfigurasi di /dashboard/ai-settings.');
  }

  const useDeepSeek = Boolean(deepseekKey);
  const endpoint = useDeepSeek
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://openrouter.ai/api/v1/chat/completions';
  const modelName = useDeepSeek ? 'deepseek-chat' : 'deepseek/deepseek-chat';

  const systemPrompt = `Anda adalah pakar Ilmu Rijalul Hadits (Al-Jarh wa At-Ta'dil).
Berikan profil ringkas dan akurat untuk perawi hadits yang diminta dalam format JSON murni valid:
{
  "nama_arab": "nama lengkap dalam tulisan Arab berharakat",
  "kategori_rawi": "sahabat" | "tabiin" | "perawi",
  "thabaqat": "tingkatan thabaqat (misal: Sahabat, Tabi'in Kubra, Tabi'in Wustha, Tabi'ut Tabi'in)",
  "kredibilitas": "status Al-Jarh wa At-Ta'dil (misal: Shahabi / Adil, Thiqah Hafizh, Thiqah, Shaduq)",
  "biografi": "biografi singkat 2-3 kalimat dalam bahasa Indonesia yang mencakup nama asli/kunyah, keutamaan, tahun wafat (Hijriah), dan peran periwayatan haditsnya."
}`;

  const aiRes = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${useDeepSeek ? deepseekKey : openrouterKey}`,
      ...(useDeepSeek ? {} : { 'HTTP-Referer': 'https://pustaka.mta.or.id', 'X-Title': 'Pustaka MTA Rijal' }),
    },
    body: JSON.stringify({
      model: modelName,
      temperature: 0,
      max_tokens: 600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Nama perawi: ${namaRawi}` },
      ],
    }),
  });

  if (!aiRes.ok) {
    throw new Error(`DeepSeek API error (HTTP ${aiRes.status})`);
  }

  const aiJson = await aiRes.json();
  const content = (aiJson.choices?.[0]?.message?.content || '{}')
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();
  const parsed = JSON.parse(content);

  const rawKat = (parsed.kategori_rawi || '').toLowerCase();
  const kategori = rawKat.includes('sahabat')
    ? 'sahabat'
    : rawKat.includes('tabi')
    ? 'tabiin'
    : 'perawi';

  return {
    nama_arab: (parsed.nama_arab || '').trim() || null,
    kategori_rawi: kategori,
    thabaqat: (parsed.thabaqat || '').trim() || null,
    kredibilitas: (parsed.kredibilitas || 'Thiqah').trim(),
    biografi: (parsed.biografi || '').trim() || null,
  };
}

// GET: Ambil daftar Master Rawi / Rijalul Hadits beserta jumlah hadist (terpaginasi penuh tanpa limit 1000)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const nama_rawi = searchParams.get('nama_rawi');

    // Paginate master_rawi
    const rawiList: any[] = [];
    let rFrom = 0;
    const pageSize = 1000;
    while (true) {
      let query = supabase
        .from('master_rawi')
        .select('*')
        .order('kategori_rawi', { ascending: true })
        .order('nama_rawi', { ascending: true })
        .order('id', { ascending: true })
        .range(rFrom, rFrom + pageSize - 1);

      if (nama_rawi) {
        query = query.ilike('nama_rawi', `%${nama_rawi}%`);
      }

      const { data: page, error } = await query;
      if (error) {
        if (error.code === '42P01') {
          return NextResponse.json({ error: 'TABLE_NOT_FOUND', message: error.message }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!page || page.length === 0) break;
      rawiList.push(...page);
      if (page.length < pageSize) break;
      rFrom += pageSize;
    }

    // Paginate hadist_brosur agar hitungan total_hadist tidak terpotong batas 1000 baris
    const allItems: any[] = [];
    let hFrom = 0;
    let countErr: any = null;
    while (true) {
      const { data: hPage, error: hErr } = await supabase
        .from('hadist_brosur')
        .select('rawi_kitab, rawi_teratas, perawi_sumber')
        .order('id', { ascending: true })
        .range(hFrom, hFrom + pageSize - 1);

      if (hErr) {
        countErr = hErr;
        break;
      }
      if (!hPage || hPage.length === 0) break;
      allItems.push(...hPage);
      if (hPage.length < pageSize) break;
      hFrom += pageSize;
    }

    const normalizedItems = allItems.map(row => ({
      rk: (row.rawi_kitab || '').trim().toLowerCase(),
      rt: (row.rawi_teratas || '').trim().toLowerCase(),
      ps: (row.perawi_sumber || '').trim().toLowerCase(),
    }));

    const rawiWithStats = rawiList.map((rw) => {
      const name = (rw.nama_rawi || '').trim().toLowerCase();
      const baseName = name.replace(/\s+(ra\.?|r\.a\.?|radhiyallahu\s+anh\w*)$/i, '').trim();
      let count = 0;
      if (!countErr && baseName) {
        for (const row of normalizedItems) {
          const { rk, rt, ps } = row;
          if (
            (rt && (rt.includes(baseName) || baseName.includes(rt))) ||
            (rk && (rk === name || rk.includes(baseName))) ||
            (ps && ps.includes(baseName))
          ) {
            count++;
          }
        }
      }
      return {
        ...rw,
        total_hadist: count,
      };
    });

    return NextResponse.json(
      {
        success: true,
        count: rawiWithStats.length,
        rawi: rawiWithStats,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('Error GET /api/hadist/rawi:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Buat profil perawi baru, sinkronisasi dari hadist_brosur, atau lengkapi biografi via DeepSeek AI
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();

    // 1. Aksi Sync: Tarik semua rawi_teratas dari hadist_brosur yang belum ada di master_rawi
    if (body.action === 'sync_from_hadist') {
      const existingNames = new Set<string>();
      let eFrom = 0;
      while (true) {
        const { data: exPage } = await supabase
          .from('master_rawi')
          .select('nama_rawi')
          .order('id', { ascending: true })
          .range(eFrom, eFrom + 999);
        if (!exPage || exPage.length === 0) break;
        exPage.forEach((r: any) => {
          if (r.nama_rawi) {
            const norm = r.nama_rawi.trim().toLowerCase().replace(/\s+(ra\.?|r\.a\.?)$/i, '').trim();
            existingNames.add(norm);
          }
        });
        if (exPage.length < 1000) break;
        eFrom += 1000;
      }

      const candidateMap = new Map<string, string>();
      let hFrom = 0;
      while (true) {
        const { data: hPage } = await supabase
          .from('hadist_brosur')
          .select('rawi_teratas')
          .not('rawi_teratas', 'is', null)
          .order('id', { ascending: true })
          .range(hFrom, hFrom + 999);
        if (!hPage || hPage.length === 0) break;
        for (const row of hPage as any[]) {
          const raw = (row.rawi_teratas || '').trim();
          if (!raw || raw.length < 3 || raw === '-' || /tidak dikenal/i.test(raw)) continue;
          const norm = raw.toLowerCase().replace(/\s+(ra\.?|r\.a\.?)$/i, '').trim();
          if (!norm || existingNames.has(norm) || candidateMap.has(norm)) continue;
          candidateMap.set(norm, raw);
        }
        if (hPage.length < 1000) break;
        hFrom += 1000;
      }

      const toInsert = Array.from(candidateMap.values()).map((nama) => ({
        nama_rawi: nama,
        nama_arab: null,
        kategori_rawi: /\b(ra\.?|r\.a\.?)\b/i.test(nama) ? 'sahabat' : 'perawi',
        thabaqat: /\b(ra\.?|r\.a\.?)\b/i.test(nama) ? 'Sahabat' : null,
        kredibilitas: /\b(ra\.?|r\.a\.?)\b/i.test(nama) ? 'Shahabi / Adil' : 'Thiqah',
        biografi: null,
      }));

      let insertedCount = 0;
      if (toInsert.length > 0) {
        for (let i = 0; i < toInsert.length; i += 200) {
          const chunk = toInsert.slice(i, i + 200);
          const { data: ins, error: insErr } = await supabase
            .from('master_rawi')
            .insert(chunk)
            .select('id');
          if (insErr) {
            return NextResponse.json({ error: insErr.message }, { status: 500 });
          }
          insertedCount += ins?.length || chunk.length;
        }
      }

      return NextResponse.json({
        success: true,
        addedCount: insertedCount,
        message:
          insertedCount > 0
            ? `Berhasil menambahkan ${insertedCount} perawi baru dari data hadits.`
            : 'Semua perawi dari data hadits sudah terdaftar di Rijalul Hadits.',
      });
    }

    // 2. Aksi Enrich AI: Lengkapi nama_arab, thabaqat, kredibilitas, & biografi dengan DeepSeek AI
    if (body.action === 'enrich_ai') {
      const { id, nama_rawi, save_to_db = true } = body;
      if (!nama_rawi || !nama_rawi.trim()) {
        return NextResponse.json({ error: 'nama_rawi wajib diisi.' }, { status: 400 });
      }

      const enriched = await enrichPerawiWithDeepSeek(supabase, nama_rawi.trim());

      if (save_to_db && id) {
        const { data: updated, error: updErr } = await supabase
          .from('master_rawi')
          .update(enriched)
          .eq('id', id)
          .select()
          .single();

        if (updErr) {
          return NextResponse.json({ error: updErr.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, rawi: updated });
      }

      return NextResponse.json({ success: true, enriched });
    }

    // 3. Aksi Normal: Tambah 1 perawi baru
    const {
      nama_rawi,
      nama_arab,
      kategori_rawi = 'sahabat',
      thabaqat,
      kredibilitas = 'Thiqah',
      biografi,
    } = body;

    if (!nama_rawi || !nama_rawi.trim()) {
      return NextResponse.json({ error: 'Nama rawi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_rawi')
      .insert([
        {
          nama_rawi: nama_rawi.trim(),
          nama_arab: nama_arab?.trim() || null,
          kategori_rawi: kategori_rawi.trim(),
          thabaqat: thabaqat?.trim() || null,
          kredibilitas: kredibilitas.trim(),
          biografi: biografi?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rawi: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Perbarui profil biografi rawi
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id, nama_rawi, nama_arab, kategori_rawi, thabaqat, kredibilitas, biografi } = body;

    if (!id || !nama_rawi) {
      return NextResponse.json({ error: 'ID dan Nama Rawi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_rawi')
      .update({
        nama_rawi: nama_rawi.trim(),
        nama_arab: nama_arab?.trim() || null,
        kategori_rawi: kategori_rawi?.trim() || 'sahabat',
        thabaqat: thabaqat?.trim() || null,
        kredibilitas: kredibilitas?.trim() || 'Thiqah',
        biografi: biografi?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rawi: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus rawi
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Rawi wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('master_rawi').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
