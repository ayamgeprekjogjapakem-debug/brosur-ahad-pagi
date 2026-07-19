import React from 'react';
import { BookOpen, FolderArchive, ArrowRight, Download, FileText } from "lucide-react";
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  
  // Mengambil daftar Folders dari database
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  // Mengambil daftar file mentah dari Supabase Storage (chm-uploads)
  const { data: storageFiles } = await supabase.storage.from('chm-uploads').list();
  const publicFiles = storageFiles?.filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.startsWith('assets/')) || [];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header className="p-6 md:p-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg shadow-accent/20">
            <FolderArchive className="text-white" size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-tight">Koleksi Digital</span>
        </div>
        <Link href="/login" className="text-sm font-bold text-zinc-500 hover:text-accent transition-colors">
          Admin Login
        </Link>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-6xl mx-auto w-full">
        <div className="mb-10 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Perpustakaan Digital</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto md:mx-0">
            Silakan pilih kategori koleksi arsip yang ingin Anda baca di bawah ini.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Card untuk setiap Folder yang terdaftar di Database */}
          {folders && folders.length > 0 ? (
            folders.map((folder) => (
              <Link 
                key={folder.id} 
                href={`/koleksi/${folder.slug}`} 
                className="group relative bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-accent/5 hover:border-accent/30 transition-all duration-300 flex flex-col h-full overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                  <BookOpen size={100} />
                </div>
                
                <div className="w-14 h-14 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent transition-colors">
                  <BookOpen size={28} className="text-accent group-hover:text-white transition-colors" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">{folder.name}</h2>
                <p className="text-zinc-500 text-sm mb-8 flex-1">
                  {folder.description || 'Kumpulan arsip digital.'}
                </p>
                
                <div className="flex items-center text-accent font-bold text-sm gap-2 mt-auto">
                  Buka Koleksi <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))
          ) : (
            <div className="col-span-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center h-64 text-zinc-500">
              <FolderArchive size={32} className="mb-4 opacity-50" />
              <p>Belum ada Master Koleksi. Silakan buat melalui Admin Area.</p>
            </div>
          )}
        </div>
        
        {/* List of raw files uploaded to Supabase Storage */}
        {publicFiles.length > 0 && (
          <>
            <h2 className="text-2xl font-bold mb-6 mt-16 border-t border-black/5 dark:border-white/5 pt-10">Arsip Mentah (Belum Diekstrak)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicFiles.map((file) => {
                const { data } = supabase.storage.from('chm-uploads').getPublicUrl(file.name);
                
                return (
                  <a 
                    key={file.id} 
                    href={data.publicUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="group bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-md hover:border-blue-500/30 transition-all duration-300 flex flex-col h-full"
                  >
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                      <FileText size={24} className="text-blue-500 group-hover:text-white transition-colors" />
                    </div>
                    
                    <h3 className="font-bold text-lg mb-2 truncate" title={file.name}>{file.name}</h3>
                    
                    <p className="text-zinc-500 text-sm mb-6 flex-1">
                      Arsip mentah yang diunggah pada {file.created_at ? new Date(file.created_at).toLocaleDateString('id-ID') : 'Tanggal Tidak Diketahui'}. 
                      Ukuran: {file.metadata?.size ? (file.metadata.size / 1024 / 1024).toFixed(2) : '0'} MB.
                    </p>
                    
                    <div className="flex items-center text-blue-500 font-bold text-sm gap-2 mt-auto">
                      Unduh File <Download size={16} className="group-hover:-translate-y-1 transition-transform" />
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
