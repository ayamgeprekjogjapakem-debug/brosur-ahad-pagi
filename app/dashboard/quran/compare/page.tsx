'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, Loader2, PlayCircle, Database, RefreshCw, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CompareQuranPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [syncResult, setSyncResult] = useState<any>(null);
  
  // Progress state for Apply
  const [isApplying, setIsApplying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentSurah, setCurrentSurah] = useState(0);

  useEffect(() => {
    checkUpdates();
  }, []);

  const checkUpdates = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('/api/quran/sync');
      const data = await res.json();
      setSyncResult(data);
    } catch (error) {
      console.error("Gagal cek update:", error);
      setSyncResult({ success: false, error: 'Terjadi kesalahan jaringan saat mengecek pembaruan.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleApplyUpdates = async () => {
    if (!window.confirm("Proses ini akan mengunduh dan menyimpan seluruh data Al-Quran (114 Surah). Pastikan koneksi stabil. Lanjutkan?")) {
      return;
    }

    setIsApplying(true);
    setProgress(0);
    setCurrentSurah(0);

    let successCount = 0;

    for (let i = 1; i <= 114; i++) {
      setCurrentSurah(i);
      try {
        const res = await fetch('/api/quran/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ surah_id: i })
        });
        
        if (res.ok) {
          successCount++;
        } else {
          console.error(`Gagal apply surah ${i}`);
        }
      } catch (err) {
        console.error(`Error apply surah ${i}:`, err);
      }
      
      setProgress(Math.round((i / 114) * 100));
    }

    setIsApplying(false);
    alert(`Proses selesai. Berhasil memperbarui ${successCount} dari 114 Surah.`);
    router.push('/dashboard/quran');
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 md:py-8 font-sans antialiased text-slate-800 select-none space-y-6">
      <Link 
        href="/dashboard/quran" 
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition"
      >
        <ArrowLeft size={14} /> <span>Kembali ke Data Quran</span>
      </Link>

      {/* Header Banner */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Komparasi Data{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
            Kemenag RI
          </span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal leading-relaxed">
          Mengecek perbedaan data surah dan ayat di basis data lokal Anda dengan API resmi Kemenag (EQuran).
        </p>
      </div>

      {isChecking ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Sedang Mengecek Pembaruan...</h3>
          <p className="text-xs text-slate-500 mt-1">Menghubungkan ke API Kemenag / EQuran.id</p>
        </div>
      ) : syncResult && !syncResult.success ? (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-6 flex flex-col items-center text-center">
          <XCircle className="w-10 h-10 text-rose-500 mb-2" />
          <h3 className="text-sm font-bold text-rose-800">Pengecekan Gagal</h3>
          <p className="text-xs text-rose-600 mt-1 mb-4">{syncResult.error}</p>
          <button 
            onClick={checkUpdates} 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
          >
            Coba Lagi
          </button>
        </div>
      ) : syncResult ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              {syncResult.needsUpdate ? (
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <Database size={24} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={24} />
                </div>
              )}
              
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {syncResult.needsUpdate ? 'Pembaruan Data Ditemukan' : 'Basis Data Sudah Sesuai (Up-to-Date)'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{syncResult.message}</p>
              </div>
            </div>

            {!syncResult.needsUpdate && (
              <button 
                onClick={handleApplyUpdates}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
              >
                Paksa Sinkron Ulang
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Data Lokal (Supabase)</span>
              <span className="text-2xl font-bold text-slate-900 font-mono">{syncResult.localSurahsCount || 0}</span>
              <span className="text-xs text-slate-500 block">Surah tersimpan</span>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/60">
              <span className="text-emerald-700 text-[10px] font-bold uppercase tracking-wider block mb-1">Data Kemenag (EQuran)</span>
              <span className="text-2xl font-bold text-emerald-800 font-mono">{syncResult.externalSurahsCount || 114}</span>
              <span className="text-xs text-emerald-600 block">Surah resmi</span>
            </div>
          </div>

          {syncResult.changes && syncResult.changes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Perbedaan yang Ditemukan:</h4>
              <ul className="space-y-1.5">
                {syncResult.changes.map((c: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/60 p-3 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span> 
                    <span className="leading-relaxed">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {syncResult.needsUpdate && !isApplying && (
            <button 
              onClick={handleApplyUpdates}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition"
            >
              <PlayCircle size={16} /> <span>Mulai Unduh & Sinkronkan ke Database</span>
            </button>
          )}
        </div>
      ) : null}

      {/* Fullscreen Overlay for Progress */}
      {isApplying && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center border border-slate-200">
            <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-900 mb-1">Sinkronisasi Sedang Berjalan</h3>
            <p className="text-xs text-slate-500 mb-5">Memproses Surah ke-{currentSurah} dari 114...</p>
            
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-emerald-600 transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="font-bold text-emerald-600 text-xs font-mono">{progress}% Selesai</div>
            
            <p className="text-[11px] text-slate-400 mt-4">Mohon tunggu hingga seluruh surah tersimpan ke basis data.</p>
          </div>
        </div>
      )}
    </div>
  );
}
