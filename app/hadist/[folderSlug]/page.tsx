'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Search, ArrowLeft, Bookmark, 
  ChevronDown, ChevronRight, ChevronLeft, ExternalLink, Loader2,
  Copy, Check, Menu, X, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HadistSidebar, { BabInfo } from '../components/HadistSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';
import { createClient } from '@/utils/supabase/client';
import { NINE_BOOKS } from '../page';

const ITEMS_PER_PAGE = 25;

export default function HadistBookDetailPage({ params }: { params: Promise<{ folderSlug: string }> }) {
  const { folderSlug } = use(params);
  
  // Identifikasi buku berdasarkan slug atau key
  const currentBook = NINE_BOOKS.find(
    (b) => b.slug.toLowerCase() === folderSlug.toLowerCase() || b.key.toLowerCase() === folderSlug.toLowerCase()
  ) || NINE_BOOKS[0];

  const [items, setItems] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savedItems, setSavedItems] = useState<string[]>([]);
  const [isShowingSavedOnly, setIsShowingSavedOnly] = useState(false);
  
  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Bab Hierarchy (Kitab/Bab dari pola ID)
  const [babList, setBabList] = useState<BabInfo[]>([]);
  const [loadingBab, setLoadingBab] = useState(true);
  const [selectedBab, setSelectedBab] = useState<number | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedHadist, setSelectedHadist] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load saved items dari localStorage
  useEffect(() => {
    const saved = localStorage.getItem('makkah_saved_dalil');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        setSavedItems(parsed.map((item: any) => typeof item === 'string' ? item : item.id));
      } catch (e) { }
    }
  }, []);

  // Simpan / Toggle Bookmark Hadist
  const toggleBookmark = (hadist: any) => {
    const id = hadist.id;
    let nextSaved: string[];
    const isAlreadySaved = savedItems.includes(id);

    if (isAlreadySaved) {
      nextSaved = savedItems.filter(item => item !== id);
      showToast('Hadits dihapus dari simpanan');
    } else {
      nextSaved = [...savedItems, id];
      showToast('Hadits berhasil disimpan');
    }
    setSavedItems(nextSaved);
    localStorage.setItem('makkah_saved_dalil', JSON.stringify(nextSaved));
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load Bab list (Kitab/Bab hierarchy from ID patterns: H{x}K{kitabNo}B{babNo})
  useEffect(() => {
    const fetchBabHierarchy = async () => {
      setLoadingBab(true);
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from('hadist_chm')
          .select('id')
          .like('id', `${currentBook.key}%`)
          .limit(10000);

        if (!error && data) {
          const map = new Map<number, number>();
          data.forEach(row => {
            const match = row.id.match(/^H\d+K(\d+)/i);
            if (match) {
              const kNo = parseInt(match[1], 10);
              map.set(kNo, (map.get(kNo) || 0) + 1);
            }
          });

          const sortedBabs: BabInfo[] = Array.from(map.entries())
            .map(([kitabNo, count]) => ({
              kitabNo,
              count,
              label: `Bab / Bagian ${kitabNo}`
            }))
            .sort((a, b) => a.kitabNo - b.kitabNo);

          setBabList(sortedBabs);
        }
      } catch (e) {
        console.error('Failed to aggregate bab hierarchy:', e);
      } finally {
        setLoadingBab(false);
      }
    };

    fetchBabHierarchy();
  }, [currentBook.key]);

  // Fetch Hadiths from hadist_chm based on book key, bab, search, & pagination
  useEffect(() => {
    const fetchHadists = async () => {
      setLoading(true);
      const supabase = createClient();

      try {
        let query = supabase
          .from('hadist_chm')
          .select('id, judul, slug, teks_arab, terjemahan, teks_bersih, folders_hadist(name, slug)', { count: 'exact' });

        if (selectedBab !== null) {
          const padBab = selectedBab < 10 ? `0${selectedBab}` : `${selectedBab}`;
          query = query.or(`id.like.${currentBook.key}K${padBab}%,id.like.${currentBook.key}K${selectedBab}%`);
        } else {
          query = query.like('id', `${currentBook.key}%`);
        }

        if (debouncedSearch.trim()) {
          const q = debouncedSearch.trim();
          query = query.or(`judul.ilike.%${q}%,terjemahan.ilike.%${q}%,teks_arab.ilike.%${q}%,teks_bersih.ilike.%${q}%`);
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data, count, error } = await query
          .range(from, to)
          .order('id', { ascending: true });

        if (error) {
          console.error('Error fetching hadists:', error);
        } else {
          setItems(data || []);
          setTotalCount(count || 0);
        }
      } catch (err) {
        console.error('Failed to load hadists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHadists();
  }, [currentBook.key, selectedBab, debouncedSearch, currentPage]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleCopy = (hadist: any) => {
    const textToCopy = `${hadist.teks_arab ? hadist.teks_arab + '\n\n' : ''}${hadist.terjemahan ? 'Artinya:\n"' + hadist.terjemahan + '"\n\n' : ''}(HR. ${currentBook.name} - ${hadist.id})`.trim();
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    showToast('Teks hadits berhasil disalin');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getRefDisplay = (id: string) => {
    const match = id?.match(/^H(\d+)K(\d+)(?:B(\d+))?/i);
    if (match) {
      const kitab = parseInt(match[2], 10);
      const hadistNo = match[3] ? parseInt(match[3], 10) : null;
      return `Bab ${kitab}${hadistNo ? ` • No. ${hadistNo}` : ''}`;
    }
    return id;
  };

  // Filter items jika user memilih "Tersimpan"
  const displayedItems = isShowingSavedOnly
    ? items.filter(item => savedItems.includes(item.id))
    : items;

  return (
    <div className="bg-[#fafafa] text-slate-800 font-sans antialiased h-screen max-h-screen overflow-hidden flex selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ==================== 1. SIDEBAR CLEAN KHUSUS HADIST (SCROLL MANDIRI) ==================== */}
      <HadistSidebar
        currentBook={currentBook}
        selectedBab={selectedBab}
        onSelectBab={(bab) => {
          setSelectedBab(bab);
          setCurrentPage(1);
          setIsShowingSavedOnly(false);
        }}
        babList={babList}
        loadingBab={loadingBab}
        totalHadistCount={totalCount}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onSearchFilterApply={(term) => {
          setSearchQuery(term);
        }}
      />

      {/* ==================== 2. MAIN CONTENT AREA (SCROLL MANDIRI) ==================== */}
      <div className="flex-1 flex flex-col min-w-0 h-screen max-h-screen overflow-hidden">

        {/* Top Navbar Bersih & Luas Sesuai Desain HTML (Tanpa Shadow) */}
        <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0 z-20">
          
          {/* Sisi Kiri: Breadcrumb & Mobile Button */}
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setIsMobileSidebarOpen(true)} 
              className="w-9 h-9 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition lg:hidden shrink-0" 
              title="Buka Menu"
            >
              <Menu size={16} />
            </button>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium overflow-hidden">
              <Link href="/hadist" className="text-slate-400 hover:text-emerald-700 hidden sm:inline transition">
                Pustaka Hadist
              </Link>
              <span className="text-slate-300 hidden sm:inline">/</span>

              {/* Badge Nama Kitab */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-semibold text-xs">
                <span>{currentBook.name}</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200/50">
                  BUKU {currentBook.bookNo}
                </span>
              </div>

              <span className="text-slate-300">/</span>

              <span className="text-xs text-slate-500 font-medium truncate max-w-[180px] sm:max-w-[280px]">
                {selectedBab !== null ? `Bab ${selectedBab}` : 'Semua Bab'}
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Status Simpan & User */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setIsShowingSavedOnly(!isShowingSavedOnly)} 
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                isShowingSavedOnly 
                  ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold' 
                  : 'border-slate-200/70 hover:bg-slate-50 text-slate-700'
              }`}
              title="Lihat Dalil Tersimpan"
            >
              <Bookmark size={13} className={isShowingSavedOnly ? 'text-amber-600 fill-amber-600' : 'text-amber-600'} />
              <span className="hidden sm:inline">Tersimpan</span>
              <span className="text-slate-500 font-semibold text-[11px]">
                ({savedItems.length})
              </span>
            </button>

            <div className="pl-2 border-l border-slate-200/70">
              <HeaderUserDropdown />
            </div>
          </div>

        </header>

        {/* Main Workspace Scrollable Mandiri */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-7 max-w-5xl w-full mx-auto space-y-6 custom-scrollbar">

          {/* ==================== BANNER INFORMASI KITAB (CLEAN, FLAT, NO SHADOW) ==================== */}
          <section className="bg-white rounded-2xl border border-slate-200/70 p-6 sm:p-7">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[10px] font-bold px-2 py-0.5 rounded">
                    BUKU {currentBook.bookNo}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">9 Kitab Utama (Kutubut Tis'ah)</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {currentBook.name}
                </h1>

                <div className="text-xs text-slate-500 space-y-0.5 pt-0.5">
                  <p className="text-emerald-700 font-semibold">
                    {currentBook.compiler}
                  </p>
                  <p className="text-slate-400">
                    {currentBook.desc}
                  </p>
                </div>
              </div>

              {/* Counter Kanan */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-5 py-3.5 flex flex-col items-start md:items-end justify-center min-w-[190px]">
                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase">PILIHAN SAAT INI</span>
                <span className="text-sm font-semibold text-slate-800 mt-0.5 max-w-[210px] truncate">
                  {isShowingSavedOnly ? 'Dalil Tersimpan' : selectedBab !== null ? `Bab ${selectedBab}` : 'Semua Bab'}
                </span>
                <span className="text-xs font-semibold text-emerald-600 mt-0.5">
                  {totalCount.toLocaleString('id-ID')} Hadist
                </span>
              </div>
            </div>
          </section>

          {/* ==================== SEARCH BAR CLEAN (NO SHADOW) ==================== */}
          <section className="space-y-2.5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari hadist (Arab, Latin, arti, atau nomor matan)..." 
                className="w-full pl-10 pr-24 py-3 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 transition font-medium"
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600 transition"
                  >
                    Reset
                  </button>
                )}
                <button 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition"
                >
                  Cari
                </button>
              </div>
            </div>

            {/* Tag Kata Kunci Sederhana */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs text-slate-400">
              <span className="text-[11px] shrink-0 font-medium">Populer:</span>
              {['Niat', 'Wahyu', 'Shalat', 'Iman', 'Wudhu', 'Zakat'].map((tag) => (
                <button 
                  key={tag}
                  onClick={() => setSearchQuery(tag)} 
                  className="px-2 py-0.5 bg-white border border-slate-200/70 rounded-md hover:border-slate-300 hover:text-slate-700 transition shrink-0"
                >
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* ==================== STATUS COUNT ==================== */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-0.5">
            <div>
              Menampilkan <span className="font-semibold text-slate-700">{displayedItems.length}</span> hadist
              {totalCount > 0 && ` (dari ${totalCount} hadist)`}
            </div>
            <div>
              Sumber: Kutubut Tis'ah Otentik
            </div>
          </div>

          {/* ==================== DAFTAR KARTU HADIST (CLEAN CARD - TANPA SHADOW) ==================== */}
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 size={32} className="animate-spin text-emerald-600" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Memuat Hadist...</p>
            </div>
          ) : displayedItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/70 p-10 text-center space-y-2">
              <BookOpen size={28} className="text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">Tidak Ada Hadits Ditemukan</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Silakan ubah kata kunci pencarian atau pilih bab lain pada menu di sebelah kiri.
              </p>
              <div className="pt-2">
                <button 
                  onClick={() => {
                    setSelectedBab(null);
                    setSearchQuery('');
                    setIsShowingSavedOnly(false);
                  }} 
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition"
                >
                  Kembalikan ke Semua Bab
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-12">
              {displayedItems.map((h) => {
                const isSaved = savedItems.includes(h.id);
                const refDisplay = getRefDisplay(h.id);

                return (
                  <article 
                    key={h.id} 
                    className="bg-white rounded-2xl border border-slate-200/70 p-6 sm:p-7 transition-colors hover:border-slate-300"
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-100 text-slate-700 font-semibold text-[11px] px-2 py-0.5 rounded">
                          {currentBook.name}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">{refDisplay}</span>
                        <span className="text-[10px] font-mono text-slate-400">{h.id}</span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => toggleBookmark(h)} 
                          className={`text-sm transition ${isSaved ? 'text-amber-600' : 'text-slate-300 hover:text-slate-500'}`} 
                          title={isSaved ? "Hapus dari Simpanan" : "Simpan Dalil"}
                        >
                          <Bookmark size={16} className={isSaved ? 'fill-amber-600 text-amber-600' : ''} />
                        </button>
                        <button 
                          onClick={() => setSelectedHadist(h)} 
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition"
                        >
                          <span>Buka Penuh</span>
                          <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </div>

                    <h2 
                      onClick={() => setSelectedHadist(h)}
                      className="text-base sm:text-lg font-bold text-slate-900 mb-1 leading-snug cursor-pointer hover:text-emerald-700 transition"
                    >
                      {h.judul || 'Hadist'}
                    </h2>

                    <p className="text-xs text-slate-400 mb-4">
                      {currentBook.name} &bull; {refDisplay}
                    </p>

                    {/* Arabic Text Box */}
                    {h.teks_arab && (
                      <div className="bg-slate-50/80 rounded-xl p-4 sm:p-5 mb-4 border border-slate-100">
                        <p 
                          className="text-xl sm:text-2xl text-slate-900 text-right leading-loose" 
                          dir="rtl"
                          style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                        >
                          {h.teks_arab}
                        </p>
                      </div>
                    )}

                    {/* Translation */}
                    {h.terjemahan ? (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
                        "{h.terjemahan}"
                      </p>
                    ) : h.teks_bersih && !h.teks_arab ? (
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4 whitespace-pre-line">
                        {h.teks_bersih}
                      </p>
                    ) : null}

                    <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <button 
                        onClick={() => handleCopy(h)} 
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition font-medium"
                      >
                        <Copy size={13} />
                        <span>Salin Teks</span>
                      </button>
                      <span className="font-mono text-[11px]">HR. {currentBook.name}</span>
                    </div>
                  </article>
                );
              })}

              {/* Pagination Controls - CLEAN & FLAT (TANPA SHADOW) */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/70">
                  <span className="text-xs font-semibold text-slate-500">
                    Menampilkan Halaman <span className="text-slate-900 font-bold">{currentPage}</span> dari <span className="text-slate-900 font-bold">{totalPages}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>

                    {/* Nomor Halaman Ringkas */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum < 1 || pageNum > totalPages) return null;

                      const isActive = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                            isActive
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Berikutnya</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ==================== 3. MODAL BUKA PENUH (CLEAN & FLAT SESUAI HTML) ==================== */}
      <AnimatePresence>
        {selectedHadist && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/25 backdrop-blur-[2px]"
            onClick={() => setSelectedHadist(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col border border-slate-200/80 overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-50 text-emerald-700 font-semibold text-xs px-2 py-0.5 rounded border border-emerald-200/50">
                    {currentBook.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {selectedHadist.id}
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedHadist(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 transition rounded-lg hover:bg-slate-100" 
                  aria-label="Tutup"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {selectedHadist.judul || 'Hadist'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentBook.name} &bull; {getRefDisplay(selectedHadist.id)}
                  </p>
                </div>

                {/* Box Teks Arab */}
                {selectedHadist.teks_arab && (
                  <div className="p-5 rounded-xl bg-slate-50/80 border border-slate-100">
                    <p 
                      className="text-xl sm:text-2xl text-slate-900 text-right leading-loose" 
                      dir="rtl"
                      style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                    >
                      {selectedHadist.teks_arab}
                    </p>
                  </div>
                )}

                {/* Terjemahan */}
                {selectedHadist.terjemahan && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Terjemahan
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      "{selectedHadist.terjemahan}"
                    </p>
                  </div>
                )}

                {/* Rujukan Tambahan */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-500 space-y-1">
                  <span className="font-semibold text-slate-700 block">Identifikasi Dalil:</span>
                  <p className="leading-relaxed text-[11px] font-mono text-slate-500">
                    {currentBook.name} &bull; ID Matan: {selectedHadist.id}
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
                <button 
                  onClick={() => handleCopy(selectedHadist)} 
                  className="px-3.5 py-1.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-2 transition"
                >
                  <Copy size={13} />
                  <span>{isCopied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/hadist/${folderSlug}/${selectedHadist.slug || selectedHadist.id}`}
                    className="px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                  >
                    Buka Halaman Utuh &rarr;
                  </Link>

                  <button 
                    onClick={() => setSelectedHadist(null)} 
                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                  >
                    Selesai
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================== 4. TOAST NOTIFICATION CLEAN SESUAI HTML ==================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-xs"
          >
            <Check size={14} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
