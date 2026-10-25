-- ==============================================================
-- SKEMA TABEL: pengumuman
-- Untuk mengelola pengumuman resmi yang otomatis dapat dikirim
-- sebagai Push Notifikasi ke aplikasi mobile jamaah (FCM).
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    ringkasan TEXT,
    konten TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'info', -- 'kajian', 'brosur', 'info', 'urgent'
    banner_url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    send_push_notification BOOLEAN DEFAULT true,
    fcm_message_id TEXT,
    notified_at TIMESTAMPTZ,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_pengumuman_created_at ON public.pengumuman(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengumuman_slug ON public.pengumuman(slug);
CREATE INDEX IF NOT EXISTS idx_pengumuman_is_pinned ON public.pengumuman(is_pinned);

-- Row Level Security (RLS)
ALTER TABLE public.pengumuman ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika sudah ada (mencegah error 42710)
DROP POLICY IF EXISTS "Publik dapat membaca pengumuman aktif" ON public.pengumuman;
DROP POLICY IF EXISTS "Admin dapat melihat semua pengumuman" ON public.pengumuman;
DROP POLICY IF EXISTS "Admin dapat mengelola semua pengumuman" ON public.pengumuman;

-- 1. Siapa saja (Publik / Anonim / Mobile) dapat membaca pengumuman yang aktif
CREATE POLICY "Publik dapat membaca pengumuman aktif"
ON public.pengumuman
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- 2. Admin & Super Admin dapat melihat & mengelola semua pengumuman (termasuk draft/non-aktif)
CREATE POLICY "Admin dapat mengelola semua pengumuman"
ON public.pengumuman
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
        AND profiles.is_active = true
    )
);
