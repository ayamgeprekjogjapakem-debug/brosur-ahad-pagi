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

    // 2. Standarisasi Arabic (hapus style font inline dari MS Word)
    const updates = brosurs.map((brosur) => {
      let kontenBaru = brosur.konten;
      if (kontenBaru) {
        const $ = cheerio.load(kontenBaru, {}, false);
        
        // Cari semua elemen yang memiliki atribut style
        $('[style]').each((i, el) => {
          let style = $(el).attr('style');
          if (style) {
            // Hapus font-family, font-size, line-height, mso-bidi-font-family, dll (MS Word specific & fixed fonts)
            style = style
              .replace(/font-family\s*:[^;]+;?/gi, '')
              .replace(/font-size\s*:[^;]+;?/gi, '')
              .replace(/line-height\s*:[^;]+;?/gi, '')
              .replace(/mso-[a-z0-9-]+\s*:[^;]+;?/gi, '');
            
            style = style.trim();
            if (style === '') {
              $(el).removeAttr('style');
            } else {
              $(el).attr('style', style);
            }
          }
        });

        // Simpan HTML yang sudah bersih dari inline styles yg mengganggu
        kontenBaru = $.html();
      }

      return {
        id: brosur.id,
        konten: kontenBaru
      };
    });

    // 3. Lakukan proses update secara paralel
    const updatePromises = updates.map((update) => 
      supabase
        .from('brosur')
        .update({ konten: update.konten })
        .eq('id', update.id)
    );

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, processed: updates.length });

  } catch (err: any) {
    console.error('Error in standardize-arabic:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
