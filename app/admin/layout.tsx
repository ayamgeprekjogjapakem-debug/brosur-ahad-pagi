import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import AiChatWidget from '../components/AiChatWidget';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user profile from Supabase (by ID or Email fallback)
  let { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile && user.email) {
    const { data: profileByEmail } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('email', user.email)
      .maybeSingle();
    profile = profileByEmail;
  }

  // Fallback jika user adalah master admin atau super-admin via metadata
  const userMetaRole = user.user_metadata?.role;
  const masterEmails = ['admin@brosurmta.com', 'r.wariyanto@gmail.com', 'brosurmta@gmail.com', 'test_admin@brosur.id'];
  const isMasterEmail = !!(user.email && masterEmails.includes(user.email));
  const effectiveRole = profile?.role || userMetaRole || (isMasterEmail ? 'super-admin' : 'user');
  const effectiveActive = isMasterEmail || (profile ? profile.is_active !== false : true);

  const isPermitted = effectiveActive && (effectiveRole === 'admin' || effectiveRole === 'super-admin');

  if (!isPermitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-white text-center text-zinc-900 font-sans">
        <div className="bg-zinc-50 p-10 rounded-3xl max-w-md border border-zinc-100">
          <h1 className="text-2xl font-bold mb-3 text-red-500">Akses Ditolak</h1>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            Anda tidak memiliki izin untuk mengakses Dashboard Admin, atau akun Anda belum diaktifkan oleh Super Admin.
          </p>
          <form action={async () => {
            'use server';
            const supabaseClient = await createClient();
            await supabaseClient.auth.signOut();
            redirect('/login');
          }}>
            <button type="submit" className="w-full bg-emerald-600 text-white px-5 py-3 rounded-xl font-medium text-sm hover:bg-emerald-700 transition">
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
    <div className="h-screen max-h-screen overflow-hidden bg-white text-zinc-800 flex flex-row font-sans selection:bg-emerald-100 selection:text-emerald-900 antialiased">
      {/* Sidebar Clean Tanpa Garis Pembatas Keras */}
      <AdminSidebar />
      
      {/* Canvas Area Bersih / Seamless Gemini style */}
      <div className="flex-1 w-full h-full overflow-hidden flex flex-col min-w-0 bg-white">
        <AdminHeader email={user.email} role={effectiveRole} />
        <main className="flex-1 overflow-x-hidden flex flex-col custom-scrollbar p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
          {children}
        </main>
      </div>

      {aiSettings?.ai_enabled && <AiChatWidget />}
    </div>
  );
}
