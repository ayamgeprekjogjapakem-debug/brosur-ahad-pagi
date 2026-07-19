import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DashboardSidebar from './components/DashboardSidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user profile from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fafafa] dark:bg-[#0a0a0a] text-center text-zinc-900 dark:text-zinc-100">
        <div className="bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-black/5 dark:border-white/5 shadow-2xl max-w-md">
          <h1 className="text-3xl font-extrabold mb-4 text-red-500">Akses Ditolak</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8">
            Anda tidak memiliki izin untuk mengakses halaman ini, atau akun Anda belum diaktifkan oleh Administrator.
          </p>
          <form action={async () => {
            'use server';
            const supabaseClient = await createClient();
            await supabaseClient.auth.signOut();
            redirect('/login');
          }}>
            <button type="submit" className="w-full bg-accent text-white px-6 py-3.5 rounded-xl font-bold hover:bg-accent/90 transition-colors">
              Keluar & Kembali ke Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row">
      <DashboardSidebar />
      <div className="flex-1 w-full overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
