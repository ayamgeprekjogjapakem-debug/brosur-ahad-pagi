'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2, PlayCircle, Database } from 'lucide-react';
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
    <main className="p-8 md:p-12 w-full max-w-4xl mx-auto">
      <Link href="/dashboard/quran" className="inline-flex items-center gap-2 text-zinc-500 hover:text-accent font-bold mb-6 transition-colors">
        <ArrowLeft size={18} /> Kembali ke Data Quran
      </Link>

      <header className="mb-10">
        <h1 className="text-3xl font-extrabold mb-2">Komparasi Data Kemenag</h1>
        <p className="text-zinc-500">Mengecek perbedaan data di database lokal Anda dengan API Kemenag (EQuran).</p>
      </header>

      {isChecking ? (
        <div className="bg-white  border border-black/5  rounded-3xl p-12 flex flex-col items-center justify-center shadow-sm">
          <Loader2 className="w-12 h-12 text-accent animate-spin mb-4" />
          <h2 className="text-xl font-bold mb-2">Sedang Mengecek Pembaruan...</h2>
          <p className="text-zinc-500 text-sm">Menghubungkan ke API EQuran.id</p>
        </div>
      ) : syncResult && !syncResult.success ? (
        <div className="bg-red-50  border border-red-200  rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <XCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-red-700  mb-2">Pengecekan Gagal</h2>
          <p className="text-red-600/80  mb-6">{syncResult.error}</p>
          <button onClick={checkUpdates} className="bg-red-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-600 transition-colors">
            Coba Lagi
          </button>
        </div>
      ) : syncResult ? (
        <div className="bg-white  border border-black/5  rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-black/5 ">
            <div className="flex items-center gap-4">
              {syncResult.needsUpdate ? (
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <Database size={32} />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle size={32} />
                </div>
              )}
              
              <div>
                <h2 className="text-2xl font-bold mb-1">
                  {syncResult.needsUpdate ? 'Pembaruan Ditemukan' : 'Sistem Up-to-Date'}
                </h2>
                <p className="text-zinc-500 text-sm">{syncResult.message}</p>
              </div>
            </div>

            {!syncResult.needsUpdate && (
              <button 
                onClick={handleApplyUpdates}
                className="text-accent hover:underline text-sm font-bold"
              >
                Force Update (Paksa Sinkron)
              </button>
            )}
          </div>

          <div className="space-y-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-zinc-50  rounded-2xl border border-black/5 ">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Data Lokal (Supabase)</p>
                <p className="text-2xl font-black">{syncResult.localSurahsCount} Surah</p>
              </div>
              <div className="p-4 bg-zinc-50  rounded-2xl border border-black/5 ">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Data Kemenag (EQuran)</p>
                <p className="text-2xl font-black">{syncResult.externalSurahsCount} Surah</p>
              </div>
            </div>

            {syncResult.changes && syncResult.changes.length > 0 && (
              <div>
                <h3 className="font-bold text-sm mb-3">Detail Perubahan:</h3>
                <ul className="space-y-2">
                  {syncResult.changes.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-zinc-600  bg-amber-50  p-3 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {syncResult.needsUpdate && !isApplying && (
            <button 
              onClick={handleApplyUpdates}
              className="w-full bg-accent text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors shadow-lg shadow-accent/20"
            >
              <PlayCircle size={24} /> Mulai Sinkronisasi (Unduh ke Database)
            </button>
          )}
        </div>
      ) : null}

      {/* Fullscreen Overlay for Progress */}
      {isApplying && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-8">
          <div className="bg-white  rounded-3xl p-8 max-w-md w-full text-center">
            <Loader2 className="w-16 h-16 text-accent animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-2">Sinkronisasi Berjalan</h2>
            <p className="text-zinc-500 mb-8">Memproses Surah ke-{currentSurah} dari 114...</p>
            
            <div className="w-full h-4 bg-zinc-100  rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="font-black text-accent text-lg">{progress}% Selesai</div>
            
            <p className="text-xs text-zinc-400 mt-6 mt-4">Mohon jangan tutup halaman ini hingga proses selesai.</p>
          </div>
        </div>
      )}

    </main>
  );
}
