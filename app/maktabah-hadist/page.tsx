'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import Footer from '../components/Footer';

// Komponen penyorot teks agar kata kunci stabil di-*highlight*
function HighlightedText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>;
  
  const words = highlight.split(/\s+/).filter(w => w.trim().length > 0);
  if (words.length === 0) return <>{text}</>;
  
  const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (words.some(w => w.toLowerCase() === part.toLowerCase())) {
          return <mark key={i} className="bg-emerald-200  text-black  px-1 rounded-sm font-semibold">{part}</mark>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function HadistSearchPage() {
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
        const url = `/api/hadist-search?q=${encodeURIComponent(initialQuery)}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        console.error('Failed to fetch hadist results', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [initialQuery]);

  return (
    <div className="min-h-screen bg-[#fafafa] [#0a0a0a] text-zinc-900  flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="px-6 py-4 border-b border-black/5  bg-white/80  backdrop-blur-xl sticky top-0 z-20 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-black/5  rounded-xl transition-colors">
          <ArrowLeft size={24} />
        </Link>
        <div className="font-extrabold text-xl tracking-tight flex items-center gap-2">
          <Search className="text-emerald-600" size={20} />
          Pencarian Hadist Shahih
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-4xl mx-auto w-full">
        
        {/* Search Bar Ulang */}
        <div className="mb-12">
          <GlobalSearch />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative flex items-center justify-center w-14 h-14 mb-6">
              <div className="absolute w-full h-full border-[1.5px] border-emerald-500/10 rounded-full"></div>
              <div className="absolute w-full h-full border-[1.5px] border-transparent border-t-emerald-500 rounded-full animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>
            <p className="text-sm font-medium text-emerald-600/70 tracking-widest uppercase animate-pulse">Mencari Hadist...</p>
          </div>
        ) : !initialQuery ? (
          <div className="text-center py-20 text-zinc-500">
            <Search size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">Silakan masukkan kata kunci untuk mencari hadist.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <div className="w-20 h-20 bg-black/5  rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="opacity-40" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Tidak Ada Hasil</h2>
            <p className="max-w-md mx-auto">
              Maaf, kami tidak dapat menemukan hadist dengan kata kunci <strong>"{initialQuery}"</strong>.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm font-bold text-zinc-500 mb-6 uppercase tracking-widest border-b border-black/5  pb-4">
              Ditemukan {results.length} hadist
            </div>
            
            {results.map((item, i) => (
              <div 
                key={i}
                className="block bg-white  border border-black/5  p-6 rounded-2xl hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start mb-2 border-b border-black/5 pb-3">
                    <span className="inline-flex px-3 py-1 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 uppercase tracking-widest">
                      {item.kitab} - No. {item.nomor}
                    </span>
                    {item.judul_bab_terjemahan && (
                      <span className="text-xs font-semibold text-zinc-500 max-w-[200px] truncate text-right">
                        Bab: {item.judul_bab_terjemahan}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <p className="text-2xl text-slate-800 font-semibold leading-loose arabic-text" dir="rtl" style={{ fontFamily: "'Amiri', serif" }}>
                      <HighlightedText text={item.teks_arab || ''} highlight={initialQuery} />
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-black/5 ">
                    <p className="text-[15px] text-zinc-700  leading-relaxed">
                      <HighlightedText text={item.terjemahan || ''} highlight={initialQuery} />
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
