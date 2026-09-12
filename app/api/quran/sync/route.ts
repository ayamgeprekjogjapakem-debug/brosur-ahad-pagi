import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // 1. Fetch data dari API EQuran (sumber Kemenag)
    // Gunakan endpoint v2 yang lebih lengkap
    const response = await fetch('https://equran.id/api/v2/surat');
    if (!response.ok) {
      throw new Error(`Gagal mengambil data dari API Kemenag (EQuran): ${response.statusText}`);
    }
    
    const responseData = await response.json();
    const externalSurahs = responseData.data; // array 114 surah

    // 2. Cek data yang ada di database lokal
    const { data: localSurahs, error: dbError } = await supabase
      .from('quran_surah')
      .select('id, jumlah_ayat');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    // 3. Bandingkan (Sederhana: Cek jumlah surah dan total ayat)
    let needsUpdate = false;
    let changes = [];
    
    if (!localSurahs || localSurahs.length === 0) {
      needsUpdate = true;
      changes.push("Database lokal masih kosong. Perlu inisialisasi awal.");
    } else if (localSurahs.length !== externalSurahs.length) {
      needsUpdate = true;
      changes.push(`Jumlah surah berbeda: Lokal (${localSurahs.length}), Kemenag (${externalSurahs.length}).`);
    } else {
      // Cek jumlah ayat per surah
      for (const ext of externalSurahs) {
        const loc = localSurahs.find((s: any) => s.id === ext.nomor);
        if (!loc || loc.jumlah_ayat !== ext.jumlahAyat) {
          needsUpdate = true;
          changes.push(`Perbedaan pada Surah ${ext.namaLatin} (No. ${ext.nomor}): Lokal (${loc?.jumlah_ayat || 0} ayat), Kemenag (${ext.jumlahAyat} ayat).`);
        }
      }
    }

    // Catat log sinkronisasi
    await supabase.from('quran_sync_logs').insert({
      status: 'SUCCESS',
      details: needsUpdate ? `Ditemukan perbedaan: ${changes.join(' | ')}` : 'Sinkronisasi berhasil, tidak ada perubahan yang diperlukan.',
      changes_detected: needsUpdate,
      applied: !needsUpdate // Jika tidak ada perubahan, langsung anggap "applied"
    });

    return NextResponse.json({
      success: true,
      needsUpdate,
      changes,
      externalSurahsCount: externalSurahs.length,
      localSurahsCount: localSurahs?.length || 0,
      message: needsUpdate ? "Ditemukan pembaruan data." : "Data lokal sudah up-to-date."
    });

  } catch (error: any) {
    console.error("Quran Sync API Error:", error);
    
    // Coba log error jika memungkinkan
    try {
      const supabase = await createClient();
      await supabase.from('quran_sync_logs').insert({
        status: 'FAILED',
        details: error.message || 'Unknown error during sync',
        changes_detected: false,
        applied: false
      });
    } catch (e) {
      console.error("Gagal mencatat log error:", e);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
