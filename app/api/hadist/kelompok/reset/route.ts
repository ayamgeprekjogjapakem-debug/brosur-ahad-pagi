import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';

export async function DELETE() {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('kelompok_hadist')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Seluruh data kelompok berhasil dihapus.' });
  } catch (err: any) {
    console.error('Error DELETE /api/hadist/kelompok/reset:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal' }, { status: 500 });
  }
}
