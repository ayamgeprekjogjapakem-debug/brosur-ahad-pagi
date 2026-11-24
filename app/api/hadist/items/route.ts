import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { computeContentHash } from '@/utils/contentHash';
import {
  expandSearchTerms,
  stripArabicHarakat,
  SYNONYMS_MAP,
  extractWords,
  findClosestWord,
  SearchTermsResult
} from '@/utils/searchHelper';

// Cache kosakata in-memory server untuk deteksi typo cepat
let globalHadistVocabulary: Set<string> | null = null;
let lastVocabFetch = 0;

async function getOrFetchVocabulary(supabase: any): Promise<Set<string>> {
  const now = Date.now();
  if (globalHadistVocabulary && now - lastVocabFetch < 1000 * 60 * 30) {
    return globalHadistVocabulary;
  }
  try {
    const { data } = await supabase
      .from('hadist_brosur')
      .select('terjemahan')
      .limit(300);

    const vocab = new Set<string>();
    if (data && Array.isArray(data)) {
      for (const row of data) {
        if (row.terjemahan) {
          const words = extractWords(row.terjemahan);
          for (const w of words) vocab.add(w);
        }
      }
    }
    globalHadistVocabulary = vocab;
    lastVocabFetch = now;
    return vocab;
  } catch (e) {
    console.error('Error fetching hadist vocabulary:', e);
    return globalHadistVocabulary || new Set();
  }
}

