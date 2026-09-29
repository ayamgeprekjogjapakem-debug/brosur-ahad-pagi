'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2, Book, ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function SearchHadistPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'arabic' | 'translation'>('all');
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const supabase = createClient();

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 600);
    return () => clearTimeout(timer);
  }, [query]);

  // Perform search
  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery || debouncedQuery.trim().length < 3) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      
      try {
        let dbQuery = supabase
          .from('hadist_chm')
          .select('id, judul, konten, teks_bersih, teks_arab, terjemahan, folders_hadist(name)')
          .limit(20);

        if (filterType === 'all') {
          // Because Supabase doesn't easily support OR across many text columns simply without `or()` syntax
          dbQuery = dbQuery.or(`terjemahan.ilike.%${debouncedQuery}%,teks_arab.ilike.%${debouncedQuery}%,judul.ilike.%${debouncedQuery}%`);
        } else if (filterType === 'arabic') {
          dbQuery = dbQuery.ilike('teks_arab', `%${debouncedQuery}%`);
        } else if (filterType === 'translation') {
          dbQuery = dbQuery.ilike('terjemahan', `%${debouncedQuery}%`);
        }

        const { data, error } = await dbQuery;
        
        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Gagal mencari:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery, filterType]);

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#fbfbfd] p-8 md:p-12 selection:bg-emerald-500/30">
      <div className="max-w-5xl mx-auto">
        {/* Header - Apple Style */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-4">
            Cari & Eksplorasi <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Jutaan Riwayat Hadist
            </span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Mesin pencari khusus yang dirancang untuk menemukan hadist spesifik berdasarkan teks Arab, terjemahan, atau judul secara instan.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03] mb-8 sticky top-0 z-20">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-zinc-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari lafadz arab, terjemahan, atau topik hadist..."
              className="w-full bg-zinc-50 border-0 rounded-2xl pl-16 pr-6 py-5 text-lg text-zinc-900 font-medium placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all shadow-inner"
            />
            {isLoading && (
              <div className="absolute inset-y-0 right-0 pr-6 flex items-center">
                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center gap-3 mt-4">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-500">Filter:</span>
            <div className="flex bg-zinc-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Semua Teks
              </button>
              <button
                onClick={() => setFilterType('arabic')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === 'arabic' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Khusus Arab
              </button>
              <button
                onClick={() => setFilterType('translation')}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${filterType === 'translation' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Khusus Terjemahan
              </button>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className="space-y-6">
          {!hasSearched && !isLoading && (
            <div className="text-center py-20 flex flex-col items-center">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <Search className="w-10 h-10 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Mulai Pencarian</h3>
              <p className="text-zinc-500 max-w-sm">Ketikkan minimal 3 karakter (huruf arab atau latin) untuk mulai mencari hadist dari database.</p>
            </div>
          )}

          {hasSearched && !isLoading && results.length === 0 && (
            <div className="text-center py-20 flex flex-col items-center bg-white rounded-[2rem] border border-black/[0.03]">
              <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mb-6">
                <Book className="w-8 h-8 text-zinc-400" />
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">Hadist Tidak Ditemukan</h3>
              <p className="text-zinc-500">Tidak ada hadist yang cocok dengan kata kunci "{debouncedQuery}". Coba gunakan kata kunci atau filter lain.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-500 tracking-wide uppercase">
                Ditemukan {results.length} Hasil Teratas
              </span>
            </div>
          )}

          {results.map((item, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-zinc-100 hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-2">
                    <Book className="w-3 h-3" />
                    {item.folders_hadist?.name || 'Koleksi Umum'}
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-400 bg-zinc-50 px-2 py-1 rounded-md">{item.id}</span>
              </div>
              
              <h3 className="text-xl font-semibold text-zinc-900 mb-4 group-hover:text-emerald-600 transition-colors">
                {item.judul || 'Tanpa Judul'}
              </h3>
              
              {item.teks_arab && (
                <div className="mb-6 p-5 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="font-arabic text-2xl leading-[2.5] text-right text-zinc-800" dir="rtl">
                    {item.teks_arab.substring(0, 500)}...
                  </p>
                </div>
              )}
              
              <div 
                className="text-zinc-600 leading-relaxed text-sm md:text-base max-w-none line-clamp-4"
              >
                {item.terjemahan ? item.terjemahan.substring(0, 600) + '...' : ''}
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-100 flex justify-end">
                <button className="flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl transition-colors">
                  Baca Selengkapnya
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
