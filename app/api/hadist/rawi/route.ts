import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// GET: Ambil daftar Master Rawi / Rijalul Hadits beserta jumlah hadist dari riwayat kitab tersebut
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const nama_rawi = searchParams.get('nama_rawi');

    let query = supabase
      .from('master_rawi')
      .select('*')
      .order('kategori_rawi', { ascending: true })
      .order('nama_rawi', { ascending: true });

    if (nama_rawi) {
      query = query.ilike('nama_rawi', `%${nama_rawi}%`);
    }

    const { data: rawiList, error } = await query;

    // Cek jika tabel master_rawi belum ada di database (Error 42P01)
    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ error: 'TABLE_NOT_FOUND', message: error.message }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ambil statistik hitungan hadist_brosur berdasarkan rawi_kitab, rawi_teratas, dan perawi_sumber
    const { data: itemsCount, error: countErr } = await supabase
      .from('hadist_brosur')
      .select('rawi_kitab, rawi_teratas, perawi_sumber');

    const rawiWithStats = (rawiList || []).map((rw) => {
      const name = (rw.nama_rawi || '').trim().toLowerCase();
      let count = 0;
      if (!countErr && itemsCount && name) {
        for (const row of itemsCount) {
          const rk = (row.rawi_kitab || '').trim().toLowerCase();
          const rt = (row.rawi_teratas || '').trim().toLowerCase();
          const ps = (row.perawi_sumber || '').trim().toLowerCase();
          if (
            (rk && (rk === name || rk.includes(name) || name.includes(rk))) ||
            (rt && (rt === name || rt.includes(name) || name.includes(rt))) ||
            (ps && ps.includes(name))
          ) {
            count++;
          }
        }
      }
      return {
        ...rw,
        total_hadist: count,
      };
    });

    return NextResponse.json({
      success: true,
      count: rawiWithStats.length,
      rawi: rawiWithStats,
    });
  } catch (e: any) {
    console.error('Error GET /api/hadist/rawi:', e);
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// POST: Buat profil perawi baru (Rijalul Hadits)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      nama_rawi,
      nama_arab,
      kategori_rawi = 'mukharij',
      thabaqat,
      kredibilitas = 'Thiqah',
      biografi,
    } = body;

    if (!nama_rawi || !nama_rawi.trim()) {
      return NextResponse.json({ error: 'Nama rawi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_rawi')
      .insert([
        {
          nama_rawi: nama_rawi.trim(),
          nama_arab: nama_arab?.trim() || null,
          kategori_rawi: kategori_rawi.trim(),
          thabaqat: thabaqat?.trim() || null,
          kredibilitas: kredibilitas.trim(),
          biografi: biografi?.trim() || null,
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rawi: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// PUT: Perbarui profil biografi rawi
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { id, nama_rawi, nama_arab, kategori_rawi, thabaqat, kredibilitas, biografi } = body;

    if (!id || !nama_rawi) {
      return NextResponse.json({ error: 'ID dan Nama Rawi wajib diisi' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('master_rawi')
      .update({
        nama_rawi: nama_rawi.trim(),
        nama_arab: nama_arab?.trim() || null,
        kategori_rawi: kategori_rawi?.trim() || 'mukharij',
        thabaqat: thabaqat?.trim() || null,
        kredibilitas: kredibilitas?.trim() || 'Thiqah',
        biografi: biografi?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, rawi: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE: Hapus rawi
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID Rawi wajib diisi' }, { status: 400 });
    }

    const { error } = await supabase.from('master_rawi').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
