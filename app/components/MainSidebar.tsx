'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Bookmark, BookOpen, ScrollText, Users, X, Menu, CalendarDays, BrainCircuit, Settings, BookMarked, Sparkles, Plus, MessageSquare, ArrowLeft, Trash2, Clock, Flame, Key, RefreshCw } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AccessCodeModal from './AccessCodeModal';
import { checkIsAccessExpired, clearLocalAccessCache, getAccessRemainingSeconds, formatRemainingTime, verifyAccessCodeOnline } from '@/utils/accessCodeHelper';


export default function MainSidebar({
  savedItemsCount = 0,
  onSearchClick,
  onHistoryClick,
  aiMode = false,
  aiSessions = [],
  recentAiChats = [],
  popularAiChats = [],
  activeAiSessionId,
  onNewAiSession,
  onAiSessionClick,
  onAiSessionDelete,
  onClearAiSessions,
  onSelectCommunityChat
}: {
  savedItemsCount?: number;
  onSearchClick?: () => void;
  onHistoryClick?: (query: string) => void;
  aiMode?: boolean;
  aiSessions?: { id: string; slug?: string; title: string }[];
  recentAiChats?: { id: string; slug?: string; title: string; query: string; category?: string; sessionMessages?: any[] }[];
  popularAiChats?: { id: string; slug?: string; title: string; query: string; count?: number; category?: string; sessionMessages?: any[] }[];
  activeAiSessionId?: string;
  onNewAiSession?: () => void;
  onAiSessionClick?: (id: string) => void;
  onAiSessionDelete?: (id: string) => void;
  onClearAiSessions?: () => void;
  onSelectCommunityChat?: (item: { id?: string; slug?: string; title: string; query: string; sessionMessages?: any[] }) => void;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [hasAccess, setHasAccess] = useState(true);
  const [savedCode, setSavedCode] = useState<string>('');
  const [remainingTimeStr, setRemainingTimeStr] = useState<string>('');
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessModalReason, setAccessModalReason] = useState<'required' | 'expired' | 'deleted'>('required');
  const [isAccessModalUnclosable, setIsAccessModalUnclosable] = useState(false);
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

    // Cek status kode akses yang valid & verifikasi ke database server di setiap kunjungan/route
    if (typeof window !== 'undefined') {
      // Abaikan route dashboard/admin
      if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin')) {
        return;
      }

      const isLocalExpired = checkIsAccessExpired();
      const localCode = localStorage.getItem('mta_premium_access');
      if (isLocalExpired || !localCode || localCode === 'allowed') {
        clearLocalAccessCache();
        setHasAccess(false);
        setSavedCode('');
        setRemainingTimeStr('');
        setAccessModalReason(isLocalExpired ? 'expired' : 'required');
        setIsAccessModalUnclosable(true);
        setIsAccessModalOpen(true);
        return;
      }

      // Verifikasi online ke server Supabase (apakah kode masih terdaftar & aktif atau sudah dihapus/didelete)
      verifyAccessCodeOnline().then((result) => {
        if (!result.valid) {
          clearLocalAccessCache();
          setHasAccess(false);
          setSavedCode('');
          setRemainingTimeStr('');
          setAccessModalReason(result.reason === 'expired' ? 'expired' : (result.reason === 'deleted' ? 'deleted' : 'required'));
          setIsAccessModalUnclosable(true);
          setIsAccessModalOpen(true);
        } else {
          setHasAccess(true);
          setSavedCode(result.code || localCode);
          const remSecs = getAccessRemainingSeconds();
          setRemainingTimeStr(formatRemainingTime(remSecs));
        }
      });
    }
  }, [pathname]);

  const handleChangeCode = () => {
    setAccessModalReason('required');
    setIsAccessModalUnclosable(false);
    setIsAccessModalOpen(true);
  };

  const handleRemoveCode = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus kode akses pada perangkat ini?\n\nAplikasi akan terkunci dan Anda harus memasukkan kode akses kembali untuk melanjutkan.')) {
      clearLocalAccessCache();
      setHasAccess(false);
      setSavedCode('');
      setRemainingTimeStr('');
      setAccessModalReason('required');
      setIsAccessModalUnclosable(true);
      setIsAccessModalOpen(true);
    }
  };

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
      label: 'Asma',
      icon: BrainCircuit,
      href: '/ai-pustaka',
      onClick: (e: React.MouseEvent) => {
        const isExpired = checkIsAccessExpired();
        const code = localStorage.getItem('mta_premium_access');
        if (isExpired || !code || code === 'allowed') {
          e.preventDefault();
          clearLocalAccessCache();
          setAccessModalReason(isExpired ? 'expired' : 'required');
          setIsAccessModalUnclosable(true);
          setIsAccessModalOpen(true);
          return;
        }
        if (window.innerWidth < 1024) setIsSidebarOpen(false);
      },
      isActive: pathname.startsWith('/ai-pustaka'),
      badge: 'AI'
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
        className={`fixed inset-y-0 left-0 z-[70] lg:relative transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0 border-r border-slate-200/70
          ${isSidebarOpen ? 'w-[295px] sm:w-[315px] translate-x-0 bg-[#f0f4f9]' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-[82px] bg-white'}
        `}
      >
        <div className={`h-20 px-5 flex items-center ${!isSidebarOpen ? 'justify-center' : 'justify-between'} sticky top-0 ${isSidebarOpen ? 'bg-[#f0f4f9]' : 'bg-white'} z-10 shrink-0 border-b border-slate-200/50`}>
          <Link
            href={aiMode ? '/ai-pustaka' : '/'}
            onClick={(e: React.MouseEvent) => {
              if (!aiMode && onSearchClick) {
                e.preventDefault();
                onSearchClick();
              }
              if (window.innerWidth < 1024) setIsSidebarOpen(false);
            }}
            className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3.5'} group text-left cursor-pointer outline-none w-full`}
            title={!isSidebarOpen ? (aiMode ? "Asma' (Asisten Majlis Tafsir Al Qur'an)" : 'Pustaka MTA') : undefined}
          >
            {aiMode ? (
              <div className="relative w-10 h-10 rounded-xl  flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Image
                  src="/images/logo_asma.png"
                  alt="Logo Pustaka MTA"
                  fill
                  sizes="40px"
                  priority
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 shadow-xs group-hover:scale-105 transition-transform bg-white">
                <Image
                  src="/images/logo_pustaka.png"
                  alt="Logo Pustaka MTA"
                  fill
                  sizes="40px"
                  priority
                  className="object-contain"
                />
              </div>
            )}
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <h1 className="text-[17px] font-normal text-slate-800 leading-tight truncate tracking-tight">
                  {aiMode ? "Asma' (Asisten Majlis Tafsir Al Qur'an)" : 'Pustaka MTA'}
                </h1>
                <p className="text-[11px] font-normal text-emerald-700 tracking-wider uppercase truncate mt-0.5">
                  {aiMode ? 'BROSUR MTA 1995–2026' : 'Brosur Ahad Pagi'}
                </p>
              </div>
            )}
          </Link>
          {isSidebarOpen && (
            <button
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition shrink-0"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 space-y-5 custom-scrollbar">
          {aiMode ? (
            /* MODE FOKUS AI PUSTAKA (Clean Typography, Tanpa Bold/Semibold, Dikelompokkan 3 Kategori) */
            <>
              <div>
                {isSidebarOpen ? (
                  <button
                    type="button"
                    onClick={() => {
                      onNewAiSession?.();
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-normal text-[14.5px] shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[1.8]" />
                    <span>Percakapan Baru</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNewAiSession?.()}
                    className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm transition cursor-pointer"
                    title="Percakapan Baru"
                  >
                    <Plus className="w-5 h-5 stroke-[1.8]" />
                  </button>
                )}
              </div>

              <div>
                {isSidebarOpen && (
                  <p className="px-3.5 text-[11.5px] font-normal text-slate-400 uppercase tracking-wider mb-1.5">
                    Navigasi
                  </p>
                )}
                <div className="space-y-1">
                  <Link
                    href="/ai-pustaka"
                    className={`relative w-full flex items-center ${!isSidebarOpen ? 'justify-center p-3' : 'justify-between px-3.5 py-2.5'} rounded-xl text-[14px] bg-emerald-100/60 text-emerald-900 font-normal transition-colors`}
                    title={!isSidebarOpen ? 'Ruang Tanya AI' : undefined}
                  >
                    <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3'}`}>
                      <Image src="/images/logo_asma.png" alt="Logo Asma'" width={18} height={18} className="object-contain shrink-0" />
                      {isSidebarOpen && <span className="truncate">Ruang Tanya AI</span>}
                    </div>
                    {isSidebarOpen && (
                      <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-600/90 text-white tracking-wide">
                        Aktif
                      </span>
                    )}
                  </Link>

                  <Link
                    href="/bap"
                    className={`relative w-full flex items-center ${!isSidebarOpen ? 'justify-center p-3' : 'gap-3 px-3.5 py-2'} rounded-xl text-[14px] text-slate-600 hover:text-slate-900 font-normal hover:bg-slate-200/50 transition-colors`}
                    title={!isSidebarOpen ? 'Arsip Brosur' : undefined}
                  >
                    <ScrollText strokeWidth={1.6} className="w-[18px] h-[18px] shrink-0 text-slate-500" />
                    {isSidebarOpen && <span className="truncate">Arsip Brosur Ahad</span>}
                  </Link>

                  <Link
                    href="/"
                    className={`relative w-full flex items-center ${!isSidebarOpen ? 'justify-center p-3' : 'gap-3 px-3.5 py-2'} rounded-xl text-[14px] text-slate-600 hover:text-slate-900 font-normal hover:bg-slate-200/50 transition-colors`}
                    title={!isSidebarOpen ? 'Kembali ke Pustaka Utama' : undefined}
                  >
                    <ArrowLeft strokeWidth={1.6} className="w-[18px] h-[18px] shrink-0 text-slate-500" />
                    {isSidebarOpen && <span className="truncate">Ke Pustaka Utama</span>}
                  </Link>
                </div>
              </div>

              {isSidebarOpen && (
                <div className="space-y-5 pt-1">
                  {/* KELOMPOK 1: CHAT SAYA (Sesi Lokal Browser - Bisa Di-clear Hanya Cache Lokal) */}
                  <div>
                    <div className="flex items-center justify-between px-3.5 mb-1.5">
                      <span className="text-[11.5px] font-normal text-slate-400 uppercase tracking-wider">
                        Chat Saya
                      </span>
                      {aiSessions.length > 0 && onClearAiSessions && (
                        <button
                          onClick={onClearAiSessions}
                          className="text-[11px] font-normal text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Bersihkan hanya cache Chat Saya di perangkat ini (Data di database tetap aman)"
                        >
                          <Trash2 size={11} strokeWidth={1.6} />
                          <span>Bersihkan Cache</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      {aiSessions.length === 0 ? (
                        <p className="text-[13px] font-normal text-slate-400 px-3.5 py-1.5">
                          Belum ada chat di perangkat ini.
                        </p>
                      ) : (
                        aiSessions.map((session) => (
                          <div
                            key={session.id}
                            className={`group relative w-full flex items-center justify-between px-3.5 py-2 rounded-xl transition cursor-pointer font-normal ${activeAiSessionId === session.id
                              ? 'bg-emerald-100/70 text-emerald-950'
                              : 'hover:bg-slate-200/50 text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            <button
                              onClick={() => {
                                onAiSessionClick?.(session.id);
                                if (window.innerWidth < 1024) setIsSidebarOpen(false);
                              }}
                              className="flex-1 flex items-center gap-2.5 text-left text-[13.5px] font-normal truncate cursor-pointer"
                            >
                              <MessageSquare
                                size={14}
                                strokeWidth={1.6}
                                className={`shrink-0 ${activeAiSessionId === session.id
                                  ? 'text-emerald-700'
                                  : 'text-slate-400 group-hover:text-slate-600'
                                  }`}
                              />
                              <span className="truncate font-normal">{session.title}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAiSessionDelete?.(session.id);
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition shrink-0 ml-1.5 cursor-pointer"
                              title="Hapus dari Chat Saya (Tetap tersimpan di Database)"
                            >
                              <X size={13} strokeWidth={1.6} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* KELOMPOK 2: CHAT TERBARU (Tersimpan Permanen di Database Supabase) */}
                  <div>
                    <div className="flex items-center justify-between px-3.5 mb-1.5">
                      <span className="text-[11.5px] font-normal text-slate-400 uppercase tracking-wider">
                        Chat Terbaru
                      </span>
                      <span className="text-[10px] font-normal text-emerald-700/80">
                        Database
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {recentAiChats.length === 0 ? (
                        <p className="text-[13px] font-normal text-slate-400 px-3.5 py-1.5">
                          Memuat arsip terbaru...
                        </p>
                      ) : (
                        recentAiChats.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              onSelectCommunityChat?.(item);
                              if (window.innerWidth < 1024) setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-left text-[13.5px] font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition cursor-pointer"
                            title={item.query}
                          >
                            <Clock size={14} strokeWidth={1.6} className="text-slate-400 shrink-0" />
                            <span className="truncate font-normal">{item.title}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* KELOMPOK 3: CHAT TERPOPULER (Topik Paling Sering Ditanyakan di Database) */}
                  <div>
                    <div className="flex items-center justify-between px-3.5 mb-1.5">
                      <span className="text-[11.5px] font-normal text-slate-400 uppercase tracking-wider">
                        Chat Terpopuler
                      </span>
                      <span className="text-[10px] font-normal text-amber-700/80">
                        Sering Dicari
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      {popularAiChats.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectCommunityChat?.(item);
                            if (window.innerWidth < 1024) setIsSidebarOpen(false);
                          }}
                          className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-left text-[13.5px] font-normal text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition cursor-pointer"
                          title={item.query}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <Flame size={14} strokeWidth={1.6} className="text-amber-500/90 shrink-0" />
                            <span className="truncate font-normal">{item.title}</span>
                          </div>
                          {item.count && item.count > 1 && (
                            <span className="text-[11px] font-normal text-slate-400 shrink-0">
                              {item.count}x
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* MODE MENU UTAMA REGULER (Clean Typography, Tanpa Bold/Semibold) */
            <div>
              {isSidebarOpen ? (
                <p className="px-4 text-[11.5px] font-normal text-slate-400 uppercase tracking-wider mb-2">Menu Utama</p>
              ) : (
                <div className="h-4" />
              )}
              <div className="relative flex flex-col space-y-1">
                {menuItems.map((menu) => (
                  <Link
                    key={menu.id}
                    href={menu.href}
                    onClick={menu.onClick}
                    className={`relative w-full flex items-center ${!isSidebarOpen ? 'justify-center p-3' : 'justify-between px-4 py-2.5'} rounded-xl text-[14.5px] transition-colors z-10 font-normal ${menu.isActive ? 'text-emerald-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}`}
                    title={!isSidebarOpen ? menu.label : undefined}
                  >
                    <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'gap-3.5'}`}>
                      {menu.id === 'ai-pustaka' ? (
                        <div className="relative w-[18px] h-[18px] shrink-0">
                          <Image
                            src="/images/logo_asma.png"
                            alt="Asma"
                            fill
                            sizes="18px"
                            className="object-contain"
                          />
                        </div>
                      ) : (
                        <menu.icon strokeWidth={1.6} className={`w-[18px] h-[18px] shrink-0 transition-all ${menu.isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
                      )}
                      {isSidebarOpen && <span className="truncate font-normal">{menu.label}</span>}
                    </div>
                    {isSidebarOpen && menu.badge && (
                      <span className={`text-[10px] font-normal px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${menu.isActive ? 'bg-emerald-200/80 text-emerald-800' : 'bg-slate-200/80 text-slate-600'}`}>
                        {menu.badge}
                      </span>
                    )}
                    {menu.isActive && (
                      <motion.div
                        layoutId="active-sidebar-menu-global"
                        className="absolute inset-0 bg-emerald-100/75 rounded-xl -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {isSidebarOpen && !aiMode && (
            <div>
              <div className="flex items-center justify-between px-4 mb-2">
                <p className="text-[11.5px] font-normal text-slate-400 uppercase tracking-wider">
                  Riwayat Pencarian
                </p>
                {searchHistory.length > 0 && (
                  <button onClick={handleClearHistory} className="text-[11px] font-normal text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
                    Hapus
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {searchHistory.length === 0 ? (
                  <p className="text-[13.5px] font-normal text-slate-400 px-4 py-2">Belum ada riwayat.</p>
                ) : (
                  searchHistory.map((history, i) => (
                    <div key={i} className="group relative w-full flex items-center justify-between px-4 py-2 hover:bg-slate-200/60 rounded-xl transition">
                      <button
                        onClick={() => {
                          if (onHistoryClick) {
                            onHistoryClick(history);
                          } else {
                            router.push('/?q=' + encodeURIComponent(history));
                          }
                          if (window.innerWidth < 1024) setIsSidebarOpen(false);
                        }}
                        className="flex-1 flex items-center gap-3 text-left text-slate-600 hover:text-slate-900 text-[14px] font-normal truncate cursor-pointer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-100 shrink-0"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>
                        <span className="truncate font-normal">{history}</span>
                      </button>
                      <button
                        onClick={() => handleRemoveHistoryItem(i)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 ml-2 cursor-pointer"
                        title="Hapus riwayat"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className={`p-3.5 flex flex-col items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} text-[11px] text-slate-400 font-normal bg-[#f0f4f9] gap-2.5`}>
          {isSidebarOpen ? (
            <div className="w-full bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                    <Key className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    {/* <span className="text-[12px] font-medium text-slate-800 leading-tight truncate">
                      {savedCode ? `Kode: ${savedCode}` : 'Kode Akses'}
                    </span> */}
                    <span className="text-[10px] text-slate-400 truncate mt-0.5">
                      {remainingTimeStr ? `Masa Aktif: ${remainingTimeStr}` : 'Akses Pustaka'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleChangeCode}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Ganti dengan kode akses lain"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Ubah Kode</span>
                </button>
                <button
                  type="button"
                  onClick={handleRemoveCode}
                  className="py-1.5 px-2 rounded-lg text-[11px] font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Hapus kode dan kunci aplikasi"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Hapus Kode</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleChangeCode}
              className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 transition shadow-xs cursor-pointer"
              title={`Kode Akses: ${savedCode || 'Klik untuk ubah/kelola'}`}
            >
              <Key className="w-4 h-4 text-emerald-700" />
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
        onClose={() => {
          if (!isAccessModalUnclosable) {
            setIsAccessModalOpen(false);
          }
        }}
        unclosable={isAccessModalUnclosable}
        reason={accessModalReason}
        onSuccess={(newCode) => {
          setHasAccess(true);
          setSavedCode(newCode);
          setIsAccessModalUnclosable(false);
          setIsAccessModalOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
