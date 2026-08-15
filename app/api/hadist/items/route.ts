import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kelompokId = searchParams.get('kelompok_id');
    const brosurId = searchParams.get('brosur_id');
    const rawiKitab = searchParams.get('rawi_kitab');
    const statusHadist = searchParams.get('status_hadist');
    const sumberJenis = searchParams.get('sumber_jenis');
    const search = searchParams.get('search');

    const supabase = await createClient();

    let query = supabase
      .from('hadist_brosur')
      .select(`
        id,
        kelompok_id,
        brosur_id,
        kutipan_arab,
        terjemahan,
        perawi_sumber,
        rawi_kitab,
        juz,
        halaman,
        no_hadist,
        rawi_teratas,
        status_hadist,
        catatan,
        created_at,
        kelompok_hadist(id, nama_kelompok, warna_badge),
        brosur(id, judul, tahun, slug, folder_id, folders(name))
      `)
      .order('created_at', { ascending: false });

    if (kelompokId && kelompokId !== 'all') {
      query = query.eq('kelompok_id', kelompokId);
    }

    if (brosurId) {
      query = query.eq('brosur_id', brosurId);
    }

    if (rawiKitab && rawiKitab !== 'all') {
      query = query.or(`rawi_kitab.ilike.%${rawiKitab}%,rawi_teratas.ilike.%${rawiKitab}%`);
    }

    if (statusHadist && statusHadist !== 'all') {
      query = query.eq('status_hadist', statusHadist);
    }

    if (search) {
      query = query.or(`kutipan_arab.ilike.%${search}%,terjemahan.ilike.%${search}%,perawi_sumber.ilike.%${search}%,rawi_kitab.ilike.%${search}%,rawi_teratas.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      const isMissingTable = 
        error.code === '42P01' || 
        error.message?.includes('does not exist') ||
        error.message?.includes('schema cache');

      if (isMissingTable) {
        return NextResponse.json(
          { 
            error: 'TABLE_NOT_FOUND', 
            message: 'Tabel hadist_brosur belum dibuat di database Supabase.' 
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err: any) {
    console.error('Error GET /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      kelompok_id,
      brosur_id,
      kutipan_arab,
      terjemahan,
      perawi_sumber,
      rawi_kitab,
      juz,
      halaman,
      no_hadist,
      rawi_teratas,
      status_hadist = 'terverifikasi',
      catatan,
    } = body;

    if (!brosur_id || !kutipan_arab || !kutipan_arab.trim()) {
      return NextResponse.json(
        { error: 'Brosur Sumber dan Kutipan Teks Arab wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hadist_brosur')
      .insert({
        kelompok_id: kelompok_id || null,
        brosur_id,
        kutipan_arab: kutipan_arab.trim(),
        terjemahan: terjemahan?.trim() || null,
        perawi_sumber: perawi_sumber?.trim() || null,
        rawi_kitab: rawi_kitab?.trim() || null,
        juz: juz?.trim() || null,
        halaman: halaman?.trim() || null,
        no_hadist: no_hadist?.trim() || null,
        rawi_teratas: rawi_teratas?.trim() || null,
        status_hadist: status_hadist || 'terverifikasi',
        catatan: catatan?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('Error POST /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      kelompok_id,
      kutipan_arab,
      terjemahan,
      perawi_sumber,
      rawi_kitab,
      juz,
      halaman,
      no_hadist,
      rawi_teratas,
      status_hadist,
      catatan,
    } = body;

    if (!id || !kutipan_arab || !kutipan_arab.trim()) {
      return NextResponse.json(
        { error: 'ID dan Kutipan Teks Arab wajib diisi.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('hadist_brosur')
      .update({
        kelompok_id: kelompok_id || null,
        kutipan_arab: kutipan_arab.trim(),
        terjemahan: terjemahan?.trim() || null,
        perawi_sumber: perawi_sumber?.trim() || null,
        rawi_kitab: rawi_kitab?.trim() || null,
        juz: juz?.trim() || null,
        halaman: halaman?.trim() || null,
        no_hadist: no_hadist?.trim() || null,
        rawi_teratas: rawi_teratas?.trim() || null,
        status_hadist: status_hadist || 'terverifikasi',
        catatan: catatan?.trim() || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (err: any) {
    console.error('Error PUT /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const resetAll = searchParams.get('reset_all');
    const statusHadist = searchParams.get('status_hadist');

    const supabase = await createClient();

    if (resetAll === 'true') {
      const { error } = await supabase
        .from('hadist_brosur')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Semua hadist berhasil dihapus (Reset All).' });
    }

    if (statusHadist === 'mentah') {
      const { error } = await supabase
        .from('hadist_brosur')
        .delete()
        .eq('status_hadist', 'mentah');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, message: 'Semua draft hadist mentah berhasil dihapus.' });
    }

    if (!id) {
      return NextResponse.json({ error: 'ID item hadist atau parameter reset wajib diberikan.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('hadist_brosur')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Hadist berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/items:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
