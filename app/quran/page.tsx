'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { createSlug } from './utils';
import { Book, ChevronLeft, Search, Loader2, Library } from 'lucide-react';

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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      {/* HEADER */}
      <header className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between border-b border-zinc-200/80 bg-white/80 backdrop-blur-2xl sticky top-0 z-50 transition-all">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 relative flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Image 
              src="/logo.png" 
              alt="Logo Ulil Albab" 
              fill
              className="object-contain"
            />
          </div>
          <span className="font-bold text-[17px] tracking-tight text-zinc-900 hidden sm:block">Ulil Albab</span>
        </Link>
        
        {/* MENU */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/quran" className="flex items-center gap-2 text-[13px] font-bold text-teal-600 bg-teal-50 px-3.5 py-1.5 rounded-full transition-all">
            <Book size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Quran</span>
          </Link>
          <Link href="/hadist" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-3.5 py-1.5 rounded-full transition-all">
            <Book size={15} strokeWidth={2} />
            <span className="hidden sm:inline">Hadist</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-3.5 py-1.5 rounded-full transition-all">
            <Library size={15} strokeWidth={2} />
            <span className="hidden md:inline">Brosur</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col items-center">
        {/* Tabs and Sort */}
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between border-b border-black/10 dark:border-white/10 mb-6 pb-2">
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="/quran" className="border-b-2 border-black dark:border-white pb-2 text-black dark:text-white">Surah</Link>
            <Link href="/quran/juz" className="pb-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">Juz</Link>
            <Link href="/quran/urutan-wahyu" className="pb-2 text-zinc-500 hover:text-black dark:hover:text-white transition-colors">Urutan Wahyu</Link>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-2 text-xs font-bold text-zinc-500 tracking-wider">
            <span>SORTIR DENGAN:</span>
            <button className="text-black dark:text-white flex items-center gap-1">
              MENAIK <span className="text-lg leading-none">▾</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="w-full mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari surah..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 focus:border-black dark:focus:border-white rounded-full pl-12 pr-4 py-2.5 text-sm outline-none transition-all shadow-sm font-medium"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Loader2 className="animate-spin mb-4 text-zinc-400" size={32} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-500">
            <p className="font-bold mb-2">Gagal memuat data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {filteredSurahs.map((surah) => (
              <Link 
                href={`/quran/${createSlug(surah.namaLatin)}`} 
                key={surah.nomor}
                className="group bg-white dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-xl p-4 hover:border-black/20 dark:hover:border-white/20 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  {/* Rhombus container */}
                  <div className="w-10 h-10 shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center transform rotate-45 rounded-sm relative">
                    <span className="transform -rotate-45 font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                      {surah.nomor}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-[15px] text-zinc-900 dark:text-zinc-100 leading-tight group-hover:text-accent transition-colors">
                      {surah.namaLatin}
                    </h3>
                    <p className="text-[12px] text-zinc-500 uppercase tracking-wide mt-1">
                      {surah.arti}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-1 leading-tight" style={{ fontFamily: "var(--font-amiri), serif" }}>
                    {surah.nama}
                  </h3>
                  <p className="text-[12px] text-zinc-500">
                    {surah.jumlahAyat} Ayat
                  </p>
                </div>
              </Link>
            ))}
            
            {filteredSurahs.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 font-medium">
                Pencarian "{search}" tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
