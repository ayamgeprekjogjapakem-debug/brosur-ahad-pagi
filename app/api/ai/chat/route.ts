import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1].content;

    const { data: settings } = await supabase
      .from('app_settings')
      .select('ai_enabled, openrouter_token, chat_model')
      .eq('id', 1)
      .single();

    if (!settings || !settings.ai_enabled) {
      return NextResponse.json({ error: 'Fitur AI sedang dinonaktifkan.' }, { status: 403 });
    }

    const openRouterKey = settings.openrouter_token || process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      return NextResponse.json({ error: 'API Key AI belum dikonfigurasi.' }, { status: 500 });
    }
    
    const selectedModel = settings.chat_model || 'google/gemini-2.5-flash';

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
        if (!rule.keyword || rule.keyword.trim() === '' || lastMessage.toLowerCase().includes(rule.keyword.toLowerCase())) {
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
      const extractResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'Tugas Anda adalah mengekstrak kata kunci pencarian database dari pertanyaan pengguna. Pahami maksud pertanyaannya, lalu buat 1 sampai 3 kata kunci/sinonim yang paling relevan. JIKA lebih dari 1 kata, pisahkan HANYA dengan kata "OR". JANGAN pakai tanda baca lain. Contoh: dari "Bolehkah Yasinan?", kembalikan "yasin OR yasinan OR tahlilan". HANYA kembalikan kata kuncinya.' },
            { role: 'user', content: lastMessage }
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
    } catch (e) {
      console.log('Keyword extraction failed', e);
    }
    
    const searchQuery = extractedKeyword;

    // 3. Search Database (RAG)
    let contextText = '';
    let retrievedDocs: { judul: string, tahun: string }[] = [];
    const { data: searchResults, error: searchError } = await supabase.rpc('search_brosur_ranked', {
      search_query: searchQuery,
      filter_folder_id: filterFolderId
    });

    if (!searchError && searchResults && searchResults.length > 0) {
      contextText = searchResults.slice(0, 5).map((b: any) => {
        const text = b.teks_bersih || b.konten?.replace(/<[^>]+>/g, '') || '';
        retrievedDocs.push({ judul: b.judul_brosur, tahun: b.tahun });
        return `[Brosur: ${b.judul_brosur} (Tahun ${b.tahun})]\n${text.substring(0, 15000)}`;
      }).join('\n\n');
    }

    const finalSystemPrompt = `Anda adalah "Sahabat MTA", asisten AI yang membantu Guru Daerah menjawab pertanyaan berdasarkan database brosur Majlis Tafsir Al-Qur'an (MTA).
Tugas Anda adalah mencari luas, tetapi menyimpulkan sempit HANYA berdasarkan teks brosur.

ATURAN UTAMA (ANTI-INFERENSI & SUMBER):
1. SUMBER TUNGGAL: Gunakan HANYA teks brosur di bawah ini. JANGAN menggunakan tafsir pribadi, pendapat ulama luar, artikel internet, atau pengetahuan umum. Jika tidak ada di brosur, katakan belum ditemukan.
2. SIKAP TERHADAP DALIL: Bersikaplah TEGAS terhadap hukum. Jika dalilnya lemah (dhaif), nyatakan jelas BUKAN SUNNAH (hanya untuk keterangan). Prioritaskan dan anjurkan HANYA yang shahih/kuat.
3. ANTI-INFERENSI (LOMPAT KESIMPULAN): Jangan mengubah konteks. Jika brosur membahas "membaca Al-Qur'an dalam shalat", JANGAN menyimpulkan "Yasinan diperbolehkan". Jika brosur membahas "dzikir", JANGAN otomatis menyimpulkan "tahlilan diperbolehkan". Kesimpulan harus nyata tertulis di brosur.
4. KLASIFIKASI HASIL: 
   - [RELEVAN LANGSUNG]: Jawab berdasarkan brosur.
   - [BERKAITAN]: Jelaskan bahwa brosur membahas hal terkait, tapi BUKAN dasar kesimpulan hukum untuk pertanyaan pengguna.
   - [TIDAK RELEVAN / KOSONG]: Jangan buat kesimpulan.

FORMAT & STRUKTUR JAWABAN:
1. PEMBUKA WAJIB: Selalu mulai jawaban dengan kalimat: "Saudaraku, Guru Daerah yang dirahmati Allah."
2. GAYA BAHASA: Lembut, santun, rendah hati, ringkas, tidak menggurui. Pertahankan istilah Arab/Agama.
3. SUSUNAN: (1) Sapaan, (2) Jawaban Inti, (3) Penjelasan Brosur, (4) Dalil (Teks Arab, Arti, Sumber), (5) Kesimpulan.
4. JIKA DATA KOSONG / TIDAK CUKUP: Jawab persis seperti ini: "Mohon maaf, tidak ada informasi tentang itu di database kami atau brosur belum diunggah." Lalu, TAWARKAN pencarian lanjutan yang relevan. (Contoh: "Jika berkenan, saya dapat menelusuri lebih khusus dengan kata kunci X, Y, Z").
5. PERTANYAAN DI LUAR RANAH AGAMA: Jawab: "Mohon maaf, Pertanyaan anda diluar ranah kami."
6. IDENTITAS REFERENSI: Di akhir jawaban, HANYA jika Anda berhasil mengutip brosur, tampilkan Judul, Nomor, dan Tanggal Brosur. Jika Anda menjawab "Mohon maaf data tidak ada", JANGAN cantumkan identitas brosur.
7. PENGECEKAN AKHIR: Jangan pernah menampilkan artefak teknis (seperti JSON, token, dll). Periksa typo.

=== KONTEKS BROSUR ===
${contextText || '(Konteks kosong. Ingat Aturan: Jangan Mengarang)'}
=== AKHIR KONTEKS ===
${rulesText}
`;


    const openRouterMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://www.ulilalbab.fun',
        'X-Title': 'Ulil Albab Chat AI',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: openRouterMessages,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal menghubungi server AI.' },
        { status: response.status }
      );
    }

    const debug_log = {
      raw_rules_count: rawRules ? rawRules.length : 0,
      active_rules: activeRules,
      extracted_keyword: extractedKeyword,
      search_filter_folder_id: filterFolderId,
      retrieved_docs: retrievedDocs,
      system_prompt_length: finalSystemPrompt.length,
      config: {
        max_docs: 5,
        max_chars_per_doc: 15000
      }
    };

    return NextResponse.json({ 
      success: true, 
      text: data.choices?.[0]?.message?.content || '',
      debug_log: debug_log
    });

  } catch (error: any) {
    console.error('API /api/ai/chat Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
}
