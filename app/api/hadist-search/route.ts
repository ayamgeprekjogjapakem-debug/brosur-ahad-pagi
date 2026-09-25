import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  try {
    const supabase = await createClient();

    // Lakukan pencarian menggunakan metode ilike pada kolom terjemahan, judul_bab_terjemahan, atau teks_arab
    // Karena Supabase membatasi jumlah hasil default, kita limit di 50 hasil agar cepat
    const { data, error } = await supabase
      .from('master_hadist_api')
      .select('*')
      .or(`terjemahan.ilike.%${q}%,judul_bab_terjemahan.ilike.%${q}%,teks_arab.ilike.%${q}%`)
      .limit(50);

    if (error) {
      console.error('Error fetching hadist search:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      results: data || [],
      meta: {
        query: q,
        total: data?.length || 0,
      }
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
