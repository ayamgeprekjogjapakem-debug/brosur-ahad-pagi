'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Search, ArrowLeft, Filter, BookMarked, 
  ChevronDown, ExternalLink, Quote, Loader2, Sparkles,
  Book, Library 
} from 'lucide-react';
import Image from 'next/image';
import Footer from '../../components/Footer';
import { createSlug } from '../../quran/utils';
import { use } from 'react';

// Define styles for badge colors
const badgeStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export default function HadistRawiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [items, setItems] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [rawiList, setRawiList] = useState<any[]>([]);
  const [currentRawi, setCurrentRawi] = useState<any>(null);
  
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState('all');
  const [selectedRawi, setSelectedRawi] = useState('all');

  // Load Filter Data
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [resKelompok, resRawi] = await Promise.all([
          fetch('/api/hadist/kelompok'),
          fetch('/api/hadist-api/kitab')
        ]);
        
        if (resKelompok.ok) {
          const dataKel = await resKelompok.json();
          setKelompokList(dataKel.kelompok || []);
        }
        
        if (resRawi.ok) {
          const dataRawi = await resRawi.json();
          const rawis = dataRawi.rawi || [];
          setRawiList(rawis);

          // Temukan rawi yang cocok dengan slug
          const matchedRawi = rawis.find((r: any) => createSlug(r.nama_rawi) === slug || r.id === slug);
          if (matchedRawi) {
            setCurrentRawi(matchedRawi);
            setSelectedRawi(matchedRawi.nama_rawi);
          }
        }
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    };
    fetchFilters();
  }, [slug]);

  // Load Hadist Data
  useEffect(() => {
    const fetchHadist = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (currentRawi) params.set('kitab', currentRawi.id);
        if (searchQuery) params.set('search', searchQuery);
        
        // Kelompok and Rawi filters might not be perfectly mapped yet for the new API, 
        // but we send the kitab.
        // Revert to using hadist_brosur to get the brosur relation
        const res = await fetch(`/api/hadist/items?${params.toString()}`);
        const data = await res.json();
        
        if (res.ok) {
          setItems(data.items || []);
        }
      } catch (e) {
        console.error('Failed to load hadist', e);
      } finally {
        setLoading(false);
      }
    };
    
    // Add a slight debounce for search
    const timer = setTimeout(() => {
      fetchHadist();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedKelompok, selectedRawi, currentRawi]);

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

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:px-8 md:py-12">
        
        {/* BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/15 via-white dark:via-zinc-900 to-accent/5 p-8 md:p-12 border border-black/5 dark:border-white/5 shadow-sm mb-12">
          <Link href="/hadist" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold text-xs hover:text-accent hover:bg-accent/10 transition-colors shadow-sm mb-6 border border-zinc-200 dark:border-zinc-700">
            <ArrowLeft size={14} />
            <span>Kembali ke Daftar Kitab</span>
          </Link>
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-extrabold text-xs uppercase tracking-widest">
              <Sparkles size={14} />
              <span>Kitab Rujukan</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Hadist Riwayat {currentRawi ? currentRawi.nama_rawi : 'Memuat...'}
            </h1>
            {currentRawi?.nama_arab && (
              <p className="text-3xl font-arabic text-zinc-500" dir="rtl">{currentRawi.nama_arab}</p>
            )}
            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              Kumpulan hadist dan dalil yang disarikan dari brosur Ahad Pagi MTA yang bersumber dari riwayat {currentRawi ? currentRawi.nama_rawi : ''}.
            </p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-4 mb-8 shadow-sm sticky top-20 z-20">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search size={18} className="text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Cari teks hadist, terjemahan, atau perawi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>

            {/* Kelompok Filter */}
            <div className="relative md:w-64">
              <select
                value={selectedKelompok}
                onChange={(e) => setSelectedKelompok(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all cursor-pointer"
              >
                <option value="all">Semua Tema / Bab</option>
                {kelompokList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama_kelompok}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <ChevronDown size={16} className="text-zinc-400" />
              </div>
            </div>

            {/* Rawi Filter */}
            <div className="relative md:w-56">
              <select
                value={selectedRawi}
                onChange={(e) => setSelectedRawi(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-3 bg-zinc-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all cursor-pointer"
              >
                <option value="all">Semua Sumber</option>
                {rawiList.map((r) => (
                  <option key={r.id} value={r.nama_rawi}>{r.nama_rawi}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <ChevronDown size={16} className="text-zinc-400" />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 size={40} className="text-accent animate-spin mb-4" />
            <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Memuat Hadist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-32 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl shadow-sm">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-black/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-zinc-400" />
            </div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">Tidak Ada Hadist Ditemukan</h2>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Coba ubah kata kunci pencarian atau sesuaikan filter Anda.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm font-bold text-zinc-500 mb-2 uppercase tracking-widest">
              Menampilkan {items.length} Kutipan
            </div>
            
            <div className="grid gap-6">
              {items.map((item) => {
                const kelompok = item.kelompok_hadist;
                const badgeStyle = kelompok?.warna_badge ? badgeStyles[kelompok.warna_badge] : badgeStyles.blue;
                
                return (
                  <div key={item.id} className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Header Card: Badges & Source */}
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        {kelompok && (
                          <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${badgeStyle} flex items-center gap-1.5`}>
                            <BookMarked size={14} />
                            {kelompok.nama_kelompok}
                          </div>
                        )}
                        {item.rawi_kitab && (
                          <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-200/50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 flex items-center gap-1.5">
                            <Quote size={14} />
                            {item.rawi_kitab}
                          </div>
                        )}
                      </div>
                      
                      {item.perawi_sumber && (
                        <div className="text-sm font-bold text-zinc-600 dark:text-zinc-400">
                          {item.perawi_sumber}
                        </div>
                      )}
                    </div>

                    {/* Main Content Area: Flex layout for text and sidebar */}
                    <div className="flex flex-col lg:flex-row border-t border-black/5 dark:border-white/5">
                      {/* Left Side: Hadith Text (Takes up most space) */}
                      <div className="p-6 md:p-8 flex-1">
                        {/* Arabic Text */}
                        <div 
                          className="text-right text-3xl md:text-4xl leading-loose md:leading-[1.8] font-arabic text-zinc-900 dark:text-zinc-100 mb-8"
                          dir="rtl"
                        >
                          {item.kutipan_arab}
                        </div>

                        {/* Translation */}
                        {item.terjemahan && (
                          <div className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
                            <span className="text-accent font-bold mr-2">Artinya:</span>
                            "{item.terjemahan}"
                          </div>
                        )}

                        {/* Catatan / Keterangan Tambahan */}
                        {item.catatan && (
                          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-800 dark:text-amber-200">
                            <strong>Catatan Tambahan:</strong> {item.catatan}
                          </div>
                        )}
                      </div>

                      {/* Right Side: Sidebar Informasi Brosur */}
                      {item.brosur && (
                        <div className="lg:w-72 bg-zinc-50/50 dark:bg-black/20 border-t lg:border-t-0 lg:border-l border-black/5 dark:border-white/5 p-6 flex flex-col">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Library size={14} /> Sumber Brosur
                          </h4>
                          
                          <div className="flex-1 space-y-4">
                            <div>
                              <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase">Judul Brosur</div>
                              <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200 leading-snug">
                                {item.brosur.judul}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase">Tahun</div>
                                <div className="text-sm font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded inline-block">
                                  {item.brosur.tahun || '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase">Hal / Juz</div>
                                <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                  {item.halaman || '-'} / {item.juz || '-'}
                                </div>
                              </div>
                            </div>
                            
                            {item.brosur.folders?.name && (
                              <div>
                                <div className="text-[10px] text-zinc-500 font-bold mb-1 uppercase">Koleksi</div>
                                <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                  {item.brosur.folders.name}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <Link 
                            href={`/${item.brosur.slug}`}
                            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-accent hover:text-white hover:border-accent transition-all shadow-sm group"
                          >
                            Baca Brosur Asli
                            <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
