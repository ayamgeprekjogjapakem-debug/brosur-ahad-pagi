import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Delete all records from kelompok_hadist where id is not null (meaning all records)
    const { error } = await supabase
      .from('kelompok_hadist')
      .delete()
      .neq('id', '0');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Seluruh data kelompok berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/kelompok/reset:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
