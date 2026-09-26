import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Ambil 5 pencarian terpopuler (yang paling sering dicari)
    const { data, error } = await supabase
      .from('pencarian_populer')
      .select('keyword, search_count')
      .order('search_count', { ascending: false })
      .order('last_searched_at', { ascending: false })
      .limit(5);

    if (error) {
      console.warn("Tabel pencarian_populer belum siap:", error.message);
      return NextResponse.json({ topics: [] });
    }

    // Format hasil ke array object
    const topics = data.map(item => {
      const name = item.keyword
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return {
        name,
        count: item.search_count
      };
    });

    return NextResponse.json({ topics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
