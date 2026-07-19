'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

export default function DashboardPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<{type: 'success' | 'error', message: string} | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.chm') || file.name.endsWith('.zip')) {
        setSelectedFile(file);
        setUploadStatus(null);
        setUploadProgress(0);
      } else {
        setUploadStatus({ type: 'error', message: 'Hanya file .chm atau .zip yang diperbolehkan.' });
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

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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
      <main className="p-8 md:p-12 w-full max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <header className="mb-10">
            <h1 className="text-3xl font-extrabold mb-2">Upload File CHM</h1>
            <p className="text-zinc-500">Unggah file arsip brosur untuk memproses dan menambahkannya ke dalam database.</p>
          </header>

          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-sm relative overflow-hidden">
            
            {/* Drag & Drop Area */}
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:border-accent hover:bg-accent/5 transition-colors group relative">
              <input 
                type="file" 
                accept=".chm,.zip"
                onChange={handleFileChange}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
              />
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-accent group-hover:text-white transition-colors">
                <Upload size={28} className="text-zinc-400 group-hover:text-white" />
              </div>
              <h3 className="font-bold text-lg mb-1">Pilih atau letakkan file di sini</h3>
              <p className="text-sm text-zinc-500">Mendukung file berformat .chm atau .zip</p>
            </div>

            {/* Selected File Details */}
            {selectedFile && (
              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <FileText className="text-accent" size={24} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-sm truncate max-w-[200px] sm:max-w-[300px]">{selectedFile.name}</p>
                    <p className="text-xs text-zinc-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button 
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="w-full sm:w-auto bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {isUploading ? <Loader2 className="animate-spin" size={16} /> : 'Mulai Upload'}
                </button>
              </div>
            )}

            {/* Upload Status */}
            {uploadStatus && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-4 rounded-xl flex items-center gap-3 font-medium text-sm border ${
                  uploadStatus.type === 'success' 
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                    : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                }`}
              >
                {uploadStatus.type === 'success' ? <CheckCircle size={18} /> : <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                {uploadStatus.message}
              </motion.div>
            )}
            
            <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-700 dark:text-blue-400">
              <strong className="block mb-1">ℹ️ Penyimpanan Cloud Aktif</strong>
              File yang Anda unggah kini langsung disimpan dengan aman di Supabase Storage, membuatnya dapat diakses dari mana saja tanpa bergantung pada sistem file lokal server.
            </div>
          </div>
        </motion.div>
      </main>

      {/* Freeze Screen Overlay for Upload Progress */}
      {isUploading && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center"
          >
            <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 relative">
              <Loader2 className="animate-spin text-accent" size={40} />
              <div className="absolute inset-0 border-4 border-accent/20 rounded-full"></div>
            </div>
            
            <h3 className="text-2xl font-extrabold mb-2">Mengunggah File...</h3>
            <p className="text-zinc-500 text-sm mb-8">
              Mohon jangan menutup halaman ini. File {selectedFile?.name} sedang diunggah ke Cloud.
            </p>

            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 mb-3 overflow-hidden relative">
              <div 
                className="bg-accent h-full transition-all duration-300 ease-out absolute left-0 top-0"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="font-bold text-accent text-2xl">{uploadProgress}%</p>
          </motion.div>
        </div>
      )}
    </>
  );
}
