'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, Upload, LogOut, Loader2, FileStack, Settings, 
  UserCog, Database, MessageSquare, Activity, ShieldBan,
  ChevronLeft, ChevronRight, BookMarked, Sparkles, Key, Bot, Settings2, Search, Calendar
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/dashboard/hadist9imam')) {
    return null;
  }

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_sidebar_minimized');
    if (saved === 'true') {
      setIsMinimized(true);
      window.dispatchEvent(new CustomEvent('sidebar_minimized_changed', { detail: true }));
    }
    // Delay mounting slightly to allow state to settle without transition
    setTimeout(() => setIsMounted(true), 10);
  }, []);

  useEffect(() => {
    const handleToggleEvent = () => {
      const nextState = !isMinimized;
      setIsMinimized(nextState);
      localStorage.setItem('dashboard_sidebar_minimized', String(nextState));
      window.dispatchEvent(new CustomEvent('sidebar_minimized_changed', { detail: nextState }));
    };

    window.addEventListener('toggle_sidebar_minimized', handleToggleEvent);
    return () => window.removeEventListener('toggle_sidebar_minimized', handleToggleEvent);
  }, [isMinimized]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };


  const navGroups = [
    {
      label: 'KONTEN & ARSIP',
      items: [
        { name: 'Upload CHM', href: '/dashboard', icon: Upload },
        { name: 'Arsip Brosur', href: '/dashboard/arsip', icon: FileStack },
        { name: 'Data Brosur', href: '/dashboard/data', icon: Database },
        { name: 'Analisis Pencarian', href: '/dashboard/search-analyzer', icon: Search },
        { name: 'Hadist Sumber Brosur', href: '/dashboard/hadist', icon: BookMarked },
        { name: 'Hadist 9 Imam', href: '/dashboard/hadist9imam', icon: BookMarked },
        { name: 'Hadist dari API', href: '/dashboard/hadist-api', icon: BookOpen },
        { name: 'Data Quran', href: '/dashboard/quran', icon: BookOpen },
        { name: 'Kotak Masukan', href: '/dashboard/masukan', icon: MessageSquare },
        { name: 'Kalender', href: '/dashboard/kalender', icon: Calendar },
      ],
    },
    {
      label: 'ARTIFICIAL INTELLIGENCE',
      items: [
        { name: 'Generator Kajian', href: '/dashboard/ai-kajian', icon: Sparkles },
        { name: 'Simulator AI', href: '/dashboard/ai-simulator', icon: Bot },
        { name: 'Pengaturan AI', href: '/dashboard/ai-settings', icon: Settings2 },
        { name: 'Analisa Pencarian AI', href: '/dashboard/ai-analytics', icon: Activity },
      ],
    },
    {
      label: 'MANAJEMEN AKSES',
      items: [
        { name: 'Kode Akses', href: '/dashboard/access-codes', icon: Key },
        { name: 'Akses Admin & User', href: '/dashboard/users', icon: UserCog },
        { name: 'Log Akses', href: '/dashboard/access-logs', icon: Activity },
        { name: 'Blacklist IP', href: '/dashboard/blocked-ips', icon: ShieldBan },
      ],
    },
    {
      label: 'SISTEM & APP',
      items: [
        { name: 'App Control', href: '/dashboard/app-settings', icon: Settings },
        { name: 'Kalibrasi Kalender', href: '/dashboard/kalibrasi', icon: Settings2 },
        { name: 'Pengaturan Web', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside 
      className={`${
        isMinimized ? 'w-[74px]' : 'w-64'
      } bg-[#FBFBFD]/90 dark:bg-[#161617]/90 backdrop-blur-3xl md:rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] hidden md:flex flex-col shrink-0 h-full relative z-20 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] ${isMounted ? 'transition-all duration-300 ease-out' : ''} overflow-hidden select-none`}
    >
      {/* Apple style app window top pill / branding */}
      <div className={`px-5 py-5 flex items-center ${isMinimized ? 'justify-center' : 'justify-start'} border-b border-black/[0.04] dark:border-white/[0.05]`}>
        <Link href="/" className="flex items-center gap-3 group" title="Ke Beranda">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-b from-zinc-800 to-zinc-950 dark:from-zinc-100 dark:to-zinc-300 text-white dark:text-zinc-950 flex items-center justify-center shadow-sm group-hover:scale-105 active:scale-95 transition-all duration-200 shrink-0">
            <BookOpen size={18} strokeWidth={2.2} />
          </div>
          {!isMinimized && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-[15px] tracking-[-0.015em] text-zinc-900 dark:text-zinc-100 truncate leading-tight">Ulil Albab</span>
              <span className="text-[10px] font-medium text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Super Admin Console</span>
            </div>
          )}
        </Link>
      </div>
      
      <nav className="flex-1 px-2.5 py-4 space-y-5 overflow-y-auto custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {!isMinimized ? (
              <span className="block px-3 pb-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                {group.label}
              </span>
            ) : (
              groupIdx > 0 && <div className="my-2 border-t border-black/[0.04] dark:border-white/[0.06]" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    title={isMinimized ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isMinimized ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2'
                    } rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
                      isActive 
                        ? 'bg-black/[0.07] dark:bg-white/[0.12] text-zinc-900 dark:text-white font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.03)]' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.05] hover:text-zinc-900 dark:hover:text-zinc-200 active:scale-[0.98]'
                    }`}
                  >
                    <Icon 
                      size={17} 
                      className={`${
                        isActive 
                          ? 'text-zinc-900 dark:text-white' 
                          : 'text-zinc-400 dark:text-zinc-500'
                      } shrink-0 transition-colors`} 
                      strokeWidth={isActive ? 2.3 : 1.8} 
                    />
                    {!isMinimized && <span className="truncate tracking-[-0.01em]">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-2.5 border-t border-black/[0.04] dark:border-white/[0.05]">
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={isMinimized ? 'Keluar' : undefined}
          className={`w-full flex items-center ${
            isMinimized ? 'justify-center py-2.5' : 'justify-center gap-2 px-3 py-2'
          } hover:bg-red-500/10 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-[10px] text-[13px] font-medium transition-all duration-150 disabled:opacity-50 group active:scale-[0.98]`}
        >
          {isLoggingOut ? (
            <Loader2 size={16} className="animate-spin shrink-0" />
          ) : (
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform shrink-0" strokeWidth={1.8} />
          )}
          {!isMinimized && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
        </button>
      </div>
    </aside>
  );
}
