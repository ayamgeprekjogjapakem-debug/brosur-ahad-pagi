'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BookOpen, BookMarked, Layers, FileText, ArrowLeft, 
  ChevronLeft, ChevronRight, Sparkles 
} from 'lucide-react';

export default function HadistSidebar() {
  const pathname = usePathname();
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('hadist_sidebar_minimized');
    if (saved === 'true') {
      setIsMinimized(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextState = !isMinimized;
    setIsMinimized(nextState);
    localStorage.setItem('hadist_sidebar_minimized', String(nextState));
  };

  const menuItems = [
    { name: 'Hadist Sumber Brosur', href: '/dashboard/hadist', icon: FileText, exact: true },
    { name: 'Master Kitab (Rawi)', href: '/dashboard/hadist/rawi', icon: BookOpen, exact: false },
    { name: 'Master Sahabat', href: '/dashboard/hadist/sahabat', icon: BookOpen, exact: false },
    { name: 'Master Sanad (Rijal)', href: '/dashboard/hadist/rijal', icon: BookOpen, exact: false },
    { name: 'Kelompok / Tema', href: '/dashboard/hadist/kelompok', icon: Layers, exact: false },
    { name: 'Master Brosur', href: '/dashboard/hadist/brosur', icon: BookMarked, exact: false },
    { name: 'Generate SQL', href: '/dashboard/hadist/generate', icon: Sparkles, exact: false },
  ];

  return (
    <aside 
      className={`${
        isMinimized ? 'w-20' : 'w-64'
      } bg-white/85 dark:bg-zinc-900/85 backdrop-blur-3xl md:rounded-3xl border-r md:border border-black/[0.04] dark:border-white/[0.04] hidden md:flex flex-col shrink-0 h-full relative z-20 shadow-sm transition-all duration-300 ease-[0.19,1,0.22,1] group/sidebar`}
    >
      {/* Toggle Button (Visible on Hover) */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-8 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/20 shadow-md text-zinc-500 hover:text-accent rounded-full p-1 transition-all z-[9999] focus:outline-none focus:ring-2 focus:ring-accent"
        title={isMinimized ? "Perbesar Sidebar" : "Perkecil Sidebar"}
      >
        {isMinimized ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header Logo Area */}
      <div className={`p-6 flex items-center ${isMinimized ? 'justify-center' : 'justify-start'} border-b border-black/[0.04] dark:border-white/[0.04] transition-all duration-300`}>
        <Link href="/dashboard/hadist" className="flex items-center gap-3 group" title="Pustaka Hadist">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform duration-300 shrink-0">
            <BookOpen className="text-white" size={20} strokeWidth={2.5} />
          </div>
          {!isMinimized && (
            <div className="flex-1 min-w-0">
              <h2 className="font-extrabold text-[15px] tracking-tight leading-none text-zinc-900 dark:text-zinc-100 truncate">
                Pustaka Hadist
              </h2>
              <p className="text-[11px] font-medium text-zinc-500 mt-1 truncate">
                Data Analisis UI
              </p>
            </div>
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <div>
          {!isMinimized && (
            <span className="block px-4 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              Manajemen Data
            </span>
          )}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  title={isMinimized ? item.name : undefined}
                  className={`w-full flex items-center ${isMinimized ? 'justify-center px-0' : 'gap-3.5 px-4'} py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                    isActive 
                      ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)]' 
                      : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95'
                  }`}
                >
                  <Icon size={isMinimized ? 20 : 18} className={isActive ? 'text-blue-600 dark:text-blue-400 shrink-0' : 'text-zinc-400 shrink-0'} strokeWidth={isActive ? 2.5 : 2} />
                  {!isMinimized && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer Area - Back to Dashboard */}
      <div className={`p-3 border-t border-black/[0.04] dark:border-white/[0.04] flex ${isMinimized ? 'justify-center' : 'justify-start'}`}>
        <Link 
          href="/dashboard"
          title="Ke Dashboard Utama"
          className={`w-full flex items-center ${isMinimized ? 'justify-center' : 'justify-start gap-3 px-4'} py-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 rounded-2xl font-semibold text-sm transition-all duration-300 group`}
        >
          <ArrowLeft size={isMinimized ? 20 : 18} className="group-hover:-translate-x-1 transition-transform shrink-0" />
          {!isMinimized && <span>Ke Dashboard Utama</span>}
        </Link>
      </div>
    </aside>
  );
}
