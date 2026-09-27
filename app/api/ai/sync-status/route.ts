import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // 1. Dapatkan Total Seluruh Brosur
    const { count: totalBrosurs, error: errTotal } = await supabase
      .from('brosur')
      .select('*', { count: 'exact', head: true });
      
    if (errTotal) throw errTotal;

    // 2. Dapatkan jumlah ID brosur unik yang sudah ada vektornya di brosur_chunks
    const { data: chunks, error: errChunks } = await supabase
      .from('brosur_chunks')
      .select('brosur_id');
      
    if (errChunks) throw errChunks;

    const syncedIds = new Set(chunks.map(c => c.brosur_id));
    const syncedCount = syncedIds.size;
    const unsyncedCount = (totalBrosurs || 0) - syncedCount;

    return NextResponse.json({ 
       total: totalBrosurs || 0,
       synced: syncedCount,
       unsynced: unsyncedCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
