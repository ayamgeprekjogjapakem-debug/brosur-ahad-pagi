import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data, error, count } = await supabase.from('hadist_chm').select('id, judul, tahun, created_at, folders_hadist(name)', { count: 'exact' });
  
  return NextResponse.json({
    count,
    error: error ? error.message : null,
    data
  });
}
