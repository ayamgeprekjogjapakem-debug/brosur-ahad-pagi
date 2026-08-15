import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Ambil semua kelompok hadist
    const { data: kelompokList, error } = await supabase
      .from('kelompok_hadist')
      .select('*')
      .order('nama_kelompok', { ascending: true });

    if (error) {
      const isMissingTable = 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache');

      if (isMissingTable) {
        return NextResponse.json(
          { 
            error: 'TABLE_NOT_FOUND', 
            message: 'Tabel kelompok_hadist belum dibuat di database Supabase.' 
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil data dari hadist_brosur untuk statistik hitungan
    const { data: allHadist, error: hadistError } = await supabase
      .from('hadist_brosur')
      .select('id, kelompok_id, brosur_id');

    const statsMap: Record<string, { totalHadist: number; uniqueBrosurs: Set<string> }> = {};
    const globalUniqueBrosurs = new Set<string>();
    let totalHadistCount = 0;

    if (!hadistError && allHadist) {
      for (const item of allHadist) {
        totalHadistCount++;
        if (item.brosur_id) globalUniqueBrosurs.add(item.brosur_id);

        if (item.kelompok_id) {
          if (!statsMap[item.kelompok_id]) {
            statsMap[item.kelompok_id] = { totalHadist: 0, uniqueBrosurs: new Set<string>() };
          }
          statsMap[item.kelompok_id].totalHadist++;
          if (item.brosur_id) {
            statsMap[item.kelompok_id].uniqueBrosurs.add(item.brosur_id);
          }
        }
      }
    }

    const enrichedKelompok = (kelompokList || []).map((k) => {
      const stat = statsMap[k.id] || { totalHadist: 0, uniqueBrosurs: new Set<string>() };
      return {
        ...k,
        stats: {
          totalHadist: stat.totalHadist,
          totalBrosur: stat.uniqueBrosurs.size,
        },
      };
    });

    return NextResponse.json({
      kelompok: enrichedKelompok,
      globalStats: {
        totalKelompok: enrichedKelompok.length,
        totalHadist: totalHadistCount,
        totalBrosur: globalUniqueBrosurs.size,
      },
    });
  } catch (err: any) {
    console.error('Error GET /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama_kelompok, deskripsi, warna_badge } = body;

    if (!nama_kelompok || !nama_kelompok.trim()) {
      return NextResponse.json({ error: 'Nama kelompok wajib diisi.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kelompok_hadist')
      .insert({
        nama_kelompok: nama_kelompok.trim(),
        deskripsi: deskripsi || null,
        warna_badge: warna_badge || 'emerald',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, kelompok: data });
  } catch (err: any) {
    console.error('Error POST /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nama_kelompok, deskripsi, warna_badge } = body;

    if (!id || !nama_kelompok || !nama_kelompok.trim()) {
      return NextResponse.json({ error: 'ID dan Nama kelompok wajib diisi.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kelompok_hadist')
      .update({
        nama_kelompok: nama_kelompok.trim(),
        deskripsi: deskripsi || null,
        warna_badge: warna_badge || 'emerald',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, kelompok: data });
  } catch (err: any) {
    console.error('Error PUT /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID kelompok wajib diberikan.' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('kelompok_hadist')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Kelompok berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/kelompok:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
