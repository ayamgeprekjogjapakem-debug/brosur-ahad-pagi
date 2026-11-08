-- ==============================================================================
-- MASTER SETUP SUPABASE: SEMUA TABEL AI PUSTAKA MTA
-- ==============================================================================
-- Jalankan skrip SQL ini di SQL Editor Supabase Dashboard Anda.
-- ==============================================================================

-- 1. Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABEL: ai_simulator_sessions (Riwayat Percakapan AI Playground)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_simulator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pastikan kolom updated_at ada jika tabel sudah terlanjur dibuat sebelumnya
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

CREATE INDEX IF NOT EXISTS idx_ai_simulator_sessions_created_at 
    ON public.ai_simulator_sessions (created_at DESC);

-- Kebijakan Akses Penuh Sesi Simulator
ALTER TABLE public.ai_simulator_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to ai_simulator_sessions" ON public.ai_simulator_sessions;
CREATE POLICY "Public full access to ai_simulator_sessions"
    ON public.ai_simulator_sessions
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- ==============================================================================
-- 3. TABEL: ai_query_logs (Log Kueri, Token, & Latensi Real-Time)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ai_query_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_text TEXT NOT NULL,
    topic_category TEXT DEFAULT 'Umum',
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    retrieved_docs_count INTEGER DEFAULT 0,
    source TEXT DEFAULT 'mobile', -- 'mobile' (Flutter) atau 'web' (Portal Dashboard)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON public.ai_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_topic ON public.ai_query_logs(topic_category);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_source ON public.ai_query_logs(source);

-- Kebijakan Akses Penuh Log Kueri AI (Mencegah Error 42501 RLS Violation)
ALTER TABLE public.ai_query_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to ai_query_logs" ON public.ai_query_logs;
CREATE POLICY "Public full access to ai_query_logs"
    ON public.ai_query_logs
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);


-- ==============================================================================
-- 4. SEED DATA HISTORIS AWAL (Contoh Kueri Nyata Dari Hadits & Brosur MTA)
-- ==============================================================================
INSERT INTO public.ai_query_logs (query_text, topic_category, model_used, prompt_tokens, completion_tokens, total_tokens, latency_ms, retrieved_docs_count, source, created_at)
VALUES 
    ('Hukum suntik obat saat puasa menurut fatwa brosur MTA', 'Puasa, Fidyah, & Ramadhan', 'deepseek/deepseek-chat', 850, 240, 1090, 780, 2, 'mobile', NOW() - INTERVAL '15 minutes'),
    ('Tata cara wudhu saat perban membalut anggota wudhu', 'Shalat & Thaharah (Wudhu, Shalat Berjamaah)', 'google/gemini-2.5-flash', 920, 310, 1230, 650, 3, 'mobile', NOW() - INTERVAL '45 minutes'),
    ('Apakah shalat jenazah memakai ruku dan sujud', 'Shalat & Thaharah (Wudhu, Shalat Berjamaah)', 'deepseek/deepseek-chat', 680, 195, 875, 590, 2, 'web', NOW() - INTERVAL '2 hours'),
    ('Ketentuan shalat jamak qashar bagi musafir luar kota', 'Shalat & Thaharah (Wudhu, Shalat Berjamaah)', 'google/gemini-2.5-flash', 780, 220, 1000, 620, 2, 'mobile', NOW() - INTERVAL '1 day' - INTERVAL '3 hours'),
    ('Kriteria hadits shahih dan batasan mengamalkan hadits dhaif', 'Ibadah & Sunnah', 'deepseek/deepseek-chat', 1100, 380, 1480, 890, 3, 'web', NOW() - INTERVAL '1 day' - INTERVAL '6 hours'),
    ('Zakat mal atas emas simpanan dan investasi reksadana syariah', 'Zakat, Infak, & Muamalah Finansial', 'deepseek/deepseek-chat', 950, 290, 1240, 810, 2, 'mobile', NOW() - INTERVAL '3 days'),
    ('Bacaan doa qunut subuh apakah sunnah muakkad menurut Majlis', 'Shalat & Thaharah (Wudhu, Shalat Berjamaah)', 'google/gemini-2.5-flash', 830, 260, 1090, 710, 2, 'web', NOW() - INTERVAL '5 days'),
    ('Hukum aqiqah anak setelah dewasa jika orang tua dahulu belum mampu', 'Munakahat (Pernikahan & Nafkah)', 'deepseek/deepseek-chat', 910, 280, 1190, 790, 2, 'mobile', NOW() - INTERVAL '14 days'),
    ('Batas nisab zakat hasil pertanian padi irigasi dan tadah hujan', 'Zakat, Infak, & Muamalah Finansial', 'google/gemini-2.5-flash', 1020, 340, 1360, 850, 2, 'mobile', NOW() - INTERVAL '22 days');
