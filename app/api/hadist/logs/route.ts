import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Pastikan tabel hadist_edit_logs siap (bisa auto create jika belum ada)
async function ensureAuditLogTable(supabase: any) {
  try {
    // Jalankan pengecekan atau insert aman
    await supabase.from('hadist_edit_logs').select('id').limit(1);
  } catch (e) {
    // silent
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const { data, error } = await supabase
      .from('hadist_edit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Jika tabel belum dibuat, fallback gracefully
      return NextResponse.json({ success: true, logs: [] });
    }

    return NextResponse.json({ success: true, logs: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: true, logs: [] });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { hadist_id, hadist_title, rawi_kitab, field_changes, editor_name, editor_email } = await request.json();

    const { data: { user } } = await supabase.auth.getUser();

    // Dapatkan info user
    let userEmail = editor_email || user?.email || 'admin@brosur.mta';
    let userName = editor_name || user?.user_metadata?.name || userEmail.split('@')[0];

    const logEntry = {
      hadist_id: hadist_id || null,
      hadist_title: hadist_title || 'Hadist Brosur',
      rawi_kitab: rawi_kitab || 'Hadist',
      editor_name: userName,
      editor_email: userEmail,
      field_changes: field_changes || 'Memperbarui data hadist',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('hadist_edit_logs')
      .insert(logEntry)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Warning inserting hadist edit log to supabase:', error.message);
      return NextResponse.json({ success: true, log: logEntry });
    }

    return NextResponse.json({ success: true, log: data || logEntry });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
