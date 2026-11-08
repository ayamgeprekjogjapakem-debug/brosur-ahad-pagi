import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Kode tidak boleh kosong' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ valid: false, error: 'Kode akses tidak valid atau sudah nonaktif' }, { status: 404 });
    }

    const allowed: string[] = Array.isArray(data.allowed_features) ? [...data.allowed_features] : [];
    if (data.has_ai_access && !allowed.includes('ai-pustaka')) {
      allowed.push('ai-pustaka');
    }

    return NextResponse.json({ 
      valid: true, 
      code: data.code,
      allowed_features: allowed
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
