'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { BookOpen, RefreshCw, Loader2, ServerCog, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DataQuranPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSurah: 0,
    totalAyat: 0,
    lastSync: null as any,
  });

  const supabase = createClient();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { count: countSurah } = await supabase.from('quran_surah').select('*', { count: 'exact', head: true });
      const { count: countAyat } = await supabase.from('quran_ayat').select('*', { count: 'exact', head: true });
      
      const { data: syncLog } = await supabase
        .from('quran_sync_logs')
        .select('*')
        .order('sync_date', { ascending: false })
        .limit(1)
        .single();

      setStats({
        totalSurah: countSurah || 0,
        totalAyat: countAyat || 0,
        lastSync: syncLog || null
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <main className="p-8 md:p-12 w-full max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <BookOpen className="text-accent" /> Data Quran
          </h1>
          <p className="text-zinc-500">Kelola master data Al-Quran yang tersinkronisasi dari Kemenag / EQuran.</p>
        </div>
        
        <Link 
          href="/dashboard/quran/compare" 
          className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors shrink-0 shadow-lg shadow-accent/20"
        >
          <RefreshCw size={18} /> Cek Pembaruan Data
        </Link>
      </header>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-zinc-500">
          <Loader2 className="w-10 h-10 animate-spin text-accent mb-4" />
          <p className="text-sm font-medium tracking-widest uppercase animate-pulse">Memuat Data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white  border border-black/5  p-6 rounded-3xl shadow-sm flex flex-col">
            <h3 className="text-zinc-500 font-bold text-sm uppercase tracking-wider mb-2">Total Surah</h3>
            <div className="text-5xl font-black text-zinc-900  mb-4">{stats.totalSurah}</div>
            <p className="text-xs text-zinc-500 mt-auto">Dari total 114 Surah</p>
          </div>
          
          <div className="bg-white  border border-black/5  p-6 rounded-3xl shadow-sm flex flex-col">
            <h3 className="text-zinc-500 font-bold text-sm uppercase tracking-wider mb-2">Total Ayat</h3>
            <div className="text-5xl font-black text-zinc-900  mb-4">{stats.totalAyat}</div>
            <p className="text-xs text-zinc-500 mt-auto">Dari total 6236 Ayat</p>
          </div>

          <div className="bg-white  border border-black/5  p-6 rounded-3xl shadow-sm flex flex-col">
            <h3 className="text-zinc-500 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <ServerCog size={16} /> Sinkronisasi Terakhir
            </h3>
            {stats.lastSync ? (
              <>
                <div className="text-lg font-bold text-zinc-900  mb-1">
                  {new Date(stats.lastSync.sync_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`text-sm font-bold mt-2 ${stats.lastSync.status === 'SUCCESS' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  Status: {stats.lastSync.status}
                </div>
                <p className="text-xs text-zinc-500 mt-auto line-clamp-2" title={stats.lastSync.details}>
                  {stats.lastSync.details}
                </p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center py-4 text-amber-600">
                <AlertTriangle className="mb-2 opacity-50" size={24} />
                <p className="text-sm font-bold">Belum Pernah Sync</p>
                <p className="text-xs opacity-70">Klik tombol Cek Pembaruan Data untuk memulai</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info Tambahan */}
      <div className="mt-8 bg-blue-50  border border-blue-100  rounded-2xl p-5 flex items-start gap-4">
        <BookOpen className="text-blue-500 shrink-0 mt-1" />
        <div>
          <h4 className="font-bold text-blue-900  mb-1">Sumber Data (EQuran API)</h4>
          <p className="text-sm text-blue-700/80  leading-relaxed">
            Data ayat, terjemahan, dan latin bersumber dari API pihak ketiga yang mengambil data resmi dari Kemenag RI (Kementerian Agama). 
            Proses sinkronisasi akan membandingkan data di database lokal Anda dengan data dari API untuk memastikan selalu update.
          </p>
        </div>
      </div>
    </main>
  );
}
