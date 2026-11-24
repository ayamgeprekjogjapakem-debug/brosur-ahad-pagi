import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

interface SahabatMeta {
  canonical: string;
  title: string;
  desc: string;
  aliases: string[];
}

const KNOWN_SAHABAT: SahabatMeta[] = [
  {
    canonical: 'Abu Hurairah',
    title: 'Abdurrahman bin Shakhr Ad-Dausi RA',
    desc: 'Sahabat yang paling banyak meriwayatkan hadist dari Rasulullah ﷺ.',
    aliases: ['abu hurairah', 'abu hurairoh', 'abdurrahman bin shakhr'],
  },
  {
    canonical: 'Aisyah binti Abu Bakar',
    title: 'Ummul Mukminin RA',
    desc: 'Istri Rasulullah ﷺ yang paling banyak meriwayatkan hadist hukum fikih dan keluarga.',
    aliases: ['aisyah', "'aisyah", '‘aisyah', 'aisyah ra', "aisyah r.a", 'ummul mukminin'],
  },
  {
    canonical: 'Abdullah bin Umar',
    title: 'Ibnu Umar bin Al-Khattab RA',
    desc: 'Sahabat yang sangat teliti dalam meneladani sunnah dan perbuatan Rasulullah ﷺ.',
    aliases: ['ibnu umar', 'abdullah bin umar', "'abdullah bin umar"],
  },
  {
    canonical: 'Anas bin Malik',
    title: 'Pelayan Rasulullah ﷺ RA',
    desc: 'Melayani Rasulullah ﷺ selama 10 tahun di Madinah sejak usia 10 tahun.',
    aliases: ['anas bin malik', 'anas'],
  },
  {
    canonical: 'Abdullah bin Abbas',
    title: "Turjumanul Qur'an RA",
    desc: "Sepupu Nabi ﷺ yang didoakan khusus agar paham agama dan tafsir Al-Qur'an.",
    aliases: ['ibnu abbas', 'abdullah bin abbas', "'abdullah bin abbas"],
  },
  {
    canonical: 'Jabir bin Abdullah',
    title: 'Jabir bin Abdullah Al-Anshari RA',
    desc: 'Sahabat Anshar yang banyak meriwayatkan hadist ibadah dan manasik haji.',
    aliases: ['jabir bin abdullah', 'jabir'],
  },
  {
    canonical: "Abu Sa'id Al-Khudri",
    title: "Sa'ad bin Malik bin Sinan RA",
    desc: 'Salah satu mufti Madinah dari kalangan sahabat yang banyak meriwayatkan hadist.',
    aliases: ["abu sa'id", 'abu said', "abu sa'id al-khudri", 'abu said al khudri'],
  },
  {
    canonical: "Abdullah bin Mas'ud",
    title: 'Ibnu Mas’ud RA',
    desc: 'Sahabat senior ahli Al-Qur’an dan fikih dari generasi awal Islam.',
    aliases: ['ibnu masud', "ibnu mas'ud", "abdullah bin mas'ud", 'abdullah bin masud'],
  },
  {
    canonical: 'Umar bin Al-Khattab',
    title: 'Amirul Mukminin RA',
    desc: 'Khalifah kedua yang ketegasan dan kebijaksanaannya banyak terekam dalam hadist.',
    aliases: ['umar bin khattab', 'umar bin al-khattab', 'umar ra'],
  },
  {
    canonical: 'Ali bin Abi Thalib',
    title: 'Amirul Mukminin RA',
    desc: 'Sepupu sekaligus menantu Rasulullah ﷺ yang dikenal keluasan ilmunya.',
    aliases: ['ali bin abi thalib', 'ali bin abi talib', "'ali bin abi thalib"],
  },
  {
    canonical: 'Abu Musa Al-Asy’ari',
    title: 'Abdullah bin Qais RA',
    desc: 'Sahabat yang dikenal keindahan bacaan Al-Qur’annya dan amanah kepemimpinannya.',
    aliases: ["abu musa al-asy'ari", 'abu musa', 'abu musa al asyari'],
  },
  {
    canonical: "Mu'adz bin Jabal",
    title: 'Imam Ulama Sahabat RA',
    desc: 'Sahabat yang paling mengetahui halal dan haram menurut persaksian Nabi ﷺ.',
    aliases: ["mu'adz bin jabal", 'muadz bin jabal', "mu'adz", 'muadz'],
  },
  {
    canonical: 'Buraidah bin Al-Hushaib',
    title: 'Buraidah Al-Aslami RA',
    desc: 'Sahabat Nabi ﷺ yang meriwayatkan hadist-hadist seputar hukum dan ibadah.',
    aliases: ['buraidah', 'buraidah bin al-hushaib'],
  },
];

