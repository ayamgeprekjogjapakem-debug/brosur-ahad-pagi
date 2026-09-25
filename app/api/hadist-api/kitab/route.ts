import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // In a real app we might use a Postgres View or RPC to get grouped counts.
    // For now, let's just get all rows and group them, or use a distinct query.
    // Supabase JS doesn't support GROUP BY directly easily without RPC, 
    // so let's call an RPC if it exists, otherwise just get distinct.
    
    // As a workaround, we will just fetch all distinct kitabs and count them
    const { data, error } = await supabase.rpc('get_kitab_stats');
    
    if (error) {
      // Fallback if RPC doesn't exist: fetch all and group in JS (not ideal for huge data)
      const { data: allData, error: allErr } = await supabase.from('master_hadist_api').select('kitab');
      if (allErr) throw allErr;
      
      const counts: Record<string, number> = {};
      allData.forEach((row: any) => {
        counts[row.kitab] = (counts[row.kitab] || 0) + 1;
      });
      
      const result = Object.entries(counts).map(([nama, total]) => ({
        id: nama,
        nama_rawi: nama, // mapping for compatibility
        total_hadist: total
      }));
      
      return NextResponse.json({ rawi: result });
    }

    return NextResponse.json({ rawi: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
