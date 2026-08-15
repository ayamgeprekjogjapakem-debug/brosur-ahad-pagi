'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, ArrowLeft, BookOpen, Sparkles } from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import Footer from '../components/Footer';

function HighlightedText({ text, highlight, highlightTerms }: { text: string; highlight?: string; highlightTerms?: string[] }) {
  const words = (highlightTerms && highlightTerms.length > 0)
    ? highlightTerms.filter(w => w && w.trim().length > 0)
    : (highlight || '').split(/\s+/).filter(w => w.trim().length > 0);
  
  if (words.length === 0) return <>{text}</>;
  
  // Escape regex characters
  const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) => {
        if (words.some(w => w.toLowerCase() === part.toLowerCase())) {
          return <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/60 text-black dark:text-yellow-100 px-1 rounded-sm font-semibold">{part}</mark>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const exactParam = searchParams.get('exact') === 'true';
  
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<{
    originalQuery: string;
    correctedQuery: string;
    isCorrected: boolean;
    highlightTerms: string[];
  } | null>(null);

  useEffect(() => {
    if (!initialQuery) {
      setResults([]);
      setMeta(null);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      setIsLoading(true);
      try {
        const url = `/api/search-koleksi?q=${encodeURIComponent(initialQuery)}${exactParam ? '&exact=true' : ''}`;
        const res = await fetch(url);
        const data = await res.json();
        setResults(data.results || []);
        setMeta(data.meta || null);
      } catch (err) {
        console.error('Failed to fetch search results', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [initialQuery, exactParam]);

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

        {/* Google-like Correction Banner ("Mungkin maksud Anda / Menampilkan hasil untuk") */}
        {meta && meta.isCorrected && !exactParam && (
          <div className="mb-8 p-5 bg-teal-500/10 dark:bg-teal-500/5 border border-teal-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Menampilkan hasil untuk: <span className="font-extrabold text-teal-700 dark:text-teal-300 text-base">{meta.correctedQuery}</span>
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
                  Pencarian dikoreksi secara otomatis (ejaan & sinonim Islami).
                </div>
              </div>
            </div>
            <Link
              href={`/search?q=${encodeURIComponent(meta.originalQuery)}&exact=true`}
              className="text-xs font-bold px-4 py-2.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-zinc-700 dark:text-zinc-300 whitespace-nowrap text-center shadow-sm"
            >
              Cari sebaliknya untuk: <span className="underline decoration-dotted font-extrabold">{meta.originalQuery}</span>
            </Link>
          </div>
        )}

        {/* Mode Exact Banner */}
        {exactParam && meta && meta.originalQuery !== meta.correctedQuery && (
          <div className="mb-8 p-4 bg-zinc-100 dark:bg-zinc-900/50 border border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4 text-xs text-zinc-500">
            <span>Menampilkan hasil pencarian spesifik untuk: <strong className="text-zinc-700 dark:text-zinc-300">"{meta.originalQuery}"</strong></span>
            <Link
              href={`/search?q=${encodeURIComponent(meta.originalQuery)}`}
              className="font-bold text-accent hover:underline whitespace-nowrap"
            >
              Gunakan koreksi otomatis ({meta.correctedQuery})
            </Link>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="relative flex items-center justify-center w-14 h-14 mb-6">
              <div className="absolute w-full h-full border-[1.5px] border-teal-500/10 rounded-full"></div>
              <div className="absolute w-full h-full border-[1.5px] border-transparent border-t-teal-500 rounded-full animate-spin" style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
            </div>
            <p className="text-sm font-medium text-teal-600/70 tracking-widest uppercase animate-pulse">Mencari Data...</p>
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
                href={`/${item.slug}?q=${encodeURIComponent(initialQuery)}`} 
                key={i}
                className="block bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 p-6 rounded-2xl hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-accent/10 text-accent rounded-xl shrink-0 group-hover:bg-accent group-hover:text-white transition-colors">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold mb-1 group-hover:text-accent transition-colors">
                      <HighlightedText text={item.judul} highlightTerms={meta?.highlightTerms} highlight={initialQuery} />
                    </h3>
                    <div className="text-xs font-bold px-2 py-1 bg-black/5 dark:bg-white/5 rounded-md inline-block mb-3 text-zinc-500">
                      Tahun {item.tahun}
                    </div>
                    {item.snippet && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic border-l-2 border-accent/30 pl-3">
                        "<HighlightedText text={item.snippet} highlightTerms={meta?.highlightTerms} highlight={initialQuery} />"
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

