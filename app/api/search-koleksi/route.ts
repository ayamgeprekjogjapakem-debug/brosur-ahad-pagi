import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import * as cheerio from 'cheerio';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  const folderId = searchParams.get('folder_id');

  if (!folderId || !q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  // Normalisasi query (hapus tanda baca agar aman)
  // Catatan: Jangan hapus karakter non-latin sepenuhnya agar bahasa Arab tetap bisa dicari.
  // Gunakan \s+ untuk spasi, dan biarkan sisanya.
  const normalizedQ = q.replace(/\s+/g, ' ').trim();
  const qWords = normalizedQ.split(' ').filter(Boolean);

  let queryBuilder = supabase
    .from('brosur')
    .select('judul, slug, tahun, konten')
    .order('tahun', { ascending: false });

  // Optimasi: Jika ada kata, gunakan kata pertama untuk memfilter awal di database agar lebih ringan
  if (qWords.length > 0) {
    queryBuilder = queryBuilder.ilike('konten', `%${qWords[0]}%`);
  }

  // Ambil data
  const { data, error } = await queryBuilder;

  if (error || !data) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }

  const results = [];

  for (const item of data) {
    let matched = false;
    let snippet = '';
    
    // Cek kecocokan di judul
    if (item.judul.toLowerCase().includes(q)) {
      matched = true;
    }
    
    let plainText = '';
    let plainTextLower = '';

    // Cek kecocokan di konten
    if (item.konten) {
      const $ = cheerio.load(item.konten);
      plainText = $.text().replace(/\s+/g, ' ');
      plainTextLower = plainText.toLowerCase().replace(/\s+/g, ' ');
      
      // Jika frasa panjang cocok sama persis (setelah dihilangkan tag HTML)
      if (normalizedQ && plainTextLower.includes(normalizedQ)) {
        matched = true;
      } 
      // Atau jika setiap kata dalam query ada di dalam teks
      else if (qWords.length > 0 && qWords.every(w => plainTextLower.includes(w))) {
        matched = true;
      }
    }
    
    if (matched) {
      // Buat snippet jika ada teks
      if (plainText) {
        // Cari posisi kata pertama untuk snippet pada teks asli (belum dinormalisasi)
        const textForSnippetLower = plainText.toLowerCase();
        let matchIdx = textForSnippetLower.indexOf(q);
        
        // Jika pencarian panjang tidak persis sama karena tanda baca, cari kata pertama saja
        if (matchIdx === -1 && qWords.length > 0) {
           matchIdx = textForSnippetLower.indexOf(qWords[0]);
        }
        
        if (matchIdx !== -1) {
          const startIdx = Math.max(0, matchIdx - 60);
          const endIdx = Math.min(plainText.length, matchIdx + q.length + 100);
          snippet = (startIdx > 0 ? '... ' : '') + plainText.substring(startIdx, endIdx) + (endIdx < plainText.length ? ' ...' : '');
        } else {
          // Fallback snippet
          snippet = plainText.substring(0, 150) + '...';
        }
      }

      results.push({
        judul: item.judul,
        slug: item.slug,
        tahun: item.tahun,
        snippet: snippet || undefined
      });
    }
  }

  return NextResponse.json({ results });
}
