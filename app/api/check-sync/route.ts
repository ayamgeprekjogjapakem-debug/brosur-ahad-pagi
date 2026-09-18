import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const urlOrSlug = searchParams.get('url') || '';
  
  if (!urlOrSlug) {
    return NextResponse.json({ error: 'URL atau Slug tidak valid' }, { status: 400 });
  }

  let slug = urlOrSlug;
  let qParam = '';

  try {
    if (slug.startsWith('http')) {
      const urlObj = new URL(slug);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      slug = pathParts[pathParts.length - 1] || '';
      qParam = urlObj.searchParams.get('q') || '';
      
      if (slug === 'search') {
          return NextResponse.json({ 
              status: 'search_url',
              q: qParam,
              message: qParam ? `URL ini adalah halaman pencarian global untuk kata kunci: "${qParam}". Gunakan kotak Analisis Query di atas untuk mengeksekusi!` : 'URL ini adalah halaman pencarian tanpa kata kunci.'
          });
      }
    } else {
      if (slug.includes('?')) {
        const parts = slug.split('?');
        slug = parts[0].split('/').filter(Boolean).pop() || parts[0];
        const sp = new URLSearchParams(parts[1]);
        qParam = sp.get('q') || '';
      } else {
        slug = slug.split('/').filter(Boolean).pop() || slug;
      }
    }
  } catch (e) {
  }

  if (!slug) {
    return NextResponse.json({ error: 'Gagal mengekstrak slug' }, { status: 400 });
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('brosur')
    .select('id, judul, slug, folder_id, teks_bersih, created_at')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return NextResponse.json({
      status: 'not_found',
      slug,
      message: 'Brosur tidak ditemukan di database. Pastikan URL/Slug benar dan brosur sudah di-upload.'
    });
  }

  const isTeksBersihReady = !!data.teks_bersih && data.teks_bersih.length > 50;
  
  // Jika URL membawa query ?q=... maka kita sekalian cek apakah dokumen ini cocok dengan query tersebut
  let matchStatus = null;
  if (qParam && isTeksBersihReady) {
    const isExactMatch = data.teks_bersih.toLowerCase().includes(qParam.toLowerCase()) || data.judul.toLowerCase().includes(qParam.toLowerCase());
    
    // Cek FTS engine
    const { data: ftsCheck } = await supabase
        .from('brosur')
        .select('id')
        .eq('id', data.id)
        .textSearch('fts', qParam, { type: 'websearch', config: 'indonesian' })
        .maybeSingle();
        
    matchStatus = {
        query: qParam,
        is_fts_match: !!ftsCheck,
        is_exact_match: isExactMatch
    };
  }

  return NextResponse.json({
    status: isTeksBersihReady ? 'synced' : 'partial',
    slug,
    data: {
      id: data.id,
      judul: data.judul,
      teks_bersih_length: data.teks_bersih ? data.teks_bersih.length : 0,
    },
    match: matchStatus,
    message: isTeksBersihReady 
      ? 'Brosur sudah tersinkronisasi dan sepenuhnya terindeks oleh mesin pencari.'
      : 'Brosur ditemukan, namun Teks Bersih belum di-generate (atau terlalu pendek).'
  });
}
