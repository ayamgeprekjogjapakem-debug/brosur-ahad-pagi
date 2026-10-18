import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DashboardSidebar from './components/DashboardSidebar';
import DashboardHeader from './components/DashboardHeader';
import AiChatWidget from '../components/AiChatWidget';
import MainContentWrapper from './components/MainContentWrapper';

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

  // Role admin reguler diarahkan ke dashboard khusus /admin
  if (profile?.role === 'admin' && profile?.is_active) {
    redirect('/admin');
  }

  // Hanya super-admin (atau akun legacy bertanda aktif) yang boleh masuk ke console Super Admin /dashboard
  const isAuthorized = profile?.is_active && (profile.role === 'super-admin' || profile.role === 'admin');

  if (!profile || !profile.is_active || !isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fafafa] [#0a0a0a] text-center text-zinc-900 ">
        <div className="bg-white  p-10 rounded-3xl border border-black/5  shadow-2xl max-w-md">
          <h1 className="text-3xl font-extrabold mb-4 text-red-500">Akses Ditolak</h1>
          <p className="text-zinc-500  mb-8">
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

  // Fetch AI Settings
  const { data: aiSettings } = await supabase
    .from('app_settings')
    .select('ai_enabled')
    .eq('id', 1)
    .single();

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#F5F5F7] dark:bg-[#000000] text-zinc-900 dark:text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-accent/25 selection:text-accent p-0 md:p-3.5 gap-0 md:gap-3.5 antialiased">
      <DashboardSidebar />
      <div className="flex-1 w-full h-full overflow-hidden flex flex-col min-w-0 md:rounded-[24px] border-0 md:border md:border-black/[0.06] dark:md:border-white/[0.08] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] relative">
        <DashboardHeader email={user.email} role={profile.role} />
        <MainContentWrapper>
          {children}
        </MainContentWrapper>
      </div>
      {aiSettings?.ai_enabled && <AiChatWidget />}
    </div>
  );
}

