import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt materi tidak boleh kosong.' }, { status: 400 });
    }

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

    const systemPrompt = `Kamu adalah Asisten AI. Jawablah permintaan pengguna dengan baik dan komprehensif.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
        'HTTP-Referer': 'https://www.ulilalbab.fun',
        'X-Title': 'Ulil Albab Generate AI',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
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

    return NextResponse.json({ 
      success: true, 
      text: data.choices?.[0]?.message?.content || ''
    });

  } catch (error: any) {
    console.error('API /api/ai/generate Error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal pada server' },
      { status: 500 }
    );
  }
}
