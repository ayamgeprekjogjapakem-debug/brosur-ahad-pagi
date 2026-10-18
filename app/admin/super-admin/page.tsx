import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminSuperAdminClient from './components/AdminSuperAdminClient';

export default async function AdminSuperAdminPage() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Cek secara ketat role super-admin dari database profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  // Proteksi server-side: Hanya role super-admin yang aktif yang boleh mengakses
  if (!profile || !profile.is_active || profile.role !== 'super-admin') {
    redirect('/admin');
  }

  return (
    <AdminSuperAdminClient 
      currentUserId={user.id} 
      currentUserEmail={user.email || ''} 
    />
  );
}
