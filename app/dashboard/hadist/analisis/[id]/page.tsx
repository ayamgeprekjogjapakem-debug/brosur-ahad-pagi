'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { 
  ArrowLeft, CheckCircle2, Save, FileText, Database, ScrollText, AlertCircle, Loader2, BookOpen
} from 'lucide-react';
import Link from 'next/link';

export default function AnalisisHadistPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Fields
  const [catatanAnalisis, setCatatanAnalisis] = useState('');
  const [statusHadist, setStatusHadist] = useState('terverifikasi');
  const [rawiTeratas, setRawiTeratas] = useState('');
  const [noHadist, setNoHadist] = useState('');
  const [rawiKitab, setRawiKitab] = useState('');
  const [juz, setJuz] = useState('');
  const [halaman, setHalaman] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: hadistData, error } = await supabase
          .from('hadist_brosur')
          .select(`
            *,
            kelompok_hadist (nama_kelompok, warna_badge),
            brosur (judul, tahun)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        setData(hadistData);
        setCatatanAnalisis(hadistData.catatan_analisis || '');
        setStatusHadist(hadistData.status_hadist || 'terverifikasi');
        setRawiTeratas(hadistData.rawi_teratas || '');
        setNoHadist(hadistData.no_hadist || '');
        setRawiKitab(hadistData.rawi_kitab || '');
        setJuz(hadistData.juz || '');
        setHalaman(hadistData.halaman || '');
      } catch (err: any) {
        console.error('Error fetching hadist:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, supabase]);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { error } = await supabase
        .from('hadist_brosur')
        .update({
          catatan_analisis: catatanAnalisis,
          status_hadist: statusHadist,
          rawi_teratas: rawiTeratas,
          no_hadist: noHadist,
          rawi_kitab: rawiKitab,
          juz: juz,
          halaman: halaman
        })
        .eq('id', id);

      if (error) {
        // If column catatan_analisis doesn't exist, we fallback
        if (error.message.includes('catatan_analisis')) {
          setMessage({ text: 'Error: Kolom catatan_analisis belum ada di database. Silakan jalankan script SQL V2 di halaman sebelumnya.', type: 'error' });
          return;
        }
        throw error;
      }
      
      setMessage({ text: 'Analisis berhasil disimpan!', type: 'success' });
      
      // Update local state
      setData({ ...data, catatan_analisis: catatanAnalisis, status_hadist: statusHadist, rawi_teratas: rawiTeratas, no_hadist: noHadist, rawi_kitab: rawiKitab, juz, halaman });
    } catch (err: any) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-zinc-950">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-zinc-950 text-zinc-500">
        Data hadist tidak ditemukan.
      </div>
    );
  }

  const isQuran = data.sumber_jenis === 'quran' || data.nama_surat;

  return (
    <div className="min-h-screen bg-[#F9FAFB] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans pb-20">
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-extrabold text-lg md:text-xl text-zinc-900 dark:text-white">Analisis Mendalam</h1>
              <p className="text-xs text-zinc-500 font-medium">ID: {data.id.split('-')[0]}...</p>
            </div>
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-white font-bold text-sm shadow-lg shadow-accent/20 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Analisis
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* KOLOM KIRI: TEKS HADIST & INFO DASAR */}
        <div className="lg:col-span-2 space-y-6">
          {message.text && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
              {message.type === 'error' ? <AlertCircle size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
              <p className="text-sm font-semibold">{message.text}</p>
            </div>
          )}

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5 shadow-sm space-y-6">
            <div className="flex items-center justify-between mb-4 border-b border-black/5 dark:border-white/5 pb-4">
              <span className="px-3 py-1 bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 font-bold text-xs rounded-full">
                {isQuran ? 'Ayat Al-Qur\'an' : 'Hadist / Atsar'}
              </span>
              {data.brosur && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-accent">
                  <BookOpen size={14} />
                  Brosur {data.brosur.judul}
                </span>
              )}
            </div>

            <p className="text-right font-serif text-2xl md:text-3xl leading-loose text-zinc-900 dark:text-zinc-100" dir="rtl">
              {data.kutipan_arab}
            </p>
            <div className="w-16 h-1 bg-black/10 dark:bg-white/10 rounded-full my-6"></div>
            <p className="text-base md:text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              "{data.terjemahan}"
            </p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-black/5 dark:border-white/5 shadow-sm space-y-4">
            <h2 className="flex items-center gap-2 font-bold text-lg border-b border-black/5 dark:border-white/5 pb-3">
              <ScrollText size={20} className="text-accent" />
              Syarah & Catatan Analisis
            </h2>
            <p className="text-xs text-zinc-500 font-medium">
              Tambahkan penjelasan dari ulama, asbabul wurud, fawaid hadist, atau status jarh wa ta'dil di sini.
            </p>
            <textarea
              value={catatanAnalisis}
              onChange={(e) => setCatatanAnalisis(e.target.value)}
              placeholder="Tulis catatan analisis di sini..."
              className="w-full h-64 p-4 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 focus:border-accent outline-none transition-colors text-sm font-medium leading-relaxed resize-y"
            ></textarea>
          </div>
        </div>

        {/* KOLOM KANAN: FORM TAKHRIJ & STATUS */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-black/5 dark:border-white/5 shadow-sm space-y-5">
            <h2 className="flex items-center gap-2 font-bold text-lg border-b border-black/5 dark:border-white/5 pb-3">
              <Database size={20} className="text-accent" />
              Data Takhrij
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Status Keshahihan</label>
                <select 
                  value={statusHadist}
                  onChange={(e) => setStatusHadist(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                >
                  <option value="mentah">Mentah (Belum Dicek)</option>
                  <option value="terverifikasi">Shahih / Terverifikasi</option>
                  <option value="dhaif">Dha'if (Lemah)</option>
                  <option value="maudhu">Maudhu' (Palsu)</option>
                  <option value="hasan">Hasan</option>
                </select>
              </div>

              {!isQuran && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">Rawi / Kitab (Misal: Bukhari)</label>
                    <input 
                      type="text" 
                      value={rawiKitab}
                      onChange={(e) => setRawiKitab(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5">Nomor Hadist</label>
                      <input 
                        type="text" 
                        value={noHadist}
                        onChange={(e) => setNoHadist(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1.5">Juz / Jilid</label>
                      <input 
                        type="text" 
                        value={juz}
                        onChange={(e) => setJuz(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">Halaman</label>
                    <input 
                      type="text" 
                      value={halaman}
                      onChange={(e) => setHalaman(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5">Sahabat Teratas (Rawi A'la)</label>
                    <input 
                      type="text" 
                      value={rawiTeratas}
                      onChange={(e) => setRawiTeratas(e.target.value)}
                      placeholder="Misal: Abu Hurairah r.a."
                      className="w-full px-4 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 text-sm font-bold focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
