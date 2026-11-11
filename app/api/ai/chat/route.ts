import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import {
  extractSmartMultiChunks,
  generateGoogleEmbedding,
  extractCoreTopicTerms,
  scoreBrosurRelevance,
  extractReadableBrosurTitle,
} from '@/utils/ai-embeddings';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Membuat slug URL yang rapi dari teks judul/pertanyaan + akhiran pendek dari UUID sesi
 * Contoh: "rukun-syarat-sah-dan-adab-pernikahan-islami-99a2ab"
 */
function buildSessionSlug(text: string, uuid: string): string {
  const base = (text || 'percakapan-ai')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 52)
    .replace(/-$/, '');
  const shortHex = (uuid || '').replace(/-/g, '').slice(0, 6);
  return `${base || 'percakapan-ai'}-${shortHex}`;
}

/**
 * GET /api/ai/chat
 * - Jika diberi parameter `?slug=...`, mengembalikan detail sesi percakapan tersebut dari database.
 * - Jika tanpa parameter, mengambil daftar "Chat Terbaru" dan "Chat Terpopuler" beserta slug-nya dari database Supabase.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const requestedSlug = searchParams.get('slug')?.trim();

    // Ambil sesi spesifik berdasarkan slug atau UUID
    const { data: dbSessions } = await supabase
      .from('ai_simulator_sessions')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(60);

    if (requestedSlug) {
      let matchedSession: any = null;

      if (dbSessions && dbSessions.length > 0) {
        matchedSession = dbSessions.find((s: any) => {
          const sSlug = s.slug || buildSessionSlug(s.title, s.id);
          const shortHex = (s.id || '').replace(/-/g, '').slice(0, 6);
          return (
            sSlug === requestedSlug ||
            s.id === requestedSlug ||
            (shortHex.length === 6 && requestedSlug.endsWith(`-${shortHex}`))
          );
        });
      }

      if (matchedSession) {
        const computedSlug = matchedSession.slug || buildSessionSlug(matchedSession.title, matchedSession.id);
        return NextResponse.json(
          {
            success: true,
            session: {
              id: matchedSession.id,
              slug: computedSlug,
              title: matchedSession.title || 'Percakapan AI',
              messages: Array.isArray(matchedSession.messages) ? matchedSession.messages : [],
              updatedAt: matchedSession.updated_at || matchedSession.created_at,
            },
          },
          { headers: corsHeaders }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Sesi percakapan dengan slug tersebut tidak ditemukan di database.' },
        { status: 404, headers: corsHeaders }
      );
    }

    // 1. Ambil 50 log pertanyaan terbaru dari ai_query_logs
    const { data: recentLogs } = await supabase
      .from('ai_query_logs')
      .select('id, query_text, topic_category, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    // Susun Chat Terbaru (Lengkap dengan slug agar langsung bisa dibuka hasilnya dari database)
    const seenRecent = new Set<string>();
    const recentChats: {
      id: string;
      slug: string;
      title: string;
      query: string;
      category?: string;
      sessionMessages?: any[];
    }[] = [];

    if (dbSessions && dbSessions.length > 0) {
      for (const s of dbSessions) {
        const cleanTitle = (s.title || '').trim();
        if (!cleanTitle || cleanTitle === 'Percakapan Baru' || seenRecent.has(cleanTitle.toLowerCase())) continue;
        seenRecent.add(cleanTitle.toLowerCase());
        const firstUserMsg = Array.isArray(s.messages)
          ? s.messages.find((m: any) => m.role === 'user')?.content || cleanTitle
          : cleanTitle;
        const sSlug = s.slug || buildSessionSlug(cleanTitle, s.id);
        recentChats.push({
          id: s.id,
          slug: sSlug,
          title: cleanTitle,
          query: firstUserMsg,
          sessionMessages: Array.isArray(s.messages) && s.messages.length > 1 ? s.messages : undefined,
        });
        if (recentChats.length >= 7) break;
      }
    }

    if (recentLogs && recentLogs.length > 0 && recentChats.length < 7) {
      for (const log of recentLogs) {
        const qText = (log.query_text || '').trim();
        if (!qText || qText.length < 5) continue;
        const shortTitle = qText.length > 38 ? qText.slice(0, 38) + '...' : qText;
        const key = qText.toLowerCase().slice(0, 30);
        if (seenRecent.has(key)) continue;
        seenRecent.add(key);

        // Cari apakah ada sesi di dbSessions yang cocok dengan log ini agar punya slug hasil lengkap
        const matchingDbSess = (dbSessions || []).find((s: any) =>
          (s.title || '').toLowerCase().includes(qText.toLowerCase().slice(0, 20))
        );
        const computedSlug = matchingDbSess
          ? matchingDbSess.slug || buildSessionSlug(matchingDbSess.title, matchingDbSess.id)
          : buildSessionSlug(shortTitle, log.id);

        recentChats.push({
          id: matchingDbSess ? matchingDbSess.id : `log-${log.id}`,
          slug: computedSlug,
          title: shortTitle,
          query: qText,
          category: log.topic_category || 'Kajian',
          sessionMessages: matchingDbSess?.messages,
        });
        if (recentChats.length >= 7) break;
      }
    }

    // Susun Chat Terpopuler (Lengkap dengan slug jika sudah ada hasil sesinya di database)
    const freqMap = new Map<
      string,
      { title: string; query: string; count: number; category: string; slug?: string; sessionMessages?: any[] }
    >();
    if (recentLogs && recentLogs.length > 0) {
      for (const log of recentLogs) {
        const qText = (log.query_text || '').trim();
        if (!qText || qText.length < 5) continue;
        const normKey = qText.toLowerCase().replace(/[^\w\s]/g, '').trim().slice(0, 35);
        const existing = freqMap.get(normKey);
        if (existing) {
          existing.count += 1;
        } else {
          const matchingDbSess = (dbSessions || []).find((s: any) =>
            (s.title || '').toLowerCase().includes(qText.toLowerCase().slice(0, 18))
          );
          freqMap.set(normKey, {
            title: qText.length > 38 ? qText.slice(0, 38) + '...' : qText,
            query: qText,
            count: 1,
            category: log.topic_category || 'Umum',
            slug: matchingDbSess
              ? matchingDbSess.slug || buildSessionSlug(matchingDbSess.title, matchingDbSess.id)
              : buildSessionSlug(qText, log.id),
            sessionMessages: matchingDbSess?.messages,
          });
        }
      }
    }

    const popularChats: {
      id: string;
      slug: string;
      title: string;
      query: string;
      count: number;
      category: string;
      sessionMessages?: any[];
    }[] = Array.from(freqMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((item, idx) => ({
        id: `pop-${idx}`,
        slug: item.slug || buildSessionSlug(item.title, `pop00${idx}`),
        title: item.title,
        query: item.query,
        count: item.count,
        category: item.category,
        sessionMessages: item.sessionMessages,
      }));

    const defaultPopular = [
      {
        id: 'pop-def-1',
        slug: 'dalil-aqiqah-hari-ke-7-samurah-def001',
        title: 'Dalil Aqiqah Hari ke-7 & Samurah',
        query: 'Carikan dalil hadits aqiqah di hari ke-7 lengkap dengan teks Arab dan artinya',
        count: 19,
        category: 'Munakahat & Keluarga',
      },
      {
        id: 'pop-def-2',
        slug: 'rukun-syarat-dan-adab-pernikahan-islami-def002',
        title: 'Rukun, Syarat & Adab Pernikahan',
        query: 'Rukun, syarat sah, dan adab pernikahan Islami menurut Brosur MTA',
        count: 16,
        category: 'Munakahat & Keluarga',
      },
      {
        id: 'pop-def-3',
        slug: 'tuntunan-shalat-tahajud-dan-witir-def003',
        title: 'Tuntunan Shalat Tahajud & Witir',
        query: 'Bagaimana tuntunan shalat tahajud dan witir beserta dalil haditsnya di Brosur Ahad Pagi?',
        count: 14,
        category: 'Shalat & Thaharah',
      },
      {
        id: 'pop-def-4',
        slug: 'kriteria-hadits-shahih-vs-dhaif-def004',
        title: 'Kriteria Hadits Shahih vs Dhaif',
        query: 'Bagaimana sikap terhadap hadits dhaif dan kriteria hadits shahih menurut Brosur MTA?',
        count: 12,
        category: 'Ibadah & Sunnah',
      },
      {
        id: 'pop-def-5',
        slug: 'hukum-jual-beli-dan-riba-dalam-islam-def005',
        title: 'Hukum Jual Beli & Riba dalam Islam',
        query: 'Jelaskan dalil-dalil tentang jual beli yang dilarang dan bahaya riba menurut Brosur MTA',
        count: 11,
        category: 'Zakat & Muamalah',
      },
    ];

    for (const def of defaultPopular) {
      if (popularChats.length >= 5) break;
      if (!popularChats.some((p) => p.query.toLowerCase().includes(def.title.split(' ')[1].toLowerCase()))) {
        popularChats.push(def);
      }
    }

    return NextResponse.json(
      {
        success: true,
        recentChats: recentChats.slice(0, 6),
        popularChats: popularChats.slice(0, 5),
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, recentChats: [], popularChats: [], error: err.message },
      { headers: corsHeaders }
    );
  }
}

export async function POST(request: Request) {
  const startTime = performance.now();
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { messages, localContext, model } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content;

    const { data: settings } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!settings || !settings.ai_enabled) {
      return NextResponse.json({ error: 'Fitur AI sedang dinonaktifkan.' }, { status: 403 });
    }

    const openRouterKey = settings.openrouter_token || process.env.OPENROUTER_API_KEY;
    const deepseekKey = settings.deepseek_token || process.env.DEEPSEEK_API_KEY;

    // Prioritaskan model dari pengaturan dashboard web (/dashboard/ai-settings) sebagai Single Source of Truth
    const selectedModel = settings.chat_model || model || 'google/gemini-2.5-flash';
    const isDeepSeekDirect = (selectedModel === 'deepseek-chat' || selectedModel === 'deepseek-reasoner') && Boolean(deepseekKey);

    // Normalisasi nama model khusus untuk OpenRouter jika tidak menggunakan direct DeepSeek API
    const normalizeModelForOpenRouter = (rawModel: string): string => {
      if (rawModel === 'deepseek-chat') return 'deepseek/deepseek-chat';
      if (rawModel === 'deepseek-reasoner') return 'deepseek/deepseek-r1';
      return rawModel;
    };

    if (isDeepSeekDirect && !deepseekKey && !openRouterKey) {
      return NextResponse.json({ error: 'API Key DeepSeek belum dikonfigurasi di /dashboard/ai-settings.' }, { status: 500 });
    } else if (!isDeepSeekDirect && !openRouterKey) {
      return NextResponse.json({ error: 'API Key AI (OpenRouter) belum dikonfigurasi.' }, { status: 500 });
    }

    // 1. Fetch AI Rules (Memory)
    const { data: rawRules } = await supabase
      .from('ai_knowledge_rules')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    let activeRules: string[] = [];
    let filterFolderId: string | null = null;
    
    if (rawRules && rawRules.length > 0) {
      for (const rule of rawRules) {
        const kw = rule.keyword ? rule.keyword.trim().toLowerCase() : '';
        if (!kw || kw === '*' || kw === 'global' || lastMessage.toLowerCase().includes(kw)) {
          activeRules.push(rule.instruction);
          if (rule.target_folder_id && !filterFolderId) {
            filterFolderId = rule.target_folder_id; // Ambil folder_id dari rule pertama yang cocok
          }
        }
      }
    }

    const rulesText = activeRules.length > 0 
      ? `\n\nATURAN KHUSUS DARI MEMORI:\n${activeRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}` 
      : '';

    // 2. Rewrite Query (Keyword Extraction via LLM)
    let extractedKeyword = lastMessage;
    try {
      let extractUrl = 'https://openrouter.ai/api/v1/chat/completions';
      let extractAuth = `Bearer ${openRouterKey}`;
      let extractModel = normalizeModelForOpenRouter(selectedModel);

      if (isDeepSeekDirect && deepseekKey) {
        extractUrl = 'https://api.deepseek.com/chat/completions';
        extractAuth = `Bearer ${deepseekKey}`;
        extractModel = 'deepseek-chat';
      }

      if (extractAuth) {
        const extractResponse = await fetch(extractUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': extractAuth,
          },
          body: JSON.stringify({
            model: extractModel,
            messages: [
              { 
                role: 'system', 
                content: `Tugas Anda adalah mengekstrak kata kunci pencarian database materi brosur MTA dari pertanyaan pengguna.
ATURAN PENTING:
1. Pahami konteks percakapan sebelumnya. Jika pertanyaan terakhir adalah tindak lanjut (misal: "kok arabic nya tidak ada kata ke 7?" atau "carikan dalil aqiqah di hari ke 7"), hubungkan dengan topik percakapan sebelumnya (contoh: "aqiqah OR ke-7 OR samurah").
2. Buang kata tanya/perintah seperti "carikan", "tolong", "mana dalil", "kok", "kenapa", "tidak ada". Ambil kata benda/istilah agama intinya saja.
3. Untuk istilah angka/hari: sertakan variasi penulisan (contoh: "ke-7" -> "aqiqah OR ke-7 OR ketujuh").
4. Kembalikan 1 sampai 3 kata kunci paling relevan, pisahkan HANYA dengan kata "OR". JANGAN pakai tanda baca lain.`
              },
              ...messages.slice(-4)
            ],
            temperature: 0.1,
          }),
        });
        if (extractResponse.ok) {
          const extractData = await extractResponse.json();
          const kw = extractData.choices?.[0]?.message?.content?.trim();
          if (kw && kw.length > 0) {
            extractedKeyword = kw.replace(/["']/g, ''); // bersihkan tanda kutip jika ada
          }
        }
      }
    } catch (e) {
      console.log('Keyword extraction failed', e);
    }
    
    const searchQuery = extractedKeyword;

    // 3. Search Database (RAG) dengan Relevance Density Scoring & Agentic Thinking Steps
    let contextText = '';
    let retrievedDocs: { judul: string; tahun: string; source?: string }[] = [];
    const thinkingSteps: string[] = [
      'Membaca Khazanah Pustaka Brosur Ahad Pagi MTA (1995–2026)...',
    ];

    // Ekstrak akar kata topik inti (bebas kata struktural "rukun", "syarat", "adab", "hukum")
    const { primaryRoots, expandedTerms } = extractCoreTopicTerms(lastMessage, searchQuery);
    const primaryTopicKeyword = primaryRoots[0] || searchQuery.split(/\s+OR\s+/i)[0]?.trim() || lastMessage.trim();

    thinkingSteps.push(
      `Menelusuri perkembangan materi "${primaryRoots.slice(0, 3).join(', ') || primaryTopicKeyword}"...`,
      `Mencari "${expandedTerms.slice(0, 5).join(', ')}" di arsip brosur & indeks hadits...`
    );

    // Query bersih tanpa simbol minus '-' yang memicu operator NOT di PostgreSQL websearch_to_tsquery
    const cleanSearchQuery = primaryRoots
      .slice(0, 3)
      .join(' ')
      .replace(/-+/g, ' ')
      .replace(/[^\w\s\u0600-\u06FF]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || primaryTopicKeyword;

    const candidateMap = new Map<any, any>();
    const addCandidates = (items: any[] | null | undefined) => {
      if (!items) return;
      for (const item of items) {
        if (item && item.id && !candidateMap.has(item.id)) {
          candidateMap.set(item.id, item);
        }
      }
    };

    // 3a. Coba RPC search_brosur_ranked dengan kata kunci topik inti (bukan kata "rukun"/"adab")
    const queryUsed = primaryTopicKeyword.length >= 3 ? primaryTopicKeyword : cleanSearchQuery;
    const { data: primaryData, error: primaryErr } = await supabase.rpc('search_brosur_ranked', {
      search_query: queryUsed,
      filter_folder_id: filterFolderId,
    });

    if (!primaryErr && primaryData && primaryData.length > 0) {
      addCandidates(primaryData);
    }

    // 3b. Tarik kandidat langsung berdasarkan semua akar kata topik inti (Judul & Isi)
    // Kita mengambil hingga 80 kandidat tanpa membatasi tahun 2026 saja agar brosur emas tahun 2000-2025 ikut dinilai!
    const coreSearchWords = Array.from(new Set([...primaryRoots.slice(0, 3), ...expandedTerms.slice(0, 5)])).filter(
      (w) => w.length >= 3
    );

    for (const kw of coreSearchWords.slice(0, 4)) {
      // Cari di judul terlebih dahulu
      let titleQuery = supabase
        .from('brosur')
        .select('id, judul, tahun, konten, teks_bersih')
        .ilike('judul', `%${kw}%`)
        .limit(30);

      if (filterFolderId) {
        titleQuery = titleQuery.eq('folder_id', filterFolderId);
      }
      const { data: titleHits } = await titleQuery;
      addCandidates(titleHits);
    }

    // Cari di dalam isi konten untuk akar kata utama + sinonim terpenting (misal: nikah, wali, mahar, walimah)
    const contentOrClauses = coreSearchWords
      .slice(0, 4)
      .map((kw) => `konten.ilike.%${kw}%`)
      .join(',');

    if (contentOrClauses) {
      let bodyQuery = supabase
        .from('brosur')
        .select('id, judul, tahun, konten, teks_bersih')
        .or(contentOrClauses)
        .limit(80);

      if (filterFolderId) {
        bodyQuery = bodyQuery.eq('folder_id', filterFolderId);
      }
      const { data: bodyHits } = await bodyQuery;
      addCandidates(bodyHits);
    }

    // 3c. Beri Skor Kepadatan Relevansi (Relevance Density Scoring) pada seluruh kandidat
    // Hanya brosur yang BENAR-BENAR relevan dengan topik yang lolos (membuang Puasa Sunnah / Hidup Bersih yang kebetulan lewat)
    const scoredCandidates = Array.from(candidateMap.values())
      .map((doc: any) => {
        const { score, readableTitle, primaryHits } = scoreBrosurRelevance(doc, primaryRoots, expandedTerms);
        return {
          ...doc,
          judul_tampil: readableTitle,
          relevance_score: score,
          primary_hits: primaryHits,
        };
      })
      .filter((doc) => doc.relevance_score >= 12 && doc.primary_hits >= 1)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    const searchResults = scoredCandidates.slice(0, 16);

    // 3d. Hybrid Search via pgvector (brosur_chunks) jika tersedia
    const googleAiKey = settings.google_ai_token || process.env.GOOGLE_AI_API_KEY;
    const queryEmbedding = googleAiKey
      ? await generateGoogleEmbedding(lastMessage, googleAiKey)
      : null;

    let vectorChunksContext = '';
    try {
      const { data: chunkHits, error: chunkRpcErr } = await supabase.rpc('hybrid_search_brosur_chunks', {
        query_text: queryUsed,
        query_embedding: queryEmbedding ? `[${queryEmbedding.join(',')}]` : null,
        match_count: 12,
        filter_folder: filterFolderId,
      });

      if (!chunkRpcErr && chunkHits && chunkHits.length > 0) {
        // Filter chunkHits agar hanya yang mengandung setidaknya 1 kata kunci perluasan topik
        const relevantChunkHits = chunkHits.filter((c: any) => {
          const textLower = `${c.judul || ''} ${c.chunk_text || ''}`.toLowerCase();
          return expandedTerms.some((t) => t.length >= 3 && textLower.includes(t));
        });

        if (relevantChunkHits.length > 0) {
          vectorChunksContext =
            '=== POTONGAN SUB-BAB BROSUR TERKAIT (Hybrid pgvector + FTS 1995-2026) ===\n' +
            relevantChunkHits
              .map((c: any) => {
                const readableChunkTitle = extractReadableBrosurTitle(c.judul || 'Brosur MTA', c.chunk_text || '');
                const exists = retrievedDocs.some((d) => d.judul === readableChunkTitle);
                if (!exists && retrievedDocs.length < 20) {
                  retrievedDocs.push({ judul: readableChunkTitle, tahun: c.tahun, source: 'Sub-Bab Brosur' });
                }
                return `[Sub-Bab Brosur: ${readableChunkTitle} (Tahun ${c.tahun || 'Arsip MTA'}), Bagian #${(c.chunk_index || 0) + 1}]\n${c.chunk_text}`;
              })
              .join('\n\n');
        }
      }
    } catch (_) {
      // Abaikan jika fungsi RPC hybrid_search_brosur_chunks belum diaktifkan di Supabase
    }

    if (searchResults && searchResults.length > 0) {
      for (const b of searchResults) {
        const docJudul = b.judul_tampil || extractReadableBrosurTitle(b.judul || b.judul_brosur || 'Brosur MTA', b.konten || b.teks_bersih || '');
        if (!retrievedDocs.some((d) => d.judul === docJudul) && retrievedDocs.length < 20) {
          retrievedDocs.push({ judul: docJudul, tahun: b.tahun, source: 'Brosur Ahad Pagi' });
          if (thinkingSteps.length < 9) {
            thinkingSteps.push(`Membaca: ${docJudul}${b.tahun ? ` (${b.tahun})` : ''}`);
          }
        }
      }

      // Gunakan Smart Multi-Chunking pada dokumen-dokumen teratas agar seluruh dalil utuh & presisi
      contextText = searchResults
        .slice(0, 10)
        .map((b: any, index: number) => {
          const rawSource = b.konten || b.teks_bersih || '';
          const docJudul = b.judul_tampil || b.judul || b.judul_brosur || 'Brosur MTA';
          const charBudget = index < 4 ? 4200 : 1400;
          const smartSnippet = extractSmartMultiChunks(rawSource, expandedTerms.join(' '), lastMessage, charBudget);
          return `[Brosur #${index + 1}: ${docJudul} (Tahun ${b.tahun || 'Arsip MTA'})]\n${smartSnippet}`;
        })
        .join('\n\n');
    }

    if (vectorChunksContext) {
      contextText = vectorChunksContext + (contextText ? '\n\n' + contextText : '');
    }

    // 4. Pencarian Lintas Tabel: Periksa tabel hadist_brosur (16.800+ hadits) dengan kata kunci topik inti & sinonimnya
    const mainTopicWord = primaryRoots[0] || coreSearchWords[0];

    if (coreSearchWords.length > 0 || queryEmbedding) {
      try {
        let matchedHadist: any[] = [];
        const seenHadist = new Set<string>();

        // Cari hadits berdasarkan semua kata kunci topik utama (misal: nikah, wali, mahar, walimah)
        const hadistOrClauses = coreSearchWords
          .slice(0, 4)
          .map((kw) => `terjemahan.ilike.%${kw}%,catatan.ilike.%${kw}%`)
          .join(',');

        if (hadistOrClauses) {
          const { data: ilikeHadist } = await supabase
            .from('hadist_brosur')
            .select('kutipan_arab, terjemahan, perawi_sumber, catatan')
            .or(hadistOrClauses)
            .limit(18);

          if (ilikeHadist) {
            for (const h of ilikeHadist) {
              const key = `${h.perawi_sumber || ''}-${(h.terjemahan || '').slice(0, 40)}`;
              if (!seenHadist.has(key)) {
                seenHadist.add(key);
                matchedHadist.push(h);
              }
            }
          }
        }

        // Urutkan hadits berdasarkan berapa banyak kata kunci topik yang cocok di terjemahan/catatan
        matchedHadist = matchedHadist
          .map((h: any) => {
            const txt = `${h.terjemahan || ''} ${h.catatan || ''} ${h.perawi_sumber || ''}`.toLowerCase();
            let hScore = 0;
            for (const r of primaryRoots) {
              if (txt.includes(r)) hScore += 10;
            }
            for (const ex of expandedTerms) {
              if (txt.includes(ex)) hScore += 4;
            }
            return { ...h, hScore };
          })
          .filter((h) => h.hScore > 0)
          .sort((a, b) => b.hScore - a.hScore);

        if (matchedHadist.length > 0) {
          // Tambahkan hadits yang benar-benar relevan ke retrievedDocs (hingga rentang 10-20 rujukan)
          matchedHadist.forEach((h: any, idx: number) => {
            if (retrievedDocs.length < 20) {
              const shortMeaning = (h.catatan || h.terjemahan || '')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 55);
              const perawi = (h.perawi_sumber || `Hadits #${idx + 1}`).replace(/\s+/g, ' ').trim();
              const label = `Dalil Hadits: ${perawi}${shortMeaning ? ` — "${shortMeaning}..."` : ''}`;
              if (!retrievedDocs.some((d) => d.judul === label)) {
                retrievedDocs.push({ judul: label, tahun: 'Indeks Hadits', source: 'Database Hadits' });
                if (thinkingSteps.length < 10) {
                  thinkingSteps.push(`Membaca: ${perawi}`);
                }
              }
            }
          });

          const hadistContext =
            '=== DALIL HADITS SPESIFIK (Tabel hadist_brosur) ===\n' +
            matchedHadist
              .slice(0, 8)
              .map((h: any, idx: number) => {
                return `[Hadits #${idx + 1} - ${h.perawi_sumber || 'Rujukan Hadits'}]\nTeks Arab: ${h.kutipan_arab || ''}\nArti: ${h.terjemahan || ''}\nKeterangan: ${h.catatan || ''}`;
              })
              .join('\n\n');

          contextText = (contextText ? contextText + '\n\n' : '') + hadistContext;
        }
      } catch (e) {
        console.log('Error querying hadist_brosur:', e);
      }
    }

    // Batasi ketat maksimal 20 rujukan (TANPA backfill buta tahun terbaru agar 100% relevan!)
    if (retrievedDocs.length > 20) {
      retrievedDocs = retrievedDocs.slice(0, 20);
    }

    thinkingSteps.push(
      `Menyusun sintesis penjelasan materi & dalil dari ${retrievedDocs.length} rujukan relevan...`
    );

    // 5. Cari juga di tabel materi_kajian jika ada materi tematik yang relevan
    if (mainTopicWord) {
      try {
        const { data: matchedKajian } = await supabase
          .from('materi_kajian')
          .select('judul, tahun, konten, teks_bersih')
          .or(`judul.ilike.%${mainTopicWord}%,teks_bersih.ilike.%${mainTopicWord}%`)
          .limit(2);

        if (matchedKajian && matchedKajian.length > 0) {
          const kajianContext = '=== MATERI KAJIAN TEMATIK TERKAIT (Tabel materi_kajian) ===\n' +
            matchedKajian.map((k: any) => {
              const snippet = extractSmartMultiChunks(k.konten || k.teks_bersih || '', searchQuery, lastMessage, 2200);
              return `[Materi Kajian: ${k.judul} (${k.tahun || ''})]\n${snippet}`;
            }).join('\n\n');

          contextText = (contextText ? contextText + '\n\n' : '') + kajianContext;
        }
      } catch (_) {}
    }

    if (localContext) {
      contextText = (contextText ? contextText + '\n\n' : '') + localContext;
    }

    const finalSystemPrompt = `Anda adalah "Asma' (Asisten Majlis Tafsir Al Qur'an)", asisten AI yang membantu Guru Daerah menjawab pertanyaan berdasarkan database brosur Majlis Tafsir Al-Qur'an (MTA).
Tugas Anda adalah mencari luas (rentang arsip 1995-2026), mengekstrak poin inti secara singkat & tepat, lalu menelaah dan menyusunnya menjadi deskripsi penjelasan hukum yang utuh HANYA berdasarkan teks brosur.

METODE TELAAH ARSIP & DESKRIPSI (1995 - 2026):
1. RENTANG ARSIP BROSUR: Database memuat arsip materi brosur MTA kurun waktu tahun 1995 hingga 2026.
2. EKSTRAKSI SINGKAT & TEPAT: Ambil intisari dalil, potongan hadits/ayat, dan keterangan penting secara singkat dan presisi dari tiap brosur yang relevan.
3. TELAAH MENDALAM: Cermati dan telaah seluruh kutipan brosur yang ditemukan (dari berbagai tahun terbitan) untuk memahami keutuhan konteks materinya.
4. JADIKAN DESKRIPSI UTUH: Rangkum hasil telaah tersebut menjadi deskripsi penjelasan yang mengalir terstruktur, lugas, santun, dan mudah dipahami oleh Guru Daerah, dengan selalu menyertakan teks Arab asli, terjemah, dan referensi nomor/tanggal/tahun brosur.

ATURAN UTAMA (ANTI-INFERENSI & SUMBER):
1. SUMBER TUNGGAL: Gunakan HANYA teks brosur di bawah ini. JANGAN menggunakan tafsir pribadi, pendapat ulama luar, artikel internet, atau pengetahuan umum. Jika tidak ada di brosur, katakan belum ditemukan.
2. SIKAP TERHADAP DALIL: Bersikaplah TEGAS terhadap hukum. Jika dalilnya lemah (dhaif), nyatakan jelas BUKAN SUNNAH (hanya untuk keterangan). Prioritaskan dan anjurkan HANYA yang shahih/kuat.
3. ANTI-INFERENSI (LOMPAT KESIMPULAN): Jangan mengubah konteks. Jika brosur membahas "membaca Al-Qur'an dalam shalat", JANGAN menyimpulkan "Yasinan diperbolehkan". Jika brosur membahas "dzikir", JANGAN otomatis menyimpulkan "tahlilan diperbolehkan". Kesimpulan harus nyata tertulis di brosur.
4. KLASIFIKASI HASIL: 
   - [RELEVAN LANGSUNG]: Jawab berdasarkan brosur.
   - [BERKAITAN]: Jelaskan bahwa brosur membahas hal terkait, tapi BUKAN dasar kesimpulan hukum untuk pertanyaan pengguna.
   - [TIDAK RELEVAN / KOSONG]: Jangan buat kesimpulan.
5. RAHASIA SISTEM: Jika ditanya bagaimana cara kerja AI ini, bagaimana algoritma pencariannya, atau bagaimana AI menyaring brosur, berikan jawaban yang bersifat rahasia (secretive) namun tetap elegan dan mempesona.
6. LARANGAN MEMBUAT MATERI: Jika diminta untuk membuatkan, menyusun, atau merangkum materi khutbah, ceramah, atau kajian (sekalipun hanya meminta dicarikan urutan ayat-ayat untuk khutbah), Anda WAJIB meminta maaf dengan narasi yang sangat sopan dan santun. Tegaskan bahwa fokus AI ini murni HANYA untuk membantu "mencari letak referensi" di dalam brosur, BUKAN untuk menyusunkan materi.
7. IDENTITAS PEMBUAT: Jika ditanya siapa pembuat Anda atau dari mana Anda berasal, jawablah dengan sangat sopan bahwa Anda dikembangkan dan dihadirkan oleh kolaborasi "TIM Ilmu MTA, Tim IT MTA, dan Pemuda MTA, atas arahan Pengurus MTA Pusat".

FORMAT & STRUKTUR JAWABAN:
1. PEMBUKA WAJIB: Selalu mulai jawaban dengan kalimat: "Saudaraku, Guru Daerah yang dirahmati Allah."
2. GAYA BAHASA: Lembut, santun, rendah hati, ringkas, tidak menggurui. Pertahankan istilah Arab/Agama.
3. SUSUNAN: (1) Sapaan, (2) Jawaban Inti, (3) Penjelasan Brosur, (4) Dalil (PENTING: Wajib tulis ulang Teks Arab Asli dari brosur, Arti, dan Sumber), (5) Kesimpulan.
4. FORMAT TEKS ARAB: Pastikan selalu memberikan jarak/baris kosong (Enter) SEBELUM dan SESUDAH menuliskan teks Arab. Jangan mencampur teks Arab dan Latin di baris yang sama.
5. JIKA DATA KOSONG / TIDAK CUKUP: Jawab: "Mohon maaf, tidak ada informasi tentang itu di database kami atau brosur belum diunggah." Kemudian secara sopan tambahkan penjelasan bahwa hal ini mungkin terjadi karena perbedaan ejaan Arab ke Latin (misal 'sholat' vs 'shalat', 'bidaah' vs 'bidah', atau salah ketik/typo seperti 'nhtah' untuk 'nikah'), atau karena teks asli di brosur ditulis menggunakan huruf Arab asli. Sarankan pengguna untuk mencoba sinonim atau ejaan lain.
6. PERTANYAAN DI LUAR RANAH AGAMA: Jawab: "Mohon maaf, Pertanyaan anda diluar ranah kami."
7. IDENTITAS REFERENSI: Di akhir jawaban, HANYA jika Anda berhasil mengutip brosur, tampilkan Judul, Nomor, dan Tanggal Brosur.
8. PENGECEKAN AKHIR: Jangan pernah menampilkan artefak teknis (seperti JSON, token, dll). Periksa typo.

=== KONTEKS BROSUR ===
${contextText || '(Konteks kosong. Ingat Aturan: Jangan Mengarang)'}
=== AKHIR KONTEKS ===
${rulesText}
${settings?.system_prompt ? `\n=== INSTRUKSI KHUSUS PENGELOLA (/dashboard/ai-settings) ===\n${settings.system_prompt}\n` : ''}
`;


    const openRouterMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
    ];

    let chatUrl = 'https://openrouter.ai/api/v1/chat/completions';
    const chatHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    let effectiveChatModel = normalizeModelForOpenRouter(selectedModel);

    if (isDeepSeekDirect && deepseekKey) {
      chatUrl = 'https://api.deepseek.com/chat/completions';
      chatHeaders['Authorization'] = `Bearer ${deepseekKey}`;
      effectiveChatModel = selectedModel;
    } else {
      chatHeaders['Authorization'] = `Bearer ${openRouterKey}`;
      chatHeaders['HTTP-Referer'] = 'https://www.ulilalbab.fun';
      chatHeaders['X-Title'] = 'Ulil Albab Chat AI';
    }

    const chatBody: any = {
      model: effectiveChatModel,
      messages: openRouterMessages,
    };
    // DeepSeek R1 (reasoner) performs best without temperature or with default
    if (effectiveChatModel !== 'deepseek-reasoner' && effectiveChatModel !== 'deepseek/deepseek-r1') {
      chatBody.temperature = 0.7;
    }

    const response = await fetch(chatUrl, {
      method: 'POST',
      headers: chatHeaders,
      body: JSON.stringify(chatBody),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal menghubungi server AI.' },
        { status: response.status }
      );
    }

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    // Hitung token dan kategori topik untuk analitik real-time
    const usage = data.usage || {};
    const promptTokens = usage.prompt_tokens || Math.round(finalSystemPrompt.length / 4);
    const completionTokens = usage.completion_tokens || Math.round((data.choices?.[0]?.message?.content || '').length / 4);
    const totalTokens = usage.total_tokens || (promptTokens + completionTokens);

    const reqSource = body.source || (request.headers.get('user-agent')?.includes('Dart') ? 'mobile' : 'web');

    let topicCategory = 'Umum';
    const lowerMsg = lastMessage.toLowerCase();
    if (lowerMsg.includes('shalat') || lowerMsg.includes('salat') || lowerMsg.includes('wudhu') || lowerMsg.includes('sujud')) {
      topicCategory = 'Shalat & Thaharah';
    } else if (lowerMsg.includes('puasa') || lowerMsg.includes('ramadhan') || lowerMsg.includes('fidyah') || lowerMsg.includes('sahur')) {
      topicCategory = 'Puasa & Fidyah';
    } else if (lowerMsg.includes('zakat') || lowerMsg.includes('sedekah') || lowerMsg.includes('infak') || lowerMsg.includes('riba') || lowerMsg.includes('jual')) {
      topicCategory = 'Zakat & Muamalah';
    } else if (lowerMsg.includes('doa') || lowerMsg.includes('zikir') || lowerMsg.includes('wirid') || lowerMsg.includes('istighfar')) {
      topicCategory = 'Zikir & Doa';
    } else if (lowerMsg.includes('nikah') || lowerMsg.includes('cerai') || lowerMsg.includes('waris') || lowerMsg.includes('keluarga')) {
      topicCategory = 'Munakahat & Keluarga';
    } else if (lowerMsg.includes('jumat') || lowerMsg.includes('khutbah')) {
      topicCategory = 'Shalat Jumat & Khutbah';
    }

    // Catat log interaksi secara asinkron ke Supabase (tabel ai_query_logs)
    Promise.resolve(
      supabase.from('ai_query_logs').insert([{
        query_text: lastMessage.substring(0, 500),
        topic_category: topicCategory,
        model_used: selectedModel,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
        latency_ms: latencyMs,
        retrieved_docs_count: retrievedDocs.length,
        source: reqSource,
      }])
    ).catch(() => {});

    const debug_log = {
      raw_rules_count: rawRules ? rawRules.length : 0,
      active_rules: activeRules,
      extracted_keyword: extractedKeyword,
      primary_roots: primaryRoots,
      expanded_terms: expandedTerms,
      thinking_steps: thinkingSteps,
      latency_sec: Number((latencyMs / 1000).toFixed(1)),
      search_filter_folder_id: filterFolderId,
      retrieved_docs: retrievedDocs,
      system_prompt_length: finalSystemPrompt.length,
      config: {
        archive_years: '1995-2026',
        max_docs: 20,
        max_chars_per_doc: 4200
      }
    };

    const assistantReplyText = data.choices?.[0]?.message?.content || '';
    const sessionTitle = body.sessionTitle || lastMessage.substring(0, 42) + (lastMessage.length > 42 ? '...' : '');
    const incomingDbSessionId = body.dbSessionId && /^[0-9a-fA-F-]{36}$/.test(body.dbSessionId)
      ? body.dbSessionId
      : crypto.randomUUID();
    const sessionSlug = body.sessionSlug || buildSessionSlug(sessionTitle, incomingDbSessionId);

    const fullSessionMessages = [
      ...messages,
      { role: 'assistant', content: assistantReplyText, debug: debug_log }
    ];

    // Simpan / Perbarui permanen percakapan beserta slug ke tabel ai_simulator_sessions di database Supabase
    try {
      const { error: upsertWithSlugErr } = await supabase
        .from('ai_simulator_sessions')
        .upsert(
          [{
            id: incomingDbSessionId,
            slug: sessionSlug,
            title: sessionTitle,
            messages: fullSessionMessages,
            updated_at: new Date().toISOString()
          }],
          { onConflict: 'id' }
        );

      // Fallback otomatis jika kolom `slug` belum ditambahkan di tabel Supabase
      if (upsertWithSlugErr) {
        await supabase
          .from('ai_simulator_sessions')
          .upsert(
            [{
              id: incomingDbSessionId,
              title: sessionTitle,
              messages: fullSessionMessages,
              updated_at: new Date().toISOString()
            }],
            { onConflict: 'id' }
          );
      }
    } catch (_) {}

    return NextResponse.json({ 
      success: true, 
      text: assistantReplyText,
      dbSessionId: incomingDbSessionId,
      slug: sessionSlug,
      debug_log: debug_log
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server' },
      { status: 500, headers: corsHeaders }
    );
  }
}
