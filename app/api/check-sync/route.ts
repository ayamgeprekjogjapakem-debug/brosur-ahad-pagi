import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const urlOrSlug = searchParams.get('url') || '';
  
  if (!urlOrSlug) {
    return NextResponse.json({ error: 'URL atau Slug tidak valid' }, { status: 400 });
  }

  // Extract slug from URL if it's a full URL
  let slug = urlOrSlug;
  try {
    if (slug.startsWith('http')) {
      const urlObj = new URL(slug);
      // Asumsi format: http://localhost:3000/[slug]
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      slug = pathParts[pathParts.length - 1] || '';
      
      // Jika ternyata URL pencarian, misal /search?q=...
      if (slug === 'search') {
          return NextResponse.json({ 
              status: 'invalid_url',
              message: 'URL ini adalah halaman pencarian, bukan halaman brosur spesifik.'
          });
      }
    } else {
      // Jika berupa string url lokal, misal "/BAP-..."
      slug = slug.split('/').filter(Boolean).pop() || slug;
    }
    
    // Hilangkan query params jika ada
    slug = slug.split('?')[0];
  } catch (e) {
    // Ignore URL parse error
  }

  if (!slug) {
    return NextResponse.json({ error: 'Gagal mengekstrak slug' }, { status: 400 });
  }

  const supabase = await createClient();

  // Cek database untuk slug ini
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

  // Cek kelengkapan untuk FTS (Full Text Search)
  const isTeksBersihReady = !!data.teks_bersih && data.teks_bersih.length > 50;
  const isIndexed = isTeksBersihReady;

  return NextResponse.json({
    status: isIndexed ? 'synced' : 'partial',
    slug,
    data: {
      id: data.id,
      judul: data.judul,
      folder_id: data.folder_id,
      teks_bersih_length: data.teks_bersih ? data.teks_bersih.length : 0,
      created_at: data.created_at
    },
    message: isIndexed 
      ? 'Brosur sudah tersinkronisasi dan sepenuhnya terindeks oleh mesin pencari.'
      : 'Brosur ditemukan, namun Teks Bersih belum di-generate (atau terlalu pendek). Brosur mungkin sulit ditemukan di pencarian.'
  });
}
