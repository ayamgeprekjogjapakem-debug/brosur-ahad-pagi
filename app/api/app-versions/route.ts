import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export interface VersionInfo {
  version: string;
  codename: string;
  historical_significance: string;
  description: string;
  release_date?: string;
  is_latest?: boolean;
}

export const APP_VERSIONS: Record<string, VersionInfo> = {
  '1.0.0': {
    version: '1.0.0',
    codename: 'Makkah',
    historical_significance: 'Tempat turunnya wahyu pertama dan titik awal perjuangan dakwah.',
    description: 'Pondasi awal ekosistem Pustaka MTA dengan integrasi data dasar, AI Pustaka, dan pembaca brosur.',
    release_date: 'September 2026',
    is_latest: false
  },
  '2.0.0': {
    version: '2.0.0',
    codename: 'Habasyah',
    historical_significance: 'Tempat hijrah pertama kaum muslimin yang melambangkan suaka, penyelamatan diri, dan ketahanan mandiri.',
    description: 'Rilis ketahanan offline penuh (Hive), pencarian dalil & hadits lokal super cepat, serta arsitektur UI v2.',
    release_date: 'Oktober 2026',
    is_latest: true
  },
  '3.0.0': {
    version: '3.0.0',
    codename: 'Madinah',
    historical_significance: 'Pusat peradaban, kemapanan kedaulatan, dan keteraturan tatanan syariat.',
    description: 'Fase kematangan ekosistem terpadu, sinkronisasi multi-perangkat, dan kolaborasi penuh.',
    release_date: 'Mendatang',
    is_latest: false
  }
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedVersion = searchParams.get('v') || searchParams.get('version');

    const supabase = await createClient();

    // Ambil whitelist versi aktif dari Supabase jika ada
    const { data: allowedVersionsData } = await supabase
      .from('allowed_versions')
      .select('version, is_active')
      .eq('is_active', true);

    const activeWhitelist = allowedVersionsData ? allowedVersionsData.map((a: any) => a.version) : [];

    // Jika user minta spesifik versi (?v=2.0.0)
    if (requestedVersion) {
      const info = APP_VERSIONS[requestedVersion] || {
        version: requestedVersion,
        codename: 'Edisi Khusus',
        historical_significance: 'Pembaruan berkala aplikasi Pustaka MTA.',
        description: 'Pembaruan aplikasi Pustaka MTA.',
        is_latest: false
      };

      return NextResponse.json({
        ...info,
        is_allowed: activeWhitelist.length === 0 || activeWhitelist.includes(requestedVersion)
      });
    }

    // Jika tanpa parameter, kembalikan daftar semua versi & versi terbaru saat ini
    const versionsList = Object.values(APP_VERSIONS).map((item) => ({
      ...item,
      is_allowed: activeWhitelist.length === 0 || activeWhitelist.includes(item.version)
    }));

    const latest = versionsList.find(v => v.is_latest) || versionsList[versionsList.length - 1];

    return NextResponse.json({
      latest_version: latest,
      versions: versionsList,
      total_versions: versionsList.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      }
    });

  } catch (error: any) {
    console.error('Error fetching app versions:', error);
    return NextResponse.json({
      error: 'Gagal mengambil data versi aplikasi',
      details: error.message
    }, { status: 500 });
  }
}
