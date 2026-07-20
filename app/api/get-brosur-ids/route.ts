import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const folderId = searchParams.get('folder_id');

  if (!folderId) {
    return NextResponse.json({ error: 'folder_id diperlukan' }, { status: 400 });
  }

  const supabase = await createClient();

  // Hanya ambil ID brosur yang belum punya teks_bersih ATAU ambil semua jika force=true
  // Untuk amannya, kita ambil semua yang ada di folder ini agar bisa di-generate ulang
  const force = searchParams.get('force') === 'true';
  
  let queryBuilder = supabase
    .from('brosur')
    .select('id')
    .eq('folder_id', folderId);
    
  if (!force) {
    queryBuilder = queryBuilder.is('teks_bersih', null);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ids: data.map(item => item.id) });
}
