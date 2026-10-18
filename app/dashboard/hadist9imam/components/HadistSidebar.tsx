'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Book, Folder, UploadCloud, Cpu, LogOut, Search, Activity, ChevronRight, Hash } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function HadistSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = createClient();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: 'Koleksi Hadist', href: '/dashboard/hadist9imam', icon: Book },
    { name: 'Cari Hadist', href: '/dashboard/hadist9imam/search', icon: Search },
    { name: 'Upload Kitab CHM', href: '/dashboard/hadist9imam/upload', icon: UploadCloud },
    { name: 'Kategori / Folder', href: '/dashboard/hadist9imam?tab=folder', icon: Folder },
    { name: 'Sinkronisasi AI', href: '/dashboard/hadist9imam?tab=vektor', icon: Cpu },
  ];

  return (
    <aside className="w-64 h-full bg-white/70 backdrop-blur-2xl border-r border-black/[0.04] hidden md:flex flex-col shrink-0 relative z-20 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[1px_0_15px_rgba(0,0,0,0.02)]">
      {/* Header Sidebar - Apple Style Typography */}
      <div className="p-6 pb-2">
        <h1 className="text-xl font-bold tracking-tight text-emerald-900 flex items-center gap-2">
          <Book className="w-6 h-6 text-emerald-600" />
          Kitab 9 Imam
        </h1>
        <p className="text-xs text-zinc-400 font-medium mt-1">Sistem Pintar AI</p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase mb-3 ml-3">Menu Utama</div>
        {navItems.map((item) => {
          let isActive = false;
          if (item.href.includes('?tab=')) {
            const itemTab = item.href.split('?tab=')[1];
            isActive = pathname === '/dashboard/hadist9imam' && searchParams?.get('tab') === itemTab;
          } else {
            isActive = pathname === item.href && !searchParams?.get('tab');
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${
                isActive 
                  ? 'bg-emerald-500/10 text-emerald-700 shadow-sm font-semibold' 
                  : 'text-zinc-500 hover:bg-black/5 hover:text-zinc-900'
              }`}
            >
              <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-zinc-400 group-hover:text-zinc-700'}`} />
              <span className="flex-1">{item.name}</span>
            </Link>
          );
        })}

        <div className="mt-8 mb-3 ml-3 text-[10px] font-bold text-zinc-400 tracking-wider uppercase">Pintasan Akses</div>
        <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-black/5 hover:text-zinc-900 transition-all">
          <ChevronRight className="w-4 h-4 text-zinc-400" />
          <span>Kembali ke Dashboard</span>
        </Link>
      </div>

      <div className="p-4 border-t border-black/[0.04]">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
        >
          <LogOut className="w-4 h-4" />
          {isLoggingOut ? 'Keluar...' : 'Keluar'}
        </button>
      </div>
    </aside>
  );
}
