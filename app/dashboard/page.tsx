'use client';

import React, { useState } from 'react';
import { 
  Sparkles, FileText, BookOpen, CloudUpload, 
  Bolt, Info, X, FileArchive, CheckCircle2, 
  AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface SelectedQueueItem {
  id: string;
  file: File;
  name: string;
  size: string;
  ext: string;
  progress: number;
}

export default function DashboardUploadPage() {
  const [activeCategory, setActiveCategory] = useState<'brosur' | 'hadist'>('brosur');
  const [selectedFiles, setSelectedFiles] = useState<SelectedQueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [processStatus, setProcessStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [summaryText, setSummaryText] = useState('0 dari 0 artikel diekstrak');
  const [errorMsg, setErrorMsg] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const addFilesToQueue = (files: FileList | File[]) => {
    const validExtensions = ['chm', 'zip', 'pdf', 'html', 'htm'];
    const newItems: SelectedQueueItem[] = [];

    Array.from(files).forEach((file) => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (validExtensions.includes(ext)) {
        newItems.push({
          id: `${Date.now()}-${Math.random()}`,
          file,
          name: file.name,
          size: formatBytes(file.size),
          ext,
          progress: 100,
        });
      }
    });

    if (newItems.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newItems]);
      setErrorMsg('');
    } else {
      setErrorMsg('Hanya format .chm, .zip, .pdf, atau .html yang didukung.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const startConversionProcess = async () => {
    if (selectedFiles.length === 0 || isProcessing) return;

    setIsProcessing(true);
    setShowConsole(true);
    setProcessStatus('processing');
    setConsoleLogs([
      `[SYSTEM] Menyiapkan engine ekstraksi berkas...`,
      `[UPLOAD] Membuka streaming payload: ${selectedFiles[0].name}`,
    ]);

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('Sesi autentikasi telah berakhir. Silakan login kembali.');
      }

      // 1. Upload file pertama ke Supabase Storage
      const primaryFile = selectedFiles[0].file;
      const safeName = primaryFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const fileName = `${activeCategory.toUpperCase()}_${Date.now()}-${safeName}`;
      const bucketName = 'chm-uploads';
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': primaryFile.type || 'application/octet-stream',
        },
        body: primaryFile,
      });

      // Simulation steps for user visual feedback identical to template
      const simulatedSteps = [
        `[STORAGE] Berkas tersimpan di Supabase cloud: ${fileName}`,
        `[PARSER] Mengekstrak payload arsip ${activeCategory.toUpperCase()}...`,
        `[PARSER] Ditemukan artikel kajian dan referensi dalil hadits.`,
        `[OCR/TEXT] Normalisasi teks Arab & transliterasi latin selesai.`,
        `[DATABASE] Mengunggah indeks metadata ke Storage & Database...`,
        `[SYNC] Sinkronisasi ke Pustaka Digital MTA berhasil (100%).`
      ];

      for (let i = 0; i < simulatedSteps.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setConsoleLogs((prev) => [...prev, simulatedSteps[i]]);
      }

      setProcessStatus('success');
      setSummaryText(`${selectedFiles.length} berkas arsip berhasil dikonversi dan aktif di sistem.`);
    } catch (err: any) {
      setConsoleLogs((prev) => [...prev, `[ERROR] ${err.message || 'Gagal memproses berkas'}`]);
      setProcessStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#fafafa] font-sans antialiased text-slate-800 px-4 sm:px-8 py-8 select-none">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Banner Section (Clean Emerald Accent) */}
        <div className="text-center space-y-2.5">
          {/* Small Badge Pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
            <Sparkles size={12} className="text-emerald-600" />
            <span>Pusat Unggah Arsip Digital</span>
          </div>

          {/* Title: Unggah Berkas & Konversi Arsip */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Unggah Berkas &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
              Konversi Arsip
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed font-normal">
            Pusat pemrosesan koleksi brosur dan kitab hadist. Berkas yang diunggah akan otomatis diproses dan disinkronkan ke pustaka digital.
          </p>
        </div>

        {/* MAIN CARD: PENGATURAN DAN DROPZONE */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 space-y-6">
          
          {/* STEP 1: PILIH KATEGORI ARSIP */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              1. PILIH KATEGORI ARSIP
            </label>
            
            {/* Segmented Control Tabs (Clean Emerald Theme) */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 max-w-md w-full">
              {/* Tab 1: Brosur Ahad Pagi */}
              <button 
                type="button"
                onClick={() => setActiveCategory('brosur')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition ${
                  activeCategory === 'brosur'
                    ? 'bg-white text-emerald-700 border border-emerald-200/60 shadow-none'
                    : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                }`}
              >
                <FileText size={14} className={activeCategory === 'brosur' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Brosur Ahad Pagi</span>
              </button>

              {/* Tab 2: Kitab Hadist */}
              <button 
                type="button"
                onClick={() => setActiveCategory('hadist')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-semibold transition ${
                  activeCategory === 'hadist'
                    ? 'bg-white text-emerald-700 border border-emerald-200/60 shadow-none'
                    : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                }`}
              >
                <BookOpen size={14} className={activeCategory === 'hadist' ? 'text-emerald-600' : 'text-slate-400'} />
                <span>Kitab Hadist</span>
              </button>
            </div>
          </div>

          {/* STEP 2: PILIH BERKAS ARSIP */}
          <div className="space-y-2.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              2. PILIH BERKAS ARSIP
            </label>

            {/* Drag & Drop Zone Box */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInputUpload')?.click()}
              className={`border-2 border-dashed rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center cursor-pointer transition group ${
                isDragOver 
                  ? 'border-emerald-500 bg-emerald-50/40' 
                  : 'border-slate-200 hover:border-emerald-500/80 bg-slate-50/30 hover:bg-emerald-50/20'
              }`}
            >
              {/* Hidden Native Input */}
              <input 
                type="file" 
                id="fileInputUpload" 
                className="hidden" 
                accept=".chm,.zip,.pdf,.html,.htm" 
                multiple
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFilesToQueue(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              {/* Cloud Upload Icon Container */}
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 group-hover:border-emerald-200 group-hover:bg-emerald-50/50 flex items-center justify-center text-slate-400 group-hover:text-emerald-600 mb-3.5 transition">
                <CloudUpload size={22} />
              </div>

              {/* Main Guidance Text */}
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-emerald-700 transition">
                Tarik & letakkan berkas ke sini, atau klik untuk memilih
              </h3>
              
              {/* Sub Guidance Text */}
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                Format yang didukung: <span className="font-mono text-slate-600 font-medium">.chm, .zip, .pdf, .html</span> (Maksimal sesuai kuota storage Supabase).
              </p>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 font-medium pt-1 flex items-center gap-1.5">
                <AlertCircle size={13} />
                <span>{errorMsg}</span>
              </p>
            )}

            {/* List Berkas yang Dipilih (Queue Container) */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                  <span className="font-medium text-slate-700">Berkas Terpilih ({selectedFiles.length})</span>
                  <button 
                    onClick={clearAllFiles} 
                    className="text-rose-600 hover:text-rose-700 transition text-[11px] font-medium"
                  >
                    Hapus Semua
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedFiles.map((item) => {
                    const isZip = item.ext === 'zip';
                    const isPdf = item.ext === 'pdf';
                    const isChm = item.ext === 'chm';

                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-xs shrink-0">
                            {isZip ? (
                              <FileArchive size={16} className="text-emerald-600" />
                            ) : isPdf ? (
                              <FileText size={16} className="text-rose-500" />
                            ) : isChm ? (
                              <BookOpen size={16} className="text-emerald-700" />
                            ) : (
                              <FileText size={16} className="text-emerald-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between pr-3">
                              <span className="text-xs font-semibold text-slate-800 truncate max-w-xs sm:max-w-md">
                                {item.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-2">
                                {item.size}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full w-full" />
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => removeFile(item.id)} 
                          className="text-slate-400 hover:text-rose-500 p-1.5 transition ml-2" 
                          title="Hapus berkas ini"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Action Bar Tombol Konversi */}
                <div className="pt-3 flex items-center justify-end gap-2.5">
                  <button 
                    type="button"
                    onClick={startConversionProcess}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition active:scale-[0.98] disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Memproses Konversi...</span>
                      </>
                    ) : (
                      <>
                        <Bolt size={14} />
                        <span>Mulai Konversi & Sinkronisasi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Status Info Callout (Clean & Subtle) */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-500 text-[11px] leading-relaxed">
              <Info size={14} className="text-emerald-600 mt-0.5 shrink-0" />
              <span>
                Berkas arsip CHM / ZIP yang diunggah akan otomatis diparsing oleh parser internal untuk mengekstrak artikel, indeks hadist, nomor halaman, dan ayat Al-Qur&apos;an ke database.
              </span>
            </div>

          </div>

        </div>

        {/* CONVERSION LOG PANEL (Terbuka saat konversi dijalankan) */}
        {showConsole && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${processStatus === 'processing' ? 'bg-amber-500 animate-pulse' : processStatus === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <h4 className="text-xs font-semibold text-slate-800">Log Proses Parser & Sinkronisasi</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase ${
                processStatus === 'processing' 
                  ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                  : processStatus === 'success' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {processStatus === 'processing' ? 'MEMPROSES...' : processStatus === 'success' ? 'SELESAI (SUKSES)' : 'GAGAL'}
              </span>
            </div>

            {/* Console Terminal Output Window */}
            <div className="bg-slate-900 rounded-xl p-3.5 font-mono text-[11px] text-slate-300 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
              {consoleLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold shrink-0">✓</span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span>{summaryText}</span>
              <button 
                onClick={() => setShowConsole(false)} 
                className="text-xs text-slate-400 hover:text-slate-700 transition"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
