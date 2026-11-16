-- ==============================================================================
-- MIGRASI 04: PGVECTOR, HYBRID SEARCH, BROSUR CHUNKS, & LOG ANALITIK AI
-- ==============================================================================

-- 1. Ekstensi pgvector
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Tabel brosur_chunks untuk RAG AI (Embedding 768 Dimensi)
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

-- Kolom FTS Generated
ALTER TABLE public.brosur_chunks 
ADD COLUMN IF NOT EXISTS fts TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('indonesian', coalesce(judul_brosur, '') || ' ' || coalesce(content, ''))
) STORED;

CREATE INDEX IF NOT EXISTS idx_brosur_chunks_brosur_id ON public.brosur_chunks(brosur_id);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_tahun ON public.brosur_chunks(tahun DESC);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_fts_gin ON public.brosur_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_brosur_chunks_embedding_hnsw 
    ON public.brosur_chunks USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.brosur_chunks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to brosur_chunks" ON public.brosur_chunks;
CREATE POLICY "Public full access to brosur_chunks"
    ON public.brosur_chunks FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Kolom Vektor pada Tabel hadist_brosur
ALTER TABLE public.hadist_brosur 
ADD COLUMN IF NOT EXISTS embedding vector(768);

CREATE INDEX IF NOT EXISTS idx_hadist_brosur_embedding_hnsw 
    ON public.hadist_brosur USING hnsw (embedding vector_cosine_ops);

-- 4. Tabel Riwayat Percakapan AI Playground (ai_simulator_sessions)
CREATE TABLE IF NOT EXISTS public.ai_simulator_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    title TEXT NOT NULL DEFAULT 'Percakapan Baru',
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_simulator_sessions_created_at 
    ON public.ai_simulator_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_simulator_sessions_slug 
    ON public.ai_simulator_sessions (slug);

ALTER TABLE public.ai_simulator_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public full access to ai_simulator_sessions" ON public.ai_simulator_sessions;
CREATE POLICY "Public full access to ai_simulator_sessions"
    ON public.ai_simulator_sessions FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Tabel Log Analitik AI Real-time (ai_query_logs)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_query_logs_created_at ON public.ai_query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_topic ON public.ai_query_logs(topic_category);
CREATE INDEX IF NOT EXISTS idx_ai_query_logs_source ON public.ai_query_logs(source);

ALTER TABLE public.ai_query_logs DISABLE ROW LEVEL SECURITY;

-- 6. RPC: hybrid_search_brosur_chunks
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

-- 7. RPC: hybrid_search_hadist
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
