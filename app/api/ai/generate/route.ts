import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { prompt, texts } = body;

    const userPrompt = prompt?.trim() || 'Susunlah materi kajian tematik yang terstruktur, lengkap dengan dalil hadits berharakat dan kesimpulan hukumnya berdasarkan teks referensi brosur yang diberikan.';
    const referenceTexts = texts?.trim() || '';

    if (!userPrompt && !referenceTexts) {
      return NextResponse.json({ error: 'Referensi teks atau prompt materi tidak boleh kosong.' }, { status: 400 });
    }

    const { data: settings } = await supabase
      .from('app_settings')
      .select('ai_enabled, openrouter_token, google_ai_token, chat_model, material_model')
      .eq('id', 1)
      .single();

    if (!settings || !settings.ai_enabled) {
      return NextResponse.json({ error: 'Fitur AI sedang dinonaktifkan oleh administrator.' }, { status: 403 });
    }

    const openRouterKey = settings.openrouter_token || process.env.OPENROUTER_API_KEY;
    const googleAiKey = settings.google_ai_token || process.env.GOOGLE_AI_API_KEY;

    if (!openRouterKey && !googleAiKey) {
      return NextResponse.json({ error: 'API Key AI belum dikonfigurasi di Pengaturan AI.' }, { status: 500 });
    }

    const selectedModel = settings.material_model || settings.chat_model || 'google/gemini-2.5-flash';

    // System Prompt Terstruktur khusus penyusunan materi kajian MTA
    const systemPrompt = `Anda adalah Asisten Penyusun Materi Kajian Islam Pustaka MTA.
Tugas Anda adalah merangkum, mensintesis, dan menyusun draft materi kajian tematik yang komprehensif berdasarkan naskah referensi Brosur Ahad Pagi MTA yang dilampirkan.

PEDOMAN PENYUSUNAN:
1. Grounding Penuh: Gunakan dalil dan yang tercantum dalam teks referensi brosur. Jangan membuat kesimpulan di luar materi brosur.
2. Format Matan Hadits: Tuliskan kutipan ayat Al-Qur'an dan Hadits dalam teks Arab berharakat, terjemahan Indonesia, serta nama perawi/sumbernya.
3. Susunan Materi:
   - Judul & Tema Kajian
   - Mukadimah Singkat
   - Dalil-Dalil Pokok (Arab & Terjemah)
   - Uraian & Pembahasan Hukum Praktis
   - Kesimpulan Amaliah
4. Gaya Bahasa: Santun, sistematis, jelas, dan sesuai dengan manhaj dakwah MTA.`;

    // Batasi teks referensi maksimal 16.000 karakter agar tidak melebihi token / HTTP limit
    const safeReferenceText = referenceTexts ? referenceTexts.substring(0, 16000) : '';

    const userContent = safeReferenceText
      ? `REFERENSI NASKAH BROSUR MTA:\n${safeReferenceText}\n\n---\nPETUNJUK PENYUSUNAN:\n${userPrompt}`
      : userPrompt;

    // Eksekusi pemanggilan AI via OpenRouter (atau fallback Google Gemini)
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://www.ulilalbab.fun',
        'X-Title': 'Ulil Albab Kajian Generator',
      },
      body: JSON.stringify({
        model: selectedModel.replace('-native', ''),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Gagal menghasilkan materi kajian dari server AI.' },
        { status: response.status }
      );
    }

    return NextResponse.json({ 
      success: true, 
      text: data.choices?.[0]?.message?.content || ''
    });

  } catch (error: any) {
    console.error('API /api/ai/generate Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server AI Generator' },
      { status: 500 }
    );
  }
}
