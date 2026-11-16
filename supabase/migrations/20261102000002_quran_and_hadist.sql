-- ==============================================================================
-- MIGRASI 02: QURAN KEMENAG & TAKHRIJ HADIST BROSUR
-- ==============================================================================

-- 1. Tabel Surah Quran
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

-- 2. Tabel Ayat Quran
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

-- 3. Tabel Sync Logs Quran
CREATE TABLE IF NOT EXISTS public.quran_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sync_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status VARCHAR(50) NOT NULL,
    details TEXT,
    changes_detected BOOLEAN DEFAULT FALSE,
    applied BOOLEAN DEFAULT FALSE
);

-- RLS Quran
ALTER TABLE public.quran_surah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_ayat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quran_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on quran_surah" ON public.quran_surah;
CREATE POLICY "Allow public read access on quran_surah" ON public.quran_surah FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access on quran_ayat" ON public.quran_ayat;
CREATE POLICY "Allow public read access on quran_ayat" ON public.quran_ayat FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all access on quran_sync_logs" ON public.quran_sync_logs;
CREATE POLICY "Allow all access on quran_sync_logs" ON public.quran_sync_logs FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabel Master Kelompok Hadist
CREATE TABLE IF NOT EXISTS public.kelompok_hadist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelompok TEXT UNIQUE NOT NULL,
    deskripsi TEXT,
    warna_badge TEXT DEFAULT 'emerald',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabel Master Rawi / Rijalul Hadits
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

-- 6. Tabel Hadist Brosur (Takhrij & Dalil)
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hadist_kelompok_id ON public.hadist_brosur(kelompok_id);
CREATE INDEX IF NOT EXISTS idx_hadist_brosur_id ON public.hadist_brosur(brosur_id);
CREATE INDEX IF NOT EXISTS idx_hadist_rawi_kitab ON public.hadist_brosur(rawi_kitab);
CREATE INDEX IF NOT EXISTS idx_hadist_status ON public.hadist_brosur(status_hadist);
CREATE INDEX IF NOT EXISTS idx_hadist_sumber_jenis ON public.hadist_brosur(sumber_jenis);

-- RLS Hadist
ALTER TABLE public.kelompok_hadist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_rawi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hadist_brosur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on kelompok_hadist" ON public.kelompok_hadist;
CREATE POLICY "Allow public read on kelompok_hadist" ON public.kelompok_hadist FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on kelompok_hadist" ON public.kelompok_hadist;
CREATE POLICY "Allow all on kelompok_hadist" ON public.kelompok_hadist FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on master_rawi" ON public.master_rawi;
CREATE POLICY "Allow public read on master_rawi" ON public.master_rawi FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on master_rawi" ON public.master_rawi;
CREATE POLICY "Allow all on master_rawi" ON public.master_rawi FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read on hadist_brosur" ON public.hadist_brosur;
CREATE POLICY "Allow public read on hadist_brosur" ON public.hadist_brosur FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow all on hadist_brosur" ON public.hadist_brosur;
CREATE POLICY "Allow all on hadist_brosur" ON public.hadist_brosur FOR ALL USING (true) WITH CHECK (true);

-- Seed Data Master Rawi Populer
INSERT INTO public.master_rawi (nama_rawi, nama_arab, kategori_rawi, thabaqat, kredibilitas, biografi)
VALUES 
    ('Bukhari', 'البخاري', 'mukharij', 'Imam Hadits Abad 3 H', 'Amirul Mu''minin fil Hadits', 'Muhammad bin Ismail bin Ibrahim bin al-Mughirah al-Ju''fi al-Bukhari (194-256 H). Penyusun Shahih Al-Bukhari.'),
    ('Muslim', 'مسلم', 'mukharij', 'Imam Hadits Abad 3 H', 'Imam Hadits Terkemuka', 'Muslim bin al-Hajjaj bin Muslim al-Qusyairi an-Naisaburi (204-261 H). Penyusun Shahih Muslim.'),
    ('Abu Daud', 'أبو داود', 'mukharij', 'Ashabus Sunan Abad 3 H', 'Imam & Faqih', 'Sulaiman bin al-Asy''ats bin Ishaq al-Azdi as-Sijistani (202-275 H). Penyusun Sunan Abu Daud.'),
    ('Tirmidzi', 'الترمذي', 'mukharij', 'Ashabus Sunan Abad 3 H', 'Hafizh & Mujtahid', 'Muhammad bin Isa bin Saurah at-Tirmidzi (209-279 H). Penyusun Jami'' at-Tirmidzi.'),
    ('An-Nasa''i', 'النسائي', 'mukharij', 'Ashabus Sunan Abad 3 H', 'Syaikhul Islam & Hafizh', 'Ahmad bin Syu''aib bin Ali bin Sinan an-Nasa''i (215-303 H). Penyusun Sunan an-Nasa''i.'),
    ('Ibnu Majah', 'ابن ماجه', 'mukharij', 'Ashabus Sunan Abad 3 H', 'Hafizh & Mufassir', 'Muhammad bin Yazid bin Majah al-Qazwini (209-273 H). Penyusun Sunan Ibnu Majah.'),
    ('Ahmad bin Hanbal', 'أحمد بن حنبل', 'mukharij', 'Imam Mazhab & Salaf', 'Imam Ahlus Sunnah', 'Ahmad bin Muhammad bin Hanbal asy-Syaibani (164-241 H). Penyusun Musnad Ahmad.'),
    ('Malik bin Anas', 'مالك بن أنس', 'mukharij', 'Imam Mazhab & Salaf', 'Imam Darul Hijrah', 'Malik bin Anas bin Malik al-Ashbahi (93-179 H). Penyusun Kitab Al-Muwaththa''.'),
    ('Abu Hurairah', 'أبو هريرة', 'sahabat', 'Sahabat Nabi ﷺ', 'Shahabi Jalil', 'Abdurrahman bin Shakhr ad-Dausi. Sahabat Nabi yang paling banyak meriwayatkan hadits (5.374 hadits).'),
    ('Aisyah binti Abi Bakr', 'عائشة بنت أبي بكر', 'sahabat', 'Ummul Mukminin', 'Shahabiyyah & Faqihah', 'Ummul Mukminin Aisyah radhiyallahu ''anha. Salah satu perawi wanita terkemuka (2.210 hadits).'),
    ('Anas bin Malik', 'أنس بن مالك', 'sahabat', 'Sahabat Nabi ﷺ', 'Pelayan Rasulullah ﷺ', 'Khadim Rasulullah ﷺ selama 10 tahun di Madinah (2.286 hadits).'),
    ('Abdullah bin Umar', 'عبد الله بن عمر', 'sahabat', 'Sahabat Nabi ﷺ', 'Faqih Sahabat', 'Putra Umar bin Khattab radhiyallahu ''anhuma. Sangat teliti dalam ittiba'' Sunnah (2.630 hadits).')
ON CONFLICT (nama_rawi) DO NOTHING;
