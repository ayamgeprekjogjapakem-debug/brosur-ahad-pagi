import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Mencari satu baris brosur secara fleksibel berdasarkan slug/id URL dan tahun opsional.
 * Mendukung format slug lengkap (BAP-(Brosur-Ahad-Pagi)-2026-...),
 * slug hasil sanitasi tanpa tanda kurung (bap-brosur-ahad-pagi-2026-...),
 * slug judul bersih (andad-menurut-ibnu-abbas), maupun ID brosur.
 */
export async function findBrosurBySlugAndYear(
  rawSlug: string,
  yearParam?: string,
  selectFields = '*'
): Promise<any | null> {
  const supabase = createAdminClient();
  const slug = decodeURIComponent(rawSlug || '').trim();
  if (!slug) return null;

  const parsedYear = yearParam && /^\d{4}$/.test(yearParam.trim()) ? parseInt(yearParam.trim(), 10) : null;

  // 1. Exact match pada slug atau id terlebih dahulu
  const { data: exactMatch } = await supabase
    .from('brosur')
    .select(selectFields)
    .or(`slug.eq.${slug},id.eq.${slug}`)
    .limit(1)
    .maybeSingle();

  if (exactMatch) return exactMatch;

  // 2. Normalisasi prefix BAP-(Brosur-Ahad-Pagi)- atau bap-brosur-ahad-pagi-
  const withoutPrefix = slug
    .replace(/^BAP-\(Brosur-Ahad-Pagi\)-/i, '')
    .replace(/^bap-brosur-ahad-pagi-/i, '')
    .trim();

  // 3. Hapus awalan tahun (2026-) atau tanggal (20260531- / 20180218a-)
  const withoutYear = withoutPrefix
    .replace(/^\d{8}[a-z]?-?/i, '')
    .replace(/^\d{4}-/i, '')
    .trim();

  const titleWildcard = withoutYear.replace(/-/g, '%').replace(/[^a-zA-Z0-9%]/g, '%');
  const slugWildcard = withoutPrefix.replace(/[^a-zA-Z0-9%-]/g, '%');

  // 4. Cari dengan filter tahun jika tersedia
  if (parsedYear) {
    const orFilters = [
      withoutPrefix ? `slug.ilike.%${slugWildcard}%` : '',
      withoutYear ? `slug.ilike.%${withoutYear}%` : '',
      titleWildcard ? `judul.ilike.%${titleWildcard}%` : '',
    ]
      .filter(Boolean)
      .join(',');

    if (orFilters) {
      const { data: yearMatch } = await supabase
        .from('brosur')
        .select(selectFields)
        .eq('tahun', parsedYear)
        .or(orFilters)
        .limit(1)
        .maybeSingle();

      if (yearMatch) return yearMatch;
    }
  }

  // 5. Fallback pencarian lintas tahun
  const globalFilters = [
    withoutPrefix ? `slug.ilike.%${slugWildcard}%` : '',
    withoutYear ? `slug.ilike.%${withoutYear}%` : '',
    titleWildcard ? `judul.ilike.%${titleWildcard}%` : '',
  ]
    .filter(Boolean)
    .join(',');

  if (globalFilters) {
    const { data: fallbackMatch } = await supabase
      .from('brosur')
      .select(selectFields)
      .or(globalFilters)
      .limit(1)
      .maybeSingle();

    if (fallbackMatch) return fallbackMatch;
  }

  return null;
}
