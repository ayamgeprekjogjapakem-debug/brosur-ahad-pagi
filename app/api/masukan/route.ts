import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nama_terang, cabang_instansi, email, no_wa, pesan } = body;

    // Validasi sederhana di server
    if (!nama_terang || !cabang_instansi || !no_wa || !pesan) {
      return NextResponse.json({ error: 'Harap lengkapi semua field yang wajib' }, { status: 400 });
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('masukan')
      .insert([
        {
          nama_terang,
          cabang_instansi,
          email: email || null,
          no_wa,
          pesan
        }
      ]);

    if (error) {
      console.error('Error inserting masukan:', error);
      return NextResponse.json({ error: 'Gagal menyimpan pesan' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    console.error('API masukan error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
