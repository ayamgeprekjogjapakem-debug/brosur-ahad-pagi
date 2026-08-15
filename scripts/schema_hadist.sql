-- ====================================================================
-- SCRIPT SQL: SCHEMA PENGELOMPOKAN HADIST & DALIL (BROSUR AHAD PAGI)
-- ====================================================================

-- 1. Tabel Master Kelompok / Tema Hadist
CREATE TABLE IF NOT EXISTS kelompok_hadist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kelompok TEXT UNIQUE NOT NULL,
    deskripsi TEXT,
    warna_badge TEXT DEFAULT 'emerald',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabel Item Hadist yang Diekstrak dari Brosur
CREATE TABLE IF NOT EXISTS hadist_brosur (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kelompok_id UUID REFERENCES kelompok_hadist(id) ON DELETE CASCADE,
    brosur_id TEXT REFERENCES brosur(id) ON DELETE CASCADE,
    kutipan_arab TEXT NOT NULL,
    terjemahan TEXT,
    perawi_sumber TEXT,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexing untuk optimasi pencarian & relasi
CREATE INDEX IF NOT EXISTS idx_hadist_kelompok_id ON hadist_brosur(kelompok_id);
CREATE INDEX IF NOT EXISTS idx_hadist_brosur_id ON hadist_brosur(brosur_id);

-- 4. Aktifkan Row Level Security (RLS)
ALTER TABLE kelompok_hadist ENABLE ROW LEVEL SECURITY;
ALTER TABLE hadist_brosur ENABLE ROW LEVEL SECURITY;

-- 5. Policies untuk kelompok_hadist
CREATE POLICY "Allow public read on kelompok_hadist"
ON kelompok_hadist FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all access for authenticated on kelompok_hadist"
ON kelompok_hadist FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Policies untuk hadist_brosur
CREATE POLICY "Allow public read on hadist_brosur"
ON hadist_brosur FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all access for authenticated on hadist_brosur"
ON hadist_brosur FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Seed Data Kelompok Default (6 Tema Utama)
INSERT INTO kelompok_hadist (nama_kelompok, deskripsi, warna_badge)
VALUES 
    (
        'Akidah & Tauhid',
        'Hadist dan dalil yang berkaitan dengan keimanan kepada Allah, tauhid, rukun iman, dan perkara ghaib.',
        'emerald'
    ),
    (
        'Shalat & Thaharah',
        'Hadist dan dalil yang mengatur tata cara bersuci, shalat wajib, shalat sunnah, dan ibadah harian.',
        'blue'
    ),
    (
        'Akhlak & Adab',
        'Hadist mengenai pembinaan budi pekerti, adab bermasyarakat, berbakti kepada orang tua, dan kejujuran.',
        'amber'
    ),
    (
        'Muamalah & Harta',
        'Hadist mengenai perdagangan, halal dan haram, sedekah, zakat, serta etika muamalah.',
        'purple'
    ),
    (
        'Ilmu & Al-Quran',
        'Hadist tentang keutamaan menuntut ilmu, membaca Al-Quran, pengajaran, dan ilmu agama.',
        'cyan'
    ),
    (
        'Dzikir & Doa',
        'Kumpulan doa rasulullah, dzikir pagi dan petang, serta keutamaan berdzikir.',
        'rose'
    )
ON CONFLICT (nama_kelompok) DO NOTHING;
