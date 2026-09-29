'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, BookOpen, Menu, X, BookMarked, FolderArchive, Copy, Check, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import MainSidebar from '@/app/components/MainSidebar';

const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) return <>{text}</>;
  const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className="bg-emerald-100 text-emerald-800 rounded-sm px-0.5 font-medium">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default function HadistPage() {
  const [search, setSearch] = useState('');
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

  const [folders, setFolders] = useState<any[]>([]);
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

  // Fetch Folders
  useEffect(() => {
    const fetchFolders = async () => {
      setIsLoading(true);
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

    fetchFolders();
  }, []);

  // Search logic for hadist titles
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const ITEMS_PER_PAGE = 5;
  
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);
  
  useEffect(() => {
    if (!search || search.length < 3) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const fetchHadist = async () => {
      setIsSearching(true);
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      // Hitung total
      const { count } = await supabase
        .from('hadist_chm')
        .select('*', { count: 'exact', head: true })
        .or(`judul.ilike.%${search}%,terjemahan.ilike.%${search}%,teks_arab.ilike.%${search}%,teks_bersih.ilike.%${search}%`);
      
      setTotalCount(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from('hadist_chm')
        .select('id, judul, slug, teks_arab, terjemahan, folders_hadist(name, slug)')
        .or(`judul.ilike.%${search}%,terjemahan.ilike.%${search}%,teks_arab.ilike.%${search}%,teks_bersih.ilike.%${search}%`)
        .range(from, to)
        .order('id', { ascending: true });
        
      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(fetchHadist, 500);
    return () => clearTimeout(debounce);
  }, [search, currentPage]);

  // Filter folders by search query
  const filteredFolders = folders.filter((folder) => 
    folder.name.toLowerCase().includes(search.toLowerCase())
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
                placeholder="Cari Kitab atau Judul Hadist..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-full pl-12 pr-4 py-3 text-sm outline-none transition-all shadow-sm font-medium text-slate-700"
              />
            </div>

            {/* Content list Grid (Removed Folders) */}
            <div className="w-full">
              {!isSearching && search.length < 3 && (
                <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                  Ketik kata kunci untuk mencari hadist (minimal 3 huruf)...
                </div>
              )}
            </div>

            {/* Title Search Results */}
            {search.length >= 3 && searchResults.length > 0 && (
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
                        {hadist.terjemahan && (
                          <div className="w-full mt-1">
                            <p className="text-sm text-slate-500 leading-relaxed line-clamp-3">
                              <HighlightText text={hadist.terjemahan} highlight={search} />
                            </p>
                          </div>
                        )}

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

            {!isSearching && search.length >= 3 && searchResults.length === 0 && (
              <div className="text-center py-12 text-slate-500 font-medium">
                Judul "{search}" tidak ditemukan.
              </div>
            )}
            
            {isSearching && (
              <div className="text-center py-12 text-emerald-600 font-medium animate-pulse">
                Mencari judul hadist...
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
              {selectedHadist.terjemahan && (
                <div className="prose prose-slate prose-emerald max-w-none">
                  <p className="text-slate-700 leading-relaxed text-[15px] sm:text-base">
                    <HighlightText text={selectedHadist.terjemahan} highlight={search} />
                  </p>
                </div>
              )}
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
