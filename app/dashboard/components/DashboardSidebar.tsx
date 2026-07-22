'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Upload, LogOut, Loader2, Users, FileStack, Settings, UserCog, Database, MessageSquare, Activity, ShieldBan } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [visitorCount, setVisitorCount] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetch('/api/analytics')
      .then(res => res.json())
      .then(data => setVisitorCount(data.uniqueVisitors))
      .catch(err => console.error(err));
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
  };

  const navItems = [
    { name: 'Upload CHM', href: '/dashboard', icon: Upload },
    { name: 'Arsip Brosur', href: '/dashboard/arsip', icon: FileStack },
    { name: 'Data Brosur', href: '/dashboard/data', icon: Database },
    { name: 'Kotak Masukan', href: '/dashboard/masukan', icon: MessageSquare },
    { name: 'Pengguna', href: '/dashboard/users', icon: UserCog },
    { name: 'App Control', href: '/dashboard/app-settings', icon: Settings },
    { name: 'Log Akses', href: '/dashboard/access-logs', icon: Activity },
    { name: 'Blacklist IP', href: '/dashboard/blocked-ips', icon: ShieldBan },
    { name: 'Pengaturan Web', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-3xl border-r border-black/[0.04] dark:border-white/[0.04] hidden md:flex flex-col shrink-0 min-h-screen relative z-10 shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
      <div className="p-8 pb-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-tr from-accent to-accent/80 rounded-2xl flex items-center justify-center shadow-lg shadow-accent/30 group-hover:scale-105 transition-transform duration-300">
            <BookOpen className="text-white" size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-[17px] tracking-tight text-zinc-900 dark:text-zinc-100">Ulil Albab</span>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">Admin</span>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 px-4 py-2 space-y-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                isActive 
                  ? 'bg-white dark:bg-zinc-800 text-accent shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                  : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-accent' : 'text-zinc-400'} strokeWidth={isActive ? 2.5 : 2} />
              {item.name}
            </Link>
          );
        })}
        
        <div className="p-4 mb-4">
          <div className="bg-gradient-to-br from-black/5 to-transparent dark:from-white/5 rounded-3xl p-5 border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="text-accent" size={18} />
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Visitor Hari Ini</h3>
            </div>
            <p className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
              {visitorCount === null ? (
                <span className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                  <Loader2 size={16} className="animate-spin" /> Memuat...
                </span>
              ) : (
                visitorCount.toLocaleString('id-ID')
              )}
            </p>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-black/[0.04] dark:border-white/[0.04]">
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-zinc-100 dark:bg-zinc-900 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 text-zinc-600 dark:text-zinc-400 rounded-2xl font-semibold text-sm transition-all duration-300 disabled:opacity-50 group"
        >
          {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />}
          <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
        </button>
      </div>
    </aside>
  );
}
