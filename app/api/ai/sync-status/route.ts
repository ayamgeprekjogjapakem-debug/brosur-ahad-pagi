import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'brosur';

    const sourceTable = type === 'hadist_chm' ? 'hadist_chm' : 'brosur';
    const chunksTable = type === 'hadist_chm' ? 'hadist_chm_chunks' : 'brosur_chunks';
    const fkColumn = type === 'hadist_chm' ? 'hadist_id' : 'brosur_id';

    // 1. Dapatkan Total Seluruh Entri
    const { count: totalEntries, error: errTotal } = await supabase
      .from(sourceTable)
      .select('*', { count: 'exact', head: true });
      
    if (errTotal) throw errTotal;

    // 2. Dapatkan jumlah ID unik yang sudah ada vektornya
    const { data: chunks, error: errChunks } = await supabase
      .from(chunksTable)
      .select(fkColumn);
      
    if (errChunks) throw errChunks;

    const syncedIds = new Set(chunks.map(c => (c as Record<string, any>)[fkColumn]));
    const syncedCount = syncedIds.size;
    const unsyncedCount = (totalEntries || 0) - syncedCount;

    return NextResponse.json({ 
       total: totalEntries || 0,
       synced: syncedCount,
       unsynced: unsyncedCount
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
