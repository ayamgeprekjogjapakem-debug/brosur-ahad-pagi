import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE() {
  try {
    const supabase = await createClient();

    // Check user auth and role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super-admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete all rawi data (where id is not null deletes everything)
    const { error } = await supabase
      .from('master_rawi')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Reset rawi error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Semua data Kitab/Rawi berhasil dihapus.' });
  } catch (error: any) {
    console.error('Server error resetting rawi:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
