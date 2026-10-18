'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Search, X, ChevronDown, ChevronRight, Clock, 
  Bookmark, Check
} from 'lucide-react';
import { NINE_BOOKS } from '../page';

export interface BabInfo {
  kitabNo: number;
  count: number;
  label: string;
}

interface HadistSidebarProps {
  currentBook: typeof NINE_BOOKS[0];
  selectedBab: number | null;
  onSelectBab: (babNo: number | null) => void;
  babList: BabInfo[];
  loadingBab: boolean;
  totalHadistCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onSearchFilterApply?: (term: string) => void;
}

export default function HadistSidebar({
  currentBook,
  selectedBab,
  onSelectBab,
  babList,
  loadingBab,
  totalHadistCount,
  isOpenMobile,
  onCloseMobile,
  onSearchFilterApply,
}: HadistSidebarProps) {
  // Accordion state: simpan buku mana yang sedang di-expand di accordion (default: buku yang sedang dibuka)
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({
    [currentBook.slug]: true,
  });

  const [filterQuery, setFilterQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const h = localStorage.getItem('makkah_search_history');
        if (h) return JSON.parse(h).slice(0, 5);
      } catch (e) {}
    }
    return ['niat', 'iman', 'shalat', 'wudhu'];
  });

  const toggleBookAccordion = (slug: string) => {
    setExpandedBooks(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }));
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('makkah_search_history');
    }
  };

  // Filter list buku & bab jika user mencari di input filter sidebar
  const filteredBabs = babList.filter(b => 
    !filterQuery || 
    b.kitabNo.toString().includes(filterQuery) || 
    b.label.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 lg:hidden transition-opacity" 
        />
      )}

      {/* SIDEBAR CLEAN DESIGN - SCROLL INDEPENDEN TANPA SHADOW */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-80 h-screen max-h-screen bg-white border-r border-slate-200/70 flex flex-col transition-transform duration-200 ease-out select-none shrink-0 overflow-hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header Logo Sidebar */}
        <div className="h-16 flex items-center px-5 border-b border-slate-100 gap-3 shrink-0 bg-white">
          <Link href="/hadist" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <BookOpen size={18} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-slate-900">Pustaka MTA</span>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">V1.0</span>
              </div>
              <span className="text-[11px] text-slate-400">Pusat Hadist & Sunnah</span>
            </div>
          </Link>

          {/* Tombol Tutup Mobile */}
          <button 
            onClick={onCloseMobile} 
            className="ml-auto text-slate-400 hover:text-slate-600 p-1.5 lg:hidden transition rounded-lg hover:bg-slate-50" 
            aria-label="Tutup Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pencarian Cepat Kitab / Bab */}
        <div className="p-3 border-b border-slate-100 shrink-0 bg-white">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter Kitab atau Bab..." 
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-slate-200 transition text-slate-700 placeholder-slate-400 font-medium"
            />
            {filterQuery && (
              <button 
                onClick={() => setFilterQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* List Kitab & Bab (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
          
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Kutubut Tis'ah (9 Kitab)
              </span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                Lengkap
              </span>
            </div>

            <nav className="space-y-1">
              {NINE_BOOKS.map((book) => {
                const isCurrentBook = book.slug === currentBook.slug;
                const isExpanded = !!expandedBooks[book.slug];

                return (
                  <div key={book.slug} className="book-group">
                    {/* Header Kitab Button */}
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/hadist/${book.slug}`}
                        onClick={() => {
                          if (!isExpanded) toggleBookAccordion(book.slug);
                        }}
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                          isCurrentBook 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-100 font-bold' 
                            : 'text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            isCurrentBook ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {book.bookNo}
                          </span>
                          <span className="truncate">{book.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-1">
                          {isCurrentBook ? `${totalHadistCount || '3.840'} H` : 'Koleksi'}
                        </span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleBookAccordion(book.slug)}
                        className={`p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition shrink-0 ${
                          isCurrentBook ? 'text-emerald-700' : ''
                        }`}
                        title="Buka/Tutup Bab"
                      >
                        <ChevronDown 
                          size={13} 
                          className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                        />
                      </button>
                    </div>

                    {/* Accordion Bab Content (Bila buku ini aktif dan di-expand) */}
                    {isExpanded && (
                      <div className="pl-3 pr-1 pt-1 pb-1 space-y-0.5 animate-in fade-in duration-150">
                        {isCurrentBook ? (
                          <>
                            {/* Tombol Semua Bab */}
                            <button 
                              onClick={() => {
                                onSelectBab(null);
                                if (window.innerWidth < 1024) onCloseMobile();
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                                selectedBab === null 
                                  ? 'font-bold text-emerald-700 bg-emerald-50/70' 
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                              }`}
                            >
                              <span className="truncate">Semua Bab {book.name}</span>
                              <span className="text-[10px] text-emerald-600/80 font-bold">Semua</span>
                            </button>

                            {/* Daftar Tiap Bab */}
                            {loadingBab ? (
                              <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                                Memuat bab...
                              </div>
                            ) : filteredBabs.length === 0 ? (
                              <div className="px-3 py-2 text-[11px] text-slate-400 italic">
                                Tidak ada bab cocok
                              </div>
                            ) : (
                              filteredBabs.map((bab) => {
                                const isSelected = selectedBab === bab.kitabNo;
                                return (
                                  <button
                                    key={bab.kitabNo}
                                    onClick={() => {
                                      onSelectBab(bab.kitabNo);
                                      if (window.innerWidth < 1024) onCloseMobile();
                                    }}
                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                                      isSelected 
                                        ? 'font-bold text-emerald-700 bg-emerald-50/70' 
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium'
                                    }`}
                                  >
                                    <span className="truncate">Bab {bab.kitabNo}</span>
                                    <span className={`text-[10px] ${isSelected ? 'text-emerald-700 font-bold' : 'text-slate-400'}`}>
                                      {bab.count} H
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </>
                        ) : (
                          <Link
                            href={`/hadist/${book.slug}`}
                            className="block px-3 py-1.5 text-xs text-slate-500 hover:text-emerald-700 hover:bg-slate-50 rounded-lg transition"
                          >
                            Buka koleksi {book.name} &rarr;
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Riwayat Terakhir Pencarian */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between px-3 mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Riwayat Terakhir
              </span>
              {searchHistory.length > 0 && (
                <button 
                  onClick={handleClearHistory} 
                  className="text-[10px] text-slate-400 hover:text-slate-600 transition"
                >
                  Hapus
                </button>
              )}
            </div>
            <ul className="space-y-0.5 text-xs">
              {searchHistory.length === 0 ? (
                <li className="text-[11px] text-slate-400 px-3 py-1 italic">Kosong</li>
              ) : (
                searchHistory.map((item, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => {
                        if (onSearchFilterApply) onSearchFilterApply(item);
                        if (window.innerWidth < 1024) onCloseMobile();
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 flex items-center gap-2 transition"
                    >
                      <Clock size={12} className="text-slate-300" />
                      <span className="truncate">{item}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>

        {/* Footer Sidebar Minimalis */}
        <div className="p-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between shrink-0 bg-white">
          <span className="font-medium text-slate-500">Majlis Tafsir Al-Qur'an</span>
          <span className="text-slate-300">&bull;</span>
          <span>MTA Surakarta</span>
        </div>
      </aside>
    </>
  );
}
