import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Ambil semua folder
  const { data: folders, error: folderError } = await supabase
    .from('folders_hadist')
    .select('*')
    .order('created_at', { ascending: false });

  if (folderError || !folders) {
    return NextResponse.json({ error: folderError?.message || 'Error fetching folders' }, { status: 500 });
  }

  // Ambil ID, folder_id, dan status teks_bersih untuk menghitung statistik
  // Kita tidak perlu mengambil isinya, cukup gunakan `teks_bersih` dengan cara mengecek panjangnya (mengurangi bandwidth)
  // Tapi PostgREST punya keterbatasan, jadi kita cukup ngecek dengan NOT IS NULL
  
  // Karena keterbatasan PostgREST untuk aggregate berdasar kondisi, kita ambil id dan folder_id saja
  // Lalu kita buat 2 query terpisah (satu semua, satu yg punya teks_bersih) jika data besar,
  // atau ambil semua row id, folder_id dan ngecek teks_bersih null atau ngga.
  // Cara paling efisien di PostgREST tanpa RPC:
  const { data: allBrosurs } = await supabase
    .from('hadist_chm')
    .select('id, folder_id');

  const { data: cleanBrosurs } = await supabase
    .from('hadist_chm')
    .select('id, folder_id')
    .not('teks_bersih', 'is', null);

  const statsMap: Record<string, { total: number, clean: number }> = {};
  
  if (allBrosurs) {
    for (const b of allBrosurs) {
      if (b.folder_id) {
        if (!statsMap[b.folder_id]) statsMap[b.folder_id] = { total: 0, clean: 0 };
        statsMap[b.folder_id].total++;
      }
    }
  }

  if (cleanBrosurs) {
    for (const b of cleanBrosurs) {
      if (b.folder_id) {
        if (!statsMap[b.folder_id]) statsMap[b.folder_id] = { total: 0, clean: 0 };
        statsMap[b.folder_id].clean++;
      }
    }
  }

  const enrichedFolders = folders.map(f => ({
    ...f,
    stats: statsMap[f.id] || { total: 0, clean: 0 }
  }));

  return NextResponse.json({ folders: enrichedFolders });
}
