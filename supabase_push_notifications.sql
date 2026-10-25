-- ==============================================================
-- SKEMA TABEL: push_notification_logs
-- Gunakan skrip ini di SQL Editor Supabase untuk menyimpan
-- riwayat pengiriman push notifikasi ke aplikasi mobile.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'topic', -- 'topic' atau 'token'
    target TEXT NOT NULL,                     -- nama topik (misal 'brosur_baru') atau registration token
    screen TEXT DEFAULT 'beranda',            -- rute mobile ('detail_brosur', 'detail_hadits', 'kalender', 'beranda', 'detail_pengumuman')
    slug TEXT,                                -- slug brosur jika rute detail_brosur / slug pengumuman
    item_id TEXT,                             -- nomor/ID jika rute detail_hadits / detail_quran
    image_url TEXT,                           -- banner opsional
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    sender_email TEXT,
    sender_name TEXT,
    status TEXT NOT NULL DEFAULT 'sent',       -- 'sent', 'simulated', 'failed'
    message_id TEXT,                          -- ID pesan dari FCM atau ID simulasi
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing untuk performa kueri riwayat
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_created_at ON public.push_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notification_logs_target ON public.push_notification_logs(target);

-- Row Level Security (RLS)
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika sudah ada (mencegah error 42710)
DROP POLICY IF EXISTS "Admin dapat melihat log notifikasi" ON public.push_notification_logs;
DROP POLICY IF EXISTS "Admin dapat menambah log notifikasi" ON public.push_notification_logs;

-- Policy: Admin dan Super Admin dapat membaca riwayat notifikasi
CREATE POLICY "Admin dapat melihat log notifikasi"
ON public.push_notification_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
        AND profiles.is_active = true
    )
);

-- Policy: Admin dan Super Admin dapat menambah log notifikasi
CREATE POLICY "Admin dapat menambah log notifikasi"
ON public.push_notification_logs
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
        AND profiles.is_active = true
    )
);
