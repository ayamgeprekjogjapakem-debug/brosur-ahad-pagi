import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const folderId = searchParams.get('folder_id');
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!folderId) {
      return NextResponse.json({ error: 'Parameter folder_id wajib disertakan' }, { status: 400 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('brosur')
      .select('judul, slug, tahun')
      .eq('folder_id', folderId)
      .order('tahun', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API /api/brosur-list Error:', error);
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
