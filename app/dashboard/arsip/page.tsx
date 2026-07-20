'use client';

import React, { useEffect, useState } from 'react';
import { FileStack, Trash2, Download, Loader2, Edit2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function ArsipPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);

  // Fake Progress Bar Simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtracting) {
      setExtractProgress(0);
      interval = setInterval(() => {
        setExtractProgress(prev => {
          if (prev >= 99) return 99;
          // Progress semakin lambat mendekati 99
          const increment = prev < 50 ? (Math.random() * 2 + 1) : (Math.random() * 0.5 + 0.1);
          return Math.min(prev + increment, 99);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting]);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage.from('chm-uploads').list();
    if (!error && data) {
      // Hilangkan file .emptyFolderPlaceholder
      setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleExtract = async (fileName: string) => {
    if (!fileName.endsWith('.zip') && !fileName.endsWith('.chm')) {
      alert('Hanya file berformat .zip atau .chm yang dapat diekstrak ke Database.');
      return;
    }
    
    if (!confirm(`Apakah Anda yakin ingin membongkar isi file "${fileName}" dan menyimpannya ke Database secara otomatis?`)) return;
    
    setIsExtracting(fileName);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
      
      alert(data.message || 'Ekstraksi berhasil!');
      router.refresh();
    } catch (err: any) {
      alert(`Gagal mengekstrak: ${err.message}`);
    } finally {
      setIsExtracting(null);
    }
  };

  const handleRename = async (oldName: string) => {
    const newName = prompt('Masukkan nama file baru (termasuk ekstensi .chm atau .zip):', oldName);
    if (!newName || newName === oldName) return;

    if (!newName.endsWith('.chm') && !newName.endsWith('.zip')) {
      alert('Ekstensi file harus tetap .chm atau .zip');
      return;
    }

    setIsRenaming(oldName);
    
    // Gunakan copy + remove sebagai pengganti move untuk menghindari isu RLS 'Object not found'
    const { error: copyError } = await supabase.storage.from('chm-uploads').copy(oldName, newName);
    
    if (copyError) {
      alert(`Gagal menduplikasi nama baru: ${copyError.message}`);
    } else {
      const { error: removeError } = await supabase.storage.from('chm-uploads').remove([oldName]);
      if (removeError) {
         alert(`Nama baru berhasil dibuat, tapi gagal menghapus nama lama: ${removeError.message}`);
      }
      setFiles(files.map(f => f.name === oldName ? { ...f, name: newName } : f));
      router.refresh();
    }
    setIsRenaming(null);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus arsip "${fileName}"?`)) return;
    
    setIsDeleting(fileName);
    const { error } = await supabase.storage.from('chm-uploads').remove([fileName]);
    
    if (error) {
      alert(`Gagal menghapus file: ${error.message}`);
    } else {
      setFiles(files.filter(f => f.name !== fileName));
      router.refresh(); // Segarkan route agar halaman beranda juga terupdate
    }
    setIsDeleting(null);
  };

  const getPublicUrl = (fileName: string) => {
    return supabase.storage.from('chm-uploads').getPublicUrl(fileName).data.publicUrl;
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-5xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <FileStack className="text-accent" size={32} />
            Manajemen Arsip
          </h1>
          <p className="text-zinc-500">
            Kelola file mentah (CHM/ZIP) yang telah diunggah ke Supabase Storage.
          </p>
        </div>
      </header>

      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-400">
            <Loader2 className="animate-spin mb-4" size={32} />
            <p>Memuat daftar arsip...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <p>Belum ada file arsip yang diunggah.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-black/5 dark:border-white/5 text-sm">
                  <th className="p-4 font-bold">Nama File</th>
                  <th className="p-4 font-bold">Ukuran</th>
                  <th className="p-4 font-bold">Tanggal Unggah</th>
                  <th className="p-4 font-bold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.id} className="border-b border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-4 font-medium">{file.name}</td>
                    <td className="p-4 text-zinc-500 text-sm">{(file.metadata?.size / 1024 / 1024).toFixed(2)} MB</td>
                    <td className="p-4 text-zinc-500 text-sm">{new Date(file.created_at).toLocaleString('id-ID')}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      {(file.name.endsWith('.zip') || file.name.endsWith('.chm')) && (
                        <button 
                          onClick={() => handleExtract(file.name)}
                          disabled={isExtracting === file.name || isRenaming === file.name}
                          className="px-3 py-2 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-lg transition-colors flex items-center justify-center font-bold text-xs disabled:opacity-50"
                          title="Ekstrak & Masukkan ke Database"
                        >
                          {isExtracting === file.name ? <Loader2 className="animate-spin" size={16} /> : 'Ekstrak to Database'}
                        </button>
                      )}
                      <button 
                        onClick={() => handleRename(file.name)}
                        disabled={isRenaming === file.name}
                        className="p-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500 hover:text-white rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Ubah Nama File"
                      >
                        {isRenaming === file.name ? <Loader2 className="animate-spin" size={18} /> : <Edit2 size={18} />}
                      </button>
                      <a 
                        href={getPublicUrl(file.name)} 
                        target="_blank" 
                        rel="noreferrer"
                        download
                        className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-lg transition-colors flex items-center justify-center"
                        title="Unduh File"
                      >
                        <Download size={18} />
                      </a>
                      <button 
                        onClick={() => handleDelete(file.name)}
                        disabled={isDeleting === file.name}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Hapus File"
                      >
                        {isDeleting === file.name ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fullscreen Extraction Loader / Overlay */}
      {isExtracting && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 dark:bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 shadow-2xl rounded-[32px] p-8 md:p-12 text-center relative overflow-hidden flex flex-col items-center">
            
            <Loader2 className="animate-spin text-accent mb-6" size={56} strokeWidth={2} />
            
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mb-2">
              Mengekstrak Arsip
            </h2>
            <p className="text-zinc-500 font-medium mb-8 max-w-sm">
              Sistem sedang memproses file "{isExtracting}" secara otomatis ke dalam Database.
            </p>

            {/* Progress Bar Container */}
            <div className="w-full bg-black/5 dark:bg-white/5 rounded-full h-4 mb-4 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000 ease-out rounded-full" 
                style={{ width: `${extractProgress}%` }}
              ></div>
            </div>

            <div className="flex w-full items-center justify-between text-sm font-bold text-zinc-500 mb-8">
              <span>Mendekode Teks Arab...</span>
              <span className="text-accent">{Math.floor(extractProgress)}%</span>
            </div>
            
            <div className="bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2.5 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              Layar Dikunci, Mohon Jangan Tutup Halaman Ini
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
