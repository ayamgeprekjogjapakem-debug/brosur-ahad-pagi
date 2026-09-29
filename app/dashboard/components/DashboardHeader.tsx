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
    <header className="w-full bg-white/70  backdrop-blur-2xl border-b border-black/[0.04] [0.04] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleSidebar}
          title={isSidebarMinimized ? 'Perluas Sidebar' : 'Kecilkan Sidebar'}
          className="p-2 rounded-xl bg-black/5  hover:bg-black/10  text-zinc-600  transition-colors hidden md:flex items-center justify-center"
        >
          {isSidebarMinimized ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="text-base md:text-lg font-extrabold text-zinc-900  tracking-tight">
            {getPageTitle(pathname)}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600  font-bold text-xs rounded-full">
          <ShieldCheck size={14} />
          <span className="uppercase tracking-wide">{role}</span>
        </span>

        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-3 bg-black/5  hover:bg-black/10  rounded-2xl transition-all border border-black/5 "
          >
            <span className="text-sm font-semibold text-zinc-700  hidden md:inline-block max-w-[160px] truncate">
              {email}
            </span>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-accent to-accent/70 text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-accent/20">
              {initial}
            </div>
            <ChevronDown size={14} className="text-zinc-400 mr-1" />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 bg-white  border border-black/10  rounded-2xl shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2.5 border-b border-black/5  mb-1">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Akun Anda</p>
                  <p className="text-sm font-bold text-zinc-900  truncate">{email}</p>
                  <p className="text-xs font-semibold text-emerald-500 mt-0.5 capitalize">{role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-500 hover:bg-red-500/10 rounded-xl font-bold text-sm transition-colors"
                >
                  <LogOut size={16} />
                  <span>Keluar dari Akun</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
