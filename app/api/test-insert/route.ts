import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';
  const supabase = createClient(url, key);

  const results: any = {};

  // 1. Coba Insert Folder
  const { data: folderData, error: folderError } = await supabase
    .from('folders_hadist')
    .insert({
      name: 'Test Folder ' + Date.now(),
      slug: 'test-folder-' + Date.now(),
      description: 'Test description'
    })
    .select()
    .single();

  results.folderData = folderData;
  results.folderError = folderError;

  if (folderData) {
    // 2. Coba Insert Hadist
    const { data: hadistData, error: hadistError } = await supabase
      .from('hadist_chm')
      .insert({
        id: 'TEST-' + Date.now(),
        judul: 'Test Judul',
        slug: 'test-judul',
        konten: 'HTML',
        teks_bersih: 'Teks Bersih',
        folder_id: folderData.id
      })
      .select();

    results.hadistData = hadistData;
    results.hadistError = hadistError;
  }

  return NextResponse.json(results);
}
