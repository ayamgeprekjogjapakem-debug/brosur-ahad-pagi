'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createSlug } from './utils';
import { Book, Search, Loader2, Library, BookOpen, Bookmark, Menu, X, ScrollText, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';

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
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const pathname = usePathname();
  const router = useRouter();

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
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Al-Qur'an</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserDropdown />
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
