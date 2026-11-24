import { NextResponse, NextRequest } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

const DEFAULT_THEMES = [
  { nama_kelompok: 'Aqidah & Tauhid', deskripsi: 'Dalil tentang keimanan, tauhid, syirik, rukun iman, dan sifat Allah.', warna_badge: 'purple' },
  { nama_kelompok: 'Thaharah & Wudhu', deskripsi: 'Dalil tentang bersuci, wudhu, mandi wajib, tayammum, dan najis.', warna_badge: 'blue' },
  { nama_kelompok: 'Shalat', deskripsi: 'Dalil tentang kewajiban, tata cara, syarat, rukun, dan keutamaan shalat.', warna_badge: 'emerald' },
  { nama_kelompok: 'Puasa & Ramadhan', deskripsi: 'Dalil tentang puasa Ramadhan, puasa sunnah, sahur, berbuka, dan Lailatul Qadar.', warna_badge: 'amber' },
  { nama_kelompok: 'Zakat, Infaq & Sedekah', deskripsi: 'Dalil tentang zakat fitrah, zakat mal, infaq, dan keutamaan bersedekah.', warna_badge: 'teal' },
  { nama_kelompok: 'Haji & Umrah', deskripsi: 'Dalil tentang manasik haji, umrah, kurban, dan keutamaan tanah haram.', warna_badge: 'indigo' },
  { nama_kelompok: 'Akhlak & Adab', deskripsi: 'Dalil tentang akhlak mulia, birrul walidain, silaturahmi, jujur, dan sabar.', warna_badge: 'rose' },
  { nama_kelompok: 'Muamalah & Ekonomi', deskripsi: 'Dalil tentang jual beli, riba, hutang piutang, amanah, dan harta halal.', warna_badge: 'amber' },
  { nama_kelompok: 'Keluarga & Pernikahan', deskripsi: 'Dalil tentang nikah, hak suami istri, mendidik anak, dan waris.', warna_badge: 'purple' },
  { nama_kelompok: 'Ilmu & Dakwah', deskripsi: 'Dalil tentang menuntut ilmu, membaca Al-Qur\'an, dan amar ma\'ruf nahi munkar.', warna_badge: 'blue' },
  { nama_kelompok: 'Doa & Dzikir', deskripsi: 'Dalil tentang dzikir pagi petang, istighfar, shalawat, dan adab berdoa.', warna_badge: 'emerald' },
  { nama_kelompok: 'Hari Akhir & Surga-Neraka', deskripsi: 'Dalil tentang kematian, alam kubur, hari kiamat, surga, dan neraka.', warna_badge: 'rose' },
];

