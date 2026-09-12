import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Harapkan request POST dengan body { surah_id: number }
export async function POST(request: Request) {
  try {
    const { surah_id } = await request.json();

    if (!surah_id || surah_id < 1 || surah_id > 114) {
      return NextResponse.json({ success: false, error: 'surah_id tidak valid (1-114)' }, { status: 400 });
    }

    const supabase = await createClient();

    // 1. Fetch detail surah dan ayatnya dari API Kemenag (EQuran)
    const response = await fetch(`https://equran.id/api/v2/surat/${surah_id}`);
    if (!response.ok) {
      throw new Error(`Gagal fetch surah ${surah_id} dari EQuran API`);
    }

    const resData = await response.json();
    const data = resData.data;

    // 2. Upsert data ke quran_surah
    const { error: surahError } = await supabase
      .from('quran_surah')
      .upsert({
        id: data.nomor,
        nama_latin: data.namaLatin,
        nama_arab: data.nama,
        jumlah_ayat: data.jumlahAyat,
        tempat_turun: data.tempatTurun,
        arti: data.arti,
        deskripsi: data.deskripsi,
        audio_url: data.audioFull ? Object.values(data.audioFull)[0] : null,
      });

    if (surahError) {
      throw new Error(`Gagal upsert surah: ${surahError.message}`);
    }

    // 3. Upsert data ayat ke quran_ayat
    const ayatArray = data.ayat.map((a: any) => ({
      surah_id: data.nomor,
      nomor_ayat: a.nomorAyat,
      teks_arab: a.teksArab,
      teks_latin: a.teksLatin,
      teks_indonesia: a.teksIndonesia,
      audio_url: a.audio ? Object.values(a.audio)[0] : null,
    }));

    // Hapus ayat lama (untuk mencegah duplikasi jika nomor_ayat berubah, walau kecil kemungkinan)
    await supabase.from('quran_ayat').delete().eq('surah_id', data.nomor);
    
    // Insert ayat baru
    const { error: ayatError } = await supabase
      .from('quran_ayat')
      .insert(ayatArray);

    if (ayatError) {
      throw new Error(`Gagal insert ayat: ${ayatError.message}`);
    }

    return NextResponse.json({ success: true, message: `Berhasil sinkronisasi surah ${surah_id}` });

  } catch (error: any) {
    console.error(`Quran Apply API Error:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
