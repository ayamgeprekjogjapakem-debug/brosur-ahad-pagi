-- ==============================================================================
-- MIGRASI SUPABASE: PENGATURAN KUOTA AI HARIAN & JAM RESET PADA KODE AKSES
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Tambah kolom batas kuota pertanyaan AI per hari pada access_codes
-- (Nilai NULL atau 0 berarti UNLIMITED / tanpa batas)
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS ai_daily_limit INTEGER DEFAULT 20;

-- 2. Tambah kolom jam reset harian (0-23, default 0 = pukul 00:00 tengah malam WIB)
ALTER TABLE public.access_codes 
ADD COLUMN IF NOT EXISTS ai_reset_hour INTEGER DEFAULT 0;

-- 3. Beri komentar penjelasan kolom
COMMENT ON COLUMN public.access_codes.ai_daily_limit IS 'Batas maksimal pertanyaan ke Asma AI per hari untuk kode ini (0 atau NULL = Unlimited).';
COMMENT ON COLUMN public.access_codes.ai_reset_hour IS 'Jam reset kuota harian (0-23, default 0 = pukul 00:00 WIB).';

-- ==============================================================================
-- 4. TABEL COUNTER PEMAKAIAN AI REAL-TIME (access_code_ai_usage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.access_code_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    question_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(code, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_access_code_ai_usage_code_date 
ON public.access_code_ai_usage(code, usage_date);

-- Nonaktifkan RLS agar dapat dibaca & diperbarui dari API server / client
ALTER TABLE public.access_code_ai_usage DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. FUNCTION & RPC: CONSUME AI QUOTA DENGAN JAM RESET OTOMATIS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_and_consume_ai_quota(
    p_code TEXT,
    p_increment BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_code_record RECORD;
    v_limit INTEGER;
    v_reset_hour INTEGER;
    v_effective_date DATE;
    v_current_count INTEGER := 0;
    v_remaining INTEGER;
BEGIN
    -- 1. Cari data kode akses
    SELECT id, code, is_active, ai_daily_limit, ai_reset_hour
    INTO v_code_record
    FROM public.access_codes
    WHERE code = UPPER(TRIM(p_code))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'Kode akses tidak ditemukan'
        );
    END IF;

    IF v_code_record.is_active != true THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'error', 'Kode akses sudah tidak aktif'
        );
    END IF;

    v_limit := COALESCE(v_code_record.ai_daily_limit, 20);
    v_reset_hour := COALESCE(v_code_record.ai_reset_hour, 0);

    -- 2. Hitung tanggal efektif berdasarkan jam reset (misal: jam 04:00 subuh)
    -- Jika waktu sekarang belum mencapai v_reset_hour, maka masuk ke siklus tanggal kemarin
    IF EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Jakarta')) < v_reset_hour THEN
        v_effective_date := ((NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '1 day')::DATE;
    ELSE
        v_effective_date := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
    END IF;

    -- 3. Ambil counter pemakaian hari ini
    SELECT question_count INTO v_current_count
    FROM public.access_code_ai_usage
    WHERE code = v_code_record.code AND usage_date = v_effective_date;

    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;

    -- 4. Jika limit 0, berarti UNLIMITED
    IF v_limit <= 0 THEN
        IF p_increment THEN
            INSERT INTO public.access_code_ai_usage (code, usage_date, question_count, last_used_at)
            VALUES (v_code_record.code, v_effective_date, 1, NOW())
            ON CONFLICT (code, usage_date) 
            DO UPDATE SET question_count = public.access_code_ai_usage.question_count + 1, last_used_at = NOW();
            v_current_count := v_current_count + 1;
        END IF;

        RETURN jsonb_build_object(
            'allowed', true,
            'is_unlimited', true,
            'limit', 0,
            'used', v_current_count,
            'remaining', 99999,
            'reset_hour', v_reset_hour,
            'cycle_date', v_effective_date
        );
    END IF;

    -- 5. Cek apakah kuota sudah habis
    IF v_current_count >= v_limit THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'is_unlimited', false,
            'limit', v_limit,
            'used', v_current_count,
            'remaining', 0,
            'reset_hour', v_reset_hour,
            'cycle_date', v_effective_date,
            'error', 'Kuota pertanyaan AI hari ini telah habis'
        );
    END IF;

    -- 6. Tambah counter jika p_increment bernilai true
    IF p_increment THEN
        INSERT INTO public.access_code_ai_usage (code, usage_date, question_count, last_used_at)
        VALUES (v_code_record.code, v_effective_date, 1, NOW())
        ON CONFLICT (code, usage_date) 
        DO UPDATE SET question_count = public.access_code_ai_usage.question_count + 1, last_used_at = NOW();
        v_current_count := v_current_count + 1;
    END IF;

    v_remaining := GREATEST(0, v_limit - v_current_count);

    RETURN jsonb_build_object(
        'allowed', true,
        'is_unlimited', false,
        'limit', v_limit,
        'used', v_current_count,
        'remaining', v_remaining,
        'reset_hour', v_reset_hour,
        'cycle_date', v_effective_date
    );
END;
$$;

