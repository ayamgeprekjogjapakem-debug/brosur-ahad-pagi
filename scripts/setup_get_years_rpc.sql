-- Fungsi untuk mengambil daftar tahun unik secara efisien tanpa limit 1000 row
CREATE OR REPLACE FUNCTION get_distinct_years(filter_folder_id uuid)
RETURNS TABLE (tahun integer) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT b.tahun
  FROM brosur b
  WHERE b.folder_id = filter_folder_id
  ORDER BY b.tahun DESC;
END;
$$ LANGUAGE plpgsql;
