import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendPushNotification, FcmPayload } from '@/utils/fcm';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized: Harap login terlebih dahulu' }, { status: 401 });
    }

    // Cek role user (admin atau super-admin)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active, name')
      .eq('id', user.id)
      .single();

    const userRole = profile?.role || (user.user_metadata?.role as string);
    const isUserActive = profile ? Boolean(profile.is_active) : true;
    const senderName = profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin';

    if (!isUserActive || (userRole !== 'super-admin' && userRole !== 'admin')) {
      return NextResponse.json({ error: 'Forbidden: Hanya Admin dan Super Admin yang dapat mengirim notifikasi' }, { status: 403 });
    }

    const body = await request.json();
    const {
      targetType = 'topic',
      target = 'semua_pengguna',
      title,
      body: messageBody,
      screen = 'beranda',
      itemId,
      slug,
      imageUrl,
      extraData,
    } = body;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Judul dan isi notifikasi wajib diisi' }, { status: 400 });
    }

    const payload: FcmPayload = {
      targetType: targetType === 'token' ? 'token' : 'topic',
      target: target.trim(),
      title: title.trim(),
      body: messageBody.trim(),
      screen,
      itemId,
      slug,
      imageUrl: imageUrl?.trim() || undefined,
      extraData,
    };

    // Kirim notifikasi via FCM utility
    const result = await sendPushNotification(payload);

    // Simpan ke log di database Supabase (jika tabel push_notification_logs tersedia)
    try {
      await supabase.from('push_notification_logs').insert([
        {
          title: payload.title,
          body: payload.body,
          target_type: payload.targetType,
          target: payload.target,
          screen: payload.screen,
          item_id: payload.itemId || null,
          slug: payload.slug || null,
          image_url: payload.imageUrl || null,
          sender_id: user.id,
          sender_email: user.email,
          sender_name: senderName,
          status: result.success ? (result.mode === 'live' ? 'sent' : 'simulated') : 'failed',
          message_id: result.messageId || null,
          error_message: result.error || null,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (logErr) {
      // Abaikan jika tabel log belum dibuat di Supabase
      console.warn('Gagal mencatat log notifikasi ke Supabase (tabel mungkin belum dibuat):', logErr);
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Gagal mengirim notifikasi ke FCM',
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      mode: result.mode,
      messageId: result.messageId,
      details: result.details,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('API Send Notification Error:', error);
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan internal server' },
      { status: 500 }
    );
  }
}
