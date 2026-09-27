'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, ChevronDown, Menu, X, ArrowLeft, PanelLeftClose, PanelLeftOpen, Loader2, Home, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

interface CollectionSidebarProps {
  brosurList: any[];
  activeSlug: string;
  folderSlug: string;
  folderId: string;
}

// Cache global untuk menyimpan hasil pencarian
const searchCache = new Map<string, any[]>();

// Fungsi untuk memformat judul menjadi Title Case (huruf depan besar)
const formatTitle = (text: string) => {
  if (!text) return text;
  return text.split(' ').map(word => {
    if (word.length === 0) return word;
    // Biarkan angka atau kode seperti 20260712 tetap sama
    if (/\d/.test(word)) return word;
    // Kalau kata di dalam kurung e.g. (ke
    if (word.startsWith('(')) {
      return '(' + word.charAt(1).toUpperCase() + word.slice(2).toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

export default function CollectionSidebar({ brosurList, activeSlug, folderSlug, folderId }: CollectionSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get('q') || '';

  const [inputValue, setInputValue] = useState(initialQ);
  const [searchQuery, setSearchQuery] = useState(initialQ);

  // Jika query sudah ada di cache, langsung gunakan hasil cache tanpa loading
  const [searchResults, setSearchResults] = useState<any[]>(searchCache.get(initialQ) || []);
  const [isSearching, setIsSearching] = useState(!searchCache.has(initialQ) && initialQ !== '');

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

  const activeBrosur = brosurList.find(b => b.slug === activeSlug);

  // Jika sedang mencari, gunakan hasil dari API. Jika tidak, gunakan brosurList lokal.
  const displayList = searchQuery ? searchResults : brosurList;

  // Group by year
  const groupedByYear = displayList.reduce((acc, b) => {
    if (!acc[b.tahun]) acc[b.tahun] = [];
    acc[b.tahun].push(b);
    return acc;
  }, {} as Record<number, any[]>);

  // Jalankan pencarian ke API saat searchQuery berubah
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    // Jika sudah ada di cache, gunakan langsung tanpa loading
    if (searchCache.has(searchQuery)) {
      setSearchResults(searchCache.get(searchQuery)!);
      setIsSearching(false);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search-koleksi?q=${encodeURIComponent(searchQuery)}&folder_id=${folderId}`);
        const data = await res.json();
        searchCache.set(searchQuery, data.results || []);
        setSearchResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [searchQuery, folderId]);

  // Handler submit pencarian (Global Redirect)
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    setIsSearching(true);
    router.push(`/?q=${encodeURIComponent(inputValue)}`);
  };

  // Reset otomatis jika input kosong
  useEffect(() => {
    if (inputValue === '') {
      setSearchQuery('');
    }
  }, [inputValue]);

  // Initialize expanded years (Minimize secara default, hanya buka tahun aktif atau semua saat mencari)
  useEffect(() => {
    if (searchQuery) {
      // Auto-expand all when searching
      const all: Record<string, boolean> = {};
      displayList.forEach(b => { all[b.tahun] = true; });
      setExpandedYears(all);
    } else if (activeBrosur && Object.keys(expandedYears).length === 0) {
      // Buka hanya tahun yang sedang aktif
      setExpandedYears({ [activeBrosur.tahun]: true });
    }
  }, [searchQuery, activeBrosur, displayList]);

  const toggleYear = (year: string) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // Close sidebar on mobile initially
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    const handleToggle = () => setIsSidebarOpen(prev => !prev);
    window.addEventListener('toggle-collection-sidebar', handleToggle);
    return () => window.removeEventListener('toggle-collection-sidebar', handleToggle);
  }, []);

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isSidebarOpen && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50 flex flex-col gap-4 print:hidden">
          <Link
            href="/"
            className="p-4 rounded-full bg-white text-zinc-600 shadow-xl border border-black/5 hover:bg-zinc-50 transition-colors"
            title="Kembali ke Beranda"
          >
            <Home />
          </Link>
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-4 rounded-full bg-accent text-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
            title="Buka Daftar Isi"
          >
            <Menu />
          </button>
        </div>
      )}
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
          >
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
            <p className="text-sm font-bold text-emerald-600 tracking-widest uppercase animate-pulse">Memuat...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -350, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full sm:w-[300px] lg:w-[300px] border-r border-black/5 flex flex-col h-[100dvh] fixed lg:relative flex-shrink-0 z-40 bg-white print:hidden shadow-2xl lg:shadow-none"
          >
            {/* Header Sidebar */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-[13px] font-extrabold text-slate-900 leading-tight">Pustaka MTA</h1>
                  <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase">v1.0 Makkah</p>
                </div>
              </Link>
              <div className="flex items-center gap-1">
                <button className="hidden lg:flex p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition" onClick={() => setIsSidebarOpen(false)}>
                  <PanelLeftClose size={16} />
                </button>
                <button className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition" onClick={() => setIsSidebarOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100">
              <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600 animate-spin" size={16} />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  )}
                  <input
                    type="text"
                    placeholder="Cari ke semua database..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
                </button>
              </form>
            </div>

            {/* Indikator Hasil Pencarian */}
            {searchQuery && !isSearching && (
              <div className="px-4 py-3 bg-emerald-50 text-emerald-700 text-xs font-bold text-center border-b border-emerald-100 uppercase tracking-wider">
                Menemukan {displayList.length} brosur yang sesuai
              </div>
            )}

            {/* List Brosur by Year */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {searchQuery ? (
                // JIKA SEDANG MENCARI: Tampilkan flat list agar urutan ts_rank dari API (Paling relevan di atas) tidak rusak
                <div className="space-y-2">
                  {displayList.map((b: any) => {
                    const isActive = b.slug === activeSlug;
                    return (
                      <Link
                        key={b.slug}
                        href={`/bap/${b.tahun}/${b.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex flex-col group relative ${isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-transparent hover:bg-slate-50 text-slate-600'
                          }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`text-sm leading-snug ${isActive ? 'font-semibold text-emerald-700' : 'font-medium group-hover:text-slate-900 transition-colors'}`}>
                            {formatTitle(b.judul)}
                          </span>
                        </div>
                        {b.snippet && (
                          <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${isActive ? 'text-emerald-700/80' : 'text-slate-500'}`}>
                            <span dangerouslySetInnerHTML={{
                              __html: b.snippet.replace(
                                new RegExp(searchQuery.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi'),
                                (match: string) => `<mark class="bg-yellow-300 text-black px-1 rounded-sm">${match}</mark>`
                              )
                            }} />
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ) : (
                // JIKA TIDAK MENCARI: Tampilkan berdasarkan Grouping Tahun
                Object.entries(groupedByYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, brosurs]) => {
                  const isExpanded = !!expandedYears[year];
                  return (
                    <div key={year} className="space-y-1">
                      <button
                        onClick={() => toggleYear(year)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-widest py-2 px-2 hover:text-emerald-600 transition-colors"
                      >
                        Tahun {year}
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1"
                          >
                            {(brosurs as any[]).map((b: any, idx: number) => {
                              const isActive = b.slug === activeSlug;
                              return (
                                <Link
                                  key={b.id || `${b.slug}-${idx}`}
                                  href={`/bap/${b.tahun}/${b.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`}
                                  onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                                  className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 flex flex-col group relative ${isActive
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-transparent hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={`text-sm leading-snug ${isActive ? 'font-semibold text-emerald-700' : 'font-medium group-hover:text-slate-900 transition-colors'}`}>
                                      {formatTitle(b.judul)}
                                    </span>
                                  </div>
                                </Link>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}

              {displayList.length === 0 && (
                <div className="text-center text-zinc-500 text-sm mt-10">
                  Brosur tidak ditemukan.
                </div>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
