'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { 
  BookOpen, RefreshCw, Loader2, Database, Search, 
  ChevronRight, Volume2, Sparkles, Filter, CheckCircle2,
  AlertTriangle, X, Play, Pause
} from 'lucide-react';
import Link from 'next/link';

interface SurahItem {
  id: number;
  nama_latin: string;
  nama_arab: string;
  jumlah_ayat: number;
  tempat_turun: string;
  arti: string;
  deskripsi?: string;
  audio_url?: string;
}

interface AyatItem {
  id?: number;
  surah_id: number;
  nomor_ayat: number;
  teks_arab: string;
  teks_latin: string;
  teks_indonesia: string;
  audio_url?: string;
}

export default function DataQuranPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSurah: 0,
    totalAyat: 0,
    lastSync: null as any,
  });

  const [surahs, setSurahs] = useState<SurahItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterTempat, setFilterTempat] = useState<'all' | 'mekah' | 'madinah'>('all');

  // Modal Detail Surah & Ayat
  const [selectedSurah, setSelectedSurah] = useState<SurahItem | null>(null);
  const [ayats, setAyats] = useState<AyatItem[]>([]);
  const [loadingAyat, setLoadingAyat] = useState(false);
  const [searchAyat, setSearchAyat] = useState('');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const supabase = createClient();

  const fetchStatsAndSurah = async () => {
    setLoading(true);
    try {
      const { count: countSurah } = await supabase.from('quran_surah').select('*', { count: 'exact', head: true });
      const { count: countAyat } = await supabase.from('quran_ayat').select('*', { count: 'exact', head: true });
      
      const { data: syncLog } = await supabase
        .from('quran_sync_logs')
        .select('*')
        .order('sync_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: listSurah } = await supabase
        .from('quran_surah')
        .select('*')
        .order('id', { ascending: true });

      setStats({
        totalSurah: countSurah || 0,
        totalAyat: countAyat || 0,
        lastSync: syncLog || null
      });

      if (listSurah) {
        setSurahs(listSurah);
      }
    } catch (err) {
      console.error("Error fetching Quran data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndSurah();
  }, []);

  const openSurahDetail = async (surah: SurahItem) => {
    setSelectedSurah(surah);
    setSearchAyat('');
    setLoadingAyat(true);
    try {
      const { data: ayatList } = await supabase
        .from('quran_ayat')
        .select('*')
        .eq('surah_id', surah.id)
        .order('nomor_ayat', { ascending: true });
      
      setAyats(ayatList || []);
    } catch (err) {
      console.error("Error fetching ayats:", err);
    } finally {
      setLoadingAyat(false);
    }
  };

  const handleToggleAudio = (url?: string) => {
    if (!url) return;
    if (audioElement) {
      audioElement.pause();
    }
    if (playingAudio === url) {
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }
    const audio = new Audio(url);
    audio.play();
    setPlayingAudio(url);
    setAudioElement(audio);
    audio.onended = () => {
      setPlayingAudio(null);
      setAudioElement(null);
    };
  };

  // Filtered Surahs
  const filteredSurahs = useMemo(() => {
    return surahs.filter((s) => {
      const matchSearch = search.trim() === '' || 
        s.nama_latin.toLowerCase().includes(search.toLowerCase()) ||
        s.arti.toLowerCase().includes(search.toLowerCase()) ||
        String(s.id).includes(search);

      const matchTempat = filterTempat === 'all' || 
        s.tempat_turun.toLowerCase() === filterTempat.toLowerCase();

      return matchSearch && matchTempat;
    });
  }, [surahs, search, filterTempat]);

  // Filtered Ayats inside modal
  const filteredAyats = useMemo(() => {
    if (!searchAyat.trim()) return ayats;
    const q = searchAyat.toLowerCase();
    return ayats.filter(a => 
      String(a.nomor_ayat).includes(q) ||
      a.teks_latin?.toLowerCase().includes(q) ||
      a.teks_indonesia?.toLowerCase().includes(q) ||
      a.teks_arab?.includes(q)
    );
  }, [ayats, searchAyat]);

  return (
    <div className="w-full max-w-7xl mx-auto py-6 md:py-8 font-sans antialiased text-slate-800 select-none space-y-6">
      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium mb-2">
            <BookOpen size={12} className="text-emerald-600" />
            <span>Koleksi Al-Qur'anul Karim</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Data Master{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
              Al-Qur'an
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal leading-relaxed">
            Data ayat, terjemahan, dan teks latin resmi tersinkronisasi dari Kemenag RI / EQuran API.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchStatsAndSurah}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-slate-400" : "text-slate-400"} />
            <span>Muat Ulang</span>
          </button>
          <Link
            href="/dashboard/quran/compare"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-center gap-2 transition shrink-0 active:scale-[0.98]"
          >
            <RefreshCw size={13} /> <span>Cek Pembaruan & Sinkron</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Surah</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
                114 Surah
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              {stats.totalSurah}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Kelengkapan Surah</span>
            <span className="font-semibold text-emerald-600 font-mono">
              {Math.round((stats.totalSurah / 114) * 100)}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Ayat</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
                6.236 Ayat
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-mono">
              {stats.totalAyat.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Kelengkapan Ayat</span>
            <span className="font-semibold text-emerald-600 font-mono">
              {Math.min(100, Math.round((stats.totalAyat / 6236) * 100))}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Sinkronisasi</span>
              {stats.lastSync?.status === 'SUCCESS' ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 font-mono">
                  TERHUBUNG
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 font-mono">
                  PERIKSA
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-800 line-clamp-1 mt-1">
              {stats.lastSync ? (
                new Date(stats.lastSync.sync_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              ) : (
                'Belum pernah sinkron'
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
              {stats.lastSync?.details || 'Jalankan cek pembaruan untuk membandingkan data dengan server Kemenag.'}
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
            <span>Sumber Resmi</span>
            <span className="font-semibold text-slate-700">Kemenag RI</span>
          </div>
        </div>
      </div>

      {/* Main Table / Explorer Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-none">
        {/* Toolbar Pencarian & Filter */}
        <div className="p-3.5 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text" 
              placeholder="Cari nama surah, nomor, atau terjemahan..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3.5 focus:outline-none focus:border-emerald-500 focus:bg-white transition text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
            <span className="whitespace-nowrap">Tempat Turun:</span>
            <select
              value={filterTempat}
              onChange={(e: any) => setFilterTempat(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Surah</option>
              <option value="mekah">Makkiyyah (Mekah)</option>
              <option value="madinah">Madaniyyah (Madinah)</option>
            </select>
          </div>
        </div>

        {/* Tabel Daftar Surah */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Memuat data Al-Qur'an...</p>
            </div>
          ) : filteredSurahs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              {surahs.length === 0 
                ? 'Belum ada data surah di database. Silakan klik tombol "Cek Pembaruan & Sinkron" untuk mengunduh data.' 
                : 'Tidak ada surah yang cocok dengan pencarian Anda.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-3.5 w-16 text-center">No</th>
                  <th className="p-3.5">Nama Surah</th>
                  <th className="p-3.5">Teks Arab</th>
                  <th className="p-3.5">Arti / Terjemahan</th>
                  <th className="p-3.5">Jumlah Ayat</th>
                  <th className="p-3.5">Tempat Turun</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredSurahs.map((surah) => (
                  <tr key={surah.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 text-center font-mono text-slate-500 font-semibold">
                      {surah.id}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{surah.nama_latin}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-serif text-base text-slate-800" dir="rtl">
                      {surah.nama_arab}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {surah.arti}
                    </td>
                    <td className="p-3.5 font-mono text-slate-700">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 font-semibold text-[11px]">
                        {surah.jumlah_ayat} Ayat
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
                        surah.tempat_turun.toLowerCase() === 'mekah'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                      }`}>
                        {surah.tempat_turun}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openSurahDetail(surah)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 text-xs font-semibold transition"
                      >
                        <span>Baca Ayat</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Dialog Detail & Penjelajah Ayat */}
      {selectedSurah && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center font-bold text-sm font-mono shrink-0">
                  {selectedSurah.id}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">{selectedSurah.nama_latin}</h3>
                    <span className="font-serif text-slate-600 text-sm" dir="rtl">({selectedSurah.nama_arab})</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedSurah.arti} • {selectedSurah.jumlah_ayat} Ayat • {selectedSurah.tempat_turun}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedSurah.audio_url && (
                  <button
                    onClick={() => handleToggleAudio(selectedSurah.audio_url)}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition text-xs font-semibold flex items-center gap-1.5"
                    title="Putar Qori Surah"
                  >
                    {playingAudio === selectedSurah.audio_url ? <Pause size={14} className="text-emerald-600" /> : <Play size={14} />}
                    <span className="hidden sm:inline">Audio</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedSurah(null);
                    if (audioElement) audioElement.pause();
                    setPlayingAudio(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Search Toolbar */}
            <div className="p-3 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Cari nomor ayat atau terjemahan..."
                  value={searchAyat}
                  onChange={(e) => setSearchAyat(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {filteredAyats.length} dari {selectedSurah.jumlah_ayat} Ayat
              </span>
            </div>

            {/* Modal Body - List of Ayats */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 divide-y divide-slate-100">
              {loadingAyat ? (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                  <p className="text-xs font-medium">Memuat ayat-ayat surah...</p>
                </div>
              ) : filteredAyats.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  Tidak ada ayat yang cocok.
                </div>
              ) : (
                filteredAyats.map((ayat) => (
                  <div key={ayat.nomor_ayat} className="pt-4 first:pt-0 space-y-2.5">
                    {/* Header Ayat & Teks Arab */}
                    <div className="flex items-start justify-between gap-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                        {ayat.nomor_ayat}
                      </span>
                      <p className="font-serif text-xl sm:text-2xl text-slate-900 text-right leading-loose flex-1" dir="rtl">
                        {ayat.teks_arab}
                      </p>
                    </div>

                    {/* Teks Latin */}
                    {ayat.teks_latin && (
                      <p className="text-xs text-emerald-700/90 font-medium pl-9 leading-relaxed">
                        {ayat.teks_latin}
                      </p>
                    )}

                    {/* Terjemahan Bahasa Indonesia */}
                    <p className="text-xs text-slate-600 pl-9 leading-relaxed">
                      {ayat.teks_indonesia}
                    </p>

                    {/* Tombol Audio Ayat jika ada */}
                    {ayat.audio_url && (
                      <div className="pl-9 pt-1">
                        <button
                          onClick={() => handleToggleAudio(ayat.audio_url)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 text-[11px] font-semibold transition"
                        >
                          {playingAudio === ayat.audio_url ? <Pause size={11} className="text-emerald-600" /> : <Play size={11} />}
                          <span>Putar Ayat</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs text-slate-500">
              <span>{selectedSurah.deskripsi ? selectedSurah.deskripsi.replace(/<[^>]+>/g, '').slice(0, 80) + '...' : 'Data Kemenag RI'}</span>
              <button
                onClick={() => {
                  setSelectedSurah(null);
                  if (audioElement) audioElement.pause();
                  setPlayingAudio(null);
                }}
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
