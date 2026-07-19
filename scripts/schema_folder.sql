-- Buat tabel Master Folder
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS) pada tabel folders
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Siapapun (publik/anon) bisa MEMBACA folders
CREATE POLICY "Allow public read access on folders" 
ON folders FOR SELECT 
TO public 
USING (true);

-- Policy 2: Mengizinkan operasi INSERT, UPDATE, DELETE 
-- (Bisa disesuaikan dengan aturan admin Anda. Untuk saat ini kita buka akses modifikasi agar dashboard berfungsi)
CREATE POLICY "Allow modifications on folders" 
ON folders FOR ALL 
USING (true)
WITH CHECK (true);

-- Tambahkan relasi folder ke tabel brosur
ALTER TABLE brosur ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id);

-- Pindahkan semua brosur yang sudah ada ke dalam Folder Default tersebut (Jika belum)
INSERT INTO folders (id, slug, name, description) 
VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'brosur-ahad-pagi', 
    'Brosur Ahad Pagi', 
    'Koleksi lengkap arsip digital Brosur Ahad Pagi. Telah diindeks secara penuh di dalam Database Cloud untuk memudahkan pencarian teks dan tema kajian.'
) ON CONFLICT (slug) DO NOTHING;

UPDATE brosur SET folder_id = '11111111-1111-1111-1111-111111111111' WHERE folder_id IS NULL;
