import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const { code, action = 'check' } = await req.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Kode akses tidak boleh kosong' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = await createClient();
    const cleanCode = code.toString().trim().toUpperCase();

    // 1. Coba gunakan RPC function jika sudah dipasang di database
    const { data: rpcData, error: rpcError } = await supabase.rpc('check_and_consume_ai_quota', {
      p_code: cleanCode,
      p_increment: action === 'consume',
    });

    if (!rpcError && rpcData) {
      return NextResponse.json(rpcData, { headers: corsHeaders });
    }

    // 2. Fallback: Lakukan pengecekan manual langsung ke tabel access_codes
    const { data: codeData, error: codeError } = await supabase
      .from('access_codes')
      .select('code, is_active, ai_daily_limit, ai_reset_hour')
      .eq('code', cleanCode)
      .maybeSingle();

    if (codeError || !codeData) {
      return NextResponse.json(
        { allowed: false, error: 'Kode akses tidak ditemukan' }, 
        { status: 404, headers: corsHeaders }
      );
    }

    if (!codeData.is_active) {
      return NextResponse.json(
        { allowed: false, error: 'Kode akses sudah tidak aktif' }, 
        { status: 403, headers: corsHeaders }
      );
    }

    const limit = codeData.ai_daily_limit !== undefined && codeData.ai_daily_limit !== null 
      ? Number(codeData.ai_daily_limit) 
      : 20;
    const resetHour = codeData.ai_reset_hour !== undefined && codeData.ai_reset_hour !== null 
      ? Number(codeData.ai_reset_hour) 
      : 0;

    // Hitung tanggal efektif siklus kuota (WIB / UTC+7)
    const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
    const currentHourWib = nowWib.getUTCHours();
    if (currentHourWib < resetHour) {
      nowWib.setUTCDate(nowWib.getUTCDate() - 1);
    }
    const cycleDateStr = nowWib.toISOString().split('T')[0];

    // Cek penggunaan di tabel access_code_ai_usage
    let usedCount = 0;
    const { data: usageData } = await supabase
      .from('access_code_ai_usage')
      .select('question_count')
      .eq('code', cleanCode)
      .eq('usage_date', cycleDateStr)
      .maybeSingle();

    if (usageData && typeof usageData.question_count === 'number') {
      usedCount = usageData.question_count;
    }

    if (limit <= 0) {
      // Unlimited
      if (action === 'consume') {
        usedCount += 1;
        await supabase
          .from('access_code_ai_usage')
          .upsert({
            code: cleanCode,
            usage_date: cycleDateStr,
            question_count: usedCount,
            last_used_at: new Date().toISOString(),
          }, { onConflict: 'code,usage_date' });
      }

      return NextResponse.json({
        allowed: true,
        is_unlimited: true,
        limit: 0,
        used: usedCount,
        remaining: 99999,
        reset_hour: resetHour,
        cycle_date: cycleDateStr,
      }, { headers: corsHeaders });
    }

    if (usedCount >= limit) {
      return NextResponse.json({
        allowed: false,
        is_unlimited: false,
        limit,
        used: usedCount,
        remaining: 0,
        reset_hour: resetHour,
        cycle_date: cycleDateStr,
        error: 'Kuota pertanyaan AI hari ini telah habis',
      }, { headers: corsHeaders });
    }

    if (action === 'consume') {
      usedCount += 1;
      await supabase
        .from('access_code_ai_usage')
        .upsert({
          code: cleanCode,
          usage_date: cycleDateStr,
          question_count: usedCount,
          last_used_at: new Date().toISOString(),
        }, { onConflict: 'code,usage_date' });
    }

    const remaining = Math.max(0, limit - usedCount);

    return NextResponse.json({
      allowed: true,
      is_unlimited: false,
      limit,
      used: usedCount,
      remaining,
      reset_hour: resetHour,
      cycle_date: cycleDateStr,
    }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Gagal memproses kuota', details: err.message }, 
      { status: 500, headers: corsHeaders }
    );
  }
}

