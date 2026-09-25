import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createSlug } from '@/app/quran/utils'; // Assuming this utility exists

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const kitab = searchParams.get('kitab');
    const search = searchParams.get('search');
    
    if (!kitab) {
      return NextResponse.json({ items: [] });
    }

    let query = supabase
      .from('master_hadist_api')
      .select('*')
      .eq('kitab', kitab)
      .order('nomor', { ascending: true })
      .limit(200); // Limit to 200 for performance, ideally we'd use pagination

    if (search) {
      query = query.or(`terjemahan.ilike.%${search}%,judul_bab_terjemahan.ilike.%${search}%,teks_arab.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map to the expected format by the UI
    const mappedItems = data.map(item => ({
      id: item.id || `${item.kitab}-${item.nomor}`,
      kutipan_arab: item.teks_arab,
      terjemahan: item.terjemahan,
      rawi_kitab: item.kitab,
      perawi_sumber: `Nomor ${item.nomor}`,
      kelompok_hadist: item.judul_bab_terjemahan ? {
        nama_kelompok: item.judul_bab_terjemahan,
        warna_badge: 'emerald'
      } : null,
      brosur: null, // No brosur for master_hadist_api
    }));

    return NextResponse.json({ items: mappedItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
