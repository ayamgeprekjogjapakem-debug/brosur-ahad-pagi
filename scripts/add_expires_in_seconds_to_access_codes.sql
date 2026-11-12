-- ==============================================================================
-- MIGRASI SUPABASE: DUKUNGAN DURASI KEDALUWARSA & FITUR PADA KODE AKSES
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Tambah kolom expires_in_seconds pada tabel access_codes (durasi dalam detik)
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS expires_in_seconds BIGINT DEFAULT NULL;

-- 2. Tambah kolom allowed_features (array JSON untuk hak akses fitur)
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS allowed_features JSONB DEFAULT '["bap","quran","kalender","tersimpan"]'::jsonb;

-- 3. Tambah kolom pendukung notes dan description jika belum ada
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS description TEXT;

-- 4. Tambah kolom has_ai_access untuk kompatibilitas Flutter jika belum ada
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS has_ai_access BOOLEAN NOT NULL DEFAULT false;

-- 5. Beri komentar penjelasan kolom
COMMENT ON COLUMN public.access_codes.expires_in_seconds IS 'Masa berlaku kode akses dalam satuan detik (seconds). NULL atau 0 berarti permanen / tanpa batas waktu.';
COMMENT ON COLUMN public.access_codes.allowed_features IS 'Array JSON fitur yang diizinkan (bap, quran, kalender, tersimpan, hadist, perawi, ai-pustaka).';

-- ==============================================================================
-- Panduan konversi waktu ke detik:
-- 1 Hari   = 86400 detik   (1 * 24 * 3600)
-- 3 Hari   = 259200 detik  (3 * 24 * 3600)
-- 7 Hari   = 604800 detik  (7 * 24 * 3600)
-- 14 Hari  = 1209600 detik (14 * 24 * 3600)
-- 30 Hari  = 2592000 detik (30 * 24 * 3600)
-- NULL / 0 = Permanen (tanpa kedaluwarsa)
-- ==============================================================================