function buildTokenOrCondition(tokenOrVariants: string[]): string {
  const conds: string[] = [];
  for (const term of tokenOrVariants) {
    const safeTerm = term.replace(/[(),"]/g, '').trim();
    if (!safeTerm) continue;
    const stripped = stripArabicHarakat(safeTerm);
    conds.push(
      `kutipan_arab_gundul.ilike.%${stripped}%`,
      `kutipan_arab.ilike.%${safeTerm}%`,
      `terjemahan.ilike.%${safeTerm}%`,
      `perawi_sumber.ilike.%${safeTerm}%`,
      `rawi_kitab.ilike.%${safeTerm}%`,
      `rawi_teratas.ilike.%${safeTerm}%`
    );
  }
  return conds.join(',');
}

function extractBrosurSnippet(teksBersih: string | null | undefined, terms: string[]): string {
  const clean = (teksBersih || '')
    .replace(/html\s*,\s*body\s*\{[^}]*\}/gi, ' ')
    .replace(/\/\*[^*]*\*\//g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return '';

  const lower = clean.toLowerCase();
  let matchIdx = -1;
  for (const term of terms) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    const bodyIdx = lower.indexOf(t, Math.min(80, lower.length));
    const idx = bodyIdx !== -1 ? bodyIdx : lower.indexOf(t);
    if (idx !== -1 && (matchIdx === -1 || idx < matchIdx)) {
      matchIdx = idx;
    }
  }

  if (matchIdx === -1) {
    return clean.length > 320 ? clean.slice(0, 320).trim() + '...' : clean;
  }

  const start = Math.max(0, matchIdx - 110);
  const end = Math.min(clean.length, matchIdx + 220);
  let snippet = clean.slice(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';
  return snippet;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelompokId = searchParams.get('kelompok_id');
    const brosurId = searchParams.get('brosur_id');
    const rawiKitab = searchParams.get('rawi_kitab');
    const statusHadist = searchParams.get('status_hadist');
    const sumberJenis = searchParams.get('sumber_jenis');
    const search = searchParams.get('search');
    const tahun = searchParams.get('tahun');
    const tahunMulai = searchParams.get('tahun_mulai');
    const tahunAkhir = searchParams.get('tahun_akhir');
    const includeBrosur = searchParams.get('include_brosur') === '1' || searchParams.get('include_brosur') === 'true';
    const summaryOnly = searchParams.get('summary_only') === '1';

    const supabase = createAdminClient();

    if (summaryOnly) {
      const hashPromise = supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'hadist_extract_hashes')
        .maybeSingle();

      // Paginate agar tidak terpotong batas default 1000 baris PostgREST/Supabase
      const counts: Record<string, number> = {};
      const pageSize = 1000;
      let from = 0;

      while (true) {
        const { data: rows, error: sumErr } = await supabase
          .from('hadist_brosur')
          .select('brosur_id')
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);

        if (sumErr) {
          return NextResponse.json({ error: sumErr.message }, { status: 500 });
        }

        if (!rows || rows.length === 0) break;

        for (const r of rows as any[]) {
          if (r.brosur_id) {
            counts[r.brosur_id] = (counts[r.brosur_id] || 0) + 1;
          }
        }

        if (rows.length < pageSize) break;
        from += pageSize;
      }

      const { data: hashRow } = await hashPromise;
      let hashes: Record<string, string> = {};
      if (hashRow?.value) {
        try {
          hashes = JSON.parse(hashRow.value) || {};
        } catch {}
      }
      return NextResponse.json(
        { brosur_counts: counts, brosur_hashes: hashes },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let resolvedBrosurId: string | null = null;
    if (brosurId && brosurId !== 'all') {
      // Izinkan filter dengan ID maupun slug brosur
      const { data: bMatch } = await supabase
        .from('brosur')
        .select('id')
        .or(`id.eq.${brosurId},slug.eq.${brosurId}`)
        .maybeSingle();
      resolvedBrosurId = bMatch?.id || brosurId;
    }

    let yearBrosurIdSet: Set<string> | null = null;
    if ((tahun && tahun !== 'all') || tahunMulai || tahunAkhir) {
      const matchedIds: string[] = [];
      const bPageSize = 1000;
      let bFrom = 0;
      while (true) {
        let bq = supabase.from('brosur').select('id').order('id', { ascending: true }).range(bFrom, bFrom + bPageSize - 1);
        if (tahun && tahun !== 'all') {
          bq = bq.eq('tahun', parseInt(tahun, 10));
        } else {
          if (tahunMulai) bq = bq.gte('tahun', parseInt(tahunMulai, 10));
          if (tahunAkhir) bq = bq.lte('tahun', parseInt(tahunAkhir, 10));
        }
        const { data: bRows } = await bq;
        if (!bRows || bRows.length === 0) break;
        for (const b of bRows as any[]) {
          if (b.id) matchedIds.push(b.id);
        }
        if (bRows.length < bPageSize) break;
        bFrom += bPageSize;
      }
      yearBrosurIdSet = new Set(matchedIds);
    }

    const searchOrConditions: string[] = [];

    let executedSearchTerms: string[] = [];
    let highlightTerms: string[] = [];
    let correctedQuery: string | null = null;
    let hasCorrection = false;
    let finalSearch = search;
    let contextKeywords = '';
    let activeTokenGroups: string[][] = [];

    if (search) {
      const cleanSearch = search.trim().toLowerCase();
      const vocab = await getOrFetchVocabulary(supabase);
      
      // 1. Ekspansi pencarian cerdas (Multi-term, sinonim transliterasi, & typo Levenshtein)
      const smartExpand = expandSearchTerms(cleanSearch, vocab);
      if (smartExpand.hasCorrection && smartExpand.correctedQuery) {
        correctedQuery = smartExpand.correctedQuery;
        hasCorrection = true;
      }
      highlightTerms = smartExpand.highlightTerms;

      // 2. Cek tabel cache AI jika ada
      const { data: cacheData } = await supabase
        .from('search_intent_cache')
        .select('*')
        .eq('query_asli', cleanSearch)
        .single();
        
      if (cacheData) {
        // Gunakan cache
        finalSearch = cacheData.query_koreksi || correctedQuery || cleanSearch;
        contextKeywords = cacheData.kata_kunci_konteks || '';
        
        try {
          const parsedKategori = JSON.parse(cacheData.kategori_ditebak || '{}');
          if (parsedKategori.saran) {
            (request as any)._aiSuggestions = parsedKategori.saran;
          }
        } catch (e) {
          // Abaikan jika bukan JSON
        }
        
        (request as any)._aiData = cacheData;
        (request as any)._aiStatus = 'cached';
        
        // Update frekuensi (Background)
        supabase.from('search_intent_cache')
          .update({ 
            frekuensi_pencarian: (cacheData.frekuensi_pencarian || 1) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', cacheData.id)
          .then();
      } else {
        // 3. Jika tidak ada cache, panggil LLM jika setting tersedia
        const { data: settings } = await supabase
          .from('app_settings')
          .select('openrouter_token, google_ai_token, chat_model')
          .eq('id', 1)
          .single();
          
        if (settings && (settings.openrouter_token || settings.google_ai_token)) {
          try {
            let dbContextStr = '';
            const previewTerms = cleanSearch.split(' ').filter(w => w.length > 3);
            if (previewTerms.length > 0) {
              const orConds = previewTerms.map(t => `terjemahan.ilike.%${t}%`).join(',');
              const { data: dbPreview } = await supabase
                .from('hadist_brosur')
                .select('terjemahan, brosur_id')
                .or(orConds)
                .limit(3);
                
              if (dbPreview && dbPreview.length > 0) {
                const previewBrosurIds = Array.from(new Set(dbPreview.map((d: any) => d.brosur_id).filter(Boolean)));
                let previewBrosurMap = new Map();
                if (previewBrosurIds.length > 0) {
                  const { data: previewBrosurs } = await supabase
                    .from('brosur')
                    .select('id, judul')
                    .in('id', previewBrosurIds);
                  if (previewBrosurs) {
                    previewBrosurMap = new Map(previewBrosurs.map((b: any) => [b.id, b.judul]));
                  }
                }
                const snippets = dbPreview.map((d: any) => `- Judul: ${previewBrosurMap.get(d.brosur_id) || 'Brosur'}. Teks: ${d.terjemahan ? d.terjemahan.substring(0, 150) : ''}...`).join('\n');
                dbContextStr = `\n\nREFERENSI TEKS DATABASE:\n${snippets}\n\n(Gunakan referensi di atas untuk membuat saran_topik jika relevan)`;
              }
            }

            const isNativeGoogle = settings.chat_model?.endsWith('-native');
            let responseText = '{}';
            
            const systemPromptText = 'Anda adalah mesin analisis intent pencarian Islami. HANYA respons JSON murni: { "query_koreksi": "kata baku", "kategori_ditebak": "kategori", "kata_kunci_konteks": ["kata1", "kata2"], "saran_topik": ["Frasa A", "Frasa B"] }. ATURAN: 1. JIKA query istilah Arab, WAJIB masukkan TERJEMAHANNYA ke kata_kunci_konteks. 2. SANGAT PENTING: Untuk "saran_topik", JANGAN mengarang atau merangkum kalimat sendiri! HARUS berisi potongan KUTIPAN LANGSUNG (kata-katanya sama persis) dari referensi teks database yang diberikan. Jika teks database tidak ada, kosongkan saran_topik ([]).';

            if (isNativeGoogle && settings.google_ai_token) {
              let actualModel = settings.chat_model.replace('-native', '');
              if (actualModel === 'gemini-1.5-flash' || actualModel === 'gemini-2.5-flash') actualModel = 'gemini-3.8-flash';
              
              const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${settings.google_ai_token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemPromptText}\n\nQuery User: ${cleanSearch}${dbContextStr}` }] }],
                  generationConfig: { responseMimeType: "application/json" }
                })
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
              }
            } else if (!isNativeGoogle && settings.openrouter_token) {
              const token = settings.openrouter_token.trim();
              const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'Pustaka MTA'
                },
                body: JSON.stringify({
                  model: settings.chat_model || 'google/gemini-2.5-flash',
                  response_format: { type: 'json_object' },
                  messages: [
                    { role: 'system', content: systemPromptText },
                    { role: 'user', content: `Query User: ${cleanSearch}${dbContextStr}` }
                  ]
                })
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                responseText = aiData.choices?.[0]?.message?.content || '{}';
              }
            }

            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            
            finalSearch = parsed.query_koreksi || correctedQuery || cleanSearch;
            contextKeywords = Array.isArray(parsed.kata_kunci_konteks) ? parsed.kata_kunci_konteks.join(' ') : (parsed.kata_kunci_konteks || '');
            
            const saranTopik = Array.isArray(parsed.saran_topik) ? parsed.saran_topik : [];
            const kategoriJsonStr = JSON.stringify({
              kategori: parsed.kategori_ditebak || 'Umum',
              saran: saranTopik
            });

            supabase.from('search_intent_cache').insert({
              query_asli: cleanSearch,
              query_koreksi: finalSearch,
              kategori_ditebak: kategoriJsonStr,
              kata_kunci_konteks: contextKeywords,
              frekuensi_pencarian: 1
            }).then();
            
            (request as any)._aiSuggestions = saranTopik;
            (request as any)._aiData = {
              query_koreksi: finalSearch,
              kata_kunci_konteks: contextKeywords,
              kategori_ditebak: parsed.kategori_ditebak
            };
            (request as any)._aiStatus = 'success';
            
          } catch (e) {
            console.error('AI Request Error:', e);
            (request as any)._aiStatus = 'error';
            finalSearch = correctedQuery || cleanSearch;
          }
        } else {
          (request as any)._aiStatus = 'inactive';
          finalSearch = correctedQuery || cleanSearch;
        }
      }

      // 4. Membangun query multi-term non-consecutive (operator AND per kata)
      // Pecah query finalSearch menjadi token-token kata
      const queryToTokenize = finalSearch || cleanSearch;
      const parsedTokens = queryToTokenize
        .split(/\s+/)
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);

      // Kumpulkan kelompok varian untuk setiap token (kata dasar + transliterasi sinonim)
      const tokenGroups: string[][] = [];
      for (const token of parsedTokens) {
        const variants = [token];
        const syns = SYNONYMS_MAP[token];
        if (syns) {
          variants.push(...syns);
        }
        tokenGroups.push(variants);
      }
      activeTokenGroups = tokenGroups;

      // Kumpulkan seluruh kata kunci yang dipakai untuk sorting & highlighting
      const allSearchKeywords = new Set<string>();
      tokenGroups.forEach(grp => grp.forEach(w => allSearchKeywords.add(w)));
      if (contextKeywords) {
        contextKeywords.split(/\s+/).forEach(k => {
          if (k.length > 2) allSearchKeywords.add(k.toLowerCase().trim());
        });
      }
      highlightTerms.forEach(h => allSearchKeywords.add(h));
      executedSearchTerms = Array.from(allSearchKeywords);

      // Simpan kondisi .or() untuk setiap token group (menghasilkan operator AND antar kata di Postgres)
      if (tokenGroups.length > 0) {
        for (const group of tokenGroups) {
          const cond = buildTokenOrCondition(group);
          if (cond) {
            searchOrConditions.push(cond);
          }
        }
      } else {
        const safeFinalSearch = (finalSearch || cleanSearch).replace(/[(),"]/g, '');
        if (safeFinalSearch) {
          const cond = buildTokenOrCondition([safeFinalSearch]);
          if (cond) searchOrConditions.push(cond);
        }
      }
      
      // Async log pencarian populer yang lama (Tetap dipertahankan)
      const logSearch = search.trim().toLowerCase();
      if (logSearch.length > 2 && logSearch.length < 50) {
        supabase.rpc('increment_search_count', { search_keyword: logSearch }).then(async ({error}) => {
          if (error) {
            const { data } = await supabase.from('pencarian_populer').select('id, search_count').eq('keyword', logSearch).single();
            if (data) {
              await supabase.from('pencarian_populer').update({ search_count: data.search_count + 1, last_searched_at: new Date().toISOString() }).eq('id', data.id);
            } else {
              await supabase.from('pencarian_populer').insert({ keyword: logSearch, search_count: 1 });
            }
          }
        });
      }
    }

    // Bangun query hadist_brosur dan paginate per 1000 baris agar tidak terpotong batas default PostgREST
    const buildHadistQuery = (from: number, to: number, brosurIdChunk?: string[]) => {
      let q = supabase
        .from('hadist_brosur')
        .select(`
          id,
          kelompok_id,
          brosur_id,
          kutipan_arab,
          terjemahan,
          perawi_sumber,
          rawi_kitab,
          juz,
          halaman,
          no_hadist,
          rawi_teratas,
          status_hadist,
          catatan,
          created_at,
          kelompok_hadist(id, nama_kelompok, warna_badge)
        `)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);

      if (kelompokId && kelompokId !== 'all') {
        q = q.eq('kelompok_id', kelompokId);
      }

      if (resolvedBrosurId) {
        q = q.eq('brosur_id', resolvedBrosurId);
      } else if (brosurIdChunk) {
        q = q.in('brosur_id', brosurIdChunk);
      }

      if (rawiKitab && rawiKitab !== 'all') {
        q = q.or(`rawi_kitab.ilike.%${rawiKitab}%,rawi_teratas.ilike.%${rawiKitab}%`);
      }

      if (statusHadist && statusHadist !== 'all') {
        q = q.eq('status_hadist', statusHadist);
      }

      if (sumberJenis === 'quran') {
        q = q.ilike('rawi_kitab', '%qur%');
      } else if (sumberJenis === 'hadist') {
        q = q.not('rawi_kitab', 'ilike', '%qur%');
      }

      for (const cond of searchOrConditions) {
        q = q.or(cond);
      }

      return q;
    };

    let rawItems: any[] = [];
    let error: any = null;
    const pageSize = 1000;

    if (yearBrosurIdSet !== null && !resolvedBrosurId) {
      const yearIds = Array.from(yearBrosurIdSet);
      if (yearIds.length > 0) {
        // Chunk filter brosur_id per 150 agar URL query PostgREST tetap aman
        for (let c = 0; c < yearIds.length; c += 150) {
          const chunk = yearIds.slice(c, c + 150);
          let from = 0;
          while (true) {
            const { data: pageData, error: pageErr } = await buildHadistQuery(from, from + pageSize - 1, chunk);
            if (pageErr) {
              error = pageErr;
              break;
            }
            if (!pageData || pageData.length === 0) break;
            rawItems.push(...pageData);
            if (pageData.length < pageSize) break;
            from += pageSize;
          }
          if (error) break;
        }
        rawItems.sort((a, b) => {
          const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
          const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
          return tb - ta;
        });
      }
    } else {
      let from = 0;
      while (true) {
        const { data: pageData, error: pageErr } = await buildHadistQuery(from, from + pageSize - 1);
        if (pageErr) {
          error = pageErr;
          break;
        }
        if (!pageData || pageData.length === 0) break;
        rawItems.push(...pageData);
        if (pageData.length < pageSize) break;
        from += pageSize;
      }
    }

    if (error) {
      console.error('Error fetching hadist_brosur:', error);
      const isMissingTable = 
        error.code === '42P01' || 
        error.code === 'PGRST205' ||
        (error.message?.includes('relation') && error.message?.includes('does not exist'));

      if (isMissingTable) {
        return NextResponse.json(
          { 
            error: 'TABLE_NOT_FOUND', 
            message: 'Tabel hadist_brosur belum dibuat di database Supabase.' 
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Lookup brosur details secara independen (chunked per 150 ID agar aman dari batas URL)
    if (rawItems.length > 0) {
      const bIds = Array.from(new Set(rawItems.map((it: any) => it.brosur_id).filter(Boolean)));
      if (bIds.length > 0) {
        try {
          const bMap = new Map<string, any>();
          for (let c = 0; c < bIds.length; c += 150) {
            const chunk = bIds.slice(c, c + 150);
            const { data: bList } = await supabase
              .from('brosur')
              .select('id, judul, tahun, slug, folder_id, folders(name)')
              .in('id', chunk);

            if (bList && bList.length > 0) {
              for (const b of bList as any[]) {
                bMap.set(b.id, b);
              }
            }
          }

          if (bMap.size > 0) {
            rawItems = rawItems.map((it: any) => ({
              ...it,
              brosur: bMap.get(it.brosur_id) || null
            }));
          }
        } catch (bErr) {
          console.warn('Failed to load brosur details for hadist items:', bErr);
        }
      }
    }

    let sortedData: any[] = rawItems.map((it: any) => {
      const isQuran =
        it.rawi_kitab === "Al-Qur'an" ||
        (it.rawi_kitab || '').toLowerCase().includes('qur') ||
        (it.perawi_sumber || '').toLowerCase().startsWith('qs');
      return {
        ...it,
        sumber_jenis: it.sumber_jenis || (isQuran ? 'quran' : 'hadist'),
        penjelasan: it.penjelasan || it.catatan || null,
      };
    });
    
    // Sort logic: Prioritaskan kalimat komplit (exact match) di urutan paling atas!
    if (sortedData.length > 0 && executedSearchTerms.length > 0) {
      const primaryTerm = finalSearch ? finalSearch.toLowerCase() : '';
      const originalTerm = search ? search.trim().toLowerCase() : '';

      sortedData.sort((a, b) => {
        const aText = ((a.terjemahan || '') + ' ' + (a.kutipan_arab || '')).toLowerCase();
        const bText = ((b.terjemahan || '') + ' ' + (b.kutipan_arab || '')).toLowerCase();

        // 1. Prioritas Super: Mengandung kalimat utuh persis seperti yang dicari
        const aExact = (primaryTerm && aText.includes(primaryTerm)) || (originalTerm && aText.includes(originalTerm)) ? 1000 : 0;
        const bExact = (primaryTerm && bText.includes(primaryTerm)) || (originalTerm && bText.includes(originalTerm)) ? 1000 : 0;
        
        if (aExact !== bExact) return bExact - aExact;

        // 2. Prioritas Tambahan: Hitung seberapa banyak kata kunci yang cocok (Scoring)
        let aScore = 0;
        let bScore = 0;
        executedSearchTerms.forEach(term => {
          const t = term.toLowerCase();
          if (aText.includes(t)) aScore++;
          if (bText.includes(t)) bScore++;
        });

        return bScore - aScore;
      });
    }

    // Jika diminta dari portal pencarian utama (include_brosur=1), ikut sertakan pencarian di tabel brosur (1.500+ naskah)
    if (includeBrosur && search && search.trim() && !kelompokId && !rawiKitab && !statusHadist && !sumberJenis) {
      try {
        let brosurQuery = supabase
          .from('brosur')
          .select('id, judul, tahun, slug, folder_id, teks_bersih, folders(name)')
          .order('tahun', { ascending: false })
          .limit(30);

        if (tahun && tahun !== 'all') {
          brosurQuery = brosurQuery.eq('tahun', parseInt(tahun, 10));
        }

        if (brosurId && brosurId !== 'all') {
          brosurQuery = brosurQuery.or(`id.eq.${brosurId},slug.eq.${brosurId}`);
        }

        const groupsToUse = activeTokenGroups.length > 0 ? activeTokenGroups : [[search.trim().toLowerCase()]];
        for (const group of groupsToUse) {
          const bConds = group
            .map((t: string) => t.replace(/[(),"]/g, '').trim())
            .filter(Boolean)
            .flatMap((t: string) => [`judul.ilike.%${t}%`, `teks_bersih.ilike.%${t}%`]);
          if (bConds.length > 0) {
            brosurQuery = brosurQuery.or(bConds.join(','));
          }
        }

        const { data: brosurMatches, error: brosurErr } = await brosurQuery;
        if (!brosurErr && brosurMatches && brosurMatches.length > 0) {
          const primaryLower = (finalSearch || search).trim().toLowerCase();
          const termsForSnippet = executedSearchTerms.length > 0 ? executedSearchTerms : [primaryLower];

          const mappedBrosurs = brosurMatches.map((b: any) => ({
            id: `brosur_${b.id}`,
            kelompok_id: null,
            brosur_id: b.id,
            sumber_jenis: 'brosur',
            kutipan_arab: null,
            terjemahan: extractBrosurSnippet(b.teks_bersih, termsForSnippet),
            perawi_sumber: null,
            rawi_kitab: b.folders?.name || (b.tahun ? `Brosur Tahun ${b.tahun}` : 'Brosur Ahad Pagi'),
            juz: null,
            halaman: null,
            no_hadist: null,
            rawi_teratas: null,
            status_hadist: 'terverifikasi',
            catatan: null,
            created_at: b.tahun ? `${b.tahun}-01-01T00:00:00Z` : new Date().toISOString(),
            kelompok_hadist: null,
            brosur: {
              id: b.id,
              judul: b.judul,
              tahun: b.tahun,
              slug: b.slug,
              folder_id: b.folder_id,
              folders: b.folders || null,
            },
          }));

          mappedBrosurs.sort((a: any, b: any) => {
            const aTitle = (a.brosur?.judul || '').toLowerCase();
            const bTitle = (b.brosur?.judul || '').toLowerCase();
            const aInTitle = aTitle.includes(primaryLower) ? 1 : 0;
            const bInTitle = bTitle.includes(primaryLower) ? 1 : 0;
            if (aInTitle !== bInTitle) return bInTitle - aInTitle;
            return (b.brosur?.tahun || 0) - (a.brosur?.tahun || 0);
          });

          sortedData = [...sortedData, ...mappedBrosurs];
        }
      } catch (bSearchErr) {
        console.warn('Error searching brosur fallback:', bSearchErr);
      }
    }

    return NextResponse.json({ 
      items: sortedData, 
      suggestions: (request as any)._aiSuggestions || [],
      ai_data: (request as any)._aiData || null,
      ai_status: (request as any)._aiStatus || 'inactive',
      search_terms_used: executedSearchTerms,
      highlight_terms: highlightTerms,
      search_meta: {
        original_query: search || '',
        corrected_query: correctedQuery || finalSearch || search || '',
        has_correction: hasCorrection,
        highlight_terms: highlightTerms
      }
    });
  } catch (err: any) {
    console.error('Error GET /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    // Dukungan Bulk Save dari halaman Generator (/dashboard/hadist/generate)
    if (Array.isArray(body.items)) {
      const itemsToSave = body.items;
      if (itemsToSave.length === 0) {
        return NextResponse.json({ error: 'Tidak ada item untuk disimpan.' }, { status: 400 });
      }

      // Ambil ID lama dulu agar hanya dihapus SETELAH insert baru berhasil (mencegah data hilang jika insert gagal)
      const oldIdsToDelete: string[] = [];
      if (Array.isArray(body.replace_brosur_ids) && body.replace_brosur_ids.length > 0) {
        for (let c = 0; c < body.replace_brosur_ids.length; c += 150) {
          const chunk = body.replace_brosur_ids.slice(c, c + 150);
          let from = 0;
          while (true) {
            const { data: existingRows } = await supabase
              .from('hadist_brosur')
              .select('id')
              .in('brosur_id', chunk)
              .order('id', { ascending: true })
              .range(from, from + 999);
            if (!existingRows || existingRows.length === 0) break;
            for (const r of existingRows as any[]) {
              if (r.id) oldIdsToDelete.push(r.id);
            }
            if (existingRows.length < 1000) break;
            from += 1000;
          }
        }
      }

      const payload = itemsToSave.map((d: any) => ({
        kelompok_id: d.kelompok_id || null,
        brosur_id: d.brosur_id,
        kutipan_arab: (d.kutipan_arab || '-').toString().trim(),
        kutipan_arab_gundul: d.kutipan_arab_gundul?.trim() || null,
        terjemahan: d.terjemahan?.trim() || null,
        perawi_sumber: d.perawi_sumber?.trim() || null,
        rawi_kitab: d.rawi_kitab?.trim() || null,
        juz: d.juz?.toString().trim() || null,
        halaman: d.halaman?.toString().trim() || null,
        no_hadist: d.no_hadist?.toString().trim() || null,
        rawi_teratas: d.rawi_teratas?.trim() || null,
        status_hadist: d.status_hadist || 'terverifikasi',
        catatan: d.catatan?.trim() || null,
      }));

      const { data: inserted, error: bulkErr } = await supabase
        .from('hadist_brosur')
        .insert(payload)
        .select('id');

      if (bulkErr) {
        return NextResponse.json({ error: bulkErr.message }, { status: 500 });
      }

      if (oldIdsToDelete.length > 0) {
        for (let i = 0; i < oldIdsToDelete.length; i += 200) {
          const chunk = oldIdsToDelete.slice(i, i + 200);
          await supabase.from('hadist_brosur').delete().in('id', chunk);
        }
      }

      // Simpan hash teks_bersih terbaru untuk setiap brosur yang disimpan
      try {
        const savedBrosurIds = Array.from(new Set(payload.map((p: any) => p.brosur_id).filter(Boolean)));
        if (savedBrosurIds.length > 0) {
          const [{ data: bTexts }, { data: existingHashRow }] = await Promise.all([
            supabase.from('brosur').select('id, teks_bersih').in('id', savedBrosurIds),
            supabase.from('system_settings').select('value').eq('key', 'hadist_extract_hashes').maybeSingle(),
          ]);

          let hashes: Record<string, string> = {};
          if (existingHashRow?.value) {
            try { hashes = JSON.parse(existingHashRow.value) || {}; } catch {}
          }
          (bTexts || []).forEach((b: any) => {
            hashes[b.id] = computeContentHash(b.teks_bersih || '');
          });
          await supabase
            .from('system_settings')
            .upsert({ key: 'hadist_extract_hashes', value: JSON.stringify(hashes) }, { onConflict: 'key' });
        }
      } catch (hashErr) {
        console.warn('Warning updating extract hashes:', hashErr);
      }

      return NextResponse.json({ success: true, savedCount: inserted?.length || payload.length });
    }

    const {
      kelompok_id,
      brosur_id,
      kutipan_arab,
      terjemahan,
      perawi_sumber,
      rawi_kitab,
      juz,
      halaman,
      no_hadist,
      rawi_teratas,
      status_hadist = 'terverifikasi',
      catatan,
    } = body;

    if (!brosur_id || !kutipan_arab || !kutipan_arab.trim()) {
      return NextResponse.json(
        { error: 'Brosur Sumber dan Kutipan Teks Arab wajib diisi.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('hadist_brosur')
      .insert({
        kelompok_id: kelompok_id || null,
        brosur_id,
        kutipan_arab: kutipan_arab.trim(),
        terjemahan: terjemahan?.trim() || null,
        perawi_sumber: perawi_sumber?.trim() || null,
        rawi_kitab: rawi_kitab?.trim() || null,
        juz: juz?.trim() || null,
        halaman: halaman?.trim() || null,
        no_hadist: no_hadist?.trim() || null,
        rawi_teratas: rawi_teratas?.trim() || null,
        status_hadist: status_hadist || 'terverifikasi',
        catatan: catatan?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('Error POST /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      kelompok_id,
      kutipan_arab,
      terjemahan,
      perawi_sumber,
      rawi_kitab,
      juz,
      halaman,
      no_hadist,
      rawi_teratas,
      status_hadist,
      catatan,
    } = body;

    if (!id || !kutipan_arab || !kutipan_arab.trim()) {
      return NextResponse.json(
        { error: 'ID dan Kutipan Teks Arab wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('hadist_brosur')
      .update({
        kelompok_id: kelompok_id || null,
        kutipan_arab: kutipan_arab.trim(),
        terjemahan: terjemahan?.trim() || null,
        perawi_sumber: perawi_sumber?.trim() || null,
        rawi_kitab: rawi_kitab?.trim() || null,
        juz: juz?.trim() || null,
        halaman: halaman?.trim() || null,
        no_hadist: no_hadist?.trim() || null,
        rawi_teratas: rawi_teratas?.trim() || null,
        status_hadist: status_hadist || 'terverifikasi',
        catatan: catatan?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('Error PUT /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const resetAll = searchParams.get('reset_all');
    const statusHadist = searchParams.get('status_hadist');

    const supabase = createAdminClient();

    if (resetAll === 'true') {
      const { error } = await supabase
        .from('hadist_brosur')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Semua hadist berhasil dihapus (Reset All).' });
    }

    if (statusHadist === 'mentah') {
      const { error } = await supabase
        .from('hadist_brosur')
        .delete()
        .eq('status_hadist', 'mentah');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Semua draft hadist mentah berhasil dihapus.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID item hadist atau parameter reset wajib diberikan.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('hadist_brosur')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Hadist berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
