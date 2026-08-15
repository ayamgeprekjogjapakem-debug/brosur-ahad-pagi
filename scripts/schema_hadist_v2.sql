-- ====================================================================
-- SCRIPT SQL V2: RIJALUL HADITS (SUNNAH.COM) & TAKHRIJ HADIST
-- ====================================================================

-- 1. Tabel Master Rawi / Rijalul Hadits (Biografi, Thabaqat, Jarh wa Ta'dil)
CREATE TABLE IF NOT EXISTS master_rawi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_rawi TEXT UNIQUE NOT NULL,
    nama_arab TEXT,
    kategori_rawi TEXT DEFAULT 'mukharij', -- 'mukharij' (Bukhari/Muslim), 'sahabat', 'tabiin', 'rijal_sanad'
    thabaqat TEXT,                         -- Era/Generasi (misal: 'Sahabat Nabi ﷺ', 'Mukharij Abad 3 H')
    kredibilitas TEXT DEFAULT 'Thiqah',    -- Penilaian Ulama: 'Thiqah', 'Shaduq', 'Shahabi', 'Dha''if'
    biografi TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Aktifkan Row Level Security (RLS) pada tabel master_rawi
ALTER TABLE master_rawi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on master_rawi"
ON master_rawi FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow all access for authenticated on master_rawi"
ON master_rawi FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Perluas Tabel hadist_brosur untuk mendukung Takhrij (Juz, Hal, No, Rawi Kitab) & Status
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS rawi_kitab TEXT;    -- Misal: 'Muslim', 'Bukhari', 'Tirmidzi'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS juz TEXT;           -- Misal: '1'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS halaman TEXT;       -- Misal: '227'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS no_hadist TEXT;     -- Misal: '70'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS rawi_teratas TEXT;  -- Misal: 'Anas bin Malik', 'Abu Hurairah'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS status_hadist TEXT DEFAULT 'terverifikasi'; -- 'mentah' vs 'terverifikasi'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS sumber_jenis TEXT DEFAULT 'hadist';         -- 'hadist' (HR) vs 'quran' (QS)
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS nama_surat TEXT;                            -- Misal: 'Al-Baqarah'
ALTER TABLE hadist_brosur ADD COLUMN IF NOT EXISTS no_ayat TEXT;                               -- Misal: '152'

-- Izinkan kelompok_id bersifat NULL agar Hadist Mentah (draft auto-generate) bisa disimpan sebelum ditetapkan temanya
ALTER TABLE hadist_brosur ALTER COLUMN kelompok_id DROP NOT NULL;

-- 4. Indexing untuk pencarian riwayat dan status
CREATE INDEX IF NOT EXISTS idx_hadist_rawi_kitab ON hadist_brosur(rawi_kitab);
CREATE INDEX IF NOT EXISTS idx_hadist_status ON hadist_brosur(status_hadist);
CREATE INDEX IF NOT EXISTS idx_hadist_sumber_jenis ON hadist_brosur(sumber_jenis);

-- 5. Seed Data Master Rawi / Rijalul Hadits (9 Imam Hadist + Sahabat Populer)
INSERT INTO master_rawi (nama_rawi, nama_arab, kategori_rawi, thabaqat, kredibilitas, biografi)
VALUES
    (
        'Muslim',
        'الإمام مسلم بن الحجاج النيسابوري',
        'mukharij',
        'Mukharij Abad 3 H (204 - 261 H)',
        'Thiqah',
        'Imam Muslim bin al-Hajjaj an-Naisaburi adalah penyusun kitab Shahih Muslim, kitab hadist paling shahih kedua setelah Shahih al-Bukhari. Beliau berguru kepada Imam Bukhari, Imam Ahmad bin Hanbal, dan para ulama besar hadist di masanya.'
    ),
    (
        'Bukhari',
        'الإمام محمد بن إسماعيل البخاري',
        'mukharij',
        'Mukharij Abad 3 H (194 - 256 H)',
        'Thiqah',
        'Imam Muhammad bin Ismail al-Bukhari adalah Amirul Mukminin dalam ilmu hadist dan penyusun al-Jami as-Shahih (Shahih Bukhari), kitab yang disepakati sebagai kitab paling shahih setelah Al-Quran.'
    ),
    (
        'Tirmidzi',
        'الإمام محمد بن عيسى الترمذي',
        'mukharij',
        'Mukharij Abad 3 H (209 - 279 H)',
        'Thiqah',
        'Imam at-Tirmidzi adalah murid terkemuka Imam Bukhari dan pengarang kitab Jami at-Tirmidzi (Sunan at-Tirmidzi). Beliau terkenal dengan klasifikasi hadist shahih, hasan, dan dhaif.'
    ),
    (
        'Abu Dawud',
        'الإمام سليمان بن الأشعث السجستاني',
        'mukharij',
        'Mukharij Abad 3 H (202 - 275 H)',
        'Thiqah',
        'Imam Abu Dawud as-Sijistani adalah penyusun kitab Sunan Abu Dawud yang menghimpun hadist-hadist hukum ahkam yang menjadi rujukan para fuqaha.'
    ),
    (
        'An-Nasa''i',
        'الإمام أحمد بن شعيب النسائي',
        'mukharij',
        'Mukharij Abad 3 H (215 - 303 H)',
        'Thiqah',
        'Imam an-Nasa''i adalah penulis kitab as-Sunan al-Kubra dan as-Sunan al-Sughra (al-Mujtaba), dengan syarat penyeleksian perawi yang sangat ketat.'
    ),
    (
        'Ibnu Majah',
        'الإمام محمد بن يزيد ابن ماجه',
        'mukharij',
        'Mukharij Abad 3 H (209 - 273 H)',
        'Thiqah',
        'Imam Ibnu Majah al-Qazwini adalah penulis Sunan Ibnu Majah, kitab ke-6 dalam kutubus sittah (enam kitab hadist utama).'
    ),
    (
        'Ahmad',
        'الإمام أحمد بن محمد بن حنبل',
        'mukharij',
        'Mukharij Abad 3 H (164 - 241 H)',
        'Thiqah',
        'Imam Ahmad bin Hanbal adalah Imam Ahlus Sunnah wal Jamaah, pendiri mazhab Hanbali, dan pengarang kitab al-Musnad yang memuat lebih dari 30.000 hadist.'
    ),
    (
        'Malik',
        'الإمام مالك بن أنس الأصبحي',
        'mukharij',
        'Mukharij Abad 2 H (93 - 179 H)',
        'Thiqah',
        'Imam Malik bin Anas adalah Imam Darul Hijrah (Madinah) dan pengarang kitab al-Muwaththa'', salah satu kumpulan hadist dan fiqih tertua yang disusun dengan sangat teliti.'
    ),
    (
        'Ad-Darimi',
        'الإمام عبد الله بن عبد الرحمن الدارمي',
        'mukharij',
        'Mukharij Abad 3 H (181 - 255 H)',
        'Thiqah',
        'Imam ad-Darimi adalah guru dari Imam Muslim, Abu Dawud, dan Tirmidzi serta pengarang kitab Sunan ad-Darimi.'
    ),
    (
        'Anas bin Malik',
        'أنس بن مالك الأنصاري',
        'sahabat',
        'Sahabat Nabi ﷺ',
        'Shahabi',
        'Anas bin Malik bin Nadhar al-Ansari adalah pelayan Rasulullah ﷺ selama 10 tahun di Madinah. Beliau termasuk di antara sahabat yang paling banyak meriwayatkan hadist (lebih dari 2.200 hadist).'
    ),
    (
        'Abu Hurairah',
        'أبو هريرة عبد الرحمن بن صخر الدوسي',
        'sahabat',
        'Sahabat Nabi ﷺ',
        'Shahabi',
        'Abu Hurairah r.a. adalah penghafal hadist terhebat di kalangan sahabat dan merupakan sahabat dengan jumlah riwayat terbanyak (lebih dari 5.300 hadist).'
    ),
    (
        'Aisyah binti Abu Bakar',
        'عائشة بنت أبي بكر الصديق',
        'sahabat',
        'Sahabat Nabi ﷺ',
        'Shahabi',
        'Ummul Mukminin Aisyah r.a. adalah istri tercinta Rasulullah ﷺ yang sangat alim dalam ilmu fikih, kedokteran, dan syair, serta meriwayatkan lebih dari 2.210 hadist.'
    ),
    (
        'al-Humaydi ''Abdullah bin az-Zubayr',
        'الحميدي عبد الله بن الزبير',
        'rijal_sanad',
        'Mukharij / Guru Bukhari (Wafat 219 H)',
        'Thiqah',
        'Al-Humaydi Abdullah bin az-Zubair al-Qurashi al-Makki adalah imam besar di Makkah, guru utama Imam Bukhari (hadist pertama dalam Shahih Bukhari diriwayatkan melalui jalur beliau), dan penyusun Musnad al-Humaydi. Beliau dinilai Thiqah Imam oleh para kritikus hadist.'
    )
ON CONFLICT (nama_rawi) DO NOTHING;
