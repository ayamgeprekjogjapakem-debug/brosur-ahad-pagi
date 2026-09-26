import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token: rawToken, model, provider } = await request.json();
    const token = rawToken?.trim();

    if (!token) {
      return NextResponse.json({ success: false, message: 'Token kosong!' }, { status: 400 });
    }

    if (provider === 'google') {
      let actualModel = model.replace('-native', '');
      if (actualModel === 'gemini-1.5-flash' || actualModel === 'gemini-2.5-flash') actualModel = 'gemini-3.8-flash';
      
      const aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:generateContent?key=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Balas dengan kata 'OK' saja." }] }],
          generationConfig: { maxOutputTokens: 10 }
        })
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json();
        return NextResponse.json({ success: false, message: `Gagal terhubung ke Google AI: ${errorData.error?.message || aiRes.statusText}` });
      }
      return NextResponse.json({ success: true, message: 'Koneksi ke Google AI Studio Sukses!' });
    } 
    
    else {
      // OpenRouter
      const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Pustaka MTA Test'
        },
        body: JSON.stringify({
          model: model || 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: 'Say OK' }],
          max_tokens: 10
        })
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json();
        return NextResponse.json({ success: false, message: `Gagal terhubung ke OpenRouter: ${errorData.error?.message || aiRes.statusText}` });
      }
      return NextResponse.json({ success: true, message: 'Koneksi ke OpenRouter Sukses!' });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, message: `Error sistem: ${error.message}` });
  }
}
