'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  FolderArchive, Search, BookOpen, ScrollText, Calendar, 
  ArrowLeft, Menu, ChevronRight, Layers, Sparkles 
} from 'lucide-react';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';

interface KoleksiDetailClientProps {
  folder: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
  };
  initialBrosurList: {
    id: string | number;
    judul: string;
    slug: string;
    tahun: number;
    created_at?: string;
  }[];
}

export default function KoleksiDetailClient({
  folder,
  initialBrosurList = []
}: KoleksiDetailClientProps) {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Hitung kategori tahun yang tersedia dalam koleksi ini beserta hitungan edisinya
  const { availableYears, yearCounts } = useMemo(() => {
    const counts: Record<number, number> = {};
    const yearsSet = new Set<number>();

    initialBrosurList.forEach((b) => {
      const y = b.tahun;
      if (y) {
        yearsSet.add(y);
        counts[y] = (counts[y] || 0) + 1;
      }
    });

    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
    return { availableYears: sortedYears, yearCounts: counts };
  }, [initialBrosurList]);

  const hasMultipleYears = availableYears.length > 1;

  // Mode tampilan: jika ada lebih dari 1 tahun, default adalah 'kategori' (muncul kategori dulu)
  const [viewMode, setViewMode] = useState<'kategori' | 'semua'>(() => {
    return hasMultipleYears ? 'kategori' : 'semua';
  });

  // Filter brosur berdasarkan pencarian dan tahun terpilih
  const filteredBrosurList = useMemo(() => {
    return initialBrosurList.filter((b) => {
      // Jika ada kata kunci pencarian, filter berdasarkan judul atau tahun
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          b.judul?.toLowerCase().includes(q) ||
          b.tahun?.toString().includes(q)
        );
      }

      // Jika sedang melihat tahun tertentu
      if (viewMode === 'kategori' && selectedYear !== null) {
        return b.tahun === selectedYear;
      }

      return true;
    });
  }, [initialBrosurList, search, viewMode, selectedYear]);

  // Filter kategori tahun berdasarkan search jika user mencari tahun di tampilan kategori
  const filteredYears = useMemo(() => {
    if (!search.trim()) return availableYears;
    return availableYears.filter((y) => y.toString().includes(search.trim()));
  }, [availableYears, search]);

  const isSearchActive = search.trim().length > 0;

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      {/* Sidebar Global */}
      <MainSidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.dispatchEvent(new Event('toggle-main-sidebar'))}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/bap" className="text-slate-400 hover:text-slate-600 transition">
                Brosur
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/koleksi" className="text-slate-400 hover:text-slate-600 transition hidden sm:inline">
                Koleksi
              </Link>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-emerald-700 font-medium truncate max-w-[160px] sm:max-w-xs">
                {folder.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserDropdown />
          </div>
        </header>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6 pb-20">

            {/* Banner Koleksi */}
            <div className="bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-100/80 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xs">
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
                    <FolderArchive className="w-6 h-6 sm:w-7 sm:h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                        Koleksi Tematik
                      </span>
                      <span className="text-[11px] font-medium text-slate-500">
                        {initialBrosurList.length} Edisi Brosur
                      </span>
                      {availableYears.length > 0 && (
                        <span className="text-[11px] font-medium text-slate-500">
                          • {availableYears.length} Kategori Tahun ({Math.min(...availableYears)}–{Math.max(...availableYears)})
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1.5">
                      {folder.name}
                    </h1>
                    {folder.description && (
                      <p className="text-slate-600 text-sm mt-1 max-w-2xl leading-relaxed">
                        {folder.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/koleksi"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-xs transition"
                  >
                    <span>Daftar Koleksi</span>
                  </Link>
                  <Link
                    href="/bap"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100/80 px-3 py-2 rounded-xl border border-emerald-200/60 shadow-xs transition"
                  >
                    <ArrowLeft size={14} />
                    <span>Semua Arsip</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Tab Switcher: Kategori Tahun vs Semua Brosur (hanya tampil jika ada kategori tahun) */}
            {hasMultipleYears && !isSearchActive && (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('kategori');
                      setSelectedYear(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      viewMode === 'kategori' && selectedYear === null
                        ? 'bg-white text-emerald-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={14} className={viewMode === 'kategori' && selectedYear === null ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Kategori Tahun ({availableYears.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('semua');
                      setSelectedYear(null);
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      viewMode === 'semua'
                        ? 'bg-white text-emerald-800 shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ScrollText size={14} className={viewMode === 'semua' ? 'text-emerald-600' : 'text-slate-400'} />
                    <span>Semua Brosur ({initialBrosurList.length})</span>
                  </button>
                </div>

                {selectedYear !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedYear(null)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Kembali ke Kategori Tahun</span>
                  </button>
                )}
              </div>
            )}

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                placeholder={`Cari judul brosur atau tahun dalam koleksi "${folder.name}"...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all shadow-xs font-normal text-slate-800 placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* ========================================================================= */}
            {/* KONDISI 1: TAMPILAN KATEGORI TAHUN DULU (DEFAULT UNTUK MULTI-TAHUN) */}
            {/* ========================================================================= */}
            {!isSearchActive && viewMode === 'kategori' && selectedYear === null && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="text-emerald-600" size={18} />
                    <span>Pilih Kategori Tahun Terbit</span>
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {filteredYears.length} Kategori Tahun
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                  {filteredYears.map((year, index) => {
                    const count = yearCounts[year] || 0;
                    return (
                      <button
                        type="button"
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className="group bg-white border border-slate-200 rounded-2xl p-4.5 hover:border-emerald-300 hover:shadow-md transition-all flex items-center justify-between text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          {/* Rhombus Box serasi dengan desain /bap */}
                          <div className="w-10 h-10 shrink-0 bg-emerald-50 group-hover:bg-emerald-100 transition-colors flex items-center justify-center transform rotate-45 rounded">
                            <span className="transform -rotate-45 font-bold text-sm text-emerald-700">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-extrabold text-[15px] text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                              Tahun {year}
                            </h3>
                            <p className="text-[11px] text-slate-500 font-semibold mt-1">
                              <span className="text-emerald-700 font-bold">
                                {count} Edisi Brosur
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-300 group-hover:text-emerald-600 transition-colors">
                          <span className="text-xs font-semibold hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                            Buka
                          </span>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* KONDISI 2: TAHUN SUDAH DIPILIH ATAU MODE SEMUA ATAU SEDANG PENCARIAN */}
            {/* ========================================================================= */}
            {(isSearchActive || viewMode === 'semua' || selectedYear !== null) && (
              <div className="space-y-4">
                {/* Header Daftar Brosur */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {selectedYear !== null && !isSearchActive && (
                      <button
                        type="button"
                        onClick={() => setSelectedYear(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
                        title="Kembali ke kategori tahun"
                      >
                        <ArrowLeft size={16} />
                      </button>
                    )}
                    <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <ScrollText className="text-emerald-600" size={18} />
                      <span>
                        {isSearchActive
                          ? `Hasil Pencarian: "${search}"`
                          : selectedYear !== null
                          ? `Brosur Edisi Tahun ${selectedYear}`
                          : 'Semua Edisi Brosur'}
                      </span>
                    </h2>
                  </div>

                  <span className="text-xs text-slate-400 font-medium">
                    {filteredBrosurList.length} Edisi Brosur
                  </span>
                </div>

                {filteredBrosurList.length === 0 ? (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <ScrollText size={24} />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      {isSearchActive ? 'Brosur Tidak Ditemukan' : 'Belum Ada Brosur'}
                    </h3>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-md mx-auto">
                      {isSearchActive
                        ? `Tidak ada brosur yang cocok dengan kata kunci "${search}".`
                        : selectedYear !== null
                        ? `Belum ada brosur pada kategori tahun ${selectedYear}.`
                        : 'Belum ada brosur yang ditautkan ke dalam koleksi ini.'}
                    </p>
                    {isSearchActive && (
                      <button
                        onClick={() => setSearch('')}
                        className="mt-4 text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        Bersihkan pencarian
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredBrosurList.map((brosur, idx) => {
                      const cleanSlug = (brosur.slug || brosur.judul)
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-+|-+$/g, '');

                      return (
                        <Link
                          key={brosur.id}
                          href={`/bap/${brosur.tahun}/${cleanSlug}`}
                          className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Calendar size={11} />
                                Tahun {brosur.tahun}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{idx + 1}
                              </span>
                            </div>
                            <h3 className="font-bold text-slate-800 text-[15px] group-hover:text-emerald-700 leading-snug line-clamp-2 transition-colors">
                              {brosur.judul}
                            </h3>
                          </div>

                          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">
                            <span className="flex items-center gap-1.5">
                              <BookOpen size={13} />
                              Baca Brosur
                            </span>
                            <span className="transform translate-x-0 group-hover:translate-x-1 transition-transform">
                              →
                            </span>
                          </div>
                        </Link>
                      );
                    })}
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
