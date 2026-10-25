-- ==============================================================
-- SKEMA TABEL: konsultasi_hadits
-- Daftar kontak Ustadz / Konsultan Hadist / Admin Help
-- yang dapat dihubungi langsung via WhatsApp oleh pengguna mobile & web.
-- Jalankan skrip ini di SQL Editor Supabase Anda.
-- ==============================================================

CREATE TABLE IF NOT EXISTS public.konsultasi_hadits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,                         -- Nama Lengkap & Gelar (misal: "Ust. Ahmad Fauzi, Lc., M.A.")
    bidang TEXT NOT NULL DEFAULT 'Konsultan Hadits', -- Bidang Keahlian / Bagian (misal: "Dewan Tafsir & Hadits", "Konsultasi Dalil Brosur", "Bantuan Aplikasi")
    nomor_wa TEXT NOT NULL,                     -- Nomor WhatsApp dalam format standar internasional (misal: "6281234567890")
    pesan_pembuka TEXT DEFAULT 'Assalamu''alaikum Ustadz, mohon izin bertanya mengenai penjelasan hadits di aplikasi Pustaka.',
    foto_url TEXT,                              -- Foto Profil / Avatar opsional
    deskripsi TEXT,                             -- Keterangan singkat atau jadwal konsultasi (misal: "Tersedia Ba''da Ashar - Isya")
    is_active BOOLEAN NOT NULL DEFAULT true,    -- Status aktif / tampil di aplikasi mobile
    urutan INTEGER NOT NULL DEFAULT 0,          -- Urutan tampilan (semakin kecil semakin atas)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_konsultasi_hadits_active_order ON public.konsultasi_hadits(is_active, urutan ASC, created_at ASC);

-- Row Level Security (RLS)
ALTER TABLE public.konsultasi_hadits ENABLE ROW LEVEL SECURITY;

-- Policy 1: Publik dan Pengguna Mobile dapat melihat kontak yang aktif (atau admin melihat semua)
DROP POLICY IF EXISTS "Publik dapat melihat kontak konsultasi aktif" ON public.konsultasi_hadits;
CREATE POLICY "Publik dapat melihat kontak konsultasi aktif"
ON public.konsultasi_hadits
FOR SELECT
TO public, authenticated, anon
USING (
    is_active = true 
    OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
    )
);

-- Policy 2: Admin dan Super Admin dapat menambah kontak (INSERT)
DROP POLICY IF EXISTS "Admin dapat menambah kontak konsultasi" ON public.konsultasi_hadits;
CREATE POLICY "Admin dapat menambah kontak konsultasi"
ON public.konsultasi_hadits
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

-- Policy 3: Admin dan Super Admin dapat mengupdate kontak (UPDATE)
DROP POLICY IF EXISTS "Admin dapat mengubah kontak konsultasi" ON public.konsultasi_hadits;
CREATE POLICY "Admin dapat mengubah kontak konsultasi"
ON public.konsultasi_hadits
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
        AND profiles.is_active = true
    )
);

-- Policy 4: Admin dan Super Admin dapat menghapus kontak (DELETE)
DROP POLICY IF EXISTS "Admin dapat menghapus kontak konsultasi" ON public.konsultasi_hadits;
CREATE POLICY "Admin dapat menghapus kontak konsultasi"
ON public.konsultasi_hadits
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super-admin')
        AND profiles.is_active = true
    )
);

-- Data Sample Awal
INSERT INTO public.konsultasi_hadits (nama, bidang, nomor_wa, pesan_pembuka, deskripsi, urutan, is_active)
VALUES 
(
    'Ustadz Dewan Fatwa & Hadits',
    'Konsultasi Sanad & Matan Hadits',
    '6281234567890',
    'Assalamu''alaikum Ustadz, mohon izin bertanya mengenai derajat dan penjelasan hadits berikut:',
    'Konsultasi keabsahan dalil, perawi, dan pemahaman hadits brosur. Jam respons: 08.00 - 20.00 WIB.',
    1,
    true
),
(
    'Admin Layanan & Bantuan Pustaka',
    'Bantuan Teknis & Informasi Aplikasi',
    '6289876543210',
    'Assalamu''alaikum Admin Pustaka, saya membutuhkan bantuan terkait:',
    'Layanan saran, pertanyaan teknis penggunaan aplikasi, dan informasi seputar brosur.',
    2,
    true
)
ON CONFLICT DO NOTHING;
