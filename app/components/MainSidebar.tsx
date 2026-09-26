'use client';

import React, { useState } from 'react';
import { Search, Bookmark, BookOpen, ScrollText, Users, X, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function MainSidebar({
  savedItemsCount = 0,
  onSearchClick,
}: {
  savedItemsCount?: number;
  onSearchClick?: () => void;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-main-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-main-sidebar', handleToggle);
  }, []);

  React.useEffect(() => {
    const history = JSON.parse(localStorage.getItem('makkah_search_history') || '[]');
    setSearchHistory(history);
  }, []);

  const handleClearHistory = () => {
    if (window.confirm('Hapus semua riwayat pencarian?')) {
      localStorage.removeItem('makkah_search_history');
      setSearchHistory([]);
    }
  };

  const handleRemoveHistoryItem = (index: number) => {
    const newHistory = [...searchHistory];
    newHistory.splice(index, 1);
    localStorage.setItem('makkah_search_history', JSON.stringify(newHistory));
    setSearchHistory(newHistory);
  };

  const isSearchActive = pathname === '/' || pathname === '/search';

  const menuItems = [
    {
      id: 'search',
      label: 'Pencarian Baru',
      icon: Search,
      onClick: () => {
        if (onSearchClick) onSearchClick();
        else router.push('/');
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      },
      isActive: isSearchActive,
      badge: null
    },
    {
      id: 'tersimpan',
      label: 'Dalil Tersimpan',
      icon: Bookmark,
      onClick: () => { router.push('/tersimpan'); if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname === '/tersimpan',
      badge: savedItemsCount > 0 ? savedItemsCount : null
    },
    {
      id: 'quran',
      label: 'Al-Qur\'an',
      icon: BookOpen,
      onClick: () => { router.push('/quran'); if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/quran'),
      badge: null
    },
    {
      id: 'bap',
      label: 'Brosur',
      icon: ScrollText,
      onClick: () => { router.push('/bap'); if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/bap') || pathname.includes('BAP-'),
      badge: null
    },
    {
      id: 'perawi',
      label: 'Master Perawi',
      icon: Users,
      onClick: () => { router.push('/perawi'); if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname === '/perawi',
      badge: 'Tahap Dev'
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-[60] backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[70] lg:relative bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0
          ${isSidebarOpen ? 'w-[280px] sm:w-[300px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-[280px] lg:sm:w-[300px] hidden lg:flex'}
        `}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <button
            onClick={() => { if (onSearchClick) onSearchClick(); else router.push('/'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
            className="flex items-center gap-3 group text-left cursor-pointer outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold text-slate-900 leading-tight">Pustaka MTA</h1>
              <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase">v1.0 Makkah</p>
            </div>
          </button>
          <button
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Utama</p>
            <div className="relative flex flex-col space-y-1">
              {menuItems.map((menu) => (
                <button
                  key={menu.id}
                  onClick={menu.onClick}
                  className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors z-10 ${menu.isActive ? 'text-emerald-800 font-semibold' : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <menu.icon className="w-4 h-4" /> {menu.label}
                  </div>
                  {menu.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${menu.isActive ? 'bg-emerald-200/50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                      {menu.badge}
                    </span>
                  )}
                  {menu.isActive && (
                    <motion.div
                      layoutId="active-sidebar-menu-global"
                      className="absolute inset-0 bg-emerald-50 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Riwayat Pencarian</p>
              {searchHistory.length > 0 && (
                <button onClick={handleClearHistory} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase transition-colors">Hapus</button>
              )}
            </div>

            <div className="space-y-1">
              {searchHistory.length === 0 ? (
                <p className="text-xs text-slate-400 italic px-3">Belum ada riwayat.</p>
              ) : (
                searchHistory.map((history, i) => (
                  <div key={i} className="group relative w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg transition">
                    <button
                      onClick={() => {
                        // Jika ada onSearchClick (berarti di luar Makkah), kita bisa arahkan ke halaman utama dengan query params atau sekadar handle default.
                        // Idealnya kita lempar event atau ke '/' dengan query string
                        router.push('/?q=' + encodeURIComponent(history));
                        if (window.innerWidth < 1024) setIsSidebarOpen(false);
                      }}
                      className="flex-1 flex items-center gap-3 text-left text-slate-500 hover:text-slate-800 text-sm truncate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 shrink-0"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                      <span className="truncate">{history}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveHistoryItem(i)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition shrink-0 ml-2"
                      title="Hapus riwayat"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium bg-slate-50">
          Hak Cipta © {new Date().getFullYear()} MTA
        </div>
      </aside>
    </>
  );
}
