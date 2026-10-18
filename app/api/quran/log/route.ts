import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { action, status, details, changes_detected, applied } = await request.json();
    const supabase = await createClient();

    const { data, error } = await supabase.from('quran_sync_logs').insert({
      status: status || 'SUCCESS',
      details: details || `Sinkronisasi data Al-Quran ${action || ''}`,
      changes_detected: changes_detected ?? false,
      applied: applied ?? true,
      sync_date: new Date().toISOString()
    }).select().single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, log: data });
  } catch (error: any) {
    console.error('Error recording quran sync log:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
