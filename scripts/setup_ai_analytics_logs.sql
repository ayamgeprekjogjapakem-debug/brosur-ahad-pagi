-- ==============================================================================
-- SKEMA SUPABASE: LOG ANALITIK AI REAL-TIME (ai_query_logs)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase untuk merekam setiap interaksi
-- kecerdasan buatan (pertanyaan, token, latensi, dan topik) secara real-time.
-- ==============================================================================

-- 1. Buat ekstensi pgcrypto jika belum ada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Buat tabel ai_query_logs
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
    source TEXT DEFAULT 'mobile', -- 'mobile' (Aplikasi Flutter) atau 'web' (Portal/Simulator)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indeks performa untuk analitik berkecepatan tinggi
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON public.ai_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_topic ON public.ai_query_logs(topic_category);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_source ON public.ai_query_logs(source);

-- 4. Nonaktifkan Row Level Security (RLS) agar logging dari Next.js / Flutter lancar
ALTER TABLE public.ai_query_logs DISABLE ROW LEVEL SECURITY;

-- 5. Seed Data Evaluasi Awal (Opsional - agar dashboard langsung menyajikan data tren historis)
INSERT INTO public.ai_query_logs (query_text, topic_category, model_used, prompt_tokens, completion_tokens, total_tokens, latency_ms, retrieved_docs_count, source, created_at)
VALUES 
    ('Hukum suntik saat puasa menurut brosur MTA', 'Puasa & Fidyah', 'deepseek/deepseek-chat', 850, 240, 1090, 780, 2, 'mobile', NOW() - INTERVAL '15 minutes'),
    ('Tata cara wudhu saat anggota badan diperban', 'Shalat & Thaharah', 'google/gemini-2.5-flash', 920, 310, 1230, 650, 3, 'mobile', NOW() - INTERVAL '35 minutes'),
    ('Apakah tahlilan dan yasinan ada tuntunannya dalam hadits shahih', 'Ibadah & Sunnah', 'deepseek/deepseek-chat', 1100, 380, 1480, 890, 3, 'web', NOW() - INTERVAL '1 hour'),
    ('Ketentuan shalat jamak qashar bagi musafir', 'Shalat & Thaharah', 'google/gemini-2.5-flash', 780, 220, 1000, 620, 2, 'mobile', NOW() - INTERVAL '2 hours'),
    ('Zakat mal atas emas simpanan dan investasi reksadana', 'Zakat & Muamalah', 'deepseek/deepseek-chat', 950, 290, 1240, 810, 2, 'mobile', NOW() - INTERVAL '3 hours'),
    ('Bacaan doa qunut subuh apakah sunnah muakkad', 'Shalat & Thaharah', 'google/gemini-2.5-flash', 830, 260, 1090, 710, 2, 'web', NOW() - INTERVAL '4 hours')
ON CONFLICT DO NOTHING;

