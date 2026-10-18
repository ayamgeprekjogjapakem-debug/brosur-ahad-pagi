'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, ChevronDown, PanelLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface AdminHeaderProps {
  email?: string;
  role?: string;
}

export default function AdminHeader({ email: initialEmail, role: initialRole = 'admin' }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail || 'Admin');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const supabase = createClient();

  const handleToggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('toggle_admin_sidebar_minimized'));
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
    if (path === '/admin') return 'Dashboard';
    if (path.startsWith('/admin/data-brosur')) return 'Data Brosur';
    if (path.startsWith('/admin/data-quran')) return 'Data Quran';
    if (path.startsWith('/admin/hadist-9-imam')) return 'Hadist 9 Imam';
    if (path.startsWith('/admin/hadist')) return 'Hadist Brosur';
    if (path.startsWith('/admin/kalender')) return 'Kalender';
    if (path.startsWith('/admin/notifikasi')) return 'Notifikasi';
    if (path.startsWith('/admin/akun')) return 'Akun';
    if (path.startsWith('/admin/management-akun')) return 'Management Akun';
    if (path.startsWith('/admin/super-admin')) return 'Super Admin Console';
    return 'Admin';
  };

  const initial = (email || 'A').charAt(0).toUpperCase();

  return (
    <header className="h-16 px-4 sm:px-6 md:px-8 flex items-center justify-between bg-white shrink-0 select-none">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={handleToggleSidebar}
          title="Toggle Sidebar"
          className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors flex items-center justify-center"
        >
          <PanelLeft size={18} strokeWidth={1.8} />
        </button>

        <h1 className="text-base font-semibold text-zinc-900 tracking-tight font-sans">
          {getPageTitle(pathname)}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        {/* User Pill Clean Gemini Style */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 pl-3 hover:bg-zinc-100 rounded-full transition-all"
          >
            <span className="text-xs font-medium text-zinc-700 hidden md:inline-block max-w-[150px] truncate">
              {email}
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center">
              {initial}
            </div>
            <ChevronDown size={14} className="text-zinc-400 mr-1" strokeWidth={2} />
          </button>

          {isMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsMenuOpen(false)} 
              />
              <div className="absolute right-0 mt-2 w-56 bg-white border border-zinc-100 rounded-2xl shadow-lg p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-2.5 border-b border-zinc-100 mb-1">
                  <p className="text-[10px] text-zinc-400 font-medium">Akun Masuk</p>
                  <p className="text-xs font-semibold text-zinc-900 truncate mt-0.5">{email}</p>
                  <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Admin
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3.5 py-2 text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-xl text-xs font-medium transition"
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
