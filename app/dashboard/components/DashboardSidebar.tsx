'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, Upload, LogOut, Loader2, FileStack, Settings, 
  UserCog, Database, MessageSquare, Activity, ShieldBan,
  ChevronLeft, ChevronRight, BookMarked, Sparkles, Key, Bot, Settings2, Search, Calendar, BellRing, Megaphone
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();

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
        { name: 'Upload Berkas', href: '/dashboard', icon: Upload },
        { name: 'Arsip Brosur', href: '/dashboard/arsip', icon: FileStack },
        { name: 'Data Brosur', href: '/dashboard/data', icon: Database },
        { name: 'Analisis Pencarian', href: '/dashboard/search-analyzer', icon: Search },
        { name: 'Hadist Sumber Brosur', href: '/dashboard/hadist', icon: BookMarked },
        { name: 'Hadist 9 Imam', href: '/dashboard/hadist9imam', icon: BookMarked },
        { name: 'Hadist dari API', href: '/dashboard/hadist-api', icon: BookOpen },
        { name: 'Data Quran', href: '/dashboard/quran', icon: BookOpen },
        { name: 'Pengumuman & Warta', href: '/dashboard/pengumuman', icon: Megaphone },
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
        isMinimized ? 'w-[72px]' : 'w-64'
      } bg-white border-r border-slate-200/80 hidden md:flex flex-col shrink-0 h-full relative z-30 ${isMounted ? 'transition-all duration-300 ease-out' : ''} overflow-hidden select-none`}
    >
      {/* Logo & Brand Header */}
      <div className={`h-16 flex items-center px-4 border-b border-slate-100 gap-3 shrink-0 ${isMinimized ? 'justify-center' : 'justify-start'}`}>
        <Link href="/" className="flex items-center gap-3 group" title="Ke Beranda">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-sm">
            <BookMarked size={18} className="text-emerald-600" />
          </div>
          {!isMinimized && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold tracking-tight text-slate-900 truncate">Brosur Ahad Pagi</span>
              <span className="text-[9.5px] font-bold tracking-wider text-emerald-600 uppercase">SUPER ADMIN CONSOLE</span>
            </div>
          )}
        </Link>
      </div>
      
      {/* Navigasi Menu Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs text-slate-600 custom-scrollbar">
        {navGroups.map((group, groupIdx) => (
          <div key={group.label}>
            {!isMinimized ? (
              <span className="block px-2 mb-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {group.label}
              </span>
            ) : (
              groupIdx > 0 && <div className="my-2 border-t border-slate-100" />
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
                      isMinimized ? 'justify-center px-0 py-2' : 'gap-2.5 px-2.5 py-1.5'
                    } rounded-xl text-xs transition ${
                      isActive 
                        ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60 shadow-none' 
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/50 border border-transparent'
                    }`}
                  >
                    <Icon 
                      size={15} 
                      className={`${
                        isActive 
                          ? 'text-emerald-600' 
                          : 'text-slate-400 group-hover:text-emerald-600'
                      } shrink-0 w-4 text-center`} 
                      strokeWidth={isActive ? 2.2 : 1.8} 
                    />
                    {!isMinimized && <span className="truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Sidebar */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[11px]">
            N
          </div>
          {!isMinimized && <span className="text-slate-400 text-[11px]">v2.4.0-prod</span>}
        </div>
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          title={isMinimized ? 'Keluar' : undefined}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition text-xs font-medium disabled:opacity-50"
        >
          {isLoggingOut ? (
            <Loader2 size={13} className="animate-spin shrink-0" />
          ) : (
            <LogOut size={13} className="shrink-0" strokeWidth={1.8} />
          )}
          {!isMinimized && <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>}
        </button>
      </div>
    </aside>
  );
}
