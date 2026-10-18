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
    if (path === '/dashboard') return 'Upload & Konversi Berkas';
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
    <header className="h-14 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between gap-3 bg-white shrink-0 z-10 select-none">
      {/* Sisi Kiri: Mac Controls & Header Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* macOS 3 Dots */}
        <div className="flex items-center gap-1.5 pr-1">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block cursor-pointer" />
          <span className="w-3 h-3 rounded-full bg-amber-400 inline-block cursor-pointer" />
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block cursor-pointer" />
        </div>

        <button
          onClick={handleToggleSidebar}
          title={isSidebarMinimized ? 'Tampilkan Sidebar' : 'Sembunyikan Sidebar'}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
        >
          <PanelLeftClose size={14} strokeWidth={1.8} />
        </button>

        <span className="text-slate-200 font-light hidden sm:inline">|</span>

        <h1 className="text-sm font-semibold text-slate-900 truncate">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Sisi Kanan: Super Admin Status & User Profil */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Super-Admin Badge (Harmoni Hijau) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-[10.5px] font-semibold tracking-wide">
          <ShieldCheck size={12} className="text-emerald-600" />
          <span className="uppercase">{role}</span>
        </div>

        {/* Akun Profil */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2 pl-1 cursor-pointer"
          >
            <span className="text-xs font-medium text-slate-600 hidden md:inline">
              {email}
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
              {initial}
            </div>
            <ChevronDown size={11} className="text-slate-400" />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-20">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Akun Masuk</p>
                  <p className="text-xs font-semibold text-slate-900 truncate mt-0.5">{email}</p>
                  <p className="text-[10.5px] font-medium text-emerald-600 capitalize">{role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-colors"
                >
                  <LogOut size={13} strokeWidth={1.8} />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
