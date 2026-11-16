-- ==============================================================================
-- MIGRASI 01: EXTENSIONS, FOLDERS, BROSUR, MASUKAN, DAN PENCARIAN TEKS (FTS)
-- ==============================================================================

-- 1. Ekstensi Dasar
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1.5. Tabel Profiles (User Management & Role)
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on profiles" ON public.profiles;
CREATE POLICY "Allow public read on profiles" 
ON public.profiles FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public full access on profiles" ON public.profiles;
CREATE POLICY "Allow public full access on profiles" 
ON public.profiles FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Auto Sync User dari auth.users ke public.profiles
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


-- 2. Master Folders / Koleksi
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on folders" ON public.folders;
CREATE POLICY "Allow public read access on folders" 
ON public.folders FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow modifications on folders" ON public.folders;
CREATE POLICY "Allow modifications on folders" 
ON public.folders FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- Seed Folder Default jika belum ada
INSERT INTO public.folders (id, slug, name, description) 
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'brosur-ahad-pagi', 
    'Brosur Ahad Pagi', 
    'Koleksi lengkap arsip digital Brosur Ahad Pagi MTA.'
) ON CONFLICT (slug) DO NOTHING;

-- 3. Tabel Brosur
CREATE TABLE IF NOT EXISTS public.brosur (
    id TEXT PRIMARY KEY,
    tahun INTEGER NOT NULL,
    judul TEXT NOT NULL,
    slug TEXT NOT NULL,
    konten TEXT NOT NULL,
    teks_bersih TEXT,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeks dasar
CREATE INDEX IF NOT EXISTS idx_brosur_tahun ON public.brosur(tahun DESC);
CREATE INDEX IF NOT EXISTS idx_brosur_folder_id ON public.brosur(folder_id);
CREATE INDEX IF NOT EXISTS idx_brosur_slug ON public.brosur(slug);

ALTER TABLE public.brosur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on brosur" ON public.brosur;
CREATE POLICY "Allow public read access on brosur" 
ON public.brosur FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow Admin full access on brosur" ON public.brosur;
CREATE POLICY "Allow Admin full access on brosur" 
ON public.brosur FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- 4. Full-Text Search (FTS) untuk Brosur
ALTER TABLE public.brosur ADD COLUMN IF NOT EXISTS fts TSVECTOR;

CREATE OR REPLACE FUNCTION public.brosur_fts_update() RETURNS trigger AS $$
BEGIN
  NEW.fts := 
    setweight(to_tsvector('indonesian', coalesce(NEW.judul, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.teks_bersih, NEW.konten, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate ON public.brosur;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON public.brosur FOR EACH ROW EXECUTE FUNCTION public.brosur_fts_update();

CREATE INDEX IF NOT EXISTS brosur_fts_idx ON public.brosur USING GIN (fts);

-- 5. Tabel Masukan / Feedback
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

ALTER TABLE public.masukan ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to masukan" ON public.masukan;
CREATE POLICY "Allow public insert to masukan" 
ON public.masukan FOR INSERT 
TO public 
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read on masukan" ON public.masukan;
CREATE POLICY "Allow authenticated read on masukan" 
ON public.masukan FOR SELECT 
TO public 
USING (true);

-- 6. Tabel Materi Kajian (AI Generated / Dashboard)
CREATE TABLE IF NOT EXISTS public.materi_kajian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    judul TEXT NOT NULL,
    tahun INTEGER NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    konten TEXT NOT NULL,
    teks_bersih TEXT,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.materi_kajian ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on materi_kajian" ON public.materi_kajian;
CREATE POLICY "Allow public read on materi_kajian" 
ON public.materi_kajian FOR SELECT 
TO public 
USING (true);

DROP POLICY IF EXISTS "Allow public modify on materi_kajian" ON public.materi_kajian;
CREATE POLICY "Allow public modify on materi_kajian" 
ON public.materi_kajian FOR ALL 
TO public 
USING (true)
WITH CHECK (true);

-- 7. RPC: get_distinct_years
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

-- 8. RPC: search_brosur_ranked
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
