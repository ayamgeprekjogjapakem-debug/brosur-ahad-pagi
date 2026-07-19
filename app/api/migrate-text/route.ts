import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function GET() {
  try {
    const supabase = await createClient();

    // Ambil brosur yang teks_bersih nya masih kosong
    const { data: brosurList, error: fetchError } = await supabase
      .from('brosur')
      .select('id, konten')
      .is('teks_bersih', null)
      .limit(50); // Batching per 50 agar tidak timeout

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!brosurList || brosurList.length === 0) {
      return NextResponse.json({ message: 'Semua brosur sudah termigrasi (teks_bersih terisi)!' });
    }

    let successCount = 0;
    
    // Proses setiap brosur
    for (const brosur of brosurList) {
      if (brosur.konten) {
        const $ = cheerio.load(brosur.konten);
        const cleanText = $.text().replace(/\s+/g, ' ').trim();
        
        const { error: updateError } = await supabase
          .from('brosur')
          .update({ teks_bersih: cleanText })
          .eq('id', brosur.id);
          
        if (!updateError) {
          successCount++;
        } else {
          console.error(`Gagal update brosur ID ${brosur.id}:`, updateError.message);
        }
      }
    }

    return NextResponse.json({ 
      message: `Migrasi Batch Berhasil! ${successCount} brosur diperbarui.`,
      sisa_brosur: brosurList.length === 50 ? 'Masih ada brosur tersisa. Harap refresh / akses URL ini lagi.' : 'Semua selesai!'
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
