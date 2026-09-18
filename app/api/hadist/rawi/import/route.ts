import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Payload tidak valid. Diharapkan array items.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Mapping and sanitizing items
    const payload = items.map((item: any) => ({
      nama_rawi: item.nama_rawi?.trim() || item.full_name?.trim() || 'Unknown',
      nama_arab: item.nama_arab?.trim() || item.kunya?.trim() || null,
      kategori_rawi: item.kategori_rawi?.trim() || 'mukharij',
      thabaqat: item.thabaqat?.trim() || item.generation_tier?.trim() || null,
      kredibilitas: item.kredibilitas?.trim() || item.jarh_tadil_status?.trim() || 'Thiqah',
      biografi: item.biografi?.trim() || (item.places_of_stay ? `Tinggal di: ${item.places_of_stay}` : null),
    }));

    // Because we might hit payload size limits with thousands of rows,
    // Supabase can handle a few thousand in one insert, but it's best to handle them.
    // However, for this simple implementation we'll try a single upsert.
    // 'onConflict: nama_rawi' to prevent duplicates.
    const { data, error } = await supabase
      .from('master_rawi')
      .upsert(payload, { onConflict: 'nama_rawi', ignoreDuplicates: true })
      .select('id');

    if (error) {
      console.error('Supabase Error on Bulk Insert:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: `${payload.length} data berhasil diproses.`,
      inserted_count: data?.length || 0 
    });
  } catch (err: any) {
    console.error('Error POST /api/hadist/rawi/import:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
