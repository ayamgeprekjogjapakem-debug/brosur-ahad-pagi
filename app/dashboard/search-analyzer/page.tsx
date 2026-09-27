'use client';

import React, { useState } from 'react';
import { Search, Loader2, X, ChevronRight, Copy, Share2, Bookmark, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

const HighlightText = ({ text, highlight }: { text: string; highlight: string | string[] }) => {
  if (!text) return <>{text}</>;
  
  const highlights = Array.isArray(highlight) ? highlight : [highlight];
  const validHighlights = highlights
    .map(h => h?.trim())
    .filter(h => h && h.length > 2)
    .sort((a, b) => b.length - a.length); // Sort longest first so long phrases match before single words

  if (validHighlights.length === 0) return <>{text}</>;

  // Escape special regex characters
  const escapedTerms = validHighlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  // Custom logic: treat wudu, wudhu, wudlu as identical matches
  const pattern = escapedTerms.join('|').replace(/wudu|wudhu|wudlu/gi, '(?:wudu|wudhu|wudlu)');

  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = text.split(regex);
  
  return (
    <>
      {parts.map((part, i) =>
        i % 2 !== 0 ? (
          <span key={i} className="bg-emerald-200/60 text-emerald-900 rounded-[2px] font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

export default function SearchAnalyzerPage() {
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [results, setResults] = useState<any[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [meta, setMeta] = useState<any>(null);
  const [searchTime, setSearchTime] = useState<number>(0);

  const executeSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setQuery(searchQuery);
    setIsSearching(true);
    try {
      const startTime = performance.now();
      const url = `/api/hadist/items?search=${encodeURIComponent(searchQuery.trim())}`;
      const res = await fetch(url);
      const data = await res.json();
      const endTime = performance.now();

      setSearchTime(Math.round(endTime - startTime));
      setResults(data.items || []);
      setVisibleCount(5); // Reset ke 5 saat mencari baru
      setMeta({
         originalQuery: searchQuery.trim(),
         suggestions: data.suggestions || [],
         ai_analysis: data.ai_data || null,
         ai_status: data.ai_status || 'inactive',
         search_terms_used: data.search_terms_used || []
      });
    } catch (err) {
      console.error('Analysis failed', err);
      alert('Gagal mengambil data pencarian');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fafafa] w-full font-sans selection:bg-emerald-200">
      <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
        
        {/* HEADER & SEARCH BAR */}
        <div className="flex flex-col items-center mb-10">
          <form 
            onSubmit={(e) => { e.preventDefault(); executeSearch(query); }} 
            className="w-full max-w-2xl bg-white border border-emerald-500 rounded-full px-2 py-1.5 flex items-center shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all"
          >
            <div className="pl-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari dalil, hadist, atau topik..."
              className="flex-1 bg-transparent border-none text-slate-800 placeholder:text-slate-400 focus:outline-none px-3 py-2 text-[15px]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="p-1.5 text-slate-400 hover:text-slate-600 mr-1">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2 rounded-full transition-colors disabled:opacity-70 flex items-center justify-center min-w-[80px]"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari'}
            </button>
          </form>

          {meta && (
            <div className="mt-8 text-center flex flex-col items-center">
              <h2 className="text-xl font-bold text-slate-800 mb-1">
                Hasil untuk "{meta.ai_analysis?.query_koreksi || meta.originalQuery}"
              </h2>
              <p className="text-slate-500 text-sm">
                Ditemukan {results.length} dalil yang relevan <span className="text-slate-300 mx-1">•</span> {searchTime}ms
              </p>
            </div>
          )}
        </div>

        {meta && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* KIRI: PANEL ANALISIS & DEBUG */}
            <div className="lg:col-span-1 flex flex-col gap-6 sticky top-6">
              
              {/* AI META ANALYSIS (Minimalist Style) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm text-sm">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-700">Analisis Pencarian AI</span>
                </div>
                
                {meta.ai_status === 'inactive' || meta.ai_status === 'error' ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6 text-rose-400" />
                    </div>
                    <h3 className="font-bold text-slate-700">Analisis AI Tidak Aktif</h3>
                    <p className="text-slate-500 text-sm mt-1 max-w-sm">
                      {meta.ai_status === 'error' 
                        ? 'Terjadi kesalahan saat menghubungi layanan AI. Pencarian tetap berjalan normal.' 
                        : 'Layanan AI belum dikonfigurasi. Silakan tambahkan API Key di menu Pengaturan.'}
                    </p>
                  </div>
                ) : meta.ai_analysis ? (
                  <div className="flex flex-col gap-3">
                    {meta.ai_analysis.query_koreksi && meta.ai_analysis.query_koreksi.toLowerCase() !== meta.originalQuery.toLowerCase() ? (
                      <div className="flex items-center gap-2 text-slate-600">
                        <span>Apakah yang Anda maksud:</span>
                        <button 
                          onClick={() => executeSearch(meta.ai_analysis.query_koreksi)}
                          className="font-bold text-emerald-600 hover:underline"
                        >
                          "{meta.ai_analysis.query_koreksi}"
                        </button>
                        <span>?</span>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">Tidak terdeteksi adanya typo pada kata kunci.</div>
                    )}

                    {meta.ai_analysis.kata_kunci_konteks && (
                      <div className="text-slate-600">
                        <span className="font-medium mr-2">Kata Kunci Tambahan:</span>
                        <span className="italic">{meta.ai_analysis.kata_kunci_konteks}</span>
                      </div>
                    )}

                    {meta.suggestions && meta.suggestions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-1 pt-3 border-t border-slate-100">
                        <span className="text-slate-500 font-medium mr-1">Topik Terkait (Kutipan):</span>
                        {meta.suggestions.map((term: string, i: number) => (
                          <button 
                            key={i} 
                            onClick={() => executeSearch(term)}
                            className="px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 rounded-full text-xs font-medium transition-colors text-left"
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 italic">Proses AI tidak memicu hasil untuk query ini.</div>
                )}
              </div>

              {/* LOGIKA EKSEKUSI (DEBUG TRACE) */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-sm text-sm text-slate-300 font-mono">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-700 pb-2">
                  <span className="font-bold text-white tracking-wider">LOGIKA EKSEKUSI</span>
                </div>
                <ul className="flex flex-col gap-3 text-xs leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-emerald-400">1.</span>
                    <span>Menangkap input: <strong className="text-emerald-300">"{meta.originalQuery}"</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400">2.</span>
                    <span>Status AI: 
                      {meta.ai_status === 'cached' ? ' ⚡ Diambil instan dari cache.' : 
                       meta.ai_status === 'success' ? ' 🤖 Dikerjakan AI.' : 
                       meta.ai_status === 'error' ? ' ❌ Gagal.' : ' ⚠️ Tidak aktif.'}
                    </span>
                  </li>
                  {meta.ai_analysis?.query_koreksi && meta.ai_analysis.query_koreksi.toLowerCase() !== meta.originalQuery.toLowerCase() && (
                    <li className="flex gap-2">
                      <span className="text-amber-400">3.</span>
                      <span>Kueri dikoreksi AI menjadi: <strong className="text-amber-300">"{meta.ai_analysis.query_koreksi}"</strong></span>
                    </li>
                  )}
                  <li className="flex gap-2">
                    <span className="text-purple-400">{meta.ai_analysis?.query_koreksi && meta.ai_analysis.query_koreksi.toLowerCase() !== meta.originalQuery.toLowerCase() ? '4.' : '3.'}</span>
                    <div className="flex flex-col">
                      <span>Database (FTS) dipanggil dengan <strong className="text-purple-300">{meta.search_terms_used?.length || 0} argumen pencarian (OR)</strong>:</span>
                      {meta.search_terms_used && meta.search_terms_used.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {meta.search_terms_used.map((term: string, idx: number) => (
                            <span key={idx} className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] border border-slate-600 font-mono">
                              "{term}"
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="mt-1.5">Ditemukan <strong className="text-purple-300">{results.length} hasil</strong>.</span>
                    </div>
                  </li>
                  <li className="flex gap-2 text-slate-500 mt-2 border-t border-slate-700 pt-2">
                    &gt; Proses selesai dalam {searchTime}ms.
                  </li>
                </ul>
              </div>

            </div>

            {/* KANAN: HASIL PENCARIAN DATABASE (Library / Pustaka Style) */}
            <div className="lg:col-span-2 space-y-6">
              {results.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-500 font-medium">Tidak ada dalil yang cocok dengan pencarian ini.</p>
                </div>
              ) : (
                <>
                  {results.slice(0, visibleCount).map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-emerald-300 shadow-sm overflow-hidden p-6 md:p-8 flex flex-col gap-6">
                      
                      {/* Header Card */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider">
                            {item.sumber_jenis === 'quran' ? 'AL-QURAN' : 'HADIST'}
                          </span>
                          <span className="text-sm font-semibold text-slate-500">
                            {item.rawi_kitab || 'Referensi'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-300">
                          <button className="hover:text-emerald-600 transition-colors" title="Salin"><Copy className="w-4 h-4" /></button>
                          <button className="hover:text-emerald-600 transition-colors" title="Bagikan"><Share2 className="w-4 h-4" /></button>
                          <button className="hover:text-emerald-600 transition-colors" title="Simpan"><Bookmark className="w-4 h-4" /></button>
                        </div>
                      </div>

                      {/* Main Content (Arabic + Translation) */}
                      <div className="flex flex-col gap-6">
                        {/* Arabic Text */}
                        {item.kutipan_arab && (
                          <div className="w-full text-right" dir="rtl">
                             <p className="font-amiri text-[28px] md:text-[34px] leading-[2.2] md:leading-[2.2] text-slate-800" style={{ fontFamily: "'Amiri', serif" }}>
                               <HighlightText 
                                 text={item.kutipan_arab} 
                                 highlight={[meta?.ai_analysis?.query_koreksi, meta?.originalQuery, query, ...(meta?.ai_analysis?.kata_kunci_konteks ? meta.ai_analysis.kata_kunci_konteks.split(' ') : [])]} 
                               />
                             </p>
                          </div>
                        )}

                        {/* Indonesian Translation */}
                        {item.terjemahan && (
                          <div className="w-full">
                             <p className="text-slate-600 text-[15px] md:text-base leading-relaxed">
                               "<HighlightText 
                                 text={item.terjemahan} 
                                 highlight={[meta?.ai_analysis?.query_koreksi, meta?.originalQuery, query, ...(meta?.ai_analysis?.kata_kunci_konteks ? meta.ai_analysis.kata_kunci_konteks.split(' ') : [])]} 
                               />"
                             </p>
                          </div>
                        )}
                      </div>

                      {/* Footer / Meta Data */}
                      <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium uppercase tracking-wide">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Dari: {item.brosur?.tahun} {item.brosur?.judul}</span>
                        </div>

                        <Link href={`/${item.brosur?.slug || '#'}`} target="_blank" className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 group">
                          Lihat Detail <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>

                    </div>
                  ))}
                  
                  {visibleCount < results.length && (
                    <button 
                      onClick={() => setVisibleCount(v => v + 5)}
                      className="w-full py-3 mt-4 bg-white border border-slate-200 rounded-xl text-emerald-600 font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      Tampilkan lebih banyak ({results.length - visibleCount} tersisa)
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
