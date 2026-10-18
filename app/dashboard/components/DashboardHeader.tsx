'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User, LogOut, ShieldCheck, ChevronDown, Bell, Sparkles, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface DashboardHeaderProps {
  email?: string;
  role?: string;
}

export default function DashboardHeader({ email: initialEmail, role: initialRole }: DashboardHeaderProps) {
  const pathname = usePathname();
  
  if (pathname.startsWith('/dashboard/hadist9imam')) {
    return null;
  }

  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || 'Admin');
  const [role, setRole] = useState(initialRole || 'admin');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_sidebar_minimized');
    if (saved === 'true') {
      setIsSidebarMinimized(true);
    }

    const handleChanged = (e: any) => {
      setIsSidebarMinimized(Boolean(e.detail));
    };
    window.addEventListener('sidebar_minimized_changed', handleChanged);
    return () => window.removeEventListener('sidebar_minimized_changed', handleChanged);
  }, []);

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle_sidebar_minimized'));
  };

  useEffect(() => {
    if (!initialEmail) {
      const getSession = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setEmail(user.email);
        }
      };
      getSession();
    }
  }, [initialEmail, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Upload & Konversi CHM';
    if (path.startsWith('/dashboard/arsip')) return 'Arsip Brosur';
    if (path.startsWith('/dashboard/data')) return 'Database Brosur';
    if (path.startsWith('/dashboard/ai-kajian')) return 'Generator Kajian AI';
    if (path.startsWith('/dashboard/hadist')) return 'Pengelompokan Hadist & Dalil';
    if (path.startsWith('/dashboard/masukan')) return 'Kotak Masukan';
    if (path.startsWith('/dashboard/users')) return 'Akses Admin & User';
    if (path.startsWith('/dashboard/app-settings')) return 'App Control & Pemeliharaan';
    if (path.startsWith('/dashboard/access-logs')) return 'Log Akses Pengunjung';
    if (path.startsWith('/dashboard/blocked-ips')) return 'Blacklist IP';
    if (path.startsWith('/dashboard/settings')) return 'Pengaturan Web';
    return 'Dashboard Admin';
  };

  const initial = (email || 'A').charAt(0).toUpperCase();

  return (
    <header className="w-full bg-[#FBFBFD]/80 dark:bg-[#161617]/80 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] px-5 py-3 flex items-center justify-between sticky top-0 z-30 select-none">
      <div className="flex items-center gap-3">
        {/* Apple style traffic dots decoration or sidebar toggle */}
        <div className="flex items-center gap-1.5 mr-1">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]/90 border border-[#E0443E]/40" />
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]/90 border border-[#DEA123]/40" />
          <div className="w-3 h-3 rounded-full bg-[#27C93F]/90 border border-[#1AAB29]/40" />
        </div>

        <button
          onClick={handleToggleSidebar}
          title={isSidebarMinimized ? 'Tampilkan Sidebar' : 'Sembunyikan Sidebar'}
          className="p-1.5 rounded-[8px] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-zinc-500 dark:text-zinc-400 transition-colors hidden md:flex items-center justify-center active:scale-95"
        >
          {isSidebarMinimized ? <PanelLeftOpen size={16} strokeWidth={1.8} /> : <PanelLeftClose size={16} strokeWidth={1.8} />}
        </button>

        <div className="h-4 w-[1px] bg-black/[0.06] dark:bg-white/[0.08] hidden md:block" />

        <div className="flex items-center gap-2">
          <h1 className="text-[14px] md:text-[15px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-[-0.01em]">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/[0.04] dark:bg-white/[0.06] text-zinc-600 dark:text-zinc-300 font-medium text-[11px] rounded-full tracking-wide">
          <ShieldCheck size={13} className="text-emerald-500" strokeWidth={2} />
          <span className="uppercase">{role}</span>
        </span>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 p-1 pl-2.5 bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.09] rounded-full transition-all border border-black/[0.05] dark:border-white/[0.07] active:scale-95"
          >
            <span className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300 hidden md:inline-block max-w-[150px] truncate tracking-tight">
              {email}
            </span>
            <div className="w-7 h-7 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-semibold text-[11px] flex items-center justify-center shadow-sm">
              {initial}
            </div>
            <ChevronDown size={12} className="text-zinc-400 dark:text-zinc-500 mr-1" strokeWidth={2} />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] rounded-[16px] shadow-[0_16px_36px_rgba(0,0,0,0.12)] p-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-black/[0.04] dark:border-white/[0.06] mb-1">
                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Akun Masuk</p>
                  <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">{email}</p>
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 capitalize">{role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-[10px] font-medium text-[13px] transition-colors"
                >
                  <LogOut size={15} strokeWidth={1.8} />
                  <span>Keluar</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
