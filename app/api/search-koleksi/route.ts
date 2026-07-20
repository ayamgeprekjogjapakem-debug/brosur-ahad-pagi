import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    // Remove Arabic diacritics (Harakat)
    .replace(/[\u0617-\u061A\u064B-\u0652]/g, '')
    // Normalize Alif variations
    .replace(/[أإآ]/g, 'ا')
    // Normalize Ta Marbuta to Ha
    .replace(/ة/g, 'ه')
    // Normalize Ya to Alif Maksura (optional, depends on text, let's keep it safe)
    .replace(/ي/g, 'ى');
}

function normalizePunctuation(text: string): string {
  if (!text) return '';
  // Replace all non-alphanumeric (except Arabic letters) with spaces, keeping numbers
  return text.replace(/[^\w\s\u0600-\u06FF0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get('q')?.toLowerCase() || '';
  const folderId = searchParams.get('folder_id');

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await createClient();

  const normalizedQ = q.replace(/\s+/g, ' ').trim();
  // Pisahkan dengan spasi ATAU tanda baca
  const qWords = normalizePunctuation(q).split(' ').filter(w => w.length > 1);

  let queryBuilder = supabase
    .from('brosur')
    .select('judul, slug, tahun, teks_bersih, konten')
    .order('tahun', { ascending: false });
    
  if (folderId) {
    queryBuilder = queryBuilder.eq('folder_id', folderId);
  }

  // Optimasi: Jika kata kunci panjang, ambil 3 kata terpanjang untuk filter DB agar lebih longgar (TIDAK STRICT AND untuk SEMUA kata)
  if (qWords.length > 0) {
    // Urutkan kata dari yang terpanjang ke terpendek
    const sortedWords = [...qWords].sort((a, b) => b.length - a.length);
    // Ambil maksimal 3 kata terpanjang
    const topWords = sortedWords.slice(0, Math.min(3, sortedWords.length));
    
    topWords.forEach(word => {
      // Hilangkan harakat untuk DB search (jika DB belum disiapkan, ini mungkin tidak match jika DB ada harakat)
      // Tapi kita coba tetap masukkan karena lebih baik daripada query semua kata.
      queryBuilder = queryBuilder.or(`judul.ilike.%${word}%,teks_bersih.ilike.%${word}%,konten.ilike.%${word}%`);
    });
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
    
    const plainTextLower = plainText.toLowerCase();
    
    // Normalisasi untuk JS matching
    const normPlainText = normalizeArabic(normalizePunctuation(plainTextLower));
    const normQuery = normalizeArabic(normalizePunctuation(q.toLowerCase()));
    const normQWords = normQuery.split(' ').filter(w => w.length > 1);

    if (plainText) {
      if (normQuery && normPlainText.includes(normQuery)) {
        matched = true;
      } else if (normQWords.length > 0) {
        // Fallback: Kalimat panjang sering salah ketik/harakat, jika 70% kata cocok, anggap match!
        let matchCount = 0;
        normQWords.forEach(w => {
          if (normPlainText.includes(w)) matchCount++;
        });
        const matchRatio = matchCount / normQWords.length;
        if (matchRatio >= 0.7) {
          matched = true;
        }
      }
    }
    
    if (matched) {
      if (plainText) {
        const snippets: string[] = [];
        let currentIndex = 0;
        let occurrences = 0;
        
        while (occurrences < 3) {
          let matchIdx = plainTextLower.indexOf(q, currentIndex);
          if (matchIdx === -1 && qWords.length > 0) {
            matchIdx = plainTextLower.indexOf(qWords[0], currentIndex);
          }
          
          if (matchIdx !== -1) {
            const startIdx = Math.max(0, matchIdx - 50);
            const endIdx = Math.min(plainText.length, matchIdx + q.length + 80);
            let snip = (startIdx > 0 ? '... ' : '') + plainText.substring(startIdx, endIdx) + (endIdx < plainText.length ? ' ...' : '');
            snippets.push(snip);
            
            currentIndex = endIdx;
            occurrences++;
          } else {
            break;
          }
        }
        
        if (snippets.length > 0) {
          snippet = snippets.join(' ');
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
