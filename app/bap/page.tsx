'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bookmark, BookOpen, Menu, X, ScrollText, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';

export default function BapPage() {
  const [search, setSearch] = useState('');
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

// Generate years from 2026 down to 1995
  const allYears = Array.from({ length: 2026 - 1995 + 1 }, (_, i) => 2026 - i);

  // Load saved items count
  useEffect(() => {
    const saved = localStorage.getItem('makkah_saved_dalil');
    if (saved) {
      try { setSavedItems(JSON.parse(saved)); } catch (e) { }
    }
  }, []);

  // Search logic for brochure titles
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const fetchBrosur = async () => {
      setIsSearching(true);
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('brosur')
        .select('id, judul, slug, tahun')
        .ilike('judul', `%${search}%`)
        .limit(20);
        
      if (!error && data) {
        setSearchResults(data);
      }
      setIsSearching(false);
    };

    const debounce = setTimeout(fetchBrosur, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // Filter years by search query
  const filteredYears = allYears.filter((year) => 
    year.toString().includes(search)
  );

  return (
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
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Brosur</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserDropdown />
          </div>
        </header>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6 pb-20">

            {/* Header Title */}
            <div className="flex flex-col items-center justify-center py-6 mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <ScrollText size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight text-center">
                Arsip <span className="text-emerald-600">Brosur MTA</span>
              </h1>
              <p className="text-slate-500 mt-2 text-sm text-center max-w-md">
                Jelajahi dan temukan kajian dari Brosur Ahad Pagi MTA per tahun.
              </p>
            </div>

            {/* Search Input */}
            <div className="max-w-md mx-auto mb-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Cari tahun brosur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-full pl-12 pr-4 py-3 text-sm outline-none transition-all shadow-sm font-medium text-slate-700"
              />
            </div>

            {/* Content list Grid (Design matches Quran page) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {filteredYears.map((year, index) => (
                <Link
                  href={`/bap/${year}`}
                  key={year}
                  className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    {/* Rhombus container matches Quran numbers */}
                    <div className="w-10 h-10 shrink-0 bg-emerald-50 group-hover:bg-emerald-100 transition-colors flex items-center justify-center transform rotate-45 rounded flex-shrink-0">
                      <span className="transform -rotate-45 font-bold text-sm text-emerald-700">
                        {index + 1}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-extrabold text-[15px] text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                        Tahun {year}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Kajian Ahad Pagi
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <ScrollText className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  </div>
                </Link>
              ))}

              {filteredYears.length === 0 && searchResults.length === 0 && !isSearching && (
                <div className="col-span-full text-center py-12 text-slate-500 font-medium">
                  Tahun atau Judul "{search}" tidak ditemukan.
                </div>
              )}
            </div>

            {/* Title Search Results */}
            {search.length >= 2 && searchResults.length > 0 && (
              <div className="mt-12">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BookOpen className="text-emerald-600" size={20} />
                  Hasil Pencarian Judul Brosur
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {searchResults.map((brosur) => {
                    const cleanSlug = brosur.judul
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-+|-+$/g, '');

                    return (
                      <Link 
                        href={`/bap/${brosur.tahun}/${cleanSlug}`} 
                        key={brosur.id}
                        className="group bg-white border border-slate-200 p-5 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all flex items-start gap-4"
                      >
                        <div className="w-10 h-10 shrink-0 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors rounded-xl flex items-center justify-center mt-0.5">
                          <BookOpen size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-[15px] group-hover:text-emerald-700 leading-snug line-clamp-3">
                            {brosur.judul}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">
                            Tahun {brosur.tahun}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            
            {isSearching && (
              <div className="text-center py-12 text-emerald-600 font-medium animate-pulse">
                Mencari judul brosur...
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
