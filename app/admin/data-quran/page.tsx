'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BookOpen, RefreshCw, Loader2, CheckCircle2, AlertCircle, 
  Search, ArrowRight, Sparkles, Layers, ShieldCheck, 
  ExternalLink, Check, X, ChevronRight, Info, History, Clock, FileText
} from 'lucide-react';
import Link from 'next/link';

interface SurahItem {
  id: number;
  nama_latin: string;
  nama_arab: string;
  arti: string;
  jumlah_ayat: number;
  tempat_turun: string;
}

interface SyncLogItem {
  id: string;
  sync_date: string;
  status: string;
  details: string;
  changes_detected: boolean;
  applied: boolean;
}

export default function AdminDataQuranPage() {
  const [activeTab, setActiveTab] = useState<'surah' | 'logs'>('surah');
  const [loading, setLoading] = useState(true);
  const [surahs, setSurahs] = useState<SurahItem[]>([]);
  const [logs, setLogs] = useState<SyncLogItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterTempat, setFilterTempat] = useState<'all' | 'mekah' | 'madinah'>('all');
  const [stats, setStats] = useState({
    totalSurah: 0,
    totalAyat: 0,
    lastSync: null as any,
  });

  // State untuk Sinkronisasi Kemenag Inline
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [isCheckingSync, setIsCheckingSync] = useState(false);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSyncSurah, setCurrentSyncSurah] = useState(0);
  const [syncSuccessToast, setSyncSuccessToast] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: countSurah },
        { count: countAyat },
        { data: syncLogList },
        { data: surahList }
      ] = await Promise.all([
        supabase.from('quran_surah').select('*', { count: 'exact', head: true }),
        supabase.from('quran_ayat').select('*', { count: 'exact', head: true }),
        supabase.from('quran_sync_logs').select('*').order('sync_date', { ascending: false }).limit(20),
        supabase.from('quran_surah').select('id, nama_latin, nama_arab, arti, jumlah_ayat, tempat_turun').order('id', { ascending: true })
      ]);

      const latestLog = syncLogList && syncLogList.length > 0 ? syncLogList[0] : null;

      setStats({
        totalSurah: countSurah || 0,
        totalAyat: countAyat || 0,
        lastSync: latestLog
      });

      if (surahList) setSurahs(surahList);
      if (syncLogList) setLogs(syncLogList);
    } catch (err) {
      console.error("Error fetching quran data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter surah berdasarkan pencarian nama atau arti
  const filteredSurahs = useMemo(() => {
    return surahs.filter(s => {
      const matchSearch = 
        s.nama_latin.toLowerCase().includes(search.toLowerCase()) ||
        s.arti.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toString() === search.trim();
      
      const matchTempat = 
        filterTempat === 'all' || 
        s.tempat_turun.toLowerCase() === filterTempat.toLowerCase();

      return matchSearch && matchTempat;
    });
  }, [surahs, search, filterTempat]);

  // Handle Cek Update dari EQuran API (Kemenag)
  const handleCheckSync = async () => {
    setSyncModalOpen(true);
    setIsCheckingSync(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/quran/sync');
      const data = await res.json();
      setSyncStatus(data);
    } catch (err: any) {
      setSyncStatus({ success: false, error: 'Koneksi ke API Kemenag / EQuran terputus.' });
    } finally {
      setIsCheckingSync(false);
    }
  };

  // Handle Sinkronisasi Penuh (1-114 Surah) & Catat Log
  const handleApplySync = async () => {
    setIsApplying(true);
    setProgress(0);
    setCurrentSyncSurah(0);

    let successCount = 0;
    const startTime = new Date();

    for (let i = 1; i <= 114; i++) {
      setCurrentSyncSurah(i);
      try {
        const res = await fetch('/api/quran/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surah_id: i })
        });
        if (res.ok) successCount++;
      } catch (err) {
        console.error(`Gagal sync surah ${i}`, err);
      }
      setProgress(Math.round((i / 114) * 100));
    }

    // Catat log detail hasil pembaharuan
    try {
      await fetch('/api/quran/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Pembaruan Data Lengkap',
          status: successCount === 114 ? 'SUCCESS' : 'PARTIAL',
          details: `Sinkronisasi sukses untuk ${successCount} dari 114 surah (6.236 ayat) dari API Kemenag EQuran. Waktu: ${new Date().toLocaleTimeString('id-ID')}.`,
          changes_detected: true,
          applied: true
        })
      });
    } catch (e) {
      console.error('Gagal mencatat log:', e);
    }

    setIsApplying(false);
    setSyncModalOpen(false);
    setSyncSuccessToast(`Berhasil memperbarui data: ${successCount} dari 114 surah telah tercatat di log.`);
    setTimeout(() => setSyncSuccessToast(null), 5000);
    fetchData();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16 font-sans">
      
      {/* Toast Notifikasi Berhasil */}
      {syncSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-zinc-900 text-white px-4 py-3.5 rounded-2xl shadow-lg border border-zinc-800 animate-in slide-in-from-bottom-5 duration-200 max-w-md">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check size={16} />
          </div>
          <p className="text-xs font-semibold leading-snug">{syncSuccessToast}</p>
        </div>
      )}

      {/* Header Utama Clean Ala Gemini */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Data Quran
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
              <ShieldCheck size={12} />
              <span>Kemenag Terverifikasi</span>
            </span>
          </div>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Pusat data mushaf Al-Quran standar Kementerian Agama RI beserta riwayat audit log pembaruan sinkronisasi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleCheckSync}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-medium transition shadow-sm"
          >
            <RefreshCw size={14} className={isCheckingSync ? 'animate-spin' : ''} />
            <span>Sinkronisasi Data</span>
          </button>
        </div>
      </div>

      {/* Stat Cards Clean Flat Ala AI Agent */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Total Surah */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Total Surah</span>
            <BookOpen size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {stats.totalSurah}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ 114 Surah</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            {stats.totalSurah === 114 ? 'Lengkap terdaftar di database' : 'Perlu sinkronisasi ulang'}
          </div>
        </div>

        {/* Total Ayat */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Total Ayat Tersimpan</span>
            <Layers size={16} className="text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {stats.totalAyat.toLocaleString('id-ID')}
            </span>
            <span className="text-xs text-zinc-400 font-medium">/ 6.236 Ayat</span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400">
            Mencakup teks Arab, transliterasi & terjemah
          </div>
        </div>

        {/* Status Sinkronisasi Terakhir */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium">Sinkronisasi Terakhir</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div>
            <span className="text-xs sm:text-sm font-semibold text-zinc-800 line-clamp-1">
              {stats.lastSync?.sync_date 
                ? new Date(stats.lastSync.sync_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Belum pernah sync'}
            </span>
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              stats.lastSync?.status === 'SUCCESS' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
            }`}>
              {stats.lastSync?.status || 'Siap'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-zinc-400 truncate">
            {stats.lastSync?.details || 'Sumber: EQuran.id (Kemenag RI)'}
          </div>
        </div>

      </div>

      {/* Tab Navigasi: Indeks Surah & Log Pembaruan (Pill Switcher Bersih) */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-100/70 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('surah')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'surah'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <BookOpen size={14} className={activeTab === 'surah' ? 'text-emerald-600' : ''} />
          <span>Indeks Surah ({surahs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === 'logs'
              ? 'bg-white text-emerald-700 font-bold'
              : 'text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <History size={14} className={activeTab === 'logs' ? 'text-emerald-600' : ''} />
          <span>Riwayat Log Pembaruan ({logs.length})</span>
        </button>
      </div>

      {/* Tab 1: Indeks Surah */}
      {activeTab === 'surah' ? (
        <div className="space-y-4">
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#FAFAFA] p-2.5 sm:p-3 rounded-2xl">
            
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari surah berdasarkan nomor, nama latin, atau arti (misal: Al-Fatihah, Pembukaan)..."
                className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-xs text-zinc-900 outline-none focus:ring-1 focus:ring-emerald-500 transition font-medium"
              />
            </div>

            {/* Filter Tempat Turun */}
            <div className="flex items-center gap-1 bg-zinc-200/60 p-0.5 rounded-xl text-xs font-medium shrink-0 self-start sm:self-center">
              <button
                onClick={() => setFilterTempat('all')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTempat === 'all' ? 'bg-white text-zinc-900 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Semua ({surahs.length})
              </button>
              <button
                onClick={() => setFilterTempat('mekah')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTempat === 'mekah' ? 'bg-white text-emerald-800 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Makkiyyah
              </button>
              <button
                onClick={() => setFilterTempat('madinah')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterTempat === 'madinah' ? 'bg-white text-emerald-800 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Madaniyyah
              </button>
            </div>

          </div>

          {/* Daftar Surah Grid Clean Flat */}
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-emerald-600" size={24} />
              <p className="text-xs text-zinc-400 font-medium">Memuat master surah...</p>
            </div>
          ) : filteredSurahs.length === 0 ? (
            <div className="py-16 text-center bg-[#FAFAFA] rounded-2xl">
              <BookOpen className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-zinc-600">Surah tidak ditemukan</p>
              <p className="text-[11px] text-zinc-400 mt-1">Coba sesuaikan kata kunci pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredSurahs.map((surah) => (
                <div
                  key={surah.id}
                  className="p-3.5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/70 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-zinc-200/60 text-zinc-700 flex items-center justify-center text-xs font-bold shrink-0 group-hover:border-emerald-500 group-hover:text-emerald-700 transition">
                      {surah.id}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-zinc-900 group-hover:text-emerald-700 transition truncate">
                        {surah.nama_latin}
                      </h3>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {surah.arti} • {surah.jumlah_ayat} Ayat
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-base font-serif text-zinc-700 font-medium" dir="rtl">
                      {surah.nama_arab}
                    </div>
                    <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-wider">
                      {surah.tempat_turun}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      ) : (
        /* Tab 2: Riwayat Log Pembaruan (Clean Timeline) */
        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="py-16 text-center bg-[#FAFAFA] rounded-2xl">
              <History className="mx-auto text-zinc-300 mb-2" size={32} />
              <p className="text-xs font-semibold text-zinc-600">Belum Ada Riwayat Log</p>
              <p className="text-[11px] text-zinc-400 mt-1">Riwayat pembaruan akan otomatis tercatat setiap kali sinkronisasi dijalankan.</p>
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const dateObj = new Date(log.sync_date);
              const formattedDate = dateObj.toLocaleDateString('id-ID', { 
                day: 'numeric', month: 'long', year: 'numeric' 
              });
              const formattedTime = dateObj.toLocaleTimeString('id-ID', { 
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
              });

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/70 transition flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {isSuccess ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isSuccess ? 'bg-emerald-100/60 text-emerald-800' : 'bg-amber-100/60 text-amber-800'
                        }`}>
                          {log.status}
                        </span>
                        {log.changes_detected && (
                          <span className="text-[10px] font-medium bg-zinc-200/70 text-zinc-700 px-2 py-0.5 rounded-md">
                            Perubahan Diterapkan
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock size={12} />
                          <span>{formattedDate} pukul {formattedTime}</span>
                        </span>
                      </div>

                      <p className="text-xs text-zinc-800 leading-relaxed break-words font-medium">
                        {log.details || 'Sinkronisasi berhasil dilakukan.'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-zinc-400 font-mono shrink-0 self-start sm:self-center">
                    ID: {log.id.slice(0, 8)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Info Card Bersih Ala Gemini */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FAFAFA] flex items-start gap-3.5 border border-zinc-100">
        <Info size={18} className="text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-zinc-600 leading-relaxed">
          <p className="font-semibold text-zinc-800">
            Jaminan Integritas & Transparansi Data Mushaf
          </p>
          <p className="text-[11px] text-zinc-500">
            Semua proses pembaruan, perbandingan jumlah surah/ayat, serta unduhan ayat dari Kementerian Agama RI tersimpan otomatis pada tabel audit log secara permanen.
          </p>
        </div>
      </div>

      {/* Modal / Dialog Sinkronisasi Kemenag */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 shadow-xl animate-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className={`text-emerald-600 ${isCheckingSync || isApplying ? 'animate-spin' : ''}`} />
                <h3 className="text-sm font-bold text-zinc-900">
                  Sinkronisasi Data Kemenag
                </h3>
              </div>
              {!isApplying && (
                <button
                  onClick={() => setSyncModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Konten Modal */}
            {isCheckingSync ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                <Loader2 size={24} className="animate-spin text-emerald-600" />
                <p className="text-xs font-semibold text-zinc-800">Memeriksa API Kemenag / EQuran...</p>
                <p className="text-[11px] text-zinc-400">Membandingkan 114 surah dengan database lokal</p>
              </div>
            ) : isApplying ? (
              <div className="py-6 space-y-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <RefreshCw size={24} className="animate-spin" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900">
                    Menyinkronkan Surah ke-{currentSyncSurah} dari 114
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Setiap surah dan ayat yang diperbarui akan dicatat ke riwayat log.
                  </p>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-emerald-700">{progress}%</span>
              </div>
            ) : syncStatus ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Status Database</span>
                    <span className="font-semibold text-zinc-800">
                      {syncStatus.localSurahsCount || stats.totalSurah} / 114 Surah
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Sumber API</span>
                    <span className="font-semibold text-emerald-700">EQuran Kemenag (114 Surah)</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200/60 text-[11px] text-zinc-500">
                    {syncStatus.message || 'Data siap untuk disinkronkan ke database.'}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSyncModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplySync}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-sm"
                  >
                    Mulai Unduh & Sinkronkan
                  </button>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
}
