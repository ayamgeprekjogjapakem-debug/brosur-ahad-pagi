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

-- Tabel masukan untuk menampung pesan, feedback, dan saran dari pengguna
CREATE TABLE masukan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_terang TEXT NOT NULL,
  cabang_instansi TEXT NOT NULL,
  email TEXT,
  no_wa TEXT NOT NULL,
  pesan TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aktifkan RLS untuk tabel masukan
ALTER TABLE masukan ENABLE ROW LEVEL SECURITY;

-- Policy 1: Siapapun (publik/anon) bisa MENGIRIM / MENAMBAH masukan
CREATE POLICY "Allow public insert to masukan" 
ON masukan FOR INSERT 
TO public 
WITH CHECK (true);

-- Policy 2: Hanya admin yang sedang login yang bisa MELIHAT dan MENGELOLA masukan
CREATE POLICY "Allow Admin full access on masukan" 
ON masukan FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);

-- Tabel pengaturan sistem global
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default: fitur masukan aktif
INSERT INTO system_settings (key, value) VALUES ('is_feedback_enabled', 'true');

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on settings" ON system_settings FOR SELECT TO public USING (true);
CREATE POLICY "Allow admin full on settings" ON system_settings FOR ALL TO authenticated USING (
  (SELECT role FROM profiles WHERE profiles.id = auth.uid()) = 'admin'
);
