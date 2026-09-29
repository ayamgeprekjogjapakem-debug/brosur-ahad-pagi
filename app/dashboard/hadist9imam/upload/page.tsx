'use client';

import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ChevronRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

export default function UploadHadistPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'extracting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const [uploadMode, setUploadMode] = useState<'local' | 'cloud'>('local');
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [selectedCloudFile, setSelectedCloudFile] = useState('');

  const supabase = createClient();

  const fetchCloudFiles = async () => {
    setIsFetchingCloud(true);
    try {
      const { data, error } = await supabase.storage.from('chm-uploads').list();
      if (!error && data) {
        // filter out folders or system files if needed, keeping only .chm
        const chms = data.filter(f => f.name.toLowerCase().endsWith('.chm') || f.name.toLowerCase().includes('kitab'));
        setCloudFiles(chms);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingCloud(false);
    }
  };

  React.useEffect(() => {
    fetchCloudFiles();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setStatus('idle');
    }
  };

  const [previewResult, setPreviewResult] = useState<{ 
    filesCount: number, 
    fileName: string, 
    files: string[],
    existingIds: string[] 
  } | null>(null);

  // Pagination & Filter State
  const [filterStatus, setFilterStatus] = useState<'all' | 'extracted' | 'unextracted'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isTableCollapsed, setIsTableCollapsed] = useState(false);

  const handleProcess = async () => {
    if (uploadMode === 'local' && !file) return;
    if (uploadMode === 'cloud' && !selectedCloudFile) return;

    setIsUploading(true);
    setStatus('uploading');
    setMessage('Mempersiapkan & Menganalisis file...');
    setProgress(0);
    
    try {
      let targetFileName = selectedCloudFile;

      if (uploadMode === 'local' && file) {
        setMessage('Mengunggah file CHM...');
        const fileName = `kitab_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('chm-uploads').upload(fileName, file);
        
        if (uploadError) throw new Error('Gagal mengunggah file ke Supabase Storage');
        targetFileName = fileName;
      }

      setMessage(`Membaca struktur file ${targetFileName}...`);

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: targetFileName,
          action: 'preview',
          destination: 'hadist_chm'
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Terjadi kesalahan sistem');

      setPreviewResult({ 
        filesCount: result.files?.length || 0, 
        fileName: targetFileName,
        files: result.files || [],
        existingIds: result.existingIds || []
      });
      setSelectedItems(new Set());
      setCurrentPage(1);
      setFilterStatus('all');
      setStatus('idle');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan sistem saat menganalisis file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmExtract = async (testOnly: boolean = false) => {
    if (!previewResult) return;
    
    const filesToExtract = testOnly ? previewResult.files.slice(0, 5) : Array.from(selectedItems).length > 0 ? Array.from(selectedItems) : [];
    const isExtractingSelected = Array.from(selectedItems).length > 0 && !testOnly;
    
    setIsUploading(true);
    setStatus('extracting');
    setMessage(testOnly ? 'Menguji ekstraksi 5 dokumen pertama...' : isExtractingSelected ? `Mengekstrak ${filesToExtract.length} dokumen pilihan...` : `Mengekstrak ${previewResult.filesCount} dokumen ke database... (Sangat lama, rawan timeout)`);
    setPreviewResult(null);
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => (prev < 95 ? prev + 1 : prev));
      }, 500);

      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: previewResult.fileName,
          action: 'extract',
          destination: 'hadist_chm',
          selectedFiles: filesToExtract
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Terjadi kesalahan saat ekstraksi');

      setStatus('success');
      // In API, it returns `success: true, message: "...", details: extractResults`
      const insertedCount = result.details?.filter((d: any) => d.status === 'success')?.length || 0;
      setMessage(`Berhasil! ${insertedCount} dokumen hadist berhasil diekstrak dan disimpan.`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan sistem saat ekstraksi');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAutoExtractAll = async () => {
    if (!previewResult) return;
    
    // Ambil semua file yang belum diekstrak
    const unextractedFiles = previewResult.files.filter(f => {
      const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
      return !previewResult.existingIds.includes(id);
    });

    if (unextractedFiles.length === 0) {
      setMessage('Semua file sudah diekstrak ke database.');
      return;
    }
    
    setIsUploading(true);
    setStatus('extracting');
    setProgress(0);

    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(unextractedFiles.length / BATCH_SIZE);
    let totalInserted = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batchFiles = unextractedFiles.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        
        setMessage(`Mengekstrak otomatis: Batch ${i + 1} dari ${totalBatches} (${batchFiles.length} file)... Jangan tutup halaman ini.`);
        
        const res = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: previewResult.fileName,
            action: 'extract',
            destination: 'hadist_chm',
            selectedFiles: batchFiles
          })
        });

        if (!res.ok) {
          const errRes = await res.json();
          throw new Error(errRes.error || `Gagal di batch ${i + 1}`);
        }

        const result = await res.json();
        const insertedCount = result.details?.filter((d: any) => d.status === 'success')?.length || 0;
        totalInserted += insertedCount;

        setProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setStatus('success');
      setMessage(`Otomatisasi Berhasil! ${totalInserted} dokumen sisa berhasil diekstrak secara bertahap tanpa RTO.`);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Terjadi kesalahan saat ekstraksi otomatis');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#fbfbfd] p-8 md:p-12 selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto">
        {/* Header - Apple Style */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-emerald-600 mb-3">
            <Link href="/dashboard/hadist9imam" className="hover:underline">Koleksi</Link>
            <ChevronRight className="w-3 h-3" />
            <span>Upload CHM</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-4">
            Upload & Ekstrak <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
              Kitab Hadist CHM
            </span>
          </h1>
          <p className="text-lg text-zinc-500 max-w-2xl font-medium leading-relaxed">
            Sistem otomatis akan membedah file CHM dan memisahkan Judul, Teks Arab, dan Terjemahan Indonesia dengan antrean memori yang optimal.
          </p>
        </div>

        {/* Upload Card - Glassmorphism & Smooth Corners */}
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.03]">
          
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center text-center py-10">
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-2xl font-semibold text-zinc-900 mb-3">Ekstraksi Selesai!</h3>
              <p className="text-zinc-500 mb-8 max-w-md">Seluruh file hadist berhasil dipisahkan dan dimasukkan ke dalam database. Anda sekarang bisa melihatnya di daftar Koleksi.</p>
              <Link href="/dashboard/hadist9imam" className="px-8 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full font-medium transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Lihat Daftar Hadist
              </Link>
            </div>
          ) : (
            <>
              {/* Tabs Upload vs Cloud */}
              <div className="flex bg-zinc-100/50 p-1 rounded-xl mb-8 w-fit mx-auto">
                <button
                  onClick={() => setUploadMode('local')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${uploadMode === 'local' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Upload Baru
                </button>
                <button
                  onClick={() => setUploadMode('cloud')}
                  className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${uploadMode === 'cloud' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                >
                  Pilih dari Cloud
                </button>
              </div>

              {uploadMode === 'local' ? (
                /* Dropzone Area */
                <label 
                  className={`relative flex flex-col items-center justify-center w-full h-72 border-2 border-dashed rounded-[1.5rem] cursor-pointer transition-all duration-300
                  ${file ? 'border-emerald-500 bg-emerald-50/50' : 'border-zinc-200 hover:border-emerald-400 hover:bg-zinc-50/50 bg-white'}`}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {file ? (
                      <FileText className="w-14 h-14 text-emerald-500 mb-4" />
                    ) : (
                      <UploadCloud className="w-14 h-14 text-zinc-300 mb-4" />
                    )}
                    <p className="mb-2 text-lg font-medium text-zinc-700">
                      {file ? file.name : <><span className="font-semibold text-emerald-600">Klik untuk upload</span> atau drag and drop</>}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : 'CHM File (Maksimal 50MB)'}
                    </p>
                  </div>
                  <input type="file" className="hidden" accept=".chm" onChange={handleFileChange} disabled={isUploading} />
                </label>
              ) : (
                /* Cloud Selection Area */
                <div className="w-full h-72 border border-zinc-200 rounded-[1.5rem] bg-white overflow-hidden flex flex-col">
                  <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                    <h3 className="font-semibold text-zinc-700">File Tersimpan di Cloud</h3>
                    <button onClick={fetchCloudFiles} className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
                      Refresh
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {isFetchingCloud ? (
                      <div className="flex items-center justify-center h-full text-zinc-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Memuat data...
                      </div>
                    ) : cloudFiles.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-zinc-400 text-sm">
                        Belum ada file CHM di cloud.
                      </div>
                    ) : (
                      cloudFiles.map((cfile, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedCloudFile(cfile.name)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                            selectedCloudFile === cfile.name 
                              ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500' 
                              : 'border-zinc-100 hover:border-emerald-200 hover:bg-emerald-50/10'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className={`w-5 h-5 shrink-0 ${selectedCloudFile === cfile.name ? 'text-emerald-500' : 'text-zinc-400'}`} />
                            <div className="truncate">
                              <p className={`font-medium truncate ${selectedCloudFile === cfile.name ? 'text-emerald-700' : 'text-zinc-700'}`}>
                                {cfile.name}
                              </p>
                              <p className="text-xs text-zinc-400">
                                {new Date(cfile.created_at).toLocaleDateString('id-ID')}
                              </p>
                            </div>
                          </div>
                          {selectedCloudFile === cfile.name && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Progress & Error Area */}
              {(status === 'uploading' || status === 'extracting') && (
                <div className="mt-8 bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                      <span className="font-medium text-zinc-700">{message}</span>
                    </div>
                    <span className="font-semibold text-emerald-600">{progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }}></div>
                  </div>
                  <p className="text-xs text-zinc-400 mt-4 text-center">Mohon jangan tutup halaman ini selama proses berjalan.</p>
                </div>
              )}

              {status === 'error' && (
                <div className="mt-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{message}</p>
                </div>
              )}

              {/* Preview Confirmation */}
              {previewResult && status === 'idle' && (
                <div className="mt-8 bg-amber-50/50 border border-amber-200/60 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900 mb-4">Analisis File Selesai</h3>
                      
                      {/* Statistik Ekstraksi */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm flex flex-col items-center text-center">
                          <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Total Dokumen</span>
                          <span className="text-2xl font-bold text-zinc-800">{previewResult.filesCount}</span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm flex flex-col items-center text-center">
                          <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Sudah Diekstrak</span>
                          <span className="text-2xl font-bold text-emerald-600">{previewResult.existingIds.length}</span>
                        </div>
                        <div className="bg-white rounded-xl p-3 border border-amber-200/60 shadow-sm flex flex-col items-center text-center">
                          <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Belum Diekstrak</span>
                          <span className="text-2xl font-bold text-amber-600">{previewResult.filesCount - previewResult.existingIds.length}</span>
                        </div>
                      </div>

                      {/* RTO Alert */}
                      {(selectedItems.size > 200 || (selectedItems.size === 0 && previewResult.filesCount > 200)) && (
                        <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200/60 shadow-sm">
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">
                            <strong>Peringatan RTO:</strong> Mengekstrak semuanya dengan tombol biasa berisiko memicu <span className="underline">Request Timeout (RTO)</span>. Disarankan menggunakan fitur <strong>"Ekstrak Sisa (Otomatis & Aman)"</strong> untuk melakukan ekstraksi secara bertahap di balik layar tanpa RTO!
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => setPreviewResult(null)}
                          className="px-5 py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-xl font-medium transition-all text-sm"
                        >
                          Batal
                        </button>
                        <button
                          onClick={() => handleConfirmExtract(true)}
                          className="px-5 py-2.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-700 rounded-xl font-medium transition-all text-sm"
                        >
                          Uji Coba (5 File)
                        </button>
                        {selectedItems.size > 0 ? (
                          <button
                            onClick={() => handleConfirmExtract(false)}
                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 text-sm"
                          >
                            Ekstrak {selectedItems.size} Pilihan
                          </button>
                        ) : (
                          <button
                            onClick={handleAutoExtractAll}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-all shadow-md shadow-emerald-500/20 flex items-center gap-2 text-sm ml-auto"
                          >
                            Ekstrak Sisa (Otomatis & Aman)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Table & Pagination for Preview Files */}
                  <div className="mt-8 border-t border-amber-200/50 pt-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                      <div 
                        className="flex items-center gap-2 cursor-pointer select-none group"
                        onClick={() => setIsTableCollapsed(!isTableCollapsed)}
                      >
                        <h4 className="font-semibold text-zinc-800 group-hover:text-amber-600 transition-colors">Daftar Dokumen Ditemukan</h4>
                        {isTableCollapsed ? <ChevronDown size={18} className="text-zinc-400 group-hover:text-amber-500" /> : <ChevronUp size={18} className="text-zinc-400 group-hover:text-amber-500" />}
                      </div>
                      
                      {!isTableCollapsed && (
                        <select 
                          className="bg-white border border-zinc-200 text-sm rounded-lg px-3 py-2 text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                          value={filterStatus}
                          onChange={(e) => {
                            setFilterStatus(e.target.value as any);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="all">Tampilkan Semua</option>
                          <option value="extracted">Sudah Diekstrak</option>
                          <option value="unextracted">Belum Diekstrak</option>
                        </select>
                      )}
                    </div>

                    {!isTableCollapsed && (
                      <>
                      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                            <tr>
                              <th className="px-4 py-3 font-medium w-12 text-center">
                                <input 
                                  type="checkbox" 
                                  className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      // Hanya centang (Select All) file yang sedang TAMPIL DI HALAMAN INI
                                      const filteredFiles = previewResult.files.filter(f => {
                                        const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                        const isExtracted = previewResult.existingIds.includes(id);
                                        if (filterStatus === 'extracted') return isExtracted;
                                        if (filterStatus === 'unextracted') return !isExtracted;
                                        return true;
                                      });
                                      const paginated = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                      
                                      const newSet = new Set(selectedItems);
                                      paginated.forEach(f => newSet.add(f));
                                      setSelectedItems(newSet);
                                    } else {
                                      // Hilangkan centang file di halaman ini saja
                                      const filteredFiles = previewResult.files.filter(f => {
                                        const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                        const isExtracted = previewResult.existingIds.includes(id);
                                        if (filterStatus === 'extracted') return isExtracted;
                                        if (filterStatus === 'unextracted') return !isExtracted;
                                        return true;
                                      });
                                      const paginated = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                      
                                      const newSet = new Set(selectedItems);
                                      paginated.forEach(f => newSet.delete(f));
                                      setSelectedItems(newSet);
                                    }
                                  }}
                                  checked={(() => {
                                    const filteredFiles = previewResult.files.filter(f => {
                                      const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                      const isExtracted = previewResult.existingIds.includes(id);
                                      if (filterStatus === 'extracted') return isExtracted;
                                      if (filterStatus === 'unextracted') return !isExtracted;
                                      return true;
                                    });
                                    const paginated = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                                    if (paginated.length === 0) return false;
                                    return paginated.every(f => selectedItems.has(f));
                                  })()}

                                />
                              </th>
                              <th className="px-4 py-3 font-medium">Path File</th>
                              <th className="px-4 py-3 font-medium">ID / Judul</th>
                              <th className="px-4 py-3 font-medium">Status Database</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {(() => {
                              const filteredFiles = previewResult.files.filter(f => {
                                const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                const isExtracted = previewResult.existingIds.includes(id);
                                if (filterStatus === 'extracted') return isExtracted;
                                if (filterStatus === 'unextracted') return !isExtracted;
                                return true;
                              });

                              const paginated = filteredFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                              
                              if (filteredFiles.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                                      Tidak ada data yang sesuai filter.
                                    </td>
                                  </tr>
                                );
                              }

                              return paginated.map((file, idx) => {
                                const id = file.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                const isExtracted = previewResult.existingIds.includes(id);
                                const isSelected = selectedItems.has(file);
                                
                                return (
                                  <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                                    <td className="px-4 py-3 text-center">
                                      <input 
                                        type="checkbox" 
                                        className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          const newSet = new Set(selectedItems);
                                          if (e.target.checked) newSet.add(file);
                                          else newSet.delete(file);
                                          setSelectedItems(newSet);
                                        }}
                                      />
                                    </td>
                                    <td className="px-4 py-3 text-zinc-600 font-mono text-xs">{file}</td>
                                    <td className="px-4 py-3 text-zinc-900 font-medium">{id}</td>
                                    <td className="px-4 py-3">
                                      {isExtracted ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3" /> Sudah Diekstrak
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                                          Belum Diekstrak
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Pagination Controls */}
                      <div className="bg-zinc-50 border-t border-zinc-200 px-4 py-3 flex items-center justify-between">
                        <span className="text-sm text-zinc-500">
                          Total terpilih: <strong className="text-zinc-900">{selectedItems.size}</strong> dari {previewResult.files.length}
                        </span>
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            Sebelumnya
                          </button>
                          <span className="text-sm font-medium text-zinc-700 px-2">{currentPage}</span>
                          <button 
                            disabled={
                              (() => {
                                const filteredFiles = previewResult.files.filter(f => {
                                  const id = f.split('/').pop()?.replace(/\.html?$/i, '') || '';
                                  const isExtracted = previewResult.existingIds.includes(id);
                                  if (filterStatus === 'extracted') return isExtracted;
                                  if (filterStatus === 'unextracted') return !isExtracted;
                                  return true;
                                });
                                return currentPage >= Math.ceil(filteredFiles.length / itemsPerPage);
                              })()
                            }
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 text-sm hover:bg-zinc-50 disabled:opacity-50"
                          >
                            Selanjutnya
                          </button>
                        </div>
                      </div>
                      </div>
                      </>
                    )}
                  </div>

                </div>
              )}

              {/* Action Button */}
              {!previewResult && ((uploadMode === 'local' && file) || (uploadMode === 'cloud' && selectedCloudFile)) && status !== 'uploading' && status !== 'extracting' && (
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleProcess}
                    className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-medium transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Menganalisis Kitab...
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
