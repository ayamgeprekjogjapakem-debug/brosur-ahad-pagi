import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelompokId = searchParams.get('kelompok_id');
    const brosurId = searchParams.get('brosur_id');
    const rawiKitab = searchParams.get('rawi_kitab');
    const statusHadist = searchParams.get('status_hadist');
    const sumberJenis = searchParams.get('sumber_jenis');
    const search = searchParams.get('search');

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
        brosur(id, judul, tahun, slug, folder_id, folders(name))
      `)
      .order('created_at', { ascending: false });

    if (kelompokId && kelompokId !== 'all') {
      query = query.eq('kelompok_id', kelompokId);
    }

    if (brosurId) {
      query = query.eq('brosur_id', brosurId);
    }

    if (rawiKitab && rawiKitab !== 'all') {
      query = query.or(`rawi_kitab.ilike.%${rawiKitab}%,rawi_teratas.ilike.%${rawiKitab}%`);
    }

    if (statusHadist && statusHadist !== 'all') {
      query = query.eq('status_hadist', statusHadist);
    }

    let finalSearch = search;
    let contextKeywords = '';

    if (search) {
      const cleanSearch = search.trim().toLowerCase();
      
      // 1. Cek tabel cache
      const { data: cacheData } = await supabase
        .from('search_intent_cache')
        .select('*')
        .eq('query_asli', cleanSearch)
        .single();
        
      if (cacheData) {
        // Gunakan cache
        finalSearch = cacheData.query_koreksi || cleanSearch;
        contextKeywords = cacheData.kata_kunci_konteks || '';
        
        try {
          const parsedKategori = JSON.parse(cacheData.kategori_ditebak || '{}');
          if (parsedKategori.saran) {
            (request as any)._aiSuggestions = parsedKategori.saran;
          }
        } catch (e) {
          // Abaikan jika bukan JSON
        }
        
        // Update frekuensi (Background)
        supabase.from('search_intent_cache')
          .update({ 
            frekuensi_pencarian: (cacheData.frekuensi_pencarian || 1) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', cacheData.id)
          .then();
      } else {
        // 2. Jika tidak ada cache, panggil LLM
        const { data: settings } = await supabase
          .from('app_settings')
          .select('openrouter_token, google_ai_token, chat_model')
          .eq('id', 1)
          .single();
          
        if (settings) {
          try {
            const isNativeGoogle = settings.chat_model?.endsWith('-native');
            let responseText = '{}';
            
            const systemPromptText = 'Anda adalah mesin analisis intent pencarian Islami. Anda harus HANYA merespons format JSON murni: { "query_koreksi": "kata baku", "kategori_ditebak": "Fiqih/Aqidah/dll", "kata_kunci_konteks": ["kata1", "kata2"], "saran_topik": ["Topik A", "Topik B"] }. ATURAN PENTING: JIKA query berupa istilah Arab/sejarah (misal: Haditsul Ifki, Qadzaf), Anda WAJIB memasukkan TERJEMAHANNYA ke dalam kata_kunci_konteks (misal: "berita bohong", "dusta", "menuduh zina") karena database kami hanya berisi teks terjemahan bahasa Indonesia. Berikan saran_topik jika query rancu.';

            if (isNativeGoogle && settings.google_ai_token) {
              // GAYA NATIVE GOOGLE AI STUDIO
              let actualModel = settings.chat_model.replace('-native', '');
              if (actualModel === 'gemini-1.5-flash' || actualModel === 'gemini-2.5-flash') actualModel = 'gemini-3.8-flash';
              
              const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${settings.google_ai_token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: `${systemPromptText}\n\nQuery User: ${cleanSearch}` }] }],
                  generationConfig: { responseMimeType: "application/json" }
                })
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                responseText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
              }
            } else if (!isNativeGoogle && settings.openrouter_token) {
              // GAYA OPENROUTER LAMA
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
                    { role: 'user', content: cleanSearch }
                  ]
                })
              });

              if (aiRes.ok) {
                const aiData = await aiRes.json();
                responseText = aiData.choices?.[0]?.message?.content || '{}';
              }
            }

            // Hapus backticks jika LLM bandel
            const cleanJson = responseText.replace(/```json|```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            
            finalSearch = parsed.query_koreksi || cleanSearch;
            contextKeywords = Array.isArray(parsed.kata_kunci_konteks) ? parsed.kata_kunci_konteks.join(' ') : (parsed.kata_kunci_konteks || '');
            
            // Simpan suggestions ke memori lokal request ini
            const saranTopik = Array.isArray(parsed.saran_topik) ? parsed.saran_topik : [];
            // Akali kolom kategori_ditebak agar bisa simpan JSON (tanpa ubah struktur DB)
            const kategoriJsonStr = JSON.stringify({
              kategori: parsed.kategori_ditebak || 'Umum',
              saran: saranTopik
            });

            // 3. Simpan ke cache (Background)
            supabase.from('search_intent_cache').insert({
              query_asli: cleanSearch,
              query_koreksi: finalSearch,
              kategori_ditebak: kategoriJsonStr,
              kata_kunci_konteks: contextKeywords,
              frekuensi_pencarian: 1
            }).then();
            
            // Attach suggestions to request object temporarily to pass to the response later
            (request as any)._aiSuggestions = saranTopik;
            
          } catch (e) {
            console.error('AI Request Error:', e);
            // Fallback ke pencarian asli jika error
          }
        }
      }

      // Bangun query pencarian (Gunakan hasil OpenRouter jika ada)
      const searchTerms = finalSearch ? [finalSearch] : [];
      if (contextKeywords) {
        contextKeywords.split(' ').forEach((k: string) => {
          if (k.length > 2) searchTerms.push(k.trim());
        });
      }
      
      if (searchTerms.length > 0) {
        const orConditions = searchTerms.map(term => 
          `kutipan_arab.ilike.%${term}%,terjemahan.ilike.%${term}%,perawi_sumber.ilike.%${term}%,rawi_kitab.ilike.%${term}%,rawi_teratas.ilike.%${term}%`
        ).join(',');
        query = query.or(orConditions);
      } else {
        query = query.or(`kutipan_arab.ilike.%${finalSearch}%,terjemahan.ilike.%${finalSearch}%,perawi_sumber.ilike.%${finalSearch}%,rawi_kitab.ilike.%${finalSearch}%,rawi_teratas.ilike.%${finalSearch}%`);
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

    return NextResponse.json({ 
      items: data || [], 
      suggestions: (request as any)._aiSuggestions || [] 
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
