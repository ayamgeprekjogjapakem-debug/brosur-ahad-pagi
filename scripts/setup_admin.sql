-- 1. Tabel app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    min_app_version TEXT NOT NULL DEFAULT '1.0.0',
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    ai_enabled BOOLEAN NOT NULL DEFAULT false,
    openrouter_token TEXT,
    chat_model TEXT NOT NULL DEFAULT 'openai/gpt-3.5-turbo',
    material_model TEXT NOT NULL DEFAULT 'google/gemini-pro',
    system_prompt TEXT NOT NULL DEFAULT 'Setiap jawaban hilangkan markdown seperti **, *, ##, dan #. Gunakan kapital besar untuk judul. Sertakan sumber materi/brosur MTA di bagian bawah jawaban.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan kolom jika tabel sudah ada (untuk update)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='ai_enabled') THEN 
        ALTER TABLE public.app_settings ADD COLUMN ai_enabled BOOLEAN NOT NULL DEFAULT false; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='openrouter_token') THEN 
        ALTER TABLE public.app_settings ADD COLUMN openrouter_token TEXT; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='chat_model') THEN 
        ALTER TABLE public.app_settings ADD COLUMN chat_model TEXT NOT NULL DEFAULT 'openai/gpt-3.5-turbo'; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='material_model') THEN 
        ALTER TABLE public.app_settings ADD COLUMN material_model TEXT NOT NULL DEFAULT 'google/gemini-pro'; 
    END IF; 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_settings' AND column_name='system_prompt') THEN 
        ALTER TABLE public.app_settings ADD COLUMN system_prompt TEXT NOT NULL DEFAULT 'Setiap jawaban hilangkan markdown seperti **, *, ##, dan #. Gunakan kapital besar untuk judul. Sertakan sumber materi/brosur MTA di bagian bawah jawaban.'; 
    END IF; 
END $$;

-- Insert nilai default jika belum ada
INSERT INTO public.app_settings (id, min_app_version, is_maintenance)
VALUES (1, '1.0.0', false)
ON CONFLICT (id) DO NOTHING;

-- 1.5 Tabel allowed_versions (Untuk multi-versi whitelist)
CREATE TABLE IF NOT EXISTS public.allowed_versions (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan kolom is_active jika tabel sudah ada (untuk update)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='allowed_versions' AND column_name='is_active') THEN 
        ALTER TABLE public.allowed_versions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true; 
    END IF; 
END $$;

-- Insert versi default
INSERT INTO public.allowed_versions (version)
VALUES ('1.0.0')
ON CONFLICT (version) DO NOTHING;

-- 2. Tabel access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    app_version TEXT,
    device_info TEXT,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan kolom location jika tabel sudah ada (untuk update)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_logs' AND column_name='location') THEN 
        ALTER TABLE public.access_logs ADD COLUMN location TEXT; 
    END IF; 
END $$;

-- 3. Tabel blocked_ips
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup RLS (opsional tapi disarankan, disable untuk admin jika diperlukan)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Allow public read for app_settings
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);
-- Allow public update for app_settings (dashboard admin)
DROP POLICY IF EXISTS "Allow public update app_settings" ON public.app_settings;
CREATE POLICY "Allow public update app_settings" ON public.app_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Allow public read for allowed_versions
DROP POLICY IF EXISTS "Allow public read allowed_versions" ON public.allowed_versions;
CREATE POLICY "Allow public read allowed_versions" ON public.allowed_versions FOR SELECT USING (true);
-- Allow public insert/update/delete for allowed_versions (dashboard admin)
DROP POLICY IF EXISTS "Allow public modify allowed_versions" ON public.allowed_versions;
CREATE POLICY "Allow public modify allowed_versions" ON public.allowed_versions FOR ALL USING (true) WITH CHECK (true);
-- Allow public insert for access_logs (from edge functions/server)
DROP POLICY IF EXISTS "Allow anon insert access_logs" ON public.access_logs;
CREATE POLICY "Allow anon insert access_logs" ON public.access_logs FOR INSERT WITH CHECK (true);
-- Mengizinkan dashboard untuk membaca data access_logs
DROP POLICY IF EXISTS "Allow public read access_logs" ON public.access_logs;
CREATE POLICY "Allow public read access_logs" ON public.access_logs FOR SELECT USING (true);
-- Allow public read for blocked_ips (so API can check)
DROP POLICY IF EXISTS "Allow public read blocked_ips" ON public.blocked_ips;
CREATE POLICY "Allow public read blocked_ips" ON public.blocked_ips FOR SELECT USING (true);

-- 4. Tabel access_codes
CREATE TABLE IF NOT EXISTS public.access_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    has_ai_access BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tambahkan kolom jika tabel sudah ada (untuk update)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_codes' AND column_name='has_ai_access') THEN 
        ALTER TABLE public.access_codes ADD COLUMN has_ai_access BOOLEAN NOT NULL DEFAULT false; 
    END IF; 
END $$;

-- Enable RLS untuk access_codes
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Allow public read (untuk dicek dari app mobile)
DROP POLICY IF EXISTS "Allow public read access_codes" ON public.access_codes;
CREATE POLICY "Allow public read access_codes" ON public.access_codes FOR SELECT USING (true);

-- Allow public modify (untuk admin dashboard)
DROP POLICY IF EXISTS "Allow public modify access_codes" ON public.access_codes;
CREATE POLICY "Allow public modify access_codes" ON public.access_codes FOR ALL USING (true) WITH CHECK (true);
