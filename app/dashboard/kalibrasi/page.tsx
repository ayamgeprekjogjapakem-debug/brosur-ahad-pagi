'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Save, Info, CalendarClock, Loader2, CalendarRange } from 'lucide-react';

export default function KalibrasiPage() {
  const [offset, setOffset] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data: settingsData, error } = await supabase
      .from('app_settings')
      .select('hijri_offset, hijri_offset_start_date')
      .eq('id', 1)
      .single();
    
    if (settingsData) {
      if (settingsData.hijri_offset !== undefined) setOffset(settingsData.hijri_offset);
      if (settingsData.hijri_offset_start_date) setEffectiveDate(settingsData.hijri_offset_start_date);
    } else {
      console.warn("Mungkin kolom belum dibuat di Supabase.", error);
    }
    
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const { error } = await supabase
      .from('app_settings')
      .update({
        hijri_offset: offset,
        hijri_offset_start_date: effectiveDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      alert('Gagal menyimpan kalibrasi. Pastikan kolom "hijri_offset" dan "hijri_offset_start_date" sudah ada di Supabase.');
      console.error(error);
    } else {
      alert('Kalibrasi berhasil disimpan!');
    }
    setIsSaving(false);
  };

  if (isLoading) return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin text-accent" /> Memuat data kalibrasi...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white flex items-center gap-2">
        <CalendarClock className="text-accent" />
        Kalibrasi Penanggalan Hijriyah
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kolom Kiri: Form Kalibrasi */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm h-fit">
          <h2 className="text-lg font-semibold mb-4 text-zinc-800 dark:text-zinc-200">
            Penyesuaian Tanggal
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
            Pilih *offset* (hari) dan **mulai tanggal berapa** penyesuaian ini diberlakukan.
          </p>

          <div className="flex flex-col gap-6">
            {/* Input Offset */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4 block">
                Offset Kalibrasi (Hari)
              </label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="-2" 
                  max="2" 
                  step="1"
                  value={offset}
                  onChange={(e) => setOffset(parseInt(e.target.value))}
                  className="w-full accent-accent h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="shrink-0 w-16 text-center text-xl font-bold text-accent bg-accent/10 px-3 py-1 rounded-xl">
                  {offset > 0 ? `+${offset}` : offset}
                </div>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 font-medium px-1 mt-3">
                <span>-2</span>
                <span>-1</span>
                <span>0</span>
                <span>+1</span>
                <span>+2</span>
              </div>
            </div>

            {/* Input Tanggal Efektif */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 block flex items-center gap-2">
                <CalendarRange size={16} className="text-zinc-400"/> Berlaku Mulai Tanggal
              </label>
              <input 
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="text-xs text-zinc-500 mt-2">
                Tanggal sebelum ini tidak akan terkena efek kalibrasi (agar arsip lama tetap akurat).
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="mt-8 w-full bg-accent hover:bg-accent/90 text-white rounded-2xl py-3.5 font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <><Loader2 size={18} className="animate-spin" /> Menyimpan...</>
            ) : (
              <><Save size={18} /> Simpan Kalibrasi</>
            )}
          </button>
        </div>

        {/* Kolom Kanan: Info & Edukasi */}
        <div className="bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 md:p-8 border border-blue-100 dark:border-blue-900/30 h-fit">
          <div className="flex items-start gap-3 mb-4">
            <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-300">
              Penting Diketahui
            </h2>
          </div>
          
          <div className="space-y-4 text-sm text-blue-800 dark:text-blue-200/80 leading-relaxed">
            <p>
              <strong>1. Apakah Weton (Jawa) ikut bergeser?</strong><br/>
              <strong>TIDAK.</strong> Penanggalan dan Pasaran Jawa (Legi, Pahing, Pon, dsb.) bersifat statis abadi dan terikat pada kalender Matahari (Masehi/Gregorian). Jika kalibrasi Hijriyah di-set +1 hari, <em>hanya angka tanggal Hijriyah-nya saja yang berubah</em>, sedangkan Weton Jawanya akan tetap akurat.
            </p>
            <p>
              <strong>2. Kenapa Butuh "Berlaku Mulai"?</strong><br/>
              Kalibrasi tidak boleh diterapkan merata ke seluruh tanggal abadi. Jika Anda men-set +1 untuk bulan puasa tahun ini, sejarah bulan puasa tahun-tahun sebelumnya tidak boleh ikut bergeser. Fitur <em>"Berlaku Mulai"</em> memastikan kalibrasi hanya berdampak pada kalender sejak tanggal tersebut dan setelahnya.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
