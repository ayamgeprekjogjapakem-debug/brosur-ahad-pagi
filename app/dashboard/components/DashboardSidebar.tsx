'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, Upload, LogOut, Loader2, FileStack, Settings, 
  UserCog, Database, MessageSquare, Activity, ShieldBan,
  ChevronLeft, ChevronRight, BookMarked, Sparkles, Key, Bot, Settings2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const saved = localStorage.getItem('dashboard_sidebar_minimized');
    if (saved === 'true') {
      setIsMinimized(true);
      window.dispatchEvent(new CustomEvent('sidebar_minimized_changed', { detail: true }));
    }
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
    router.replace('/login');
  };

  const navGroups = [
    {
      label: 'KONTEN & ARSIP',
      items: [
        { name: 'Upload CHM', href: '/dashboard', icon: Upload },
        { name: 'Arsip Brosur', href: '/dashboard/arsip', icon: FileStack },
        { name: 'Data Brosur', href: '/dashboard/data', icon: Database },
        { name: 'Pengelompokan Hadist', href: '/dashboard/hadist', icon: BookMarked },
        { name: 'Kotak Masukan', href: '/dashboard/masukan', icon: MessageSquare },
      ],
    },
    {
      label: 'ARTIFICIAL INTELLIGENCE',
      items: [
        { name: 'Generator Kajian', href: '/dashboard/ai-kajian', icon: Sparkles },
        { name: 'Simulator AI', href: '/dashboard/ai-simulator', icon: Bot },
        { name: 'Pengaturan AI', href: '/dashboard/ai-settings', icon: Settings2 },
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
        { name: 'Pengaturan Web', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside 
      className={`${
        isMinimized ? 'w-20' : 'w-64'
      } bg-white/85 dark:bg-zinc-900/85 backdrop-blur-3xl md:rounded-3xl border border-black/5 dark:border-white/10 hidden md:flex flex-col shrink-0 h-full relative z-20 shadow-sm transition-all duration-300 overflow-hidden`}
    >
      <div className={`p-6 flex items-center ${isMinimized ? 'justify-center' : 'justify-start'} border-b border-black/[0.04] dark:border-white/[0.04]`}>
        <Link href="/" className="flex items-center gap-3 group" title="Ke Beranda">
          <div className="w-10 h-10 bg-gradient-to-tr from-accent to-accent/80 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
            <BookOpen className="text-white" size={20} />
          </div>
          {!isMinimized && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-extrabold text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100 truncate">Ulil Albab</span>
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Admin</span>
            </div>
          )}
        </Link>
      </div>
      
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {!isMinimized ? (
              <span className="block px-4 pb-2 text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                {group.label}
              </span>
            ) : (
              groupIdx > 0 && <div className="my-2 border-t border-black/5 dark:border-white/5" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    title={isMinimized ? item.name : undefined}
                    className={`w-full flex items-center ${
                      isMinimized ? 'justify-center px-2 py-3' : 'gap-3.5 px-4 py-3'
                    } rounded-2xl font-semibold text-sm transition-all duration-300 ${
                      isActive 
                        ? 'bg-white dark:bg-zinc-800 text-accent shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                        : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-accent shrink-0' : 'text-zinc-400 shrink-0'} strokeWidth={isActive ? 2.5 : 2} />
                    {!isMinimized && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-black/[0.04] dark:border-white/[0.04]">
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={isMinimized ? 'Keluar' : undefined}
          className={`w-full flex items-center ${
            isMinimized ? 'justify-center py-3.5' : 'justify-center gap-2 px-4 py-3.5'
          } bg-zinc-100 dark:bg-zinc-900 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-zinc-600 dark:text-zinc-400 rounded-2xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 group`}
        >
          {isLoggingOut ? (
            <Loader2 size={18} className="animate-spin shrink-0" />
          ) : (
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform shrink-0" />
          )}
          {!isMinimized && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
        </button>
      </div>
    </aside>
  );
}
