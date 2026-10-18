'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Bookmark, BookOpen, Menu, X, BookMarked, FolderArchive, Copy, Check, ExternalLink, ChevronLeft, ChevronRight, Library, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import MainSidebar from '@/app/components/MainSidebar';

// Utility: Hapus harakat / syakal Arab
function stripArabicHarakat(text: string): string {
  if (!text) return '';
  return text
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '') // tatweel
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // Alif hamzah/wasl -> alif
    .replace(/\u0649/g, '\u064A') // Alif maqsura -> ya
    .replace(/\u0629/g, '\u0647'); // Ta marbutah -> ha
}

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!text) return null;
  if (!highlight.trim()) return <>{text}</>;

  const cleanHighlight = highlight.replace(/[(),"%]/g, ' ').trim();
  if (!cleanHighlight) return <>{text}</>;

  const terms = cleanHighlight.split(/\s+/).filter(t => t.length > 0);
  const isArabicSearch = /[\u0600-\u06FF]/.test(cleanHighlight);

  // Jika teks bahasa Arab dan ada pencarian Arab:
  if (isArabicSearch && /[\u0600-\u06FF]/.test(text)) {
    const strippedQuery = stripArabicHarakat(cleanHighlight);
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexTerms = [cleanHighlight, strippedQuery].filter(Boolean);
    const pattern = new RegExp(`(${regexTerms.map(escapeRegExp).join('|')})`, 'gi');
    const parts = text.split(pattern);
    return (
      <>
        {parts.map((part, i) =>
          regexTerms.some(t => part.toLowerCase().includes(t.toLowerCase())) ? (
            <mark key={i} className="bg-emerald-200 text-emerald-950 rounded-sm px-0.5 font-bold">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  }

  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const validTerms = terms.map(escapeRegExp).join('|');
  if (!validTerms) return <>{text}</>;

  const parts = text.split(new RegExp(`(${validTerms})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        terms.some(term => part.toLowerCase() === term.toLowerCase()) ? (
          <mark key={i} className="bg-emerald-100 text-emerald-800 rounded-sm px-0.5 font-medium">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export const NINE_BOOKS = [
  { key: 'H1', slug: 'shahih-bukhari', label: 'Shahih Bukhari', short: 'Shahih Bukhari', name: 'Shahih Bukhari', bookNo: 1, desc: 'Imam Abu Abdillah Muhammad bin Ismail al-Bukhari', compiler: 'Imam Bukhari (194 - 256 H)' },
  { key: 'H2', slug: 'shahih-muslim', label: 'Shahih Muslim', short: 'Shahih Muslim', name: 'Shahih Muslim', bookNo: 2, desc: 'Imam Abul Husain Muslim bin al-Hajjaj an-Naisaburi', compiler: 'Imam Muslim (204 - 261 H)' },
  { key: 'H3', slug: 'sunan-abu-daud', label: 'Sunan Abu Daud', short: 'Sunan Abu Daud', name: 'Sunan Abu Daud', bookNo: 3, desc: 'Imam Abu Daud Sulaiman bin al-Asy\'ats as-Sijistani', compiler: 'Imam Abu Daud (202 - 275 H)' },
  { key: 'H4', slug: 'sunan-tirmidzi', label: 'Sunan Tirmidzi', short: 'Sunan Tirmidzi', name: 'Sunan Tirmidzi', bookNo: 4, desc: 'Imam Abu Isa Muhammad bin Isa at-Tirmidzi', compiler: 'Imam Tirmidzi (209 - 279 H)' },
  { key: 'H5', slug: 'sunan-nasai', label: 'Sunan Nasa\'i', short: 'Sunan Nasa\'i', name: 'Sunan Nasa\'i', bookNo: 5, desc: 'Imam Abu Abdirrahman Ahmad bin Syu\'aib an-Nasa\'i', compiler: 'Imam Nasa\'i (215 - 303 H)' },
  { key: 'H6', slug: 'sunan-ibnu-majah', label: 'Sunan Ibnu Majah', short: 'Sunan Ibnu Majah', name: 'Sunan Ibnu Majah', bookNo: 6, desc: 'Imam Abu Abdillah Muhammad bin Yazid Ibnu Majah', compiler: 'Imam Ibnu Majah (209 - 273 H)' },
  { key: 'H7', slug: 'musnad-ahmad', label: 'Musnad Ahmad', short: 'Musnad Ahmad', name: 'Musnad Ahmad', bookNo: 7, desc: 'Imam Ahmad bin Muhammad bin Hanbal', compiler: 'Imam Ahmad (164 - 241 H)' },
  { key: 'H8', slug: 'muwatha-malik', label: 'Muwatha\' Malik', short: 'Muwatha\' Malik', name: 'Muwatha\' Malik', bookNo: 8, desc: 'Imam Malik bin Anas al-Ashbahi', compiler: 'Imam Malik (93 - 179 H)' },
  { key: 'H9', slug: 'sunan-darimi', label: 'Sunan Darimi', short: 'Sunan Darimi', name: 'Sunan Darimi', bookNo: 9, desc: 'Imam Abu Muhammad Abdullah bin Abdirrahman ad-Darimi', compiler: 'Imam Darimi (181 - 255 H)' },
];

function HadistPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [search, setSearch] = useState(initialQuery);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  // Sinkronkan URL jika query search berubah
  const handleSearchChange = (val: string) => {
    setSearch(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val.trim()) {
      params.set('q', val);
    } else {
      params.delete('q');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  };

  const [folders, setFolders] = useState<any[]>([]);
  const [bookStats, setBookStats] = useState<Record<string, { total: number, clean: number }>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [selectedHadist, setSelectedHadist] = useState<any>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (hadist: any) => {
    const textToCopy = `${hadist.teks_arab ? hadist.teks_arab + '\n\n' : ''}${hadist.terjemahan ? hadist.terjemahan + '\n\n' : ''}(HR. ${hadist.folders_hadist?.name?.replace(/^HADIST_/i, '') || 'Koleksi'})`.trim();
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Load saved items count
  useEffect(() => {
    const saved = localStorage.getItem('makkah_saved_dalil');
    if (saved) {
      try { setSavedItems(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  // Fetch Folders & Book Stats
  useEffect(() => {
    const fetchFoldersAndStats = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/folders-hadist-stats');
        if (res.ok) {
          const data = await res.json();
          if (data.folders) setFolders(data.folders);
          if (data.bookStats) setBookStats(data.bookStats);
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch from stats API, fallback to direct query', e);
      }

      // Fallback direct query
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('folders_hadist')
        .select('*')
        .order('name', { ascending: true });
        
      if (!error && data) {
        setFolders(data);
      }
      setIsLoading(false);
    };

    fetchFoldersAndStats();
  }, []);

  // Search logic for hadist
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 8;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  useEffect(() => {
    const trimmed = search.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setTotalCount(0);
      return;
    }

    const fetchHadist = async () => {
      setIsSearching(true);
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();

      // Sanitasi input agar karakter khusus tidak memecah parser Supabase .or()
      const cleanInput = trimmed.replace(/[(),"%]/g, ' ').trim();
      if (!cleanInput) {
        setIsSearching(false);
        return;
      }

      // Deteksi jika user mengetik Arab
      const hasArabic = /[\u0600-\u06FF]/.test(cleanInput);
      const terms = new Set<string>();
      terms.add(cleanInput);

      if (hasArabic) {
        const stripped = stripArabicHarakat(cleanInput);
        if (stripped && stripped !== cleanInput) {
          terms.add(stripped);
        }
      }

      // Buat filter or() untuk semua variasi kata
      const orConditions: string[] = [];
      terms.forEach(t => {
        if (!t.trim()) return;
        orConditions.push(`judul.ilike.%${t}%`);
        orConditions.push(`terjemahan.ilike.%${t}%`);
        orConditions.push(`teks_arab.ilike.%${t}%`);
        orConditions.push(`teks_bersih.ilike.%${t}%`);
      });

      const orQuery = orConditions.join(',');
      
      // Hitung total data yang cocok
      const { count } = await supabase
        .from('hadist_chm')
        .select('*', { count: 'exact', head: true })
        .or(orQuery);
      
      setTotalCount(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Ambil data halaman aktif
      const { data, error } = await supabase
        .from('hadist_chm')
        .select('id, judul, slug, teks_arab, terjemahan, teks_bersih, folders_hadist(name, slug)')
        .or(orQuery)
        .range(from, to)
        .order('id', { ascending: true });
        
      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(fetchHadist, 400);
    return () => clearTimeout(debounce);
  }, [search, currentPage]);

  // Filter books by search query
  const filteredBooks = NINE_BOOKS.filter((book) => 
    book.name.toLowerCase().includes(search.toLowerCase()) ||
    book.compiler.toLowerCase().includes(search.toLowerCase()) ||
    book.desc.toLowerCase().includes(search.toLowerCase()) ||
    book.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      {/* Sidebar Global */}
      <MainSidebar savedItemsCount={savedItems.length} />
      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">

        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">/</span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Hadist CHM</span>
            </div>
          </div>
        </header>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6 pb-20">

            {/* Header Title */}
            <div className="flex flex-col items-center justify-center py-6 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <BookMarked size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
                Pustaka <span className="text-emerald-600">Hadist</span>
              </h1>
              <p className="text-slate-500 mt-2 text-sm text-center max-w-md">
                Jelajahi dan temukan kitab-kitab hadist koleksi 9 Imam.
              </p>
            </div>

            {/* Search Input */}
            <div className="max-w-md mx-auto mb-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari kata/hadist (Arab bersyakal, Arab gundul, Latin)..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-full pl-12 pr-10 py-3 text-sm outline-none transition-all shadow-sm font-medium text-slate-700"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => handleSearchChange('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title="Hapus pencarian"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Grouped Books / Cards (9 Kitab Imam) */}
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Library className="text-emerald-600" size={20} />
                  <h2 className="text-lg md:text-xl font-bold text-slate-800">
                    Koleksi Kitab Hadist (9 Imam)
                  </h2>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  9 Kitab Utama
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <div key={n} className="h-36 bg-slate-100/70 rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : filteredBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBooks.map((book) => {
                    const stats = bookStats[book.key] || { total: 0, clean: 0 };

                    return (
                      <Link
                        key={book.key}
                        href={`/hadist/${book.slug}`}
                        className="group bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors shrink-0 shadow-sm">
                                <BookOpen size={20} />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 text-sm md:text-base leading-snug line-clamp-1">
                                  {book.name}
                                </h3>
                                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5 line-clamp-1">
                                  {book.compiler}
                                </p>
                              </div>
                            </div>

                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold rounded-md uppercase tracking-wider shrink-0 border border-emerald-200">
                              Buku {book.bookNo}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                            {book.desc}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-600">
                            <FileText size={13} className="text-slate-400" />
                            {stats.total > 0 ? `${stats.total.toLocaleString('id-ID')} Hadist` : 'Jelajahi Kitab'}
                          </span>
                          <span className="text-emerald-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            Buka <ChevronRight size={14} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-8 text-center text-slate-400 text-sm">
                  Tidak ada kitab yang cocok dengan pencarian.
                </div>
              )}
            </div>

            {/* Title Search Results */}
            {search.trim().length >= 2 && searchResults.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BookOpen className="text-emerald-600" size={20} />
                  Hasil Pencarian Judul Hadist
                </h2>
                <div className="flex flex-col gap-4 w-full">
                  {searchResults.map((hadist) => {
                    const cleanSlug = hadist.slug;
                    const folderSlug = hadist.folders_hadist?.slug || 'tanpa-koleksi';
                    
                    // Parse ID untuk render Buku/Kitab/No
                    let referensiText = hadist.id;
                    const match = hadist.id.match(/^H(\d+)K(\d+)(?:B(\d+))?/i);
                    if (match) {
                      const buku = match[1];
                      const kitab = parseInt(match[2], 10);
                      const hadistNo = match[3] ? parseInt(match[3], 10) : null;
                      referensiText = `Buku ${buku} • Kitab ${kitab}${hadistNo ? ` • Hadist No. ${hadistNo}` : ''}`;
                    }

                    return (
                      <div 
                        onClick={() => setSelectedHadist(hadist)} 
                        key={hadist.id}
                        className="group bg-white border border-slate-200 p-5 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all flex flex-col items-start gap-4 cursor-pointer"
                      >
                        <div className="flex items-start gap-4 w-full">
                          <div className="w-10 h-10 shrink-0 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors rounded-xl flex items-center justify-center mt-0.5">
                            <BookOpen size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-800 text-[15px] group-hover:text-emerald-700 leading-snug line-clamp-2">
                              {hadist.judul}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 line-clamp-1 truncate">
                              {hadist.folders_hadist?.name.replace(/^HADIST_/i, '') || 'Koleksi'}
                            </p>
                          </div>
                        </div>

                        {/* Arabic Snippet */}
                        {hadist.teks_arab && (
                          <div className="w-full mt-2">
                            <p 
                              className="text-[20px] leading-[1.8] text-right text-slate-700 line-clamp-2" 
                              dir="rtl"
                              style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                            >
                              <HighlightText text={hadist.teks_arab} highlight={search} />
                            </p>
                          </div>
                        )}

                        {/* Terjemahan Snippet */}
                        {hadist.terjemahan ? (
                          <div className="w-full mt-1">
                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                              <HighlightText text={hadist.terjemahan} highlight={search} />
                            </p>
                          </div>
                        ) : hadist.teks_bersih && !hadist.teks_arab ? (
                          <div className="w-full mt-1">
                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                              <HighlightText text={hadist.teks_bersih} highlight={search} />
                            </p>
                          </div>
                        ) : null}

                        <div className="w-full mt-auto pt-4 border-t border-slate-100">
                          <div className="bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100 inline-block">
                             <span className="text-xs font-semibold text-zinc-600">Ref: {referensiText}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalCount > ITEMS_PER_PAGE && (
                  <div className="mt-10 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <span className="text-sm font-medium text-slate-600">
                      Halaman {currentPage} dari {Math.ceil(totalCount / ITEMS_PER_PAGE)}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), p + 1))}
                      disabled={currentPage === Math.ceil(totalCount / ITEMS_PER_PAGE)}
                      className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isSearching && search.trim().length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-medium">
                Kata kunci &quot;{search}&quot; tidak ditemukan pada riwayat hadist (baik Arab maupun Latin).
              </div>
            )}
            
            {isSearching && (
              <div className="text-center py-12 text-emerald-600 font-medium animate-pulse">
                Sedang mencari hadist (Arab & Latin)...
              </div>
            )}

          </div>
        </div>
      </main>
    </div>

      {/* HADIST MODAL POPUP */}
      {selectedHadist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedHadist(null)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 bg-white z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1">
                    {selectedHadist.judul}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                    {selectedHadist.folders_hadist?.name?.replace(/^HADIST_/i, '') || 'Koleksi'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHadist(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 custom-scrollbar">
              {selectedHadist.teks_arab && (
                <div className="mb-8">
                  <p 
                    className="text-[26px] sm:text-[30px] leading-[2] sm:leading-[2.2] text-right text-slate-800 tracking-wide" 
                    dir="rtl"
                    style={{ fontFamily: "'Traditional Arabic', 'Amiri', 'Scheherazade New', serif" }}
                  >
                    {selectedHadist.teks_arab}
                  </p>
                </div>
              )}
              {selectedHadist.terjemahan ? (
                <div className="prose prose-slate prose-emerald max-w-none">
                  <p className="text-slate-700 leading-relaxed text-[15px] sm:text-base">
                    <HighlightText text={selectedHadist.terjemahan} highlight={search} />
                  </p>
                </div>
              ) : selectedHadist.teks_bersih && !selectedHadist.teks_arab ? (
                <div className="prose prose-slate prose-emerald max-w-none">
                  <p className="text-slate-700 leading-relaxed text-[15px] sm:text-base whitespace-pre-line">
                    <HighlightText text={selectedHadist.teks_bersih} highlight={search} />
                  </p>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-5 sm:p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleCopy(selectedHadist)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? 'Tersalin!' : 'Salin Teks'}
                </button>
                <Link 
                  href={`/hadist/${selectedHadist.folders_hadist?.slug || 'tanpa-koleksi'}/${selectedHadist.slug}`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink size={16} /> Buka Penuh
                </Link>
              </div>
              
              {/* Parse Referensi CHM if possible for the modal footer */}
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                  Ref: {selectedHadist.id}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default function HadistPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#fafaf9]">
        <div className="text-emerald-600 font-semibold animate-pulse">Memuat Pustaka Hadist...</div>
      </div>
    }>
      <HadistPageContent />
    </Suspense>
  );
}
