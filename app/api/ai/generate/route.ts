import { NextResponse, NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { texts, prompt, model, apiKey } = await request.json();

    const openRouterKey = apiKey || process.env.OPENROUTER_API_KEY;

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'API Key OpenRouter tidak ditemukan. Harap masukkan API Key Anda.' },
        { status: 400 }
      );
    }

    const selectedModel = model || 'google/gemini-2.5-flash';

    const systemPrompt = `Anda adalah seorang ahli agama Islam, ustadz, dan penulis materi kajian keislaman yang handal. 
Tugas Anda adalah membuat materi kajian yang komprehensif, mendalam, dan mudah dipahami berdasarkan beberapa dokumen referensi brosur yang diberikan.

Berikut adalah teks referensi brosur yang menjadi sumber utama:
=== MULAI REFERENSI ===
${texts}
=== AKHIR REFERENSI ===

Harap susun materi kajian dengan struktur berikut:
1. **Judul Kajian**: Menarik dan relevan.
2. **Pengantar/Pendahuluan**: Latar belakang tema kajian.
3. **Poin-poin Pembahasan**: Berisi ulasan mendalam, penjelasan dalil (Al-Qur'an dan Hadist) yang ada dalam referensi.
4. **Kesimpulan & Hikmah**: Rangkuman singkat dan aplikasi praktis untuk kehidupan sehari-hari.

PENTING:
- Prioritaskan informasi, dalil, dan argumen yang ada di dalam teks referensi.
- Gunakan bahasa Indonesia yang baik, sopan, menginspirasi, dan komunikatif.
- JANGAN gunakan format Markdown seperti simbol '#' untuk heading atau '*' untuk cetak tebal (bold). Buatlah heading/judul bab dengan teks biasa menggunakan huruf kapital (UPPERCASE) atau pemisahan baris kosong saja, dan tulis materi secara natural dan bersih (clean plain text).
- Jangan mengarang dalil yang tidak valid.`;

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
