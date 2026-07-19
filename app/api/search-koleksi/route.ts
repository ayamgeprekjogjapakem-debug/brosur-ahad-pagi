import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  const folderId = searchParams.get('folder_id');

  if (!folderId || !q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  const normalizedQ = q.replace(/\s+/g, ' ').trim();
  const qWords = normalizedQ.split(' ').filter(Boolean);

  let queryBuilder = supabase
    .from('brosur')
    .select('judul, slug, tahun, teks_bersih, konten')
    .order('tahun', { ascending: false });

  // Optimasi: Gunakan kata pertama untuk filter kasar di DB (cek di judul atau teks_bersih)
  if (qWords.length > 0) {
    queryBuilder = queryBuilder.or(`judul.ilike.%${qWords[0]}%,teks_bersih.ilike.%${qWords[0]}%,konten.ilike.%${qWords[0]}%`);
  }

  const { data, error } = await queryBuilder;

  if (error || !data) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [] });
  }

  const results = [];

  for (const item of data) {
    let matched = false;
    let snippet = '';
    
    if (item.judul.toLowerCase().includes(q)) {
      matched = true;
    }
    
    // Gunakan teks_bersih jika sudah dimigrasi, jika belum fallback ke cheerio (dinamis import agar tidak selalu di-load)
    let plainText = item.teks_bersih || '';
    if (!plainText && item.konten) {
       const cheerio = await import('cheerio');
       const $ = cheerio.load(item.konten);
       plainText = $.text().replace(/\s+/g, ' ').trim();
    }
    
    let plainTextLower = plainText.toLowerCase();

    if (plainText) {
      if (normalizedQ && plainTextLower.includes(normalizedQ)) {
        matched = true;
      } else if (qWords.length > 0 && qWords.every(w => plainTextLower.includes(w))) {
        matched = true;
      }
    }
    
    if (matched) {
      if (plainText) {
        let matchIdx = plainTextLower.indexOf(q);
        if (matchIdx === -1 && qWords.length > 0) {
           matchIdx = plainTextLower.indexOf(qWords[0]);
        }
        
        if (matchIdx !== -1) {
          const startIdx = Math.max(0, matchIdx - 60);
          const endIdx = Math.min(plainText.length, matchIdx + q.length + 100);
          snippet = (startIdx > 0 ? '... ' : '') + plainText.substring(startIdx, endIdx) + (endIdx < plainText.length ? ' ...' : '');
        } else {
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
