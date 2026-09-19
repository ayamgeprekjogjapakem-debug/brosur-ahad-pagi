'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Search, ArrowLeft, Filter, BookMarked, 
  ChevronDown, ExternalLink, Quote, Loader2, Sparkles,
  Book, Library, ChevronRight 
} from 'lucide-react';
import Image from 'next/image';
import Footer from '../components/Footer';
import { createSlug } from '../quran/utils';

export default function PublicHadistPage() {
  const [kitabList, setKitabList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load Kitab Data
  useEffect(() => {
    const fetchKitab = async () => {
      try {
        const res = await fetch('/api/hadist/rawi');
        if (res.ok) {
          const data = await res.json();
          // Filter out Kitab that have 0 hadiths
          const filtered = (data.rawi || []).filter((r: any) => r.total_hadist > 0);
          setKitabList(filtered);
        }
      } catch (e) {
        console.error('Failed to load kitab', e);
      } finally {
        setLoading(false);
      }
    };
    fetchKitab();
  }, []);

  const filteredKitab = kitabList.filter(k => 
    k.nama_rawi.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (k.nama_arab && k.nama_arab.includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      
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
          <Link href="/quran" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-3.5 py-1.5 rounded-full transition-all">
            <Book size={15} strokeWidth={2} />
            <span className="hidden sm:inline">Quran</span>
          </Link>
          <Link href="/hadist" className="flex items-center gap-2 text-[13px] font-bold text-teal-600 bg-teal-50 px-3.5 py-1.5 rounded-full transition-all">
            <Book size={15} strokeWidth={2.5} />
            <span className="hidden sm:inline">Hadist</span>
          </Link>
          <Link href="/" className="flex items-center gap-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 px-3.5 py-1.5 rounded-full transition-all">
            <Library size={15} strokeWidth={2} />
            <span className="hidden md:inline">Brosur</span>
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 flex flex-col items-center">
        {/* Search */}
        <div className="w-full mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari Kitab (Bukhari, Muslim...)" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full pl-11 pr-4 py-3 text-[14px] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-teal-600" size={32} />
          </div>
        ) : (
          <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredKitab.map((kitab, i) => (
              <Link 
                key={kitab.id} 
                href={`/hadist/${createSlug(kitab.nama_rawi)}`}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 md:p-6 hover:shadow-lg hover:border-teal-500/30 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-xl flex items-center justify-center font-bold text-zinc-500 group-hover:text-teal-600 group-hover:bg-teal-50 transition-colors">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-white group-hover:text-teal-600 transition-colors">{kitab.nama_rawi}</h3>
                    {kitab.nama_arab && (
                      <p className="font-arabic text-xl text-zinc-500 text-right mt-1" dir="rtl">{kitab.nama_arab}</p>
                    )}
                    <p className="text-xs font-semibold text-zinc-500 mt-1 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 w-fit px-2 py-0.5 rounded-full">
                      {kitab.total_hadist} Hadist
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-zinc-300 group-hover:text-teal-500 transition-colors" />
              </Link>
            ))}
            
            {filteredKitab.length === 0 && (
              <div className="col-span-full py-20 text-center text-zinc-500 font-medium">
                Kitab tidak ditemukan.
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
