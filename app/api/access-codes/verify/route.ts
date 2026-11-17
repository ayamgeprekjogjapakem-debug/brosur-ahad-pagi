import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Kode tidak boleh kosong' }, { status: 400 });
    }

    const rawCode = String(code).trim().toUpperCase();
    const cleanChars = rawCode.replace(/[^A-Z0-9]/g, '');
    const hyphenated = cleanChars.length > 3 ? `${cleanChars.slice(0, 3)}-${cleanChars.slice(3)}` : cleanChars;

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .or(`code.ilike.${rawCode},code.ilike.${hyphenated},code.ilike.${cleanChars}`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: 'Kode akses tidak valid atau sudah nonaktif' }, { status: 404 });
    }

    const allowed: string[] = Array.isArray(data.allowed_features) ? [...data.allowed_features] : [];
    // AI aktif HANYA jika data.has_ai_access bernilai true DAN fitur 'ai-pustaka' diizinkan
    const hasAiAccess = data.has_ai_access === true && (allowed.length === 0 || allowed.includes('ai-pustaka'));
    const finalAllowed = hasAiAccess
      ? (allowed.includes('ai-pustaka') ? allowed : [...allowed, 'ai-pustaka'])
      : allowed.filter(f => f !== 'ai-pustaka');

    const expiresInSeconds = typeof data.expires_in_seconds === 'number' && data.expires_in_seconds > 0 
      ? data.expires_in_seconds 
      : (data.expires_in_seconds ? parseInt(data.expires_in_seconds, 10) : null);

    const aiDailyLimit = data.ai_daily_limit !== undefined && data.ai_daily_limit !== null
      ? (typeof data.ai_daily_limit === 'number' ? data.ai_daily_limit : parseInt(data.ai_daily_limit, 10))
      : 20;

    const aiResetHour = data.ai_reset_hour !== undefined && data.ai_reset_hour !== null
      ? (typeof data.ai_reset_hour === 'number' ? data.ai_reset_hour : parseInt(data.ai_reset_hour, 10))
      : 0;

    return NextResponse.json({ 
      valid: true, 
      code: data.code,
      has_ai_access: hasAiAccess,
      allowed_features: finalAllowed,
      expires_in_seconds: expiresInSeconds || null,
      ai_daily_limit: aiDailyLimit,
      ai_reset_hour: aiResetHour,
      notes: data.notes || data.description || null
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
