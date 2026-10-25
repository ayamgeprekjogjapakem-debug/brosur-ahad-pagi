'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Database, BookOpen, Calendar, Bell,
  User, UserCog, LogOut, Sparkles, X, ScrollText, Library,
  KeyRound, Shield, CheckCircle2, ShieldAlert, BellRing, Megaphone
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string; name?: string; role?: string } | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .single();

          setCurrentUser({
            email: user.email,
            name: profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
            role: profile?.role || 'admin',
          });
        }
      } catch (e) {
        console.error('Failed to fetch user in sidebar:', e);
      }
    };
    fetchCurrentUser();
  }, [supabase]);

  useEffect(() => {
    const saved = localStorage.getItem('admin_sidebar_minimized');
    if (saved === 'true') {
      setIsMinimized(true);
      window.dispatchEvent(new CustomEvent('admin_sidebar_minimized_changed', { detail: true }));
    }
  }, []);

  // Listen to toggle event from header button
  useEffect(() => {
    const handleToggleEvent = () => {
      if (window.innerWidth < 768) {
        setIsMobileOpen(prev => !prev);
      } else {
        const nextState = !isMinimized;
        setIsMinimized(nextState);
        localStorage.setItem('admin_sidebar_minimized', String(nextState));
        window.dispatchEvent(new CustomEvent('admin_sidebar_minimized_changed', { detail: nextState }));
      }
    };

    window.addEventListener('toggle_admin_sidebar_minimized', handleToggleEvent);
    return () => window.removeEventListener('toggle_admin_sidebar_minimized', handleToggleEvent);
  }, [isMinimized]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const navGroups = [
    {
      label: 'MENU UTAMA',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
        { name: 'Pengumuman', href: '/admin/pengumuman', icon: Megaphone },
        { name: 'Data Brosur', href: '/admin/data-brosur', icon: Database },
        { name: 'Data Quran', href: '/admin/data-quran', icon: BookOpen },
        { name: 'Hadist Brosur', href: '/admin/hadist', icon: ScrollText },
        { name: 'Hadist 9 Imam', href: '/admin/hadist-9-imam', icon: Library },
        { name: 'Kalender', href: '/admin/kalender', icon: Calendar },
        { name: 'Kotak Masukan', href: '/admin/notifikasi', icon: Bell },
      ],
    },
    {
      label: 'SETTING',
      items: [
        { name: 'Akun', href: '/admin/akun', icon: User },
        { name: 'Management Akun', href: '/admin/management-akun', icon: UserCog },
        ...(currentUser?.role === 'super-admin' 
          ? [{ name: 'Super Admin', href: '/dashboard', icon: ShieldAlert }] 
          : []),
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 md:hidden transition-opacity" 
        />
      )}

      {/* Sidebar Responsive Container */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 h-screen max-h-screen bg-[#FAFAFA] flex flex-col shrink-0 select-none transition-all duration-200 ease-out ${
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl md:shadow-none' : '-translate-x-full md:translate-x-0'
        } ${isMinimized ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        {/* Brand Header Clean dengan Logo Utama logo_rb.png */}
        <div className={`h-16 px-4 flex items-center ${isMinimized ? 'justify-center' : 'justify-between'}`}>
          <Link href="/admin" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              <Image
                src="/images/logo_rb.png"
                alt="Logo Pustaka"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            {(!isMinimized || isMobileOpen) && (
              <div className="flex flex-col min-w-0">
                <span className="font-semibold text-sm tracking-tight text-zinc-900 truncate">
                  Admin Console
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Brosur Ahad Pagi
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200/50 md:hidden transition"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Navigation Clean Gemini Style */}
        <nav className="flex-1 px-3 py-2 space-y-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1">
              {(!isMinimized || isMobileOpen) && (
                <span className="block px-3 py-1 text-[11px] font-medium tracking-wider text-zinc-400">
                  {group.label}
                </span>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = item.href === '/admin' 
                    ? pathname === '/admin' 
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link 
                      key={item.name} 
                      href={item.href}
                      title={isMinimized && !isMobileOpen ? item.name : undefined}
                      className={`w-full flex items-center ${
                        isMinimized && !isMobileOpen ? 'justify-center px-0 h-10' : 'gap-3 px-3.5 py-2.5'
                      } rounded-xl text-sm font-medium transition-all duration-150 ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 font-semibold' 
                          : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/70'
                      }`}
                    >
                      <Icon 
                        size={18} 
                        strokeWidth={isActive ? 2.2 : 1.8} 
                        className={isActive ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-zinc-600'} 
                      />
                      {(!isMinimized || isMobileOpen) && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Minimalist Gemini Style with Active User & Password Change */}
        <div className="p-3 border-t border-zinc-200/60 bg-zinc-50/50 space-y-2">
          {(!isMinimized || isMobileOpen) ? (
            <div className="p-2.5 rounded-2xl bg-white border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {(currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {currentUser?.name || 'Admin'}
                    </p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Akun Aktif" />
                  </div>
                  <p className="text-[10px] text-zinc-400 truncate">
                    {currentUser?.email || 'admin@brosurahad.id'}
                  </p>
                </div>
              </div>

              {/* Status Aktif & Role Tag */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[10px]">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 size={11} />
                  <span>Akun Aktif</span>
                </span>
                <span className="uppercase font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded-md">
                  {currentUser?.role || 'admin'}
                </span>
              </div>

              {/* Action: Ubah Password untuk Akses Web & Mobile */}
              <Link
                href="/admin/akun"
                title="Ubah Password Akun (Akses Web & Mobile)"
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 font-semibold text-[11px] rounded-xl transition border border-emerald-200/60"
              >
                <KeyRound size={12} />
                <span>Ubah Password (Web & Mobile)</span>
              </Link>
            </div>
          ) : (
            <Link
              href="/admin/akun"
              title={`Akun Aktif: ${currentUser?.email} - Klik untuk Ubah Password`}
              className="w-full flex items-center justify-center h-10 rounded-xl bg-white border border-zinc-200/80 text-emerald-600 hover:bg-emerald-50 transition shadow-2xs relative"
            >
              <KeyRound size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </Link>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isMinimized && !isMobileOpen ? 'Keluar' : undefined}
            className={`w-full flex items-center ${
              isMinimized && !isMobileOpen ? 'justify-center px-0 h-9' : 'gap-2.5 px-3 py-2'
            } rounded-xl text-xs font-medium text-zinc-500 hover:text-red-600 hover:bg-red-50/60 transition-all duration-150 disabled:opacity-50`}
          >
            <LogOut size={15} strokeWidth={1.8} />
            {(!isMinimized || isMobileOpen) && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
