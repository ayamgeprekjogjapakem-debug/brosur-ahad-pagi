import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Dapatkan count dari tabel utama
    const { count: countBrosur } = await supabase.from('brosur').select('*', { count: 'exact', head: true });
    const { count: countHadist } = await supabase.from('master_hadist_api').select('*', { count: 'exact', head: true });
    const { count: countFolder } = await supabase.from('folders').select('*', { count: 'exact', head: true });
    const { count: countRawi } = await supabase.from('master_rawi').select('*', { count: 'exact', head: true });

    const totalBrosur = countBrosur || 0;
    const totalHadist = countHadist || 0;
    
    // Estimasi ukuran: Brosur rata-rata 15KB per baris (teks panjang), Hadist 1.5KB, lain-lain 0.5KB
    const estBrosurBytes = totalBrosur * 15 * 1024;
    const estHadistBytes = totalHadist * 1.5 * 1024;
    const estOtherBytes = ((countFolder || 0) + (countRawi || 0)) * 512;
    
    const totalBytes = estBrosurBytes + estHadistBytes + estOtherBytes;
    
    // Kuota Supabase Free Tier = 500MB
    const limitBytes = 500 * 1024 * 1024; 
    
    return NextResponse.json({
      success: true,
      data: {
        totalRecords: totalBrosur + totalHadist + (countFolder || 0) + (countRawi || 0),
        estimatedBytesUsed: totalBytes,
        limitBytes: limitBytes,
        tables: {
          brosur: totalBrosur,
          hadist: totalHadist,
          folder: countFolder || 0,
          rawi: countRawi || 0
        },
        percentageUsed: (totalBytes / limitBytes) * 100
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
