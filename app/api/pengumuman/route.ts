import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendPushNotification } from '@/utils/fcm';

// Fallback in-memory storage jika tabel Supabase belum dieksekusi
let memoryPengumuman: any[] = [];

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') === 'true';

    let query = supabase
      .from('pengumuman')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (onlyActive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (!error && data) {
      return NextResponse.json({ success: true, data });
    }

    // Fallback ke in-memory jika tabel pengumuman belum dibuat di Supabase
    return NextResponse.json({
      success: true,
      data: onlyActive ? memoryPengumuman.filter((p) => p.is_active) : memoryPengumuman,
      isFallback: true,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    // Cek role admin / super-admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, name')
      .eq('id', user.id)
      .single();

    const isPermitted = profile?.is_active && (profile.role === 'admin' || profile.role === 'super-admin');
    if (!isPermitted) {
      return NextResponse.json({ error: 'Forbidden: Khusus Admin & Super Admin' }, { status: 403 });
    }

    const body = await request.json();
    const {
      judul,
      konten,
      ringkasan,
      kategori = 'info',
      bannerUrl,
      isPinned = false,
      sendPushNotification: shouldNotify = true,
      targetTopic = 'semua_pengguna',
      brosurSlug,
    } = body;

    if (!judul || !konten) {
      return NextResponse.json({ error: 'Judul dan isi pengumuman wajib diisi' }, { status: 400 });
    }

    // Buat slug unik
    const baseSlug = judul
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const authorName = profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';

    let fcmResult: any = null;

    // 1. Kirim Push Notifikasi jika opsi dicentang
    if (shouldNotify) {
      try {
        fcmResult = await sendPushNotification({
          targetType: 'topic',
          target: targetTopic,
          title: judul,
          body: ringkasan || konten.substring(0, 140) + '...',
          screen: kategori === 'brosur' && brosurSlug ? 'detail_brosur' : 'detail_pengumuman',
          slug: kategori === 'brosur' && brosurSlug ? brosurSlug : slug,
          imageUrl: bannerUrl || undefined,
          extraData: {
            type: kategori === 'brosur' && brosurSlug ? 'brosur' : 'pengumuman',
            kategori,
            ...(brosurSlug ? { brosur_slug: brosurSlug, slug_brosur: brosurSlug } : {}),
            pengumuman_slug: slug,
          },
        });

        // Catat ke tabel push_notification_logs agar muncul di riwayat notifikasi
        try {
          await supabase.from('push_notification_logs').insert([
            {
              title: judul,
              body: ringkasan || konten.substring(0, 140),
              target_type: 'topic',
              target: targetTopic,
              screen: kategori === 'brosur' && brosurSlug ? 'detail_brosur' : 'detail_pengumuman',
              slug: kategori === 'brosur' && brosurSlug ? brosurSlug : slug,
              image_url: bannerUrl || null,
              sender_id: user.id,
              sender_email: user.email,
              sender_name: authorName,
              status: fcmResult?.success ? (fcmResult.mode === 'live' ? 'sent' : 'simulated') : 'failed',
              message_id: fcmResult?.messageId || null,
              error_message: fcmResult?.error || null,
              created_at: new Date().toISOString(),
            },
          ]);
        } catch (logErr) {
          console.warn('Gagal mencatat ke push_notification_logs:', logErr);
        }
      } catch (fcmErr) {
        console.error('Gagal mengirim push notifikasi pengumuman:', fcmErr);
      }
    }

    const newPengumuman = {
      id: crypto.randomUUID(),
      judul,
      slug,
      konten,
      ringkasan: ringkasan || konten.substring(0, 140),
      kategori,
      banner_url: bannerUrl || null,
      is_pinned: Boolean(isPinned),
      is_active: true,
      send_push_notification: Boolean(shouldNotify),
      fcm_message_id: fcmResult?.messageId || null,
      notified_at: fcmResult?.success ? new Date().toISOString() : null,
      author_id: user.id,
      author_name: authorName,
      brosur_slug: brosurSlug?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Simpan ke Supabase tabel pengumuman
    const { data, error } = await supabase
      .from('pengumuman')
      .insert([newPengumuman])
      .select()
      .single();

    if (error) {
      console.warn('Gagal menyimpan ke Supabase (menggunakan fallback in-memory):', error.message);
      memoryPengumuman.unshift(newPengumuman);
      return NextResponse.json({
        success: true,
        data: newPengumuman,
        fcm: fcmResult,
        note: 'Tersimpan (Mode Fallback / Tabel Supabase belum dibuat)',
      });
    }

    return NextResponse.json({
      success: true,
      data,
      fcm: fcmResult,
    });
  } catch (err: any) {
    console.error('Error create pengumuman:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
