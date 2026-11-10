-- ==============================================================================
-- MASTER MIGRASI: HYBRID SEARCH + PGVECTOR + DOCUMENT CHUNKING (1995 - 2026)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase Dashboard Anda.
-- ==============================================================================

-- 1. Aktifkan Ekstensi Vector (pgvector) & UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Pastikan Kolom deepseek_token Tersedia di app_settings
ALTER TABLE public.app_settings 
ADD COLUMN IF NOT EXISTS deepseek_token TEXT;

-- ==============================================================================
-- 3. TABEL: brosur_chunks (Kompatibel Penuh dengan Tabel Eksisting)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.brosur_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brosur_id TEXT NOT NULL,
    judul_brosur TEXT,
    tahun INTEGER,
    nomor TEXT,
    tanggal TEXT,
    folder_id UUID,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tambahkan kolom-kolom yang mungkin belum ada pada tabel brosur_chunks eksisting
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS judul_brosur TEXT;
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS tahun INTEGER;
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.brosur_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Tambahkan kolom fts (Full-Text Search) secara aman pada tabel brosur_chunks eksisting
ALTER TABLE public.brosur_chunks 
ADD COLUMN IF NOT EXISTS fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('indonesian', coalesce(judul_brosur, '') || ' ' || coalesce(content, ''))
) STORED;

-- Indeks Kecepatan Tinggi untuk brosur_chunks
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_brosur_id ON public.brosur_chunks(brosur_id);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_tahun ON public.brosur_chunks(tahun DESC);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_fts_gin ON public.brosur_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_embedding_hnsw 
    ON public.brosur_chunks USING hnsw (embedding vector_cosine_ops);

-- Kebijakan RLS untuk brosur_chunks
ALTER TABLE public.brosur_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to brosur_chunks" ON public.brosur_chunks;
CREATE POLICY "Public full access to brosur_chunks"
    ON public.brosur_chunks
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. TAMBAHKAN KOLOM VEKTOR KE TABEL hadist_brosur (16.832+ Hadits)
-- ==============================================================================
ALTER TABLE public.hadist_brosur 
ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_hadist_brosur_embedding_hnsw 
    ON public.hadist_brosur USING hnsw (embedding vector_cosine_ops);

-- ==============================================================================
-- 5. FUNGSI RPC: hybrid_search_brosur_chunks (Gabungan Kata Eksak + Makna Vektor)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.hybrid_search_brosur_chunks(TEXT, vector(768), INT, UUID);

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
        bc.tahun,
        coalesce((bc.metadata->>'chunk_index')::INTEGER, 0) AS chunk_index,
        coalesce(bc.content, '')::TEXT AS chunk_text,
        (
            -- Skor Vektor (Makna Kalimat) bobot 70%
            CASE 
                WHEN query_embedding IS NOT NULL AND bc.embedding IS NOT NULL 
                THEN (1 - (bc.embedding <=> query_embedding)) * 0.7
                ELSE 0.0
            END
            +
            -- Skor Kata Eksak (Full-Text Search) bobot 30%
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

-- ==============================================================================
-- 6. FUNGSI RPC: hybrid_search_hadist (Pencarian Vektor + Kata pada 16.832 Hadits)
-- ==============================================================================
DROP FUNCTION IF EXISTS public.hybrid_search_hadist(TEXT, vector(768), INT);

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
