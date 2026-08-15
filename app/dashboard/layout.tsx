import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';

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

  if (!profile || !profile.is_active || (profile.role !== 'admin' && profile.role !== 'user')) {
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
    <div className="h-screen max-h-screen overflow-hidden bg-[#eef0f3] dark:bg-[#070709] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-accent/30 selection:text-accent p-0 md:p-3 gap-0 md:gap-3">
      <DashboardSidebar />
      <div className="flex-1 w-full h-full overflow-hidden flex flex-col min-w-0 md:rounded-3xl border-0 md:border md:border-black/5 md:dark:border-white/10 bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl shadow-sm relative">
        <DashboardHeader email={user.email} role={profile.role} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

