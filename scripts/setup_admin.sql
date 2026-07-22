-- 1. Tabel app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    min_app_version TEXT NOT NULL DEFAULT '1.0.0',
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
