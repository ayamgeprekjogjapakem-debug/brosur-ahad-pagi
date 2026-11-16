-- ==============================================================================
-- MASTER LENGKAP SUPABASE SELF-HOSTED (DIBUAT DARI AWAL / ALL-IN-ONE)
-- ==============================================================================
-- Proyek: Pustaka & Brosur Ahad Pagi MTA
-- Mencakup: Semua Ekstensi, Fungsi IMMUTABLE (strip_harakat), Trigger FTS,
--           26 Tabel Lengkap, Indeks HNSW/GIN, RPC AI Hybrid Search,
--           Akses Kode, Kuota Harian, & Akun Admin (Password: 123123)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. EKSTENSI POSTGRESQL WAJIB
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 2. FUNGSI DASAR & IMMUTABLE (WAJIB DIBUAT SEBELUM TABEL YANG MEMERLUKANNYA)
-- ------------------------------------------------------------------------------

-- Fungsi untuk menghilangkan harakat Arab (Wajib IMMUTABLE untuk Generated Column)
CREATE OR REPLACE FUNCTION public.strip_harakat(text) 
RETURNS text AS $$
  SELECT regexp_replace(
    regexp_replace($1, '[\u064B-\u065F\u0670\u0640\u06D6-\u06ED]', '', 'g'),
    '[ًٌٍَُِّْـ]', '', 'g'
  );
$$ LANGUAGE sql IMMUTABLE;

