'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSlug } from './utils';
import { Book, Search, Loader2, Library, BookOpen, Bookmark, Menu, X, ScrollText, Users } from 'lucide-react';
import { motion } from 'framer-motion';

import Image from 'next/image';

interface Surah {
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
}

export default function QuranPage() {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load saved items count
  useEffect(() => {
    const saved = localStorage.getItem('makkah_saved_dalil');
    if (saved) {
      try { setSavedItems(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  useEffect(() => {
    const fetchSurahs = async () => {
      try {
        const res = await fetch('https://equran.id/api/v2/surat');
        if (!res.ok) throw new Error('Gagal memuat data');
        const data = await res.json();
        setSurahs(data.data);
      } catch (err) {
        console.error("Error fetching surah:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter(surah =>
    surah.namaLatin.toLowerCase().includes(search.toLowerCase()) ||
    surah.arti.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:relative bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0
          ${isSidebarOpen ? 'w-[280px] sm:w-[300px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'}
        `}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 group text-left cursor-pointer outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold text-slate-900 leading-tight">Pustaka MTA</h1>
              <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase">v1.0 Makkah</p>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Menu Utama</p>
            <div className="relative flex flex-col space-y-1" style={{ position: 'relative' }}>
              {[
                { id: 'search', label: 'Pencarian Baru', icon: Search, onClick: () => { router.push('/'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }, isActive: pathname === '/', badge: null },
                { id: 'tersimpan', label: 'Dalil Tersimpan', icon: Bookmark, onClick: () => { router.push('/tersimpan'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }, isActive: pathname === '/tersimpan', badge: savedItems.length > 0 ? savedItems.length : null },
                { id: 'quran', label: 'Al-Qur\'an', icon: BookOpen, onClick: () => { if (window.innerWidth < 1024) setIsSidebarOpen(false); }, isActive: pathname === '/quran', badge: null },
                { id: 'bap', label: 'Brosur', icon: ScrollText, onClick: () => { router.push('/bap'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }, isActive: pathname === '/bap', badge: null },
                { id: 'perawi', label: 'Master Perawi', icon: Users, onClick: () => { router.push('/perawi'); if (window.innerWidth < 1024) setIsSidebarOpen(false); }, isActive: pathname === '/perawi', badge: 'Tahap Dev' },
              ].map((menu) => (
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
                      layoutId="active-sidebar-menu"
                      className="absolute inset-0 bg-emerald-50 rounded-lg -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 text-center shrink-0 bg-slate-50/50">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            &copy; 2026 TIM PENGEMBANG IT
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">/</span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Al-Qur'an</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 border border-slate-200 rounded-full flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 hidden sm:inline-block">Guru Daerah MTA</span>
              <span className="text-xs font-bold text-slate-600 sm:hidden">Guru MTA</span>
              <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center text-[8px] font-bold text-emerald-700">GD</div>
            </div>
          </div>
        </header>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* Header Title */}
            <div className="flex flex-col items-center justify-center py-6 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <BookOpen size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
                Bacaan <span className="text-emerald-600">Al-Qur'an</span>
              </h1>
              <p className="text-slate-500 mt-2 text-sm text-center max-w-md">
                Jelajahi surah dan ayat suci Al-Qur'an.
              </p>
            </div>

            {/* Search Input */}
            <div className="max-w-md mx-auto mb-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari surah..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-full pl-12 pr-4 py-3 text-sm outline-none transition-all shadow-sm font-medium text-slate-700"
              />
            </div>

            {/* Loading / Error / Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-emerald-600">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-sm font-bold tracking-widest uppercase">Memuat...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 text-rose-500">
                <p className="font-bold mb-2">Gagal memuat data.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {filteredSurahs.map((surah) => (
                  <Link
                    href={`/quran/${createSlug(surah.namaLatin)}`}
                    key={surah.nomor}
                    className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      {/* Rhombus container */}
                      <div className="w-10 h-10 shrink-0 bg-emerald-50 group-hover:bg-emerald-100 transition-colors flex items-center justify-center transform rotate-45 rounded flex-shrink-0">
                        <span className="transform -rotate-45 font-bold text-sm text-emerald-700">
                          {surah.nomor}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-[15px] text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                          {surah.namaLatin}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                          {surah.arti}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <h3 className="font-amiri font-bold text-2xl text-emerald-800 mb-2 leading-tight" style={{ fontFamily: "'Amiri', serif" }} dir="rtl">
                        {surah.nama}
                      </h3>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {surah.jumlahAyat} Ayat
                      </p>
                    </div>
                  </Link>
                ))}

                {filteredSurahs.length === 0 && (
                  <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                    Pencarian "{search}" tidak ditemukan.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
