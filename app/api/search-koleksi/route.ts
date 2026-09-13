import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeSearchQuery } from '@/app/lib/search-dictionary';

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
  const exactMode = searchParams.get('exact') === 'true';

  if (!q) {
    return NextResponse.json({ results: [], meta: null });
  }

  const queryMeta = normalizeSearchQuery(q, exactMode);

  const supabase = await createClient();

  // 1. Gunakan Full-Text Search (FTS) PostgreSQL untuk query yang sudah dikoreksi / baku
  const { data: primaryData, error } = await supabase.rpc('search_brosur_ranked', {
    search_query: queryMeta.correctedQuery,
    filter_folder_id: folderId || null
  });

  if (error || !primaryData) {
    console.error('Search error:', error);
    return NextResponse.json({ results: [], meta: queryMeta });
  }

  const data: any[] = [...primaryData];
  const existingSlugs = new Set(data.map((item: any) => item.slug));

  // 2. Jika ada perbedaan antara query asli dengan yang dikoreksi, ambil juga hasil query asli
  if (queryMeta.originalQuery !== queryMeta.correctedQuery) {
    const { data: secondaryData } = await supabase.rpc('search_brosur_ranked', {
      search_query: queryMeta.originalQuery,
      filter_folder_id: folderId || null
    });

    if (secondaryData && secondaryData.length > 0) {
      for (const item of secondaryData) {
        if (!existingSlugs.has(item.slug)) {
          data.push(item);
          existingSlugs.add(item.slug);
        }
      }
    }
  }

  // 3. Jika hasil masih sedikit dan ada beberapa variasi sinonim, ambil juga brosur untuk variasi sinonim lainnya
  if (queryMeta.highlightTerms.length > 1 && data.length < 50) {
    const extraTerms = queryMeta.highlightTerms.filter(
      t => t !== queryMeta.correctedQuery && t !== queryMeta.originalQuery
    ).slice(0, 2);

    for (const term of extraTerms) {
      const { data: extraData } = await supabase.rpc('search_brosur_ranked', {
        search_query: term,
        filter_folder_id: folderId || null
      });
      if (extraData && extraData.length > 0) {
        for (const item of extraData) {
          if (!existingSlugs.has(item.slug)) {
            data.push(item);
            existingSlugs.add(item.slug);
          }
        }
      }
    }
  }

  const results = [];

  for (const item of data) {
    let matched = false;
    let snippet = '';
    
    const judulLower = item.judul.toLowerCase();
    if (queryMeta.highlightTerms.some(term => judulLower.includes(term))) {
      matched = true;
    }
    
    // Gunakan teks_bersih jika sudah dimigrasi, jika belum fallback ke cheerio (dinamis import agar tidak selalu di-load)
    let plainText = item.teks_bersih || '';
    if (!plainText && item.konten) {
       const cheerio = await import('cheerio');
       const $ = cheerio.load(item.konten);
       $('style, script').remove();
       plainText = $.text().replace(/\s+/g, ' ').trim();
    }
    
    // Always strip leaked CSS regardless of source
    plainText = plainText.replace(/html,body\s*\{[\s\S]*?\}/gi, '');
    
    const plainTextLower = plainText.toLowerCase();
    
    // Normalisasi untuk JS matching
    const normPlainText = normalizeArabic(normalizePunctuation(plainTextLower));

    if (plainText) {
      const hasNormMatch = queryMeta.highlightTerms.some(term => {
        const normTerm = normalizeArabic(normalizePunctuation(term));
        return normTerm && normPlainText.includes(normTerm);
      });

      if (hasNormMatch) {
        matched = true;
      } else {
        // Fallback: Kalimat panjang sering salah ketik/harakat, jika 70% kata cocok, anggap match!
        const checkWordsMatch = (targetQuery: string) => {
          const normTarget = normalizeArabic(normalizePunctuation(targetQuery));
          const words = normTarget.split(' ').filter(w => w.length > 1);
          if (words.length === 0) return false;
          let matchCount = 0;
          words.forEach(w => {
            if (normPlainText.includes(w)) matchCount++;
          });
          return (matchCount / words.length) >= 0.7;
        };

        if (checkWordsMatch(queryMeta.correctedQuery) || checkWordsMatch(queryMeta.originalQuery)) {
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
          let matchIdx = -1;
          let matchedTermLen = 0;

          // Cari posisi kemunculan dari salah satu kata/sinonim dalam highlightTerms
          for (const term of queryMeta.highlightTerms) {
            if (!term || term.length < 2) continue;
            const idx = plainTextLower.indexOf(term, currentIndex);
            if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
              matchIdx = idx;
              matchedTermLen = term.length;
            }
          }
          
          if (matchIdx !== -1) {
            const startIdx = Math.max(0, matchIdx - 50);
            const endIdx = Math.min(plainText.length, matchIdx + matchedTermLen + 80);
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

  return NextResponse.json({
    results,
    meta: {
      originalQuery: queryMeta.originalQuery,
      correctedQuery: queryMeta.correctedQuery,
      isCorrected: queryMeta.isCorrected,
      highlightTerms: queryMeta.highlightTerms
    }
  });
}

