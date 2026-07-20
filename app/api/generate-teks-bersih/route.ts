import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function POST(request: NextRequest) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Ambil data HTML `konten` untuk ID yang direquest
    const { data: brosurs, error: fetchError } = await supabase
      .from('brosur')
      .select('id, konten')
      .in('id', ids);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // 2. Ekstrak teks bersih
    const updates = brosurs.map((brosur) => {
      const $ = cheerio.load(brosur.konten);
      const plainText = $.text().replace(/\s+/g, ' ').trim();
      return {
        id: brosur.id,
        teks_bersih: plainText
      };
    });

    // 3. Lakukan proses update secara paralel menggunakan Promise.all (Supabase SDK belum native bulk update via RPC tanpa custom function)
    const updatePromises = updates.map((update) => 
      supabase
        .from('brosur')
        .update({ teks_bersih: update.teks_bersih })
        .eq('id', update.id)
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, processed: updates.length });

  } catch (err: any) {
    console.error('Error in generate-teks-bersih:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
