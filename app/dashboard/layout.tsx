import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { resolveServerUserAccess } from '@/utils/supabase/authRoleServer';
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

  const { role, isActive } = await resolveServerUserAccess(user);

  // Role admin aktif dialihkan ke konsol /admin
  if (isActive && role === 'admin') {
    redirect('/admin');
  }

  // Halaman /dashboard HANYA untuk role superadmin yang aktif
  const isAuthorized = isActive && role === 'superadmin';

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#fafafa] dark:bg-[#0a0a0a] text-center text-zinc-900 dark:text-zinc-100">
        <div className="bg-white dark:bg-zinc-900 p-10 rounded-3xl border border-black/5 dark:border-white/10 shadow-2xl max-w-md">
          <h1 className="text-3xl font-extrabold mb-4 text-red-500">Khusus Super Admin</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm leading-relaxed">
            Halaman <strong>/dashboard</strong> khusus untuk role <strong>Super Admin</strong> yang aktif. Akun Anda tidak memiliki izin untuk mengakses konsol ini.
          </p>
          <form action={async () => {
            'use server';
            const supabaseClient = await createClient();
            await supabaseClient.auth.signOut();
            redirect('/login');
          }}>
            <button type="submit" className="w-full bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition-colors cursor-pointer">
              Keluar &amp; Kembali ke Login
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
    <div className="h-screen max-h-screen overflow-hidden bg-[#fafafa] text-slate-800 flex flex-col md:flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased select-none">
      <DashboardSidebar />
      <div className="flex-1 w-full h-full overflow-hidden flex flex-col min-w-0 bg-[#fafafa] relative">
        <DashboardHeader email={user.email} role="superadmin" />
        <MainContentWrapper>
          {children}
        </MainContentWrapper>
      </div>
      {aiSettings?.ai_enabled && <AiChatWidget />}
    </div>
  );
}
