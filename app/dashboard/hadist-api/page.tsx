'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  CloudDownload, Search, Save, AlertCircle, Loader2, ArrowRight,
  CheckCircle2, XCircle, Database
} from 'lucide-react';

export default function HadistApiImportPage() {
  const [sumberApi, setSumberApi] = useState('gading');
  const [kitab, setKitab] = useState('bukhari');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('50');
  
  const [loading, setLoading] = useState(false);
  const [pulledData, setPulledData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  const supabase = createClient();

  const handlePullData = async () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end < start) {
      setErrorMsg('Range tidak valid. Pastikan nomor awal lebih kecil dari nomor akhir, minimal 1.');
      return;
    }
    
    if (end - start + 1 > 300) {
      setErrorMsg('Maksimal penarikan API adalah 300 hadist dalam satu waktu.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setPulledData([]);
    setImportStats({ success: 0, failed: 0 });

    try {
      const proxyUrl = `/api/hadist/proxy?sumberApi=${encodeURIComponent(sumberApi)}&kitab=${kitab}&start=${start}&end=${end}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      
      if (data && data.data && data.data.hadiths) {
        setPulledData(data.data.hadiths);
      } else if (data.error) {
        setErrorMsg('Proxy Error: ' + data.error);
      } else {
        setErrorMsg('Gagal memproses data dari API. Pastikan format range benar.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal menghubungi server API Gading: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkImport = async () => {
    if (pulledData.length === 0) return;
    
    const confirmMsg = `Anda akan memasukkan ${pulledData.length} hadist ke dalam tabel master_hadist_api. Lanjutkan?`;
    if (!window.confirm(confirmMsg)) return;

    setIsImporting(true);
    let success = 0;
    let failed = 0;

    // Supabase merekomendasikan batch insert (bulk insert) daripada satu per satu,
    // tapi karena mungkin ada data duplikat (Unique constraint pada kitab+nomor), 
    // kita akan insert secara massal dan mengabaikan error duplicate (onConflict).
    // Namun supabase client js tidak mendukung UPSERT ignore by default kecuali diset di onConflict.
    // Kita lakukan bulk insert (payload)
    
    try {
      const payload = pulledData.map(h => ({
        kitab: kitab, // name of the kitab
        nomor: h.number,
        teks_arab: h.arab,
        terjemahan: h.id
      }));

      // upsert dengan onConflict kitab,nomor agar duplikat diabaikan/diperbarui
      const { data, error } = await supabase
        .from('master_hadist_api')
        .upsert(payload, { onConflict: 'kitab,nomor', ignoreDuplicates: true });

      if (error) {
        throw error;
      }
      
      // Jika berhasil tanpa error throw, anggap semua sukses (yang duplikat diabaikan dengan aman)
      success = pulledData.length;
      
    } catch (err: any) {
      console.error('Import Error:', err);
      setErrorMsg('Sebagian atau seluruh data gagal diimpor: ' + err.message);
      failed = pulledData.length;
    }

    setImportStats({ success, failed });
    setIsImporting(false);
    
    if (success > 0) {
      alert(`Impor selesai! Berhasil: ${success} baris.`);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Amiri:wght@400;700&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .arabic-text { font-family: 'Amiri', serif; direction: rtl; }
      `}} />

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 min-h-full">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-44 h-44 bg-gradient-to-bl from-blue-100/50 to-indigo-50/20 rounded-full pointer-events-none blur-2xl"></div>
          
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold mb-1">
              <CloudDownload className="w-4 h-4" />
              <span>Mass-Importer Tool</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Impor Hadist API</h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Tarik ratusan data hadist (teks Arab & terjemahan sempurna) dari internet dan masukkan ke *database* internal secara massal. Data ini akan tersimpan di tabel <strong>master_hadist_api</strong> sebagai referensi baku.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* KOLOM KIRI: KONFIGURASI PENARIKAN */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 flex flex-col gap-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <Search className="w-4 h-4 text-indigo-600" />
                <span>Parameter Tarik API</span>
              </h4>
              
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Sumber API</label>
                <select 
                  value={sumberApi}
                  onChange={(e) => setSumberApi(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="gading">API Hadith Gading (Kemenag)</option>
                  <option value="vercel">Renomureza API (Vercel Node)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Pilih Kitab Utama</label>
                <select 
                  value={kitab}
                  onChange={(e) => setKitab(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="bukhari">Sahih Bukhari</option>
                  <option value="muslim">Sahih Muslim</option>
                  <option value="tirmidzi">Sunan Tirmidzi</option>
                  <option value="abudaud">Sunan Abu Daud</option>
                  <option value="nasai">Sunan Nasai</option>
                  <option value="ibnumajah">Sunan Ibnu Majah</option>
                  <option value="ahmad">Musnad Ahmad</option>
                  <option value="malik">Muwatta Malik</option>
                  <option value="darimi">Sunan Darimi</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Range Nomor (Maks 300)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="number"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Awal"
                  />
                  <span className="text-slate-400 font-semibold">-</span>
                  <input 
                    type="number"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Akhir"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-lg flex items-start gap-2 border border-rose-100 mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button 
                onClick={handlePullData}
                disabled={loading}
                className="w-full mt-2 inline-flex justify-center items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/30 transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudDownload className="w-4 h-4" />}
                Tarik Data Sekarang
              </button>
            </div>
            
            {/* Status Card (jika sudah import) */}
            {importStats.success > 0 || importStats.failed > 0 ? (
              <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Status Impor Terakhir</span>
                </h4>
                <div className="space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center text-emerald-700 bg-emerald-50 p-2 rounded-lg">
                    <span>Berhasil Diimpor:</span>
                    <span>{importStats.success} baris</span>
                  </div>
                  {importStats.failed > 0 && (
                     <div className="flex justify-between items-center text-rose-700 bg-rose-50 p-2 rounded-lg">
                       <span>Gagal/Duplikat:</span>
                       <span>{importStats.failed} baris</span>
                     </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* KOLOM KANAN: PREVIEW DATA & IMPORT */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/70 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Preview Data Tarikan API</span>
              </h4>
              {pulledData.length > 0 && (
                <button 
                  onClick={handleBulkImport}
                  disabled={isImporting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2 transition disabled:opacity-70 shadow-sm shadow-emerald-600/30"
                >
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Import {pulledData.length} Hadist ke DB
                </button>
              )}
            </div>

            <div className="flex-1 bg-slate-50/30 p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-indigo-600">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-bold animate-pulse">Menghubungi Server API Gading...</p>
                </div>
              ) : pulledData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <ArrowRight className="w-10 h-10 text-slate-300" />
                  <p className="text-sm font-medium">Isi parameter di sebelah kiri lalu klik "Tarik Data Sekarang".</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pulledData.map((hadist, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-center mb-3">
                        <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-widest">
                          {kitab} - No. {hadist.number}
                        </span>
                      </div>
                      <p className="arabic-text text-slate-800 text-lg font-semibold leading-loose text-right pb-3 border-b border-slate-50 mb-3">
                        {hadist.arab}
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {hadist.id}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
