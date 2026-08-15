-- Tabel materi_kajian untuk menyimpan materi hasil AI yang hanya diakses di Dashboard
CREATE TABLE IF NOT EXISTS materi_kajian (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  judul TEXT NOT NULL,
  tahun INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  konten TEXT NOT NULL, -- Format HTML
  teks_bersih TEXT, -- Format Markdown / Plain Text
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE materi_kajian ENABLE ROW LEVEL SECURITY;

-- Policy 1: Hanya pengguna terautentikasi (dashboard user/admin) yang bisa membaca (SELECT)
CREATE POLICY "Allow authenticated users to select materi_kajian" 
ON materi_kajian FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) IN ('admin', 'user')
);

-- Policy 2: Hanya admin terautentikasi yang bisa memodifikasi (INSERT, UPDATE, DELETE)
CREATE POLICY "Allow authenticated admins to modify materi_kajian" 
ON materi_kajian FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);
