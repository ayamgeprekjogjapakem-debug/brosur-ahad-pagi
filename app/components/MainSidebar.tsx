'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Bookmark, BookOpen, ScrollText, Users, X, Menu, CalendarDays, BrainCircuit, Settings, BookMarked } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AccessCodeModal from './AccessCodeModal';


export default function MainSidebar({
  savedItemsCount = 0,
  onSearchClick,
  onHistoryClick,
  aiMode = false,
  aiSessions = [],
  activeAiSessionId,
  onNewAiSession,
  onAiSessionClick,
  onAiSessionDelete
}: {
  savedItemsCount?: number;
  onSearchClick?: () => void;
  onHistoryClick?: (query: string) => void;
  aiMode?: boolean;
  aiSessions?: { id: string; title: string }[];
  activeAiSessionId?: string;
  onNewAiSession?: () => void;
  onAiSessionClick?: (id: string) => void;
  onAiSessionDelete?: (id: string) => void;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-main-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-main-sidebar', handleToggle);
  }, []);

  React.useEffect(() => {
    const history = JSON.parse(localStorage.getItem('makkah_search_history') || '[]');
    setSearchHistory(history);
    
    // Cek status premium
    const premiumCode = localStorage.getItem('mta_premium_access');
    if (premiumCode) {
      setIsPremium(true);
    } else {
      // Jika belum ada kode, otomatis buka modal
      setIsAccessModalOpen(true);
    }
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
      href: '/',
      onClick: (e: React.MouseEvent) => {
        if (onSearchClick) {
          e.preventDefault();
          onSearchClick();
        }
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      },
      isActive: isSearchActive,
      badge: null
    },
    {
      id: 'tersimpan',
      label: 'Dalil Tersimpan',
      icon: Bookmark,
      href: '/tersimpan',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname === '/tersimpan',
      badge: savedItemsCount > 0 ? savedItemsCount : null
    },
    {
      id: 'quran',
      label: 'Al-Qur\'an',
      icon: BookOpen,
      href: '/quran',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/quran'),
      badge: null
    },
    {
      id: 'bap',
      label: 'Brosur',
      icon: ScrollText,
      href: '/bap',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/bap') || pathname.includes('BAP-'),
      badge: null
    },
    {
      id: 'hadist',
      label: 'Hadist',
      icon: BookMarked,
      href: '/hadist',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/hadist'),
      badge: 'Baru',
      requiredRole: 'special'
    },
    {
      id: 'kalender',
      label: 'Kalender Hijriah',
      icon: CalendarDays,
      href: '/kalender',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/kalender'),
      badge: 'Baru'
    },
    {
      id: 'perawi',
      label: 'Master Perawi',
      icon: Users,
      href: '/perawi',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname === '/perawi',
      badge: 'Tahap Dev',
      requiredRole: 'special'
    },
    {
      id: 'ai-pustaka',
      label: 'AI Pustaka',
      icon: BrainCircuit,
      href: '/ai-pustaka',
      onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); },
      isActive: pathname.startsWith('/ai-pustaka'),
      badge: 'Beta'
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
        className={`fixed inset-y-0 left-0 z-[70] lg:relative transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0
          ${isSidebarOpen ? 'w-[280px] sm:w-[300px] translate-x-0 bg-[#f0f4f9]' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-[80px] bg-white'}
        `}
      >
        <div className={`h-16 p-4 flex items-center ${!isSidebarOpen ? 'justify-center' : 'justify-between'} sticky top-0 ${isSidebarOpen ? 'bg-[#f0f4f9]' : 'bg-white'} z-10 shrink-0`}>
          <Link
            href="/"
            onClick={(e: React.MouseEvent) => {
              if (onSearchClick) {
                e.preventDefault();
                onSearchClick();
              }
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'} group text-left cursor-pointer outline-none w-full`}
            title={!isSidebarOpen ? 'Pustaka MTA' : undefined}
          >
            <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Image
                src="/images/logo_rb.png"
                alt="Logo Pustaka"
                fill
                sizes="32px"
                className="object-contain"
              />
            </div>
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-[13px] font-extrabold text-slate-900 leading-tight truncate">Pustaka MTA</h1>
                <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase truncate">Brosur Ahad Pagi</p>
              </div>
            )}
          </Link>
          {isSidebarOpen && (
            <button
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition shrink-0"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6 custom-scrollbar">
          <div>
            {isSidebarOpen ? (
              <p className="px-4 text-[11px] font-semibold text-slate-500 mb-2">Menu Utama</p>
            ) : (
              <div className="h-4" />
            )}
            <div className="relative flex flex-col space-y-1">
              {menuItems
                .filter(menu => {
                  if (typeof window === 'undefined') return true;
                  const premiumCode = localStorage.getItem('mta_premium_access');
                  if (!premiumCode) return false; // Sembunyikan semua jika belum masuk kode
                  
                  if (menu.id === 'search' || menu.id === 'tersimpan') return true; // Menu dasar selalu muncul jika sudah punya kode
                  
                  const featuresStr = localStorage.getItem('mta_premium_features');
                  if (featuresStr) {
                    try {
                      const allowedFeatures = JSON.parse(featuresStr);
                      return allowedFeatures.includes(menu.id);
                    } catch (e) {
                      return true;
                    }
                  }
                  return true;
                })
                .map((menu) => (
                <Link
                  key={menu.id}
                  href={menu.href}
                  onClick={menu.onClick}
                  className={`relative w-full flex items-center ${!isSidebarOpen ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-full text-[14px] transition-colors z-10 ${menu.isActive ? 'text-emerald-700 font-semibold' : 'text-slate-500 hover:text-slate-800 font-medium hover:bg-slate-100/80'}`}
                  title={!isSidebarOpen ? menu.label : undefined}
                >
                  <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-4'}`}>
                    <menu.icon strokeWidth={1.5} className={`${!isSidebarOpen ? 'w-5 h-5' : 'w-[18px] h-[18px]'} shrink-0 transition-all`} />
                    {isSidebarOpen && <span className="truncate">{menu.label}</span>}
                  </div>
                  {isSidebarOpen && menu.badge && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${menu.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {menu.badge}
                    </span>
                  )}
                  {menu.isActive && (
                    <motion.div
                      layoutId="active-sidebar-menu-global"
                      className="absolute inset-0 bg-emerald-50 rounded-full -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
          {isSidebarOpen && (
            <div>
              <div className="flex items-center justify-between px-4 mb-2">
                <p className="text-[11px] font-semibold text-slate-500">{aiMode ? 'Riwayat Percakapan' : 'Riwayat Pencarian'}</p>
                {!aiMode && searchHistory.length > 0 && (
                  <button onClick={handleClearHistory} className="text-[9px] font-bold text-slate-400 hover:text-rose-500 uppercase transition-colors">Hapus</button>
                )}
                {aiMode && (
                  <button onClick={onNewAiSession} className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg> Baru
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {aiMode ? (
                  aiSessions.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic px-4">Belum ada percakapan.</p>
                  ) : (
                    aiSessions.map((session) => (
                      <div key={session.id} className={`group relative w-full flex items-center justify-between px-4 py-2.5 rounded-full transition cursor-pointer ${activeAiSessionId === session.id ? 'bg-emerald-200/40 text-emerald-800' : 'hover:bg-black/5 text-slate-600 hover:text-slate-800'}`}>
                        <button
                          onClick={() => {
                            onAiSessionClick?.(session.id);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                          className="flex-1 flex items-center gap-3 text-left text-sm truncate"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 shrink-0"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                          <span className="truncate">{session.title}</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAiSessionDelete?.(session.id); }}
                          className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-md transition shrink-0 ml-2"
                          title="Hapus percakapan"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )
                ) : (
                  searchHistory.length === 0 ? (
                    <p className="text-[13px] text-slate-400 italic px-4">Belum ada riwayat.</p>
                  ) : (
                    searchHistory.map((history, i) => (
                      <div key={i} className="group relative w-full flex items-center justify-between px-4 py-2.5 hover:bg-black/5 rounded-full transition">
                        <button
                          onClick={() => {
                            if (onHistoryClick) {
                              onHistoryClick(history);
                            } else {
                              router.push('/?q=' + encodeURIComponent(history));
                            }
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
                  )
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`p-4 flex flex-col items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} text-[10px] text-slate-400 font-medium bg-[#f0f4f9] gap-3`}>
          {isSidebarOpen && (
            <button
              onClick={() => !isPremium && setIsAccessModalOpen(true)}
              className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-bold ${
                isPremium 
                  ? 'bg-amber-100/50 text-amber-700 cursor-default' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M10 10 2.5 2.5"/><path d="m14 14 7.5 7.5"/><path d="M10 14v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h2"/></svg>
              {isPremium ? 'Premium Aktif' : 'Buka Akses Premium'}
            </button>
          )}
          
          <div className={`w-full flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
            {isSidebarOpen && <div>Hak Cipta © {new Date().getFullYear()} MTA</div>}
            <Link href="/settings" className={`flex items-center gap-1.5 hover:text-slate-700 transition ${!isSidebarOpen && 'p-2'}`} title={!isSidebarOpen ? 'Pengaturan' : undefined}>
              {isSidebarOpen && <span>v1.0.0</span>}
              <Settings size={isSidebarOpen ? 12 : 18} />
            </Link>
          </div>
        </div>
      </aside>

      <AccessCodeModal 
        isOpen={isAccessModalOpen} 
        onClose={() => setIsAccessModalOpen(false)} 
        unclosable={!isPremium}
        onSuccess={() => {
          setIsPremium(true);
          window.location.reload(); // Reload untuk menerapkan fitur premium di seluruh app
        }} 
      />
    </>
  );
}
