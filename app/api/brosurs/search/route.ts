import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 30);

    const supabase = await createClient();

    // 1. Coba cari dari Supabase tabel brosur
    let dbQuery = supabase
      .from('brosur')
      .select('id, judul, slug, tahun')
      .order('tahun', { ascending: false })
      .limit(limit);

    if (query) {
      dbQuery = dbQuery.or(`judul.ilike.%${query}%,slug.ilike.%${query}%`);
    }

    const { data: dbData, error: dbError } = await dbQuery;

    if (!dbError && dbData && dbData.length > 0) {
      return NextResponse.json({ success: true, data: dbData });
    }

    // 2. Fallback ke data/index.json jika tabel kosong atau offline
    const indexPath = path.join(process.cwd(), 'data', 'index.json');
    if (fs.existsSync(indexPath)) {
      const allBrosurs: any[] = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const filtered = query
        ? allBrosurs.filter((b) =>
            (b.judul?.toLowerCase() || '').includes(query) ||
            (b.slug?.toLowerCase() || '').includes(query) ||
            String(b.tahun || '').includes(query)
          )
        : allBrosurs;

      return NextResponse.json({
        success: true,
        data: filtered.slice(0, limit).map((b) => ({
          id: b.id,
          judul: b.judul,
          slug: b.slug,
          tahun: b.tahun,
        })),
      });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
