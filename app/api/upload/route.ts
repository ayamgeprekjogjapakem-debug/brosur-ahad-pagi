import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Tidak ada file yang ditemukan.' }, { status: 400 });
    }

    if (!file.name.endsWith('.chm') && !file.name.endsWith('.zip')) {
      return NextResponse.json({ error: 'Hanya file .chm atau .zip yang diizinkan.' }, { status: 400 });
    }

    const supabase = await createClient();

    // Pastikan user terautentikasi (admin)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Unggah file ke Supabase Storage (Bucket: chm-uploads)
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert File to ArrayBuffer/Buffer for Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase
      .storage
      .from('chm-uploads')
      .upload(fileName, buffer, {
        contentType: file.type || (file.name.endsWith('.zip') ? 'application/zip' : 'application/vnd.ms-htmlhelp'),
        upsert: false
      });

    if (error) {
      console.error('Storage Upload Error:', error);
      return NextResponse.json({ error: 'Gagal mengunggah ke Supabase Storage: ' + error.message }, { status: 500 });
    }

    // Dapatkan URL publik dari file yang baru diunggah
    const { data: { publicUrl } } = supabase.storage.from('chm-uploads').getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      message: 'File berhasil disimpan di Cloud.',
      path: publicUrl
    });
    
  } catch (error) {
    console.error('Error during file upload:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal.' }, { status: 500 });
  }
}
