'use client';

import React, { useState } from 'react';
import { Search, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function SearchAnalyzerPage() {
  const [query, setQuery] = useState('');
  const [exactMode, setExactMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  const [results, setResults] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [searchTime, setSearchTime] = useState<number>(0);
  
  const [syncUrl, setSyncUrl] = useState('');
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const startTime = performance.now();
      const url = `/api/search-koleksi?q=${encodeURIComponent(query.trim())}${exactMode ? '&exact=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      const endTime = performance.now();
      
      setSearchTime(Math.round(endTime - startTime));
      setResults(data.results || []);
      setMeta(data.meta || null);
    } catch (err) {
      console.error('Analysis failed', err);
      alert('Gagal mengambil data pencarian');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncUrl.trim()) return;
    
    setIsCheckingSync(true);
    setSyncResult(null);
    try {
      const res = await fetch(`/api/check-sync?url=${encodeURIComponent(syncUrl.trim())}`);
      const data = await res.json();
      setSyncResult(data);
    } catch (err) {
      console.error('Check sync failed', err);
      alert('Gagal mengecek status sinkronisasi');
    } finally {
      setIsCheckingSync(false);
    }
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-7xl mx-auto flex-1">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
          <Search className="text-accent" /> Analisis Pencarian
        </h1>
        <p className="text-zinc-500">Uji coba algoritma pencarian dan lihat detail proses koreksi ejaan serta ranking hasil.</p>
      </header>
      
      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm mb-8">
        <form onSubmit={handleAnalyze} className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Masukkan kata kunci pencarian..." 
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-lg"
            />
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={exactMode}
                onChange={(e) => setExactMode(e.target.checked)}
                className="w-5 h-5 accent-accent rounded text-accent focus:ring-accent"
              />
              <span className="font-medium text-sm md:text-base">Mode Pencarian Exact (Tanpa Koreksi Otomatis)</span>
            </label>
            
            <button 
              type="submit"
              disabled={isSearching || !query.trim()}
              className="bg-accent text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="animate-spin" size={20} /> : 'Analisis Query'}
            </button>
          </div>
        </form>
      </div>
      
      {meta && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* META ANALISIS */}
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-teal-500" /> Breakdown Query
            </h2>
            
            <div className="space-y-4 flex-1 text-sm font-mono bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-black/5 dark:border-white/5">
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500">query_asli:</span>
                <span className="font-bold text-lg text-red-500">"{meta.originalQuery}"</span>
              </div>
              
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800"></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500">query_dikoreksi (digunakan u/ FTS SQL):</span>
                <span className="font-bold text-lg text-emerald-500">"{meta.correctedQuery}"</span>
              </div>
              
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800"></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500">status_koreksi:</span>
                <span className={`font-bold ${meta.isCorrected ? 'text-amber-500' : 'text-zinc-500'}`}>
                  {meta.isCorrected ? 'TRUE (Terdapat Typo / Terjemahan Arab)' : 'FALSE (Query Normal)'}
                </span>
              </div>
              
              <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800"></div>
              
              <div className="flex flex-col gap-1">
                <span className="text-zinc-500">highlight_terms (kata kunci yg dicari di Teks):</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {meta.highlightTerms?.map((term: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-accent/10 text-accent rounded-md">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Pencarian pertama akan menggunakan <strong>query_dikoreksi</strong> untuk Postgres Full Text Search (FTS) di Supabase. Jika hasilnya kurang dari 50 baris, maka pencarian fallback akan dijalankan dengan mencari tambahan dari <strong>query_asli</strong> dan <strong>highlight_terms</strong> lainnya, kemudian digabungkan ke urutan paling bawah.
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-950 border border-black/5 dark:border-white/5 rounded-xl">
              <h3 className="font-bold text-sm mb-2 text-zinc-500">Evaluasi Performa & Kualitas</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Waktu Eksekusi (Timer):</span>
                  <span className={`font-bold ${searchTime < 500 ? 'text-emerald-500' : searchTime < 1500 ? 'text-amber-500' : 'text-red-500'}`}>
                    {searchTime} ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Kualitas Hasil (Ditemukan):</span>
                  <span className={`font-bold ${results.length > 10 ? 'text-emerald-500' : results.length > 0 ? 'text-amber-500' : 'text-red-500'}`}>
                    {results.length > 0 ? `${results.length} Brosur` : 'Nihil / Buruk'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Status Koreksi Auto:</span>
                  <span className={`font-bold ${meta.isCorrected ? 'text-accent' : 'text-zinc-500'}`}>
                    {meta.isCorrected ? 'Aktif (Dikoreksi)' : 'Pasif (Sesuai Asli)'}
                  </span>
                </div>
              </div>
              
              {/* REKOMENDASI OPTIMASI (NEW) */}
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                <h4 className="font-bold text-xs mb-2 uppercase text-zinc-500 tracking-wider">Rekomendasi Optimasi Sistem:</h4>
                <ul className="text-xs space-y-2 text-zinc-700 dark:text-zinc-300">
                  {searchTime > 1000 ? (
                    <li className="flex gap-2">
                      <span className="text-red-500">⚠️</span> 
                      <span><strong>Waktu Eksekusi Terlalu Lama ({searchTime}ms):</strong> Pertimbangkan untuk menambahkan Index GIN pada kolom <code>fts</code> di Supabase untuk mempercepat kueri *Full-Text Search*. Pastikan Anda tidak melakukan *scan* pada seluruh row.</span>
                    </li>
                  ) : (
                    <li className="flex gap-2">
                      <span className="text-emerald-500">✅</span> 
                      <span><strong>Kecepatan Sangat Baik:</strong> Database Anda sudah cukup responsif dalam mengeksekusi Index FTS. Limit 100 baris juga membantu menjaga memori query.</span>
                    </li>
                  )}
                  
                  {results.length > 50 && (
                    <li className="flex gap-2">
                      <span className="text-blue-500">💡</span> 
                      <span><strong>Hasil Terlalu Banyak ({results.length} brosur):</strong> Jika hasil kurang spesifik, sarankan pengguna menggunakan fitur <em>Mode Exact</em> atau tambah kata kunci tambahan agar sistem bisa menyeleksi urutan (rank) dengan lebih akurat.</span>
                    </li>
                  )}

                  {results.length === 0 && (
                    <li className="flex gap-2">
                      <span className="text-amber-500">🔍</span> 
                      <span><strong>Tidak Ada Hasil:</strong> Anda dapat menambahkan sinonim atau istilah terkait ke dalam *Kamus Pencarian* (`app/lib/search-dictionary.ts`) agar kata ini diarahkan ke istilah yang dikenali oleh isi brosur.</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* HASIL PENCARIAN */}
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 justify-between">
              <span>Hasil Pencarian</span>
              <span className="text-sm font-normal text-zinc-500 bg-black/5 dark:bg-white/5 px-3 py-1 rounded-full">
                Ditemukan {results.length} hasil
              </span>
            </h2>
            
            <div className="flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {results.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
                  Tidak ada brosur yang cocok dengan query ini.
                </div>
              ) : (
                results.map((item, i) => (
                  <div key={i} className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-accent transition-colors flex flex-col relative group">
                    {/* Urutan badge (contoh: #1, #2) */}
                    <div className="absolute -left-2 -top-2 w-6 h-6 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {i + 1}
                    </div>
                    
                    <div className="flex justify-between items-start mb-2 gap-4">
                      <Link href={`/${item.slug}`} target="_blank" className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-accent transition-colors text-base line-clamp-2">
                        {item.judul}
                      </Link>
                      <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md text-zinc-500 shrink-0">
                        {item.tahun}
                      </span>
                    </div>
                    {item.snippet && (
                      <p className="text-xs text-zinc-500 leading-relaxed italic border-l-2 border-zinc-200 dark:border-zinc-800 pl-3 line-clamp-3">
                        "{item.snippet}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
               <p className="text-xs text-zinc-500 text-center">
                 Hasil di atas telah diurutkan berdasarkan `ts_rank DESC` dan di-tiebreak oleh `tahun DESC`.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* CEK SINKRONISASI INDEX */}
      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <AlertCircle className="text-accent" /> Cek Sinkronisasi Index URL
        </h2>
        
        <form onSubmit={handleCheckSync} className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
              placeholder="Masukkan URL atau Slug brosur (Contoh: http://localhost:3000/BAP-...)" 
              className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 px-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all text-sm"
            />
          </div>
          <button 
            type="submit"
            disabled={isCheckingSync || !syncUrl.trim()}
            className="bg-accent text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50 shrink-0"
          >
            {isCheckingSync ? <Loader2 className="animate-spin" size={18} /> : 'Cek Status'}
          </button>
        </form>

        {syncResult && (
          <div className={`p-5 rounded-2xl border ${
            syncResult.status === 'synced' ? 'bg-emerald-500/10 border-emerald-500/20' :
            syncResult.status === 'partial' ? 'bg-amber-500/10 border-amber-500/20' :
            syncResult.status === 'search_url' || syncResult.status === 'invalid_url' ? 'bg-blue-500/10 border-blue-500/20' :
            'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 shrink-0 ${
                syncResult.status === 'synced' ? 'text-emerald-500' :
                syncResult.status === 'partial' ? 'text-amber-500' :
                syncResult.status === 'search_url' || syncResult.status === 'invalid_url' ? 'text-blue-500' :
                'text-red-500'
              }`}>
                {syncResult.status === 'synced' ? <Sparkles size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="flex-1 text-sm">
                <h3 className={`font-bold text-lg mb-1 ${
                  syncResult.status === 'synced' ? 'text-emerald-700 dark:text-emerald-300' :
                  syncResult.status === 'partial' ? 'text-amber-700 dark:text-amber-300' :
                  syncResult.status === 'search_url' ? 'text-blue-700 dark:text-blue-300' :
                  syncResult.status === 'invalid_url' ? 'text-blue-700 dark:text-blue-300' :
                  'text-red-700 dark:text-red-300'
                }`}>
                  {syncResult.status === 'synced' ? 'Sudah Tersinkronisasi' : 
                   syncResult.status === 'partial' ? 'Sinkronisasi Parsial / Belum Sempurna' : 
                   syncResult.status === 'search_url' ? 'Link Halaman Pencarian' :
                   syncResult.status === 'invalid_url' ? 'Format URL Salah' :
                   'Tidak Tersinkronisasi (404)'}
                </h3>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium mb-3">
                  {syncResult.message}
                </p>
                
                
                {syncResult.data && (
                  <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-black/5 dark:border-white/5 font-mono text-xs space-y-2">
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-zinc-500 w-32 shrink-0">slug:</span>
                      <span className="font-bold break-all">{syncResult.slug}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-zinc-500 w-32 shrink-0">judul:</span>
                      <span className="font-bold">{syncResult.data.judul}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:gap-2">
                      <span className="text-zinc-500 w-32 shrink-0">teks_bersih_len:</span>
                      <span className={`font-bold ${syncResult.data.teks_bersih_length > 50 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {syncResult.data.teks_bersih_length} karakter
                      </span>
                    </div>
                  </div>
                )}
                
                {syncResult.match && (
                  <div className="mt-4 bg-zinc-900 text-zinc-100 p-4 rounded-xl border border-zinc-800 text-xs">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-blue-400">
                      <Search size={14} /> Hasil Analisis Pencarian untuk Brosur Ini
                    </h4>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <span className="text-zinc-400">Kata Kunci (Query):</span>
                        <span className="font-bold text-base text-white">"{syncResult.match.query}"</span>
                      </div>
                      <div className="w-full h-px bg-zinc-800"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Terdeteksi oleh Mesin FTS (Database):</span>
                        <span className={`font-bold px-2 py-1 rounded text-[10px] uppercase tracking-widest ${syncResult.match.is_fts_match ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {syncResult.match.is_fts_match ? 'YA (Cocok)' : 'TIDAK COCOK'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-300">Terdeteksi oleh Sistem Fallback String:</span>
                        <span className={`font-bold px-2 py-1 rounded text-[10px] uppercase tracking-widest ${syncResult.match.is_exact_match ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                          {syncResult.match.is_exact_match ? 'YA (Persis)' : 'TIDAK'}
                        </span>
                      </div>
                    </div>
                    {(!syncResult.match.is_fts_match && !syncResult.match.is_exact_match) && (
                      <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[11px] leading-relaxed">
                        ⚠️ <strong>Kesimpulan:</strong> Kata kunci tersebut sama sekali <strong>tidak ada</strong> di dalam brosur ini. Oleh karena itu brosur ini tidak akan pernah muncul saat pengguna mencari kata tersebut.
                      </div>
                    )}
                    {(syncResult.match.is_fts_match) && (
                      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-[11px] leading-relaxed">
                        ✅ <strong>Kesimpulan:</strong> Brosur ini pasti akan terindeks dan muncul di pencarian untuk kata kunci ini, serta akan dihitung ranking <code>ts_rank</code> nya.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