function extractSahabatFromTerjemahan(terjemahan: string): string | null {
  if (!terjemahan) return null;
  const clean = terjemahan.replace(/\s+/g, ' ').trim();

  // Cari pola umum pembuka hadits bahasa Indonesia: "Dari <Nama>..."
  // Jika ada "dari <Nama1>, dari <Nama2>" ambil yang paling dekat dengan Nabi atau yang terakhir sebelum "ia berkata"
  const match = clean.match(
    /(?:^|[\d:\s.\-])Dari\s+([A-Z‘'ʻ`]?[A-Za-z‘'ʻ`\-\s]{2,35}?)(?:\s+RA|\s+r\.?a\.?|\s*,|\s+ia\s+berkata|\s+berkata|\s+bahwasanya|\s+dari\s+Nabi|\s+dari\s+Rasulullah)/i
  );

  if (match && match[1]) {
    let name = match[1]
      .replace(/^['‘’`]+/, '')
      .replace(/\s+(RA|r\.?a\.?|radhiyallahu.*)$/i, '')
      .trim();

    // Jika ada rantai "Ikrimah, dari Aisyah" di teks, cek apakah ada "dari <Sahabat>" berikutnya sebelum "berkata"
    const chainMatch = clean.match(
      /Dari\s+[^,]+,\s*dari\s+([A-Z‘'ʻ`]?[A-Za-z‘'ʻ`\-\s]{2,35}?)(?:\s+RA|\s+r\.?a\.?|\s*,|\s+ia\s+berkata|\s+berkata|\s+bahwasanya)/i
    );
    if (chainMatch && chainMatch[1]) {
      name = chainMatch[1]
        .replace(/^['‘’`]+/, '')
        .replace(/\s+(RA|r\.?a\.?|radhiyallahu.*)$/i, '')
        .trim();
    }

    if (name.length >= 3 && !/^(allah|nabi|rasulullah|ayat|surat)/i.test(name)) {
      return name;
    }
  }

  return null;
}

function normalizeSahabat(rawName: string): { key: string; meta: SahabatMeta } {
  const cleaned = rawName
    .replace(/['‘’`]/g, "'")
    .replace(/\s+(RA|r\.?a\.?)\.?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = cleaned.toLowerCase();

  for (const known of KNOWN_SAHABAT) {
    if (known.aliases.some((alias) => lower === alias || lower.includes(alias))) {
      return { key: known.canonical, meta: known };
    }
  }

  return {
    key: cleaned,
    meta: {
      canonical: cleaned,
      title: 'Perawi Hadist (Hasil Ekstraksi)',
      desc: `Perawi yang terekam dari hasil ekstraksi naskah brosur.`,
      aliases: [lower],
    },
  };
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data: hadistRows, error } = await supabase
      .from('hadist_brosur')
      .select('id, brosur_id, rawi_teratas, rawi_kitab, perawi_sumber, kutipan_arab, terjemahan, status_hadist, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil judul & tahun brosur terkait untuk tampilan detail
    const brosurIds = Array.from(new Set((hadistRows || []).map((r: any) => r.brosur_id).filter(Boolean)));
    const brosurMap = new Map<string, any>();
    if (brosurIds.length > 0) {
      const { data: brosurs } = await supabase
        .from('brosur')
        .select('id, judul, tahun, slug')
        .in('id', brosurIds);
      (brosurs || []).forEach((b: any) => brosurMap.set(b.id, b));
    }

    const grouped = new Map<
      string,
      {
        id: string;
        nama: string;
        title: string;
        desc: string;
        riwayat: number;
        items: any[];
      }
    >();

    let totalHadist = 0;

    for (const row of hadistRows || []) {
      // Abaikan ayat Al-Qur'an dari daftar Sahabat Nabi
      const rkLower = (row.rawi_kitab || '').toLowerCase();
      const psLower = (row.perawi_sumber || '').toLowerCase();
      if (rkLower.includes("qur'an") || rkLower.includes('quran') || psLower.startsWith('qs')) {
        continue;
      }

      totalHadist++;

      const rawFromCol = (row.rawi_teratas || '').trim();
      const rawCandidate =
        rawFromCol && rawFromCol.length >= 3 && !rawFromCol.toLowerCase().includes('kakek')
          ? rawFromCol
          : extractSahabatFromTerjemahan(row.terjemahan || '') || rawFromCol;

      if (!rawCandidate) continue;

      const { key, meta } = normalizeSahabat(rawCandidate);
      if (!key) continue;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          nama: meta.canonical,
          title: meta.title,
          desc: meta.desc,
          riwayat: 0,
          items: [],
        });
      }

      const entry = grouped.get(key)!;
      entry.riwayat++;
      entry.items.push({
        id: row.id,
        brosur_id: row.brosur_id,
        brosur: brosurMap.get(row.brosur_id) || null,
        rawi_kitab: row.rawi_kitab,
        perawi_sumber: row.perawi_sumber,
        rawi_teratas: row.rawi_teratas || key,
        kutipan_arab: row.kutipan_arab,
        terjemahan: row.terjemahan,
        status_hadist: row.status_hadist,
      });
    }

    const sahabatList = Array.from(grouped.values()).sort((a, b) => b.riwayat - a.riwayat);

    return NextResponse.json({
      success: true,
      total_hadist_extracted: totalHadist,
      total_sahabat: sahabatList.length,
      sahabat: sahabatList,
    });
  } catch (err: any) {
    console.error('Error GET /api/hadist/sahabat:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
