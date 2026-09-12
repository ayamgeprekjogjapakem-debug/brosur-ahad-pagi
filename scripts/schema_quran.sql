-- Schema untuk Data Quran Kemenag

-- Tabel Surah
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

-- Tabel Ayat
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

-- Tabel Sync Logs untuk riwayat komparasi / update dari Kemenag
CREATE TABLE IF NOT EXISTS public.quran_sync_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    sync_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'PENDING'
    details TEXT,
    changes_detected BOOLEAN DEFAULT FALSE,
    applied BOOLEAN DEFAULT FALSE
);

-- Menambahkan Index untuk pencarian
CREATE INDEX IF NOT EXISTS idx_quran_ayat_surah_id ON public.quran_ayat(surah_id);
CREATE INDEX IF NOT EXISTS idx_quran_ayat_nomor_ayat ON public.quran_ayat(nomor_ayat);

-- Row Level Security (RLS)
ALTER TABLE public.quran_surah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_ayat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_sync_logs ENABLE ROW LEVEL SECURITY;

-- Policy (Public Read, Admin Write)
-- Asumsi: role public bisa membaca, role authenticated (admin) bisa mengubah
CREATE POLICY "Allow public read access on quran_surah" ON public.quran_surah FOR SELECT USING (true);
CREATE POLICY "Allow public read access on quran_ayat" ON public.quran_ayat FOR SELECT USING (true);

-- Untuk kemudahan (development), kita berikan akses full untuk authenticated users
CREATE POLICY "Allow authenticated full access on quran_surah" ON public.quran_surah FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on quran_ayat" ON public.quran_ayat FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access on quran_sync_logs" ON public.quran_sync_logs FOR ALL USING (auth.role() = 'authenticated');
