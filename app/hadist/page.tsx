'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Search, ArrowLeft, Filter, BookMarked, 
  ChevronDown, ExternalLink, Quote, Loader2, Sparkles 
} from 'lucide-react';
import Footer from '../components/Footer';

// Define styles for badge colors
const badgeStyles: Record<string, string> = {
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export default function PublicHadistPage() {
  const [items, setItems] = useState<any[]>([]);
  const [kelompokList, setKelompokList] = useState<any[]>([]);
  const [rawiList, setRawiList] = useState<any[]>([]);
  
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
          fetch('/api/hadist/rawi')
        ]);
        
        if (resKelompok.ok) {
          const dataKel = await resKelompok.json();
          setKelompokList(dataKel.kelompok || []);
        }
        
        if (resRawi.ok) {
          const dataRawi = await resRawi.json();
          setRawiList(dataRawi.rawi || []);
        }
      } catch (e) {
        console.error('Failed to load filters', e);
      }
    };
    fetchFilters();
  }, []);

  // Load Hadist Data
  useEffect(() => {
    const fetchHadist = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('status_hadist', 'terverifikasi');
        if (searchQuery) params.set('search', searchQuery);
        if (selectedKelompok !== 'all') params.set('kelompok_id', selectedKelompok);
        if (selectedRawi !== 'all') params.set('rawi_kitab', selectedRawi);

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
  }, [searchQuery, selectedKelompok, selectedRawi]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-30 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <BookOpen className="text-accent" size={20} />
          Koleksi Hadist & Dalil
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:px-8 md:py-12">
        
        {/* BANNER */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent/15 via-white dark:via-zinc-900 to-accent/5 p-8 md:p-12 border border-black/5 dark:border-white/5 shadow-sm mb-12">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent font-extrabold text-xs uppercase tracking-widest">
              <Sparkles size={14} />
              <span>Pustaka Rujukan</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              Kumpulan Hadist & Dalil Pilihan
            </h1>
            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 font-medium leading-relaxed">
              Jelajahi dan temukan kumpulan dalil, ayat Al-Qur'an, serta Hadist Nabi Muhammad ﷺ yang disarikan dari seluruh arsip brosur Ahad Pagi.
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

                    {/* Content Card */}
                    <div className="p-6 md:p-8">
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

                    {/* Footer Card: Link to Brosur */}
                    {item.brosur && (
                      <div className="px-6 py-4 border-t border-black/5 dark:border-white/5 bg-zinc-50/50 dark:bg-black/20 flex items-center justify-between gap-4">
                        <div className="text-xs text-zinc-500 font-medium">
                          Disarikan dari arsip kajian Ahad Pagi.
                        </div>
                        <Link 
                          href={`/${item.brosur.slug}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:text-accent transition-colors shadow-sm group"
                        >
                          Baca Brosur Asli
                          <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </Link>
                      </div>
                    )}
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
