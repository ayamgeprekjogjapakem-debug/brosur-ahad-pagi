'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import Footer from '../components/Footer';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!initialQuery) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search-koleksi?q=${encodeURIComponent(initialQuery)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Failed to fetch search results', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [initialQuery]);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <Search className="text-accent" size={20} />
          Hasil Pencarian
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full">
        
        {/* Search Bar Ulang */}
        <div className="mb-12">
          <GlobalSearch />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p className="font-medium">Mencari di seluruh koleksi database...</p>
          </div>
        ) : !initialQuery ? (
          <div className="text-center py-20 text-zinc-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">Silakan masukkan kata kunci untuk mencari brosur.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="w-20 h-20 bg-black/5 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="opacity-40" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tidak Ada Hasil</h2>
            <p className="max-w-md mx-auto">
              Maaf, kami tidak dapat menemukan kalimat atau kata <strong>"{initialQuery}"</strong> di seluruh database arsip kami.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-widest border-b border-black/5 dark:border-white/5 pb-4">
              Ditemukan {results.length} brosur
            </div>
            
            {results.map((item, i) => (
              <Link 
                href={`/${item.slug}`} 
                key={i}
                className="block bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 p-6 rounded-2xl hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent/10 text-accent rounded-xl shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold mb-1 group-hover:text-accent transition-colors">
                      {item.judul}
                    </h3>
                    <div className="text-xs font-bold px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md inline-block mb-3 text-zinc-500">
                      Tahun {item.tahun}
                    </div>
                    {item.snippet && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic border-l-2 border-accent/30 pl-3">
                        "{item.snippet}"
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
