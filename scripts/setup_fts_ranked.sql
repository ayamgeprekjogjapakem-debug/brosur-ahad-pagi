-- Fungsi pencarian yang akan mengembalikan hasil berdasarkan tingkat relevansi (ts_rank)
-- ts_rank mengkalkulasi seberapa cocok dan seberapa banyak kata yang sesuai dengan pencarian
CREATE OR REPLACE FUNCTION search_brosur_ranked(search_query text, filter_folder_id uuid DEFAULT NULL)
RETURNS TABLE (
  id text,
  judul text,
  tahun integer,
  slug text,
  konten text,
  teks_bersih text,
  folder_id uuid,
  rank real
) AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.judul, b.tahun, b.slug, b.konten, b.teks_bersih, b.folder_id,
         ts_rank(b.fts, websearch_to_tsquery('indonesian', search_query)) as rank
  FROM brosur b
  WHERE b.fts @@ websearch_to_tsquery('indonesian', search_query)
    AND (filter_folder_id IS NULL OR b.folder_id = filter_folder_id)
  ORDER BY rank DESC, b.tahun DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;
