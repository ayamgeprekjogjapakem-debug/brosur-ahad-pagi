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

-- 2. Tabel access_logs
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL,
    app_version TEXT,
    device_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabel blocked_ips
CREATE TABLE IF NOT EXISTS public.blocked_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Setup RLS (opsional tapi disarankan, disable untuk admin jika diperlukan)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Allow public read for app_settings
DROP POLICY IF EXISTS "Allow public read app_settings" ON public.app_settings;
CREATE POLICY "Allow public read app_settings" ON public.app_settings FOR SELECT USING (true);
-- Allow public insert for access_logs (from edge functions/server)
DROP POLICY IF EXISTS "Allow anon insert access_logs" ON public.access_logs;
CREATE POLICY "Allow anon insert access_logs" ON public.access_logs FOR INSERT WITH CHECK (true);
-- Allow public read for blocked_ips (so API can check)
DROP POLICY IF EXISTS "Allow public read blocked_ips" ON public.blocked_ips;
CREATE POLICY "Allow public read blocked_ips" ON public.blocked_ips FOR SELECT USING (true);
