'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  CloudDownload, Search, Save, AlertCircle, Loader2, ArrowRight,
  CheckCircle2, XCircle, Database
} from 'lucide-react';

export default function HadistApiImportPage() {
  const [sumberApi, setSumberApi] = useState('vercel');
  const [kitab, setKitab] = useState('bukhari');
  const [startNumber, setStartNumber] = useState('1');
  
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [pulledData, setPulledData] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStats, setImportStats] = useState({ success: 0, failed: 0 });

  const [viewMode, setViewMode] = useState<'preview' | 'imported'>('preview');
  const [importedData, setImportedData] = useState<any[]>([]);
  const [loadingImported, setLoadingImported] = useState(false);

  const supabase = createClient();

  const fetchImportedData = async () => {
    setLoadingImported(true);
    const { data, error } = await supabase
      .from('master_hadist_api')
      .select('*')
      .eq('kitab', kitab)
      .order('nomor', { ascending: true })
      .limit(100);
    
    if (!error && data) {
      setImportedData(data);
    }
    setLoadingImported(false);
  };

  React.useEffect(() => {
    if (viewMode === 'imported') {
      fetchImportedData();
    }
  }, [viewMode, kitab]);

  const handlePullData = async () => {
    // Estimasi jumlah hadist per kitab (bisa disesuaikan atau diambil dari API metadata jika ada)
    const kitabTotals: Record<string, number> = {
      'bukhari': 7008, 'muslim': 5362, 'tirmidzi': 3956, 'abudaud': 5274,
      'nasai': 5758, 'ibnumajah': 4341, 'ahmad': 27100, 'malik': 1587, 'darimi': 3367
    };
    
    const totalToFetch = kitabTotals[kitab] || 5000;
    const batchSize = 100; // Tarik per 100 agar aman
    
    setLoading(true);
    setErrorMsg('');
    setPulledData([]);
    setImportStats({ success: 0, failed: 0 });
    setProgress({ current: 0, total: totalToFetch });

    let allData: any[] = [];
    let hasError = false;

    // Mapping Kitab
    let mappedKitab = kitab;
    if (sumberApi === 'hadithapi') {
      const mapHadithApi: Record<string, string> = {
        'bukhari': 'sahih-bukhari', 'muslim': 'sahih-muslim', 'tirmidzi': 'al-tirmidhi',
        'abudaud': 'abu-dawood', 'nasai': 'sunan-an-nasai', 'ibnumajah': 'sunan-ibn-majah', 'malik': 'muwatta-malik'
      };
      mappedKitab = mapHadithApi[kitab] || kitab;
    } else if (sumberApi === 'sunnah') {
      const mapSunnah: Record<string, string> = {
        'tirmidzi': 'tirmidhi', 'abudaud': 'abudawud', 'ibnumajah': 'ibnmajah'
      };
      mappedKitab = mapSunnah[kitab] || kitab;
    }

    try {
      const initialStart = parseInt(startNumber) || 1;
      
      for (let start = initialStart; start <= totalToFetch; start += batchSize) {
        const end = Math.min(start + batchSize - 1, totalToFetch);
        setProgress({ current: start, total: totalToFetch });
        
        let batchData: any[] = [];
        
        if (sumberApi === 'vercel' || sumberApi === 'gading') {
          const baseUrl = sumberApi === 'vercel' ? 'https://hadis-api-id.vercel.app' : 'https://api.hadith.gading.dev';
          const pageNum = Math.ceil(start / batchSize);
          
          const fetchUrl = sumberApi === 'vercel'
            ? `${baseUrl}/hadith/${mappedKitab}?page=${pageNum}&limit=${batchSize}` // Vercel uses limit and page
            : `${baseUrl}/books/${mappedKitab}?range=${start}-${end}`; // Gading uses range
            
          const res = await fetch(fetchUrl);
          const data = await res.json();
          
          if (sumberApi === 'vercel' && data?.items) {
             batchData = data.items;
          } else if (sumberApi === 'gading' && data?.data?.hadiths) {
             batchData = data.data.hadiths;
          } else {
             throw new Error("Format API tidak sesuai dari " + sumberApi);
          }
        }
        else if (sumberApi === 'myquran') {
          // Batching request MyQuran agar tidak freeze karena 100 concurrent requests
          for (let i = start; i <= end; i += 20) {
            const chunkEnd = Math.min(i + 19, end);
            const requests = [];
            for (let j = i; j <= chunkEnd; j++) {
              requests.push(fetch(`https://api.myquran.com/v2/hadits/perawi/${mappedKitab}/${j}`).then(r => r.json()).catch(() => null));
            }
            const results = await Promise.all(requests);
            batchData.push(...results.filter((r: any) => r?.data?.arab).map((r: any) => ({
              number: r.data.number,
              arab: r.data.arab,
              id: r.data.id
            })));
            await new Promise(r => setTimeout(r, 100)); // Jeda kecil antar sub-batch
          }
        }
        else if (sumberApi === 'hadithapi') {
          const apiKey = process.env.NEXT_PUBLIC_HADITHAPI_KEY || 'YOUR_KEY';
          // Client fetch allows paginate
          const fetchUrl = `https://hadithapi.com/api/hadiths?apiKey=${apiKey}&book=${mappedKitab}&paginate=100&page=${Math.ceil(start/100)}`;
          const res = await fetch(fetchUrl);
          const data = await res.json();
          if (data?.hadiths?.data) {
             batchData = data.hadiths.data.map((h: any) => ({
              number: h.hadithNumber,
              arab: h.hadithArabic,
              id: h.hadithUrdu ? "Terjemahan Indo tidak tersedia (lihat Inggris)" : "",
              en: h.hadithEnglish,
              chapterId: h.chapterId,
              headingArabic: h.headingArabic,
              headingEnglish: h.headingEnglish,
              volume: h.volume,
              status: h.status
            }));
          }
        }
        
        if (batchData.length > 0) {
          allData.push(...batchData);
          // Set preview hanya 50 data pertama agar UI tidak kosong saat proses awal
          if (allData.length <= 100) {
            setPulledData([...allData]);
          }
        } else {
           // Jika data kosong, berarti sudah mentok di ujung kitab, stop loop!
           break;
        }
        
        // Delay kecil agar tidak di rate-limit
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (err: any) {
      setErrorMsg('Gagal menarik API secara langsung: ' + err.message);
      hasError = true;
    } finally {
      setLoading(false);
      setProgress({ current: totalToFetch, total: totalToFetch }); // Selesai
      setPulledData([...allData]); // Pastikan state memiliki semua data untuk diimpor
      if (!hasError) {
        alert(`Berhasil menarik ${allData.length} hadist dari API ke layar! Silakan klik tombol Simpan.`);
      }
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
        kitab: kitab, 
        nomor: h.number || parseInt(h.hadithNumber) || parseInt(h.id) || 0,
        teks_arab: h.arab || h.hadithArabic || h.body || '',
        terjemahan: h.id || h.en || h.hadithEnglish || h.hadithUrdu || '',
        terjemahan_inggris: h.en || h.hadithEnglish || null,
        terjemahan_urdu: h.urdu || h.hadithUrdu || null,
        judul_bab_arab: h.headingArabic || null,
        judul_bab_terjemahan: h.headingEnglish || null,
        nomor_bab: h.chapterId || h.chapterNumber || null,
        volume: h.volume || null,
        status_sanad: h.status || h.grade || null,
        sumber_api: sumberApi
      }));

      // Chunk payload into batches of 100 to avoid Supabase Payload Too Large errors
      const chunkSize = 100;
      setImportProgress({ current: 0, total: payload.length });
      
      for (let i = 0; i < payload.length; i += chunkSize) {
        const batch = payload.slice(i, i + chunkSize);
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbdvcwjdttcjirrsgwsj.supabase.co';
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_Mpf4AtQtblWyhe2KTWjrrA_vfAV0SBQ';
        
        const res = await fetch(`${supabaseUrl}/rest/v1/master_hadist_api`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates' // bypass unique constraint errors
          },
          body: JSON.stringify(batch)
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText}`);
        }
        
        setImportProgress({ current: Math.min(i + chunkSize, payload.length), total: payload.length });
      }
      
      // Jika berhasil tanpa error throw, anggap semua sukses (yang duplikat diabaikan dengan aman)
      success = pulledData.length;
      
    } catch (err: any) {
      console.error('Import Error:', err);
      let errMsg = err?.message || '';
      if (!errMsg && typeof err === 'object') {
        try {
          errMsg = JSON.stringify(err, Object.getOwnPropertyNames(err));
        } catch(e) {
          errMsg = String(err);
        }
      }
      setErrorMsg('Gagal menyimpan ke database: ' + errMsg);
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

      <div className="p-5 sm:p-7 space-y-6 font-jakarta text-slate-800 bg-slate-50/60 h-full overflow-y-auto">
        
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
            <div className="bg-white rounded-3xl border-2 border-indigo-50 shadow-lg shadow-indigo-100/40 p-5 flex flex-col gap-4">
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
                  <option value="vercel">Renomureza API (Vercel/Sutanlab)</option>
                  <option value="myquran">MyQuran Hadith API</option>
                  <option value="hadithapi">HadithAPI.com (Intl)</option>
                  <option value="sunnah">Sunnah.com API (v1)</option>
                  <option value="gading">API Hadith Gading (Kemenag)</option>
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
                <label className="text-xs font-bold text-slate-600 mb-1.5 block">Mulai dari Nomor (Resume)</label>
                <input 
                  type="number"
                  value={startNumber}
                  onChange={(e) => setStartNumber(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="Contoh: 1"
                  min="1"
                />
                <p className="text-[10px] text-slate-400 mt-1">Isi 1 untuk mulai dari awal. Isi nomor lain jika ingin melanjutkan penarikan yang terputus.</p>
              </div>

              {loading && progress.total > 0 && (
                <div className="mt-4 bg-slate-100 rounded-full h-2.5 w-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%` }}
                  ></div>
                  <p className="text-[10px] text-center mt-1 text-slate-500 font-medium">Menarik data: {progress.current} / {progress.total}</p>
                </div>
              )}

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
          <div className="lg:col-span-3 bg-white rounded-3xl border-2 border-indigo-50 shadow-lg shadow-indigo-100/40 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <button
                  onClick={() => setViewMode('preview')}
                  className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 ${viewMode === 'preview' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700 transition-colors'}`}
                >
                  <CloudDownload className="w-4 h-4" />
                  <span>Preview API</span>
                </button>
                <button
                  onClick={() => setViewMode('imported')}
                  className={`font-bold text-sm flex items-center gap-2 pb-1 border-b-2 ${viewMode === 'imported' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700 transition-colors'}`}
                >
                  <Database className="w-4 h-4" />
                  <span>Sudah Diimpor (Top 100)</span>
                </button>
              </div>
              {viewMode === 'preview' && pulledData.length > 0 && (
                <div className="flex flex-col items-end gap-2 relative z-10">
                  <button 
                    onClick={handleBulkImport}
                    disabled={isImporting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center gap-2 transition disabled:opacity-70 shadow-sm shadow-emerald-600/30"
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Import {pulledData.length} Hadist ke DB
                  </button>
                  
                  {isImporting && importProgress.total > 0 && (
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))}%` }}
                      ></div>
                    </div>
                  )}
                  {isImporting && (
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest">
                      MENYIMPAN: {importProgress.current} / {importProgress.total}
                    </span>
                  )}
                </div>
              )}
              
              {/* Progress Background Overlay */}
              {isImporting && importProgress.total > 0 && (
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-emerald-50/50 transition-all duration-500 z-0"
                  style={{ width: `${Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))}%` }}
                ></div>
              )}
            </div>

            <div className="flex-1 bg-slate-50/30 p-5 max-h-[75vh] overflow-y-auto">
              {viewMode === 'preview' ? (
                loading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-indigo-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-bold animate-pulse">Menghubungi Server API...</p>
                  </div>
                ) : pulledData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <ArrowRight className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-medium">Isi parameter di sebelah kiri lalu klik "Tarik Data Sekarang".</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pulledData.slice(0, 50).map((hadist, idx) => (
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
                    {pulledData.length > 50 && (
                      <div className="text-center p-4 text-slate-500 font-medium bg-slate-100/50 rounded-xl border border-slate-200">
                        + {pulledData.length - 50} hadist lainnya disembunyikan untuk menjaga performa browser.<br/>(Semua data tetap siap untuk diimpor).
                      </div>
                    )}
                  </div>
                )
              ) : (
                loadingImported ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 text-emerald-600">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-bold animate-pulse">Mengambil data dari Database...</p>
                  </div>
                ) : importedData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Database className="w-10 h-10 text-slate-300" />
                    <p className="text-sm font-medium">Belum ada data untuk kitab {kitab} di database.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {importedData.map((hadist, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm hover:border-emerald-300 transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-widest">
                            {hadist.kitab} - No. {hadist.nomor}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Dari: {hadist.sumber_api}</span>
                        </div>
                        <p className="arabic-text text-slate-800 text-lg font-semibold leading-loose text-right pb-3 border-b border-slate-50 mb-3">
                          {hadist.teks_arab}
                        </p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {hadist.terjemahan}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
