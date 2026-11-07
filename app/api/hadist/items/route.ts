import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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

    const supabase = await createClient();

    let query = supabase
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
        kelompok_hadist(id, nama_kelompok, warna_badge),
        brosur!inner(id, judul, tahun, slug, folder_id, folders(name))
      `)
      .order('created_at', { ascending: false });

    if (kelompokId && kelompokId !== 'all') {
      query = query.eq('kelompok_id', kelompokId);
    }

    if (brosurId && brosurId !== 'all') {
      // Izinkan filter dengan ID maupun slug brosur
      const { data: bMatch } = await supabase
        .from('brosur')
        .select('id')
        .or(`id.eq.${brosurId},slug.eq.${brosurId}`)
        .maybeSingle();
      const targetBrosurId = bMatch?.id || brosurId;
      query = query.eq('brosur_id', targetBrosurId);
    }

    if (tahun && tahun !== 'all') {
      query = query.eq('brosur.tahun', parseInt(tahun, 10));
    }

    if (rawiKitab && rawiKitab !== 'all') {
      query = query.or(`rawi_kitab.ilike.%${rawiKitab}%,rawi_teratas.ilike.%${rawiKitab}%`);
    }

    if (statusHadist && statusHadist !== 'all') {
      query = query.eq('status_hadist', statusHadist);
    }

    let executedSearchTerms: string[] = [];
    let highlightTerms: string[] = [];
    let correctedQuery: string | null = null;
    let hasCorrection = false;
    let finalSearch = search;
    let contextKeywords = '';

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
                .select('terjemahan, brosur(judul)')
                .or(orConds)
                .limit(3);
                
              if (dbPreview && dbPreview.length > 0) {
                const snippets = dbPreview.map((d: any) => `- Judul: ${d.brosur?.judul}. Teks: ${d.terjemahan ? d.terjemahan.substring(0, 150) : ''}...`).join('\n');
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

      // Terapkan chained .or() untuk setiap token group (menghasilkan operator AND antar kata di Postgres)
      if (tokenGroups.length > 0) {
        for (const group of tokenGroups) {
          const cond = buildTokenOrCondition(group);
          if (cond) {
            query = query.or(cond);
          }
        }
      } else {
        const safeFinalSearch = (finalSearch || cleanSearch).replace(/[(),"]/g, '');
        if (safeFinalSearch) {
          const cond = buildTokenOrCondition([safeFinalSearch]);
          if (cond) query = query.or(cond);
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

    const { data, error } = await query;

    if (error) {
      const isMissingTable = 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache');

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

    let sortedData = data || [];
    
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

    const supabase = await createClient();

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

    const supabase = await createClient();

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

    const supabase = await createClient();

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
