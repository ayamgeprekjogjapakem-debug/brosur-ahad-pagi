import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { texts, prompt } = await request.json();

    const supabase = await createClient();

    const { data: settings } = await supabase
      .from('app_settings')
      .select('ai_enabled, openrouter_token, material_model')
      .eq('id', 1)
      .single();

    if (!settings || !settings.ai_enabled) {
      return NextResponse.json({ error: 'Fitur AI sedang dinonaktifkan.' }, { status: 403 });
    }

    const openRouterKey = settings.openrouter_token || process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'API Key OpenRouter tidak ditemukan di pengaturan. Harap konfigurasi di menu Pengaturan AI.' },
        { status: 400 }
      );
    }

    const selectedModel = settings.material_model || 'google/gemini-2.5-flash';

    const systemPrompt = `Anda adalah seorang ahli agama Islam, ustadz, dan penulis materi kajian keislaman yang handal. 
Tugas Anda adalah membuat materi kajian yang komprehensif, mendalam, dan mudah dipahami berdasarkan beberapa dokumen referensi brosur yang diberikan.

Berikut adalah teks referensi brosur yang menjadi sumber utama:
=== ATURAN KETAT MENGENAI DALIL DAN HUKUM IBADAH:
1. KAIDAH FIQIH UTAMA: Dalam urusan ibadah (termasuk pelaksanaan aqiqah, waktu, dan tata caranya), hukum asalnya adalah DILARANG/HARAM kecuali ada dalil yang SHAHIH. 
2. JANGAN PERNAH menggunakan logika "karena tidak ada larangan khusus, maka diperbolehkan". Jika suatu amalan/waktu (seperti aqiqah hari ke-14, ke-21, atau setelah dewasa) hanya bersandar pada hadits DHA'IF atau tidak ada contoh dari Nabi, maka amalan tersebut TIDAK DISYARIATKAN.
3. JIKA HADITS/RIWAYATNYA DHA'IF (LEMAH):
   - Anda WAJIB menolak menjadikannya sebagai landasan hukum.
   - DILARANG KERAS menyarankan, membolehkan, atau memberikan kelonggaran beribadah berdasarkan hadits dha'if tersebut.
   - Contoh Kasus Aqiqah: Jika ditanya aqiqah selain hari ke-7 (misal hari ke-14/21), Anda wajib menjawab: "Hadits riwayat Baihaqi mengenai pelaksanaan hari ke-14 atau ke-21 adalah dha'if (lemah). Oleh karena itu, hal tersebut tidak disyariatkan dan tidak bisa dijadikan hujjah/dalil untuk melakukan aqiqah selain di hari ke-7."
4. JIKA TIDAK DITEMUKAN DALIL:
   - Nyatakan secara tegas: "Belum ditemukan dalil yang shahih yang mendasari hal tersebut dalam arsip rujukan. Karena tidak ada dalil shahih, maka amalan tersebut tidak disyariatkan."
5. URUTAN PENYAJIAN JAWABAN:
   - Sapaan hangat: "Saudaraku, Guru Daerah yang dirahmati Allah."
   - Tegaskan hukum dan kedudukan haditsnya sejak awal kalimat.
   - Jelaskan dalil yang SHAHIH dan MUTTAFAQ 'ALAIH (sertakan teks Arab berharakat, arti, dan rawi riwayatnya).
   - Susun materi kajian dengan struktur: Judul, Pengantar, Poin Pembahasan, Kesimpulan.

PENTING:
- Gunakan bahasa Indonesia yang baik, sopan, menginspirasi, dan komunikatif.
- JANGAN gunakan format Markdown seperti simbol '#' untuk heading atau '*' untuk cetak tebal (bold). Buatlah heading/judul bab dengan teks biasa menggunakan huruf kapital (UPPERCASE) atau pemisahan baris kosong saja, dan tulis materi secara natural dan bersih (clean plain text).
- Jangan mengarang dalil yang tidak valid.
- Buatlah materi kajian yang panjang, komprehensif, dan minimal terdiri dari 100 kata.`;

    const userMessage = prompt 
      ? `Buat materi kajian berdasarkan referensi di atas dengan instruksi tambahan berikut:\n${prompt}`
      : 'Buat materi kajian lengkap berdasarkan referensi di atas.';

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Ulil Albab Kajian AI',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenRouter Error Response:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Gagal terhubung ke OpenRouter API.' },
        { status: response.status }
      );
    }

    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) {
      return NextResponse.json(
        { error: 'Respons OpenRouter kosong atau tidak memiliki konten.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, text: resultText });
  } catch (error: any) {
    console.error('API /api/ai/generate Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
}
