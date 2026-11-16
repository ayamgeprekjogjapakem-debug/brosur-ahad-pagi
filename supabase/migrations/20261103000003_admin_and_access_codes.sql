-- ==============================================================================
-- MIGRASI 03: PENGATURAN APLIKASI, KODE AKSES, KUOTA AI, & ADMIN USERS
-- ==============================================================================

-- 1. Tabel app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    min_app_version TEXT NOT NULL DEFAULT '1.0.0',
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    ai_enabled BOOLEAN NOT NULL DEFAULT false,
    openrouter_token TEXT,
    deepseek_token TEXT,
    chat_model TEXT NOT NULL DEFAULT 'openai/gpt-3.5-turbo',
    material_model TEXT NOT NULL DEFAULT 'google/gemini-pro',
    system_prompt TEXT NOT NULL DEFAULT 'Setiap jawaban hilangkan markdown seperti **, *, ##, dan #. Gunakan kapital besar untuk judul. Sertakan sumber materi/brosur MTA di bagian bawah jawaban.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed pengaturan default
INSERT INTO public.app_settings (id, min_app_version, is_maintenance, ai_enabled)
VALUES (1, '1.0.0', false, true)
ON CONFLICT (id) DO NOTHING;

-- 2. Tabel allowed_versions
CREATE TABLE IF NOT EXISTS public.allowed_versions (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.allowed_versions (version, is_active)
VALUES ('1.0.0', true)
ON CONFLICT (version) DO NOTHING;

-- 3. Tabel access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
    id SERIAL PRIMARY KEY,
    code_entered TEXT NOT NULL,
    device_id TEXT,
    device_info TEXT,
    status TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_code ON public.access_logs(code_entered);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON public.access_logs(created_at DESC);

-- 4. Tabel access_codes Lengkap
CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    description TEXT,
    allowed_features JSONB DEFAULT '["bap","quran","kalender","tersimpan"]'::jsonb,
    has_ai_access BOOLEAN NOT NULL DEFAULT false,
    expires_in_seconds BIGINT DEFAULT NULL,
    ai_daily_limit INTEGER DEFAULT 20,
    ai_reset_hour INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_codes_code ON public.access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_is_active ON public.access_codes(is_active);

-- Seed Kode Master Akses
INSERT INTO public.access_codes (code, is_active, notes, description, allowed_features, has_ai_access, expires_in_seconds, ai_daily_limit, ai_reset_hour)
VALUES 
    ('MTA-DEV2026', true, 'Akses Developer Penuh', 'Akses Developer Penuh', '["bap","quran","kalender","tersimpan","hadist","perawi","ai-pustaka"]'::jsonb, true, NULL, 0, 0),
    ('MTA-PREMIUM', true, 'Akses Reguler Premium AI', 'Akses Reguler Premium AI', '["bap","quran","kalender","tersimpan","hadist","perawi","ai-pustaka"]'::jsonb, true, 2592000, 50, 0)
ON CONFLICT (code) DO NOTHING;

-- 5. Tabel admin_users
CREATE TABLE IF NOT EXISTS public.admin_users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.admin_users (username, password_hash, role)
VALUES ('admin', 'admin123', 'admin')
ON CONFLICT (username) DO NOTHING;

-- 6. Tabel Counter Pemakaian AI Harian (access_code_ai_usage)
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

-- Nonaktifkan RLS agar dapat diakses dari Flutter dan API Routes Next.js
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_code_ai_usage DISABLE ROW LEVEL SECURITY;

-- 7. RPC: check_and_consume_ai_quota
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

    -- Hitung tanggal siklus berdasarkan jam reset
    IF EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Jakarta')) < v_reset_hour THEN
        v_effective_date := ((NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '1 day')::DATE;
    ELSE
        v_effective_date := (NOW() AT TIME ZONE 'Asia/Jakarta')::DATE;
    END IF;

    SELECT question_count INTO v_current_count
    FROM public.access_code_ai_usage
    WHERE code = v_code_record.code AND usage_date = v_effective_date;

    IF v_current_count IS NULL THEN
        v_current_count := 0;
    END IF;

    -- Limit <= 0 berarti Unlimited
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
            'remaining', -1,
            'reset_hour', v_reset_hour,
            'cycle_date', v_effective_date
        );
    END IF;

    -- Cek limit jika kuota habis
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
