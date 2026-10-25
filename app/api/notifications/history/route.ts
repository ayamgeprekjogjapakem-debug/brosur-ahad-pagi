import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Cek konfigurasi Firebase di server
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const isConfigured = Boolean(projectId && clientEmail && privateKey && !privateKey.includes('your-private-key'));

    // Ambil log riwayat dari tabel push_notification_logs
    let logs: any[] = [];
    const { data, error } = await supabase
      .from('push_notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      logs = data;
    }

    // Ambil daftar brosur terbaru untuk dropdown cepat
    const { data: recentBrosur } = await supabase
      .from('brosur')
      .select('id, judul, slug, tahun')
      .order('tahun', { ascending: false })
      .limit(20);

    return NextResponse.json({
      firebaseConfig: {
        isConfigured,
        projectId: projectId ? `${projectId.substring(0, 4)}***` : null,
      },
      logs,
      recentBrosur: recentBrosur || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
