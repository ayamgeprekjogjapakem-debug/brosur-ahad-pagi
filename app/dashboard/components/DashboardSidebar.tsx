'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, Upload, LogOut, Loader2, Users, FileStack, Settings, UserCog, Database } from 'lucide-react';
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
    { name: 'Pengguna', href: '/dashboard/users', icon: UserCog },
    { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-black/5 dark:border-white/5 bg-white dark:bg-black hidden md:flex flex-col shrink-0 min-h-screen">
      <div className="p-6 border-b border-black/5 dark:border-white/5">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center shadow-lg shadow-accent/20">
            <BookOpen className="text-white" size={16} />
          </div>
          <span className="font-bold text-lg tracking-tight">Admin Area</span>
        </Link>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                isActive 
                  ? 'bg-accent/10 text-accent' 
                  : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
        
        <div className="mt-8 px-4 pt-6 border-t border-black/5 dark:border-white/5">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Statistik Web</h3>
          <div className="bg-black/5 dark:bg-white/5 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-accent/20 rounded-xl flex items-center justify-center">
              <Users className="text-accent" size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-bold mb-0.5">Total Perangkat</p>
              <p className="font-extrabold text-2xl leading-none text-zinc-900 dark:text-zinc-100">
                {visitorCount === null ? <Loader2 className="animate-spin text-zinc-400" size={16} /> : visitorCount}
              </p>
            </div>
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-black/5 dark:border-white/5">
        <button 
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
          Keluar
        </button>
      </div>
    </aside>
  );
}
