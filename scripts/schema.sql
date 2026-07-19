-- Tabel brosur untuk menyimpan seluruh koleksi konten HTML brosur
CREATE TABLE brosur (
  id TEXT PRIMARY KEY,
  tahun INTEGER NOT NULL,
  judul TEXT NOT NULL,
  slug TEXT NOT NULL,
  konten TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE brosur ENABLE ROW LEVEL SECURITY;

-- Policy 1: Siapapun (publik/anon) bisa MEMBACA brosur
CREATE POLICY "Allow public read access on brosur" 
ON brosur FOR SELECT 
TO public 
USING (true);

-- Policy 2: Hanya admin yang sedang login yang bisa MENGUBAH / MENAMBAH brosur
CREATE POLICY "Allow Admin full access on brosur" 
ON brosur FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);