const THEME_KEYWORDS: Record<string, string[]> = {
  'aqidah': ['tauhid', 'syirik', 'iman', 'kafir', 'munafik', 'takdir', 'qadar', 'malaikat', 'rasul', 'aqidah', 'akidah', 'tawakal'],
  'thaharah': ['thaharah', 'taharah', 'wudhu', 'wudlu', 'mandi', 'junub', 'tayammum', 'tayamum', 'najis', 'haid', 'istinja', 'bersuci', 'siwak'],
  'shalat': ['shalat', 'sholat', 'salat', 'sujud', 'ruku', 'imam', 'makmum', 'jamaah', 'jumat', 'masjid', 'adzan', 'azan', 'iqamah', 'qiblat', 'kiblat', 'tahajud', 'witir', 'dhuha', 'tarawih'],
  'puasa': ['puasa', 'shaum', 'ramadhan', 'ramadan', 'sahur', 'berbuka', 'imsak', 'itikaf', 'lailatul qadar', 'syawal', 'arafah', 'asyura'],
  'zakat': ['zakat', 'infaq', 'infak', 'sedekah', 'shadaqah', 'sodaqoh', 'fakir', 'miskin', 'harta', 'dermawan'],
  'haji': ['haji', 'umrah', 'umroh', 'kabah', 'ka\'bah', 'ihram', 'tawaf', 'thawaf', 'sai', 'wukuf', 'qurban', 'kurban', 'udhiyah', 'makkah', 'mekah'],
  'akhlak': ['akhlak', 'adab', 'sabar', 'syukur', 'jujur', 'dusta', 'ghibah', 'fitnah', 'sombong', 'hasad', 'dengki', 'orang tua', 'walidain', 'silaturahmi', 'tetangga', 'kasih sayang', 'marah', 'malu'],
  'muamalah': ['jual beli', 'riba', 'hutang', 'utang', 'pinjam', 'gadai', 'dagang', 'timbangan', 'suap', 'korupsi', 'mencuri', 'halal', 'haram', 'makanan', 'minuman', 'khamr'],
  'keluarga': ['nikah', 'menikah', 'suami', 'istri', 'talak', 'cerai', 'nafkah', 'anak', 'waris', 'faraidh', 'mahram', 'aurat', 'hijab', 'jilbab'],
  'ilmu': ['ilmu', 'ulama', 'belajar', 'mengajar', 'dakwah', 'amar ma\'ruf', 'nahi munkar', 'al-qur\'an', 'alquran', 'tilawah', 'hafal', 'majlis'],
  'doa': ['doa', 'berdoa', 'dzikir', 'zikir', 'tasbih', 'tahmid', 'takbir', 'istighfar', 'taubat', 'tobat', 'shalawat', 'sholawat', 'wirid'],
  'hari akhir': ['kiamat', 'kubur', 'mati', 'kematian', 'jenazah', 'surga', 'neraka', 'hisab', 'syafaat', 'akhirat', 'dajjal', 'mahsyar'],
};

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Ambil semua kelompok hadist
    const { data: kelompokList, error } = await supabase
      .from('kelompok_hadist')
      .select('*')
      .order('nama_kelompok', { ascending: true });

    if (error) {
      const isMissingTable =
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache');

      if (isMissingTable) {
        return NextResponse.json(
          {
            error: 'TABLE_NOT_FOUND',
            message: 'Tabel kelompok_hadist belum dibuat di database Supabase.',
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Paginate seluruh hadist_brosur agar statistik tidak terpotong batas 1.000 baris
    const statsMap: Record<string, { totalHadist: number; uniqueBrosurs: Set<string> }> = {};
    const globalUniqueBrosurs = new Set<string>();
    let totalHadistCount = 0;
    let categorizedCount = 0;
    let uncategorizedCount = 0;

    let from = 0;
    const pageSize = 1000;
    while (true) {
      const { data: page, error: hErr } = await supabase
        .from('hadist_brosur')
        .select('id, kelompok_id, brosur_id')
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);

      if (hErr || !page || page.length === 0) break;

      for (const item of page as any[]) {
        totalHadistCount++;
        if (item.brosur_id) globalUniqueBrosurs.add(item.brosur_id);

        if (item.kelompok_id) {
          categorizedCount++;
          if (!statsMap[item.kelompok_id]) {
            statsMap[item.kelompok_id] = { totalHadist: 0, uniqueBrosurs: new Set<string>() };
          }
          statsMap[item.kelompok_id].totalHadist++;
          if (item.brosur_id) {
            statsMap[item.kelompok_id].uniqueBrosurs.add(item.brosur_id);
          }
        } else {
          uncategorizedCount++;
        }
      }

      if (page.length < pageSize) break;
      from += pageSize;
    }

    const enrichedKelompok = (kelompokList || []).map((k: any) => {
      const stat = statsMap[k.id] || { totalHadist: 0, uniqueBrosurs: new Set<string>() };
      return {
        ...k,
        stats: {
          totalHadist: stat.totalHadist,
          totalBrosur: stat.uniqueBrosurs.size,
        },
      };
    });

    return NextResponse.json(
      {
        kelompok: enrichedKelompok,
        globalStats: {
          totalKelompok: enrichedKelompok.length,
          totalHadist: totalHadistCount,
          categorizedCount,
          uncategorizedCount,
          totalBrosur: globalUniqueBrosurs.size,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    console.error('Error GET /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // 1. Seed tema standar Islami (lewati yang sudah ada)
    if (body.action === 'seed_defaults') {
      const { data: existing } = await supabase.from('kelompok_hadist').select('nama_kelompok');
      const existingNames = new Set(
        (existing || []).map((r: any) => (r.nama_kelompok || '').trim().toLowerCase())
      );

      const toInsert = DEFAULT_THEMES.filter(
        t => !existingNames.has(t.nama_kelompok.toLowerCase())
      );

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('kelompok_hadist').insert(toInsert);
        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        addedCount: toInsert.length,
        message:
          toInsert.length > 0
            ? `Berhasil menambahkan ${toInsert.length} tema standar.`
            : 'Semua tema standar sudah tersedia.',
      });
    }

    // 2. Klasifikasi otomatis hadits yang belum punya kelompok_id berdasarkan kata kunci tema & judul brosur
    if (body.action === 'auto_classify') {
      const { data: themes, error: tErr } = await supabase.from('kelompok_hadist').select('id, nama_kelompok');
      if (tErr || !themes || themes.length === 0) {
        return NextResponse.json(
          { error: 'Belum ada tema di database. Klik "Seed Tema Standar" atau buat tema terlebih dahulu.' },
          { status: 400 }
        );
      }

      // Bangun daftar keyword untuk setiap tema
      const themeMatchers = themes.map((t: any) => {
        const lowName = (t.nama_kelompok || '').toLowerCase();
        const words = lowName
          .split(/[^a-z0-9']+/)
          .filter((w: string) => w.length >= 3 && !['dan', 'atau', 'yang', 'untuk', 'dalam'].includes(w));

        const extra: string[] = [];
        for (const [k, kws] of Object.entries(THEME_KEYWORDS)) {
          if (lowName.includes(k)) extra.push(...kws);
        }

        return {
          id: t.id,
          keywords: Array.from(new Set([...words, ...extra])),
        };
      });

      // Ambil judul brosur untuk membantu pencocokan tema
      const brosurTitleMap = new Map<string, string>();
      let bFrom = 0;
      while (true) {
        const { data: bPage } = await supabase
          .from('brosur')
          .select('id, judul')
          .order('id', { ascending: true })
          .range(bFrom, bFrom + 999);
        if (!bPage || bPage.length === 0) break;
        bPage.forEach((b: any) => brosurTitleMap.set(b.id, (b.judul || '').toLowerCase()));
        if (bPage.length < 1000) break;
        bFrom += 1000;
      }

      // Ambil semua hadist_brosur yang belum dikelompokkan
      const uncategorized: any[] = [];
      let hFrom = 0;
      while (true) {
        const { data: hPage } = await supabase
          .from('hadist_brosur')
          .select('id, brosur_id, terjemahan, catatan')
          .is('kelompok_id', null)
          .order('id', { ascending: true })
          .range(hFrom, hFrom + 999);
        if (!hPage || hPage.length === 0) break;
        uncategorized.push(...hPage);
        if (hPage.length < 1000) break;
        hFrom += 1000;
      }

      // Kelompokkan ID hadits per kelompok_id target
      const updatesByTheme = new Map<string, string[]>();
      let assignedCount = 0;

      for (const item of uncategorized) {
        const brosurTitle = brosurTitleMap.get(item.brosur_id) || '';
        const text = `${brosurTitle} ${(item.catatan || '').toLowerCase()} ${(item.terjemahan || '').toLowerCase()}`;

        let bestThemeId: string | null = null;
        let bestScore = 0;

        for (const matcher of themeMatchers) {
          let score = 0;
          for (const kw of matcher.keywords) {
            if (brosurTitle.includes(kw)) score += 3;
            else if (text.includes(kw)) score += 1;
          }
          if (score > bestScore) {
            bestScore = score;
            bestThemeId = matcher.id;
          }
        }

        if (bestThemeId && bestScore >= 1) {
          const list = updatesByTheme.get(bestThemeId) || [];
          list.push(item.id);
          updatesByTheme.set(bestThemeId, list);
          assignedCount++;
        }
      }

      // Eksekusi bulk update per tema dalam chunk 200 ID
      for (const [kelompokId, ids] of updatesByTheme.entries()) {
        for (let i = 0; i < ids.length; i += 200) {
          const chunk = ids.slice(i, i + 200);
          await supabase
            .from('hadist_brosur')
            .update({ kelompok_id: kelompokId })
            .in('id', chunk);
        }
      }

      return NextResponse.json({
        success: true,
        assignedCount,
        totalScanned: uncategorized.length,
        remainingUncategorized: uncategorized.length - assignedCount,
        message: `Berhasil mengelompokkan ${assignedCount} dari ${uncategorized.length} dalil secara otomatis.`,
      });
    }

    // 3. Buat tema baru
    const { nama_kelompok, deskripsi, warna_badge } = body;

    if (!nama_kelompok || !nama_kelompok.trim()) {
      return NextResponse.json({ error: 'Nama kelompok wajib diisi.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('kelompok_hadist')
      .insert({
        nama_kelompok: nama_kelompok.trim(),
        deskripsi: deskripsi?.trim() || null,
        warna_badge: warna_badge || 'emerald',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, kelompok: data });
  } catch (err: any) {
    console.error('Error POST /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nama_kelompok, deskripsi, warna_badge } = body;

    if (!id || !nama_kelompok || !nama_kelompok.trim()) {
      return NextResponse.json({ error: 'ID dan Nama kelompok wajib diisi.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('kelompok_hadist')
      .update({
        nama_kelompok: nama_kelompok.trim(),
        deskripsi: deskripsi?.trim() || null,
        warna_badge: warna_badge || 'emerald',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, kelompok: data });
  } catch (err: any) {
    console.error('Error PUT /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kelompok wajib diberikan.' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('kelompok_hadist')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Kelompok berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
