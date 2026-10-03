import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Bisa mencari berdasarkan 'slug' atau 'id'
  const slug = searchParams.get('id'); 
  
  // Inisialisasi Supabase Server Client
  const supabase = createClient();

  // Jika tidak ada ID/Slug, kembalikan daftar semua brosur
  if (!slug) {
    const { data, error } = await supabase
      .from('brosur')
      .select('id, judul, slug, tahun')
      .order('tahun', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, data });
  }

  // Jika ada ID/Slug, ambil detail spesifik dari tabel brosur
  const { data: detailData, error: detailError } = await (await supabase)
    .from('brosur')
    .select('*')
    .eq('slug', slug)
    .single();

  if (detailError) {
    return NextResponse.json({ success: false, error: detailError.message }, { status: 404 });
  }

  // Mengembalikan data JSON (Anggap kolom markdown Anda bernama 'konten' atau 'teks')
  return NextResponse.json({
    success: true,
    data: {
      id: detailData.id,
      title: detailData.judul,
      // Jika kolom Anda namanya bukan 'konten', silakan ubah di bawah ini
      content: detailData.konten || '# Konten Belum Tersedia', 
      tahun: detailData.tahun
    }
  });
}
