-- 1. Tambahkan kolom tsvector untuk menyimpan data pencarian
ALTER TABLE brosur ADD COLUMN IF NOT EXISTS fts tsvector;

-- 2. Buat fungsi untuk meng-update kolom fts setiap kali ada data baru/diubah
CREATE OR REPLACE FUNCTION brosur_fts_update() RETURNS trigger AS $$
BEGIN
  -- Menggunakan teks_bersih (atau konten jika belum ada teks_bersih) dan judul.
  -- Menggunakan dictionary 'indonesian' untuk optimasi bahasa Indonesia
  NEW.fts := 
    setweight(to_tsvector('indonesian', coalesce(NEW.judul, '')), 'A') ||
    setweight(to_tsvector('indonesian', coalesce(NEW.teks_bersih, NEW.konten, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- 3. Pasang Trigger agar fungsi di atas berjalan otomatis saat INSERT atau UPDATE
DROP TRIGGER IF EXISTS tsvectorupdate ON brosur;
CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON brosur FOR EACH ROW EXECUTE FUNCTION brosur_fts_update();

-- 4. Update data yang sudah ada agar kolom fts-nya terisi
UPDATE brosur SET id = id; -- Memicu trigger untuk semua row

-- 5. Buat GIN Index agar pencarian sangat cepat
CREATE INDEX IF NOT EXISTS brosur_fts_idx ON brosur USING GIN (fts);
