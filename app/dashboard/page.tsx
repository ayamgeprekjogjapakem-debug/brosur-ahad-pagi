'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

export default function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'brosur' | 'hadist'>('brosur');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'chm' || ext === 'zip' || ext === 'pdf' || ext === 'html' || ext === 'htm') {
        setSelectedFile(file);
        setUploadStatus(null);
        setUploadProgress(0);
      } else {
        setUploadStatus({ type: 'error', message: 'Hanya file .chm, .zip, .pdf, atau .html yang diperbolehkan.' });
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    setUploadStatus(null);
    setUploadProgress(0);

    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sesi tidak valid, silakan login ulang.');
      }

      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const fileName = `${uploadType.toUpperCase()}_${Date.now()}-${safeName}`;
      const bucketName = 'chm-uploads';
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

      // Menggunakan XMLHttpRequest agar bisa membaca persentase onprogress
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      };

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${session.access_token}`);
      // Supabase Storage REST API (non-multipart) expects the raw file body
      xhr.setRequestHeader('Content-Type', selectedFile.type || 'application/octet-stream');
      
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadStatus({ type: 'success', message: 'File berhasil diunggah langsung ke Cloud.' });
          setSelectedFile(null);
          setIsUploading(false);
          setUploadProgress(100);
        } else {
          try {
            const errorRes = JSON.parse(xhr.responseText);
            setUploadStatus({ type: 'error', message: errorRes.message || 'Gagal mengunggah file.' });
          } catch (e) {
            setUploadStatus({ type: 'error', message: 'Terjadi kesalahan saat mengunggah.' });
          }
          setIsUploading(false);
        }
      };

      xhr.onerror = function() {
        setUploadStatus({ type: 'error', message: 'Gagal terhubung ke server (Network Error).' });
        setIsUploading(false);
      };

      xhr.send(selectedFile);
      
    } catch (err: any) {
      console.error('Direct upload error:', err);
      setUploadStatus({ type: 'error', message: err.message || 'Terjadi kesalahan.' });
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto py-2">
        <motion.div 
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Apple Style Page Header */}
          <header className="mb-8">
            <h1 className="text-[28px] md:text-[32px] font-semibold tracking-[-0.03em] text-zinc-900 dark:text-zinc-100">
              Upload Arsip
            </h1>
            <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl font-normal leading-relaxed">
              Pilih file arsip berformat CHM, ZIP, HTML, atau PDF untuk memproses dan menambahkan data ke sistem.
            </p>
          </header>

          <div className="bg-white/80 dark:bg-zinc-900/60 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.08] rounded-[24px] p-6 md:p-8 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] relative overflow-hidden">
            
            {/* Apple Segmented Control */}
            <div className="mb-8">
              <label className="block text-[12px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2.5">
                Kategori Berkas
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-[14px] max-w-md">
                <button 
                  type="button"
                  onClick={() => setUploadType('brosur')}
                  className={`py-2 px-4 rounded-[11px] text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    uploadType === 'brosur' 
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FileText size={16} strokeWidth={2} />
                  <span>Brosur Ahad Pagi</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setUploadType('hadist')}
                  className={`py-2 px-4 rounded-[11px] text-[13px] font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                    uploadType === 'hadist' 
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]' 
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <FileText size={16} strokeWidth={2} />
                  <span>Kitab Hadist</span>
                </button>
              </div>
            </div>

            {/* Apple Style Drag & Drop Area */}
            <div className="border border-dashed border-black/[0.12] dark:border-white/[0.14] rounded-[20px] p-10 md:p-14 flex flex-col items-center justify-center text-center hover:border-zinc-400 dark:hover:border-zinc-500 hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-all duration-200 group relative cursor-pointer">
              <input 
                type="file" 
                accept=".chm,.zip,.pdf,.html,.htm"
                onChange={handleFileChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
              />
              <div className="w-14 h-14 bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.05] dark:border-white/[0.07] rounded-[16px] flex items-center justify-center mb-4 group-hover:scale-105 transition-all duration-200 shadow-sm">
                <Upload size={22} className="text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" strokeWidth={1.8} />
              </div>
              <h3 className="font-semibold text-[15px] mb-1 text-zinc-900 dark:text-zinc-100 tracking-[-0.01em]">
                Pilih atau seret berkas ke sini
              </h3>
              <p className="text-[13px] text-zinc-400 dark:text-zinc-500">
                Format yang didukung: .chm, .zip, .pdf, atau .html
              </p>
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#F5F5F7] dark:bg-zinc-800/60 rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white dark:bg-zinc-700/60 rounded-[12px] border border-black/[0.04] dark:border-white/[0.06] shadow-sm">
                    <FileText className="text-zinc-700 dark:text-zinc-300" size={20} strokeWidth={1.8} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-medium text-[13px] text-zinc-900 dark:text-zinc-100 truncate max-w-[200px] sm:max-w-[320px] tracking-tight">{selectedFile.name}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full sm:w-auto bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 px-4 py-2 rounded-[11px] font-medium text-[13px] flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={15} /> : 'Mulai Unggah'}
                </button>
              </motion.div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-5 p-3.5 rounded-[14px] flex items-center gap-2.5 text-[13px] font-medium border ${
                  uploadStatus.type === 'success' 
                    ? 'bg-emerald-500/[0.08] border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                    : 'bg-red-500/[0.08] border-red-500/20 text-red-600 dark:text-red-400'
                }`}
              >
                {uploadStatus.type === 'success' ? <CheckCircle size={16} strokeWidth={2} /> : <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
                {uploadStatus.message}
              </motion.div>
            )}
            
            <div className="mt-8 pt-5 border-t border-black/[0.05] dark:border-white/[0.06] flex items-start gap-3">
              <span className="text-zinc-400 dark:text-zinc-500 text-xs mt-0.5">ⓘ</span>
              <p className="text-[12px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Berkas yang Anda unggah disimpan langsung di cloud storage Supabase. Pastikan ukuran berkas tidak melebihi kuota penyimpanan yang tersedia.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Freeze Screen Overlay for Upload Progress (Apple sheet/modal style) */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex flex-col items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded-[24px] p-8 max-w-sm w-full border border-black/[0.08] dark:border-white/[0.1] shadow-[0_24px_48px_rgba(0,0,0,0.18)] flex flex-col items-center text-center"
          >
            <div className="w-14 h-14 bg-black/[0.04] dark:bg-white/[0.06] rounded-full flex items-center justify-center mb-5">
              <Loader2 className="animate-spin text-zinc-900 dark:text-zinc-100" size={26} strokeWidth={2} />
            </div>
            
            <h3 className="text-[17px] font-semibold mb-1 text-zinc-900 dark:text-zinc-100 tracking-[-0.015em]">Mengunggah Berkas</h3>
            <p className="text-zinc-400 dark:text-zinc-500 text-[13px] mb-6 line-clamp-1">
              {selectedFile?.name}
            </p>

            <div className="w-full bg-black/[0.06] dark:bg-white/[0.1] rounded-full h-2 mb-3 overflow-hidden">
              <div 
                className="bg-zinc-900 dark:bg-zinc-100 h-full transition-all duration-200 ease-out rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="font-semibold text-zinc-700 dark:text-zinc-300 text-[13px] tabular-nums">{uploadProgress}%</p>
          </motion.div>
        </div>
      )}
    </>
  );
}
