'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronRight, ChevronDown, Menu, X, ArrowLeft, PanelLeftClose, PanelLeftOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface CollectionSidebarProps {
  brosurList: any[];
  activeSlug: string;
  folderSlug: string;
  folderId: string;
}

export default function CollectionSidebar({ brosurList, activeSlug, folderSlug, folderId }: CollectionSidebarProps) {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  
  const [inputValue, setInputValue] = useState(initialQ);
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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

    const performSearch = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search-koleksi?q=${encodeURIComponent(searchQuery)}&folder_id=${folderId}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    };
    performSearch();
  }, [searchQuery, folderId]);

  // Handler submit pencarian
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue);
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

  return (
    <>
      {/* Mobile Toggle Button */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-50 p-4 rounded-full bg-accent text-white shadow-xl"
        >
          <Menu />
        </button>
      )}

      {/* Desktop Hidden Toggle Button */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="hidden lg:flex fixed top-6 left-6 z-50 p-3 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors shadow-sm items-center gap-2"
          title="Buka Sidebar Koleksi"
        >
          <PanelLeftOpen size={20} />
        </button>
      )}

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside 
            initial={{ x: -350, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -350, opacity: 0 }}
            className="w-full md:w-80 lg:w-[350px] border-r border-black/5 dark:border-white/5 flex flex-col h-[100dvh] absolute lg:relative flex-shrink-0 z-40 bg-[#fafafa] dark:bg-[#0a0a0a]"
          >
            {/* Header Sidebar */}
            <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between sticky top-0 bg-[#fafafa]/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-10">
              <div>
                <h2 className="font-extrabold text-xs uppercase tracking-widest text-zinc-500">Daftar Isi Koleksi</h2>
              </div>
              <div className="flex items-center gap-2">
                {folderSlug ? (
                  <Link href={`/koleksi/${folderSlug}`} className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Kembali ke Koleksi">
                    <ArrowLeft size={16} />
                  </Link>
                ) : (
                  <Link href="/" className="p-2 bg-black/5 dark:bg-white/5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors" title="Kembali ke Beranda">
                    <ArrowLeft size={16} />
                  </Link>
                )}
                <button className="hidden lg:flex p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-zinc-500" onClick={() => setIsSidebarOpen(false)}>
                  <PanelLeftClose size={18} />
                </button>
                <button className="lg:hidden p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setIsSidebarOpen(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-black/5 dark:border-white/5">
              <form onSubmit={handleSearchSubmit} className="relative flex gap-2">
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 text-accent animate-spin" size={16} />
                  ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  )}
                  <input 
                    type="text"
                    placeholder="Cari kata/kalimat di koleksi ini..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="w-full bg-black/5 dark:bg-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSearching}
                  className="bg-accent text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px]"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Cari'}
                </button>
              </form>
            </div>

            {/* Indikator Hasil Pencarian */}
            {searchQuery && !isSearching && (
              <div className="px-4 py-3 bg-accent/10 text-accent text-xs font-bold text-center border-b border-black/5 dark:border-white/5 uppercase tracking-wider">
                Menemukan {displayList.length} brosur yang sesuai
              </div>
            )}

            {/* List Brosur by Year */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {Object.entries(groupedByYear).sort(([a], [b]) => Number(b) - Number(a)).map(([year, brosurs]) => {
                const isExpanded = !!expandedYears[year];
                return (
                  <div key={year} className="space-y-1">
                    <button 
                      onClick={() => toggleYear(year)}
                      className="w-full flex items-center justify-between text-xs font-bold text-zinc-500 uppercase tracking-widest py-2 px-2 hover:text-accent transition-colors"
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
                          {(brosurs as any[]).map((b: any) => {
                            const isActive = b.slug === activeSlug;
                            return (
                              <Link
                                key={b.slug}
                                href={`/${b.slug}${searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''}`}
                                onClick={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
                                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex flex-col group relative border ${
                                  isActive 
                                    ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                                    : 'bg-transparent border-transparent hover:border-black/5 dark:hover:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className={`text-sm font-bold leading-snug ${isActive ? 'text-white' : 'group-hover:text-accent transition-colors'}`}>
                                    {b.judul}
                                  </span>
                                </div>
                                {b.snippet && (
                                  <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>
                                    <span dangerouslySetInnerHTML={{ 
                                      __html: b.snippet.replace(new RegExp(searchQuery, 'gi'), (match: string) => `<strong>${match}</strong>`)
                                    }} />
                                  </p>
                                )}
                              </Link>
                            )
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
              
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