-- Trigger Function untuk Full-Text Search Brosur
CREATE OR REPLACE FUNCTION public.brosur_fts_update() 
RETURNS trigger AS $$
BEGIN
  NEW.fts := 
    setweight(to_tsvector('indonesian', coalesce(NEW.judul, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.teks_bersih, NEW.konten, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. MASTER FOLDERS & KATEGORI
-- ------------------------------------------------------------------------------

-- Tabel Master Folder Brosur
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Folder Default Brosur Ahad Pagi
INSERT INTO public.folders (id, slug, name, description) 
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'brosur-ahad-pagi', 
    'Brosur Ahad Pagi', 
    'Koleksi lengkap arsip digital Brosur Ahad Pagi MTA.'
) ON CONFLICT (slug) DO NOTHING;

-- Tabel Master Folder Hadist
CREATE TABLE IF NOT EXISTS public.folders_hadist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. TABEL BROSUR & CHUNKS (RAG AI PGVECTOR)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.brosur (
    id TEXT PRIMARY KEY,
    tahun INTEGER NOT NULL,
    judul TEXT NOT NULL,
    slug TEXT NOT NULL,
    konten TEXT NOT NULL,
    teks_bersih TEXT,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    fts TSVECTOR,
    fts_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('indonesian', coalesce(judul, '')), 'A') ||
        setweight(to_tsvector('indonesian', coalesce(teks_bersih, '')), 'B') ||
        setweight(to_tsvector('indonesian', coalesce(konten, '')), 'C')
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS brosur_fts_idx ON public.brosur USING gin (fts);
CREATE INDEX IF NOT EXISTS brosur_judul_trgm_idx ON public.brosur USING gin (judul gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_brosur_fts_gin ON public.brosur USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_brosur_tahun ON public.brosur (tahun DESC);
CREATE INDEX IF NOT EXISTS idx_brosur_folder_id ON public.brosur (folder_id);

DROP TRIGGER IF EXISTS tsvectorupdate ON public.brosur;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON public.brosur FOR EACH ROW EXECUTE FUNCTION public.brosur_fts_update();

-- Tabel Brosur Chunks (Untuk Embedding AI 768-Dimensi)
CREATE TABLE IF NOT EXISTS public.brosur_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brosur_id TEXT REFERENCES public.brosur(id) ON DELETE CASCADE,
    judul_brosur TEXT,
    tahun TEXT,
    chunk_index INTEGER,
    chunk_text TEXT,
    content TEXT,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768),
    fts TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('indonesian', coalesce(judul_brosur, '') || ' ' || coalesce(content, ''))
    ) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brosur_chunks_brosur_id ON public.brosur_chunks (brosur_id);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_tahun ON public.brosur_chunks (tahun DESC);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_fts_gin ON public.brosur_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_embedding_hnsw ON public.brosur_chunks USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------------------------
-- 5. TABEL HADIST & RAWIS
-- ------------------------------------------------------------------------------

-- Master Kelompok Hadist
CREATE TABLE IF NOT EXISTS public.kelompok_hadist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelompok TEXT UNIQUE NOT NULL,
    deskripsi TEXT,
    warna_badge TEXT DEFAULT 'emerald',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master Rawi / Rijalul Hadits
CREATE TABLE IF NOT EXISTS public.master_rawi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_rawi TEXT UNIQUE NOT NULL,
    nama_arab TEXT,
    kategori_rawi TEXT DEFAULT 'mukharij',
    thabaqat TEXT,
    kredibilitas TEXT DEFAULT 'Thiqah',
    biografi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hadist Brosur (Takhrij & Dalil)
CREATE TABLE IF NOT EXISTS public.hadist_brosur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelompok_id UUID REFERENCES public.kelompok_hadist(id) ON DELETE SET NULL,
    brosur_id TEXT REFERENCES public.brosur(id) ON DELETE CASCADE,
    kutipan_arab TEXT NOT NULL,
    terjemahan TEXT,
    perawi_sumber TEXT,
    catatan TEXT,
    rawi_kitab TEXT,
    juz TEXT,
    halaman TEXT,
    no_hadist TEXT,
    rawi_teratas TEXT,
    status_hadist TEXT DEFAULT 'terverifikasi',
    sumber_jenis TEXT DEFAULT 'hadist',
    nama_surat TEXT,
    no_ayat TEXT,
    kutipan_arab_gundul TEXT GENERATED ALWAYS AS (public.strip_harakat(kutipan_arab)) STORED,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hadist_kelompok_id ON public.hadist_brosur(kelompok_id);
CREATE INDEX IF NOT EXISTS idx_hadist_brosur_id ON public.hadist_brosur(brosur_id);
CREATE INDEX IF NOT EXISTS idx_hadist_rawi_kitab ON public.hadist_brosur(rawi_kitab);
CREATE INDEX IF NOT EXISTS idx_hadist_status ON public.hadist_brosur(status_hadist);
CREATE INDEX IF NOT EXISTS idx_hadist_arab_gundul ON public.hadist_brosur(kutipan_arab_gundul);
CREATE INDEX IF NOT EXISTS idx_hadist_embedding_hnsw ON public.hadist_brosur USING hnsw (embedding vector_cosine_ops);

-- Hadist CHM (Kitab 9 Imam)
CREATE TABLE IF NOT EXISTS public.hadist_chm (
    id TEXT PRIMARY KEY,
    judul TEXT NOT NULL,
    tahun INTEGER,
    slug TEXT NOT NULL,
    konten TEXT,
    teks_bersih TEXT,
    teks_arab TEXT,
    terjemahan TEXT,
    folder_id UUID REFERENCES public.folders_hadist(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hadist_chm_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hadist_chm_id TEXT REFERENCES public.hadist_chm(id) ON DELETE CASCADE,
    judul_brosur TEXT,
    content TEXT,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Konsultasi Hadits
CREATE TABLE IF NOT EXISTS public.konsultasi_hadits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama TEXT NOT NULL,
    bidang TEXT NOT NULL DEFAULT 'Konsultan Hadits',
    nomor_wa TEXT NOT NULL,
    pesan_pembuka TEXT DEFAULT 'Assalamu''alaikum Ustadz, mohon izin bertanya mengenai penjelasan hadits di aplikasi Pustaka.',
    foto_url TEXT,
    deskripsi TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    urutan INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_konsultasi_hadits_active_order ON public.konsultasi_hadits(is_active, urutan, created_at);

-- ------------------------------------------------------------------------------
-- 6. QURAN KEMENAG
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.quran_surah (
    id INT PRIMARY KEY,
    nama_latin VARCHAR(255) NOT NULL,
    nama_arab VARCHAR(255) NOT NULL,
    jumlah_ayat INT NOT NULL,
    tempat_turun VARCHAR(50) NOT NULL,
    arti VARCHAR(255),
    deskripsi TEXT,
    audio_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.quran_ayat (
    id SERIAL PRIMARY KEY,
    surah_id INT NOT NULL REFERENCES public.quran_surah(id) ON DELETE CASCADE,
    nomor_ayat INT NOT NULL,
    teks_arab TEXT NOT NULL,
    teks_latin TEXT,
    teks_indonesia TEXT NOT NULL,
    audio_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(surah_id, nomor_ayat)
);

CREATE INDEX IF NOT EXISTS idx_quran_ayat_surah_id ON public.quran_ayat(surah_id);
CREATE INDEX IF NOT EXISTS idx_quran_ayat_nomor_ayat ON public.quran_ayat(nomor_ayat);

CREATE TABLE IF NOT EXISTS public.quran_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details TEXT,
    changes_detected BOOLEAN DEFAULT FALSE,
    applied BOOLEAN DEFAULT FALSE
);

-- ------------------------------------------------------------------------------
-- 7. PENGATURAN, KODE AKSES, & PENGGUNA
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.app_settings (
    id SERIAL PRIMARY KEY,
    min_app_version TEXT NOT NULL DEFAULT '1.0.0',
    is_maintenance BOOLEAN NOT NULL DEFAULT false,
    ai_enabled BOOLEAN NOT NULL DEFAULT false,
    openrouter_token TEXT,
    google_ai_token TEXT,
    deepseek_token TEXT,
    chat_model TEXT NOT NULL DEFAULT 'openai/gpt-3.5-turbo',
    material_model TEXT NOT NULL DEFAULT 'google/gemini-pro',
    system_prompt TEXT NOT NULL DEFAULT 'Setiap jawaban hilangkan markdown seperti **, *, ##, dan #. Gunakan kapital besar untuk judul. Sertakan sumber materi/brosur MTA di bagian bawah jawaban.',
    hijri_offset_start_date DATE,
    hijri_offset INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_settings (id, min_app_version, is_maintenance, ai_enabled)
VALUES (1, '1.0.0', false, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.allowed_versions (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.allowed_versions (version, is_active)
VALUES ('1.0.0', true)
ON CONFLICT (version) DO NOTHING;

-- Tabel Kode Akses Lengkap (Web + Flutter)
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

-- Seed Kode Master Akses
INSERT INTO public.access_codes (code, is_active, notes, description, allowed_features, has_ai_access, expires_in_seconds, ai_daily_limit, ai_reset_hour)
VALUES 
    ('MTA-DEV2026', true, 'Akses Developer Penuh', 'Akses Developer Penuh', '["bap","quran","kalender","tersimpan","hadist","perawi","ai-pustaka"]'::jsonb, true, NULL, 0, 0),
    ('MTA-PREMIUM', true, 'Akses Reguler Premium AI', 'Akses Reguler Premium AI', '["bap","quran","kalender","tersimpan","hadist","perawi","ai-pustaka"]'::jsonb, true, 2592000, 50, 0)
ON CONFLICT (code) DO NOTHING;

-- Tabel Counter Pemakaian AI Harian
CREATE TABLE IF NOT EXISTS public.access_code_ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    question_count INTEGER NOT NULL DEFAULT 1,
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(code, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_access_code_ai_usage_code_date ON public.access_code_ai_usage(code, usage_date);

-- Tabel Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'super-admin', 'admin', 'user'
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger User Baru Otomatis Masuk ke profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = COALESCE(public.profiles.role, EXCLUDED.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 8. FITUR PENDUKUNG: PENGUMUMAN, NOTIFIKASI, FEEDBACK, & KONSULTASI
-- ------------------------------------------------------------------------------

-- Tabel Pengumuman
CREATE TABLE IF NOT EXISTS public.pengumuman (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    ringkasan TEXT,
    konten TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'info',
    banner_url TEXT,
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    send_push_notification BOOLEAN DEFAULT true,
    fcm_message_id TEXT,
    notified_at TIMESTAMPTZ,
    author_id UUID,
    author_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pengumuman_created_at ON public.pengumuman(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pengumuman_slug ON public.pengumuman(slug);

-- Log Push Notification
CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL DEFAULT 'topic',
    target TEXT NOT NULL,
    screen TEXT DEFAULT 'beranda',
    slug TEXT,
    item_id TEXT,
    image_url TEXT,
    sender_id UUID,
    sender_email TEXT,
    sender_name TEXT,
    status TEXT NOT NULL DEFAULT 'sent',
    message_id TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_notification_logs_created ON public.push_notification_logs(created_at DESC);

-- Tabel Masukan & Feedback
CREATE TABLE IF NOT EXISTS public.masukan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_terang TEXT NOT NULL,
    cabang_instansi TEXT NOT NULL,
    email TEXT,
    no_wa TEXT NOT NULL,
    pesan TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Materi Kajian AI
CREATE TABLE IF NOT EXISTS public.materi_kajian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    tahun INTEGER NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    konten TEXT NOT NULL,
    teks_bersih TEXT,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel Pencarian Populer & Cache Intent
CREATE TABLE IF NOT EXISTS public.pencarian_populer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT UNIQUE NOT NULL,
    search_count INTEGER DEFAULT 1,
    last_searched_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.search_intent_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_asli TEXT UNIQUE NOT NULL,
    query_koreksi TEXT,
    kategori_ditebak TEXT,
    kata_kunci_konteks TEXT,
    frekuensi_pencarian INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Leave Requests
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Disetujui', 'Ditolak')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. AI LOGS, PLAYGROUND SESSIONS, & KNOWLEDGE RULES
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ai_knowledge_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword TEXT NOT NULL,
    instruction TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    target_folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_simulator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    source TEXT DEFAULT 'mobile',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON public.ai_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_topic ON public.ai_query_logs(topic_category);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_source ON public.ai_query_logs(source);

-- ------------------------------------------------------------------------------
-- 10. RPC FUNCTIONS (FTS, DISTINCT YEARS, CONSUME QUOTA, HYBRID SEARCH)
-- ------------------------------------------------------------------------------

-- RPC: get_distinct_years
CREATE OR REPLACE FUNCTION public.get_distinct_years(filter_folder_id UUID DEFAULT NULL)
RETURNS TABLE (tahun INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.tahun
  FROM public.brosur b
  WHERE (filter_folder_id IS NULL OR b.folder_id = filter_folder_id)
  ORDER BY b.tahun DESC;
END;
$$ LANGUAGE plpgsql;

-- RPC: search_brosur_ranked
CREATE OR REPLACE FUNCTION public.search_brosur_ranked(search_query TEXT, filter_folder_id UUID DEFAULT NULL)
RETURNS TABLE (
  id TEXT,
  judul TEXT,
  tahun INTEGER,
  slug TEXT,
  konten TEXT,
  teks_bersih TEXT,
  folder_id UUID,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.judul, b.tahun, b.slug, b.konten, b.teks_bersih, b.folder_id,
         ts_rank(b.fts, websearch_to_tsquery('indonesian', search_query)) as rank
  FROM public.brosur b
  WHERE b.fts @@ websearch_to_tsquery('indonesian', search_query)
    AND (filter_folder_id IS NULL OR b.folder_id = filter_folder_id)
  ORDER BY rank DESC, b.tahun DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- RPC: check_and_consume_ai_quota
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
        RETURN jsonb_build_object('allowed', false, 'error', 'Kode akses tidak ditemukan');
    END IF;

    IF v_code_record.is_active != true THEN
        RETURN jsonb_build_object('allowed', false, 'error', 'Kode akses sudah tidak aktif');
    END IF;

    v_limit := COALESCE(v_code_record.ai_daily_limit, 20);
    v_reset_hour := COALESCE(v_code_record.ai_reset_hour, 0);

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

    IF v_limit <= 0 THEN
        IF p_increment THEN
            INSERT INTO public.access_code_ai_usage (code, usage_date, question_count, last_used_at)
            VALUES (v_code_record.code, v_effective_date, 1, NOW())
            ON CONFLICT (code, usage_date) 
            DO UPDATE SET question_count = public.access_code_ai_usage.question_count + 1, last_used_at = NOW();
            v_current_count := v_current_count + 1;
        END IF;

        RETURN jsonb_build_object('allowed', true, 'is_unlimited', true, 'limit', 0, 'used', v_current_count, 'remaining', -1, 'reset_hour', v_reset_hour, 'cycle_date', v_effective_date);
    END IF;

    IF v_current_count >= v_limit THEN
        RETURN jsonb_build_object('allowed', false, 'is_unlimited', false, 'limit', v_limit, 'used', v_current_count, 'remaining', 0, 'reset_hour', v_reset_hour, 'cycle_date', v_effective_date, 'error', 'Kuota pertanyaan AI hari ini telah habis');
    END IF;

    IF p_increment THEN
        INSERT INTO public.access_code_ai_usage (code, usage_date, question_count, last_used_at)
        VALUES (v_code_record.code, v_effective_date, 1, NOW())
        ON CONFLICT (code, usage_date) 
        DO UPDATE SET question_count = public.access_code_ai_usage.question_count + 1, last_used_at = NOW();
        v_current_count := v_current_count + 1;
    END IF;

    v_remaining := GREATEST(0, v_limit - v_current_count);

    RETURN jsonb_build_object('allowed', true, 'is_unlimited', false, 'limit', v_limit, 'used', v_current_count, 'remaining', v_remaining, 'reset_hour', v_reset_hour, 'cycle_date', v_effective_date);
END;
$$;

-- RPC: hybrid_search_brosur_chunks
CREATE OR REPLACE FUNCTION public.hybrid_search_brosur_chunks(
    query_text TEXT,
    query_embedding vector(768) DEFAULT NULL,
    match_count INT DEFAULT 10,
    filter_folder UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    brosur_id TEXT,
    judul TEXT,
    tahun INTEGER,
    chunk_index INTEGER,
    chunk_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        bc.id,
        bc.brosur_id::TEXT,
        coalesce(bc.judul_brosur, 'Brosur MTA')::TEXT AS judul,
        bc.tahun::INTEGER,
        coalesce((bc.metadata->>'chunk_index')::INTEGER, 0) AS chunk_index,
        coalesce(bc.content, '')::TEXT AS chunk_text,
        (
            CASE 
                WHEN query_embedding IS NOT NULL AND bc.embedding IS NOT NULL 
                THEN (1 - (bc.embedding <=> query_embedding)) * 0.7
                ELSE 0.0
            END
            +
            CASE 
                WHEN query_text IS NOT NULL AND query_text <> '' AND bc.fts @@ websearch_to_tsquery('indonesian', query_text)
                THEN ts_rank(bc.fts, websearch_to_tsquery('indonesian', query_text)) * 0.3
                ELSE 0.0
            END
        )::FLOAT AS similarity
    FROM public.brosur_chunks bc
    WHERE
        (filter_folder IS NULL OR bc.folder_id = filter_folder)
        AND (
            (query_embedding IS NOT NULL AND bc.embedding IS NOT NULL AND (1 - (bc.embedding <=> query_embedding)) > 0.45)
            OR
            (query_text IS NOT NULL AND query_text <> '' AND bc.fts @@ websearch_to_tsquery('indonesian', query_text))
        )
    ORDER BY similarity DESC, bc.tahun DESC NULLS LAST
    LIMIT match_count;
END;
$$;

-- RPC: hybrid_search_hadist
CREATE OR REPLACE FUNCTION public.hybrid_search_hadist(
    query_text TEXT,
    query_embedding vector(768) DEFAULT NULL,
    match_count INT DEFAULT 6
)
RETURNS TABLE (
    id UUID,
    brosur_id TEXT,
    kutipan_arab TEXT,
    terjemahan TEXT,
    perawi_sumber TEXT,
    catatan TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hb.id,
        hb.brosur_id::TEXT,
        hb.kutipan_arab::TEXT,
        hb.terjemahan::TEXT,
        hb.perawi_sumber::TEXT,
        hb.catatan::TEXT,
        (
            CASE 
                WHEN query_embedding IS NOT NULL AND hb.embedding IS NOT NULL 
                THEN (1 - (hb.embedding <=> query_embedding)) * 0.75
                ELSE 0.0
            END
            +
            CASE 
                WHEN query_text IS NOT NULL AND query_text <> '' AND (
                    hb.terjemahan ILIKE '%' || query_text || '%' OR
                    hb.catatan ILIKE '%' || query_text || '%' OR
                    hb.perawi_sumber ILIKE '%' || query_text || '%'
                )
                THEN 0.25
                ELSE 0.0
            END
        )::FLOAT AS similarity
    FROM public.hadist_brosur hb
    WHERE
        (query_embedding IS NOT NULL AND hb.embedding IS NOT NULL AND (1 - (hb.embedding <=> query_embedding)) > 0.48)
        OR
        (query_text IS NOT NULL AND query_text <> '' AND (
            hb.terjemahan ILIKE '%' || query_text || '%' OR
            hb.catatan ILIKE '%' || query_text || '%' OR
            hb.perawi_sumber ILIKE '%' || query_text || '%'
        ))
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. HAK AKSES RLS TERBUKA (UNTUK WEB & FLUTTER)
-- ------------------------------------------------------------------------------
ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders_hadist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brosur DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brosur_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.kelompok_hadist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_rawi DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hadist_brosur DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hadist_chm DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hadist_chm_chunks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.konsultasi_hadits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_surah DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_ayat DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_sync_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_code_ai_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pengumuman DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.masukan DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.materi_kajian DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pencarian_populer DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_intent_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_knowledge_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_simulator_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_query_logs DISABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 12. SETUP AKUN SUPER ADMIN & ADMIN (PASSWORD: 123123)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_user1_id UUID := gen_random_uuid();
  v_user2_id UUID := gen_random_uuid();
  v_existing_id UUID;
BEGIN
  -- A. Setup Akun SUPER ADMIN: r.wariyanto@gmail.com
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'r.wariyanto@gmail.com';
  
  IF v_existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user1_id,
      'authenticated',
      'authenticated',
      'r.wariyanto@gmail.com',
      crypt('123123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Rifqi Wariyanto","role":"super-admin"}',
      NOW(),
      NOW()
    );
    
    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_user1_id, 'r.wariyanto@gmail.com', 'Rifqi Wariyanto', 'super-admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super-admin', is_active = true;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('123123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"super-admin"')
    WHERE id = v_existing_id;

    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_existing_id, 'r.wariyanto@gmail.com', 'Rifqi Wariyanto', 'super-admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'super-admin', is_active = true;
  END IF;

  -- B. Setup Akun ADMIN: brosurmta@gmail.com
  SELECT id INTO v_existing_id FROM auth.users WHERE email = 'brosurmta@gmail.com';
  
  IF v_existing_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user2_id,
      'authenticated',
      'authenticated',
      'brosurmta@gmail.com',
      crypt('123123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"Admin Brosur MTA","role":"admin"}',
      NOW(),
      NOW()
    );
    
    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_user2_id, 'brosurmta@gmail.com', 'Admin Brosur MTA', 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
  ELSE
    UPDATE auth.users 
    SET encrypted_password = crypt('123123', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        raw_user_meta_data = jsonb_set(coalesce(raw_user_meta_data, '{}'::jsonb), '{role}', '"admin"')
    WHERE id = v_existing_id;

    INSERT INTO public.profiles (id, email, name, role, is_active)
    VALUES (v_existing_id, 'brosurmta@gmail.com', 'Admin Brosur MTA', 'admin', true)
    ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
