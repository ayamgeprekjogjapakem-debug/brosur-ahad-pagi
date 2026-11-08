-- ==============================================================================
-- SKEMA SUPABASE: RIWAYAT SIMULATOR AI (ai_simulator_sessions)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase untuk memastikan tabel riwayat
-- percakapan AI Simulator sudah siap dan dapat menyimpan pesan secara permanen.
-- ==============================================================================

-- 1. Buat ekstensi pgcrypto / uuid-ossp jika belum ada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel ai_simulator_sessions jika belum ada
CREATE TABLE IF NOT EXISTS public.ai_simulator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Pastikan kolom updated_at ada jika tabel sebelumnya sudah terlanjur dibuat tanpa kolom ini
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'ai_simulator_sessions' 
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.ai_simulator_sessions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 4. Indeks untuk mempercepat pengurutan riwayat percakapan
CREATE INDEX IF NOT EXISTS idx_ai_simulator_sessions_created_at 
    ON public.ai_simulator_sessions (created_at DESC);

-- 5. Kebijakan Row Level Security (RLS)
-- Opsi A: Nonaktifkan RLS jika dashboard dikelola internal
ALTER TABLE public.ai_simulator_sessions DISABLE ROW LEVEL SECURITY;

-- Atau Opsi B: Jika RLS aktif, izinkan anon & authenticated membaca dan menulis:
/*
ALTER TABLE public.ai_simulator_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access on ai_simulator_sessions" ON public.ai_simulator_sessions;
CREATE POLICY "Public Full Access on ai_simulator_sessions"
    ON public.ai_simulator_sessions
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
*/

