import React from 'react';
import { Book, Library, AlertCircle } from "lucide-react";
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import GlobalSearch from './components/GlobalSearch';
import Footer from './components/Footer';
import Image from 'next/image';

export default async function Home() {
  const supabase = await createClient();
  
  // Mengambil daftar Folders dari database
  const { data: folders } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="p-6 md:px-12 md:py-8 flex items-center justify-center border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 relative flex items-center justify-center shrink-0">
            <Image 
              src="/logo.png" 
              alt="Logo Ulil Albab" 
              fill
              className="object-contain drop-shadow-md"
            />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Ulil Albab</span>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full flex flex-col items-center">
        
        {/* HERO NARRATIVE / DISCLAIMER */}
        <div className="w-full max-w-4xl mx-auto mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">
            Perpustakaan <span className="text-accent">Ulil Albab</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 font-medium mb-8">
            Koleksi Digital Arsip Brosur Ahad Pagi MTA
          </p>
          
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden mb-8">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-left">
              <div className="w-14 h-14 shrink-0 bg-amber-500/10 text-amber-500 rounded-xl flex items-center justify-center">
                <AlertCircle size={28} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold mb-1">Informasi Penting (Non-Official)</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Ini adalah halaman arsip <strong>Non-Official</strong> (tidak resmi) yang dibangun sebagai bentuk dedikasi untuk mempermudah peserta kajian mengakses materi. 
                  Jika terdapat banyak kesalahan teks (karena proses konversi otomatis), mohon langsung hubungi admin di <strong className="text-accent">brosurmta@gmail.com</strong> agar segera dibenahi. <em>Jazaakumullah khairan.</em>
                </p>
              </div>
            </div>
          </div>

          {/* GLOBAL SEARCH */}
          <GlobalSearch />
        </div>

        {/* RAK BUKU (GRID) */}
        <div className="w-full">
          <div className="flex items-center gap-3 mb-10 border-b border-black/5 dark:border-white/5 pb-4">
            <Book size={24} className="text-accent" />
            <h2 className="text-2xl font-bold tracking-tight">Rak Koleksi</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10 pb-20">
            {folders && folders.length > 0 ? (
              folders.map((folder, index) => {
                // Generate warna buku berbeda-beda (secara deterministik berdasarkan urutan)
                const bookColors = [
                  'from-emerald-700 to-emerald-900', // Hijau tua elegan
                  'from-blue-700 to-blue-900',       // Biru
                  'from-slate-700 to-slate-900',     // Hitam/Abu
                  'from-amber-700 to-amber-900',     // Cokelat emas
                  'from-indigo-700 to-indigo-900'    // Nila tua
                ];
                const colorClass = bookColors[index % bookColors.length];
                
                return (
                  <Link 
                    key={folder.id} 
                    href={`/koleksi/${folder.slug}`} 
                    className="group relative flex justify-center perspective-[1000px] h-[300px] md:h-[350px]"
                  >
                    {/* Shadow Buku (di bawah) */}
                    <div className="absolute -bottom-4 w-[80%] h-6 bg-black/20 dark:bg-black/50 blur-lg rounded-[100%] group-hover:blur-xl transition-all duration-300"></div>
                    
                    {/* Container Buku Utama (Animasi Angkat 3D) */}
                    <div className="relative w-full h-full transform transition-all duration-500 ease-out [transform-style:preserve-3d] group-hover:-translate-y-4 group-hover:[transform:rotateY(-10deg)]">
                      
                      {/* Tulang Buku (Spine) - Sisi Kiri */}
                      <div className={`absolute left-0 top-0 w-6 h-full bg-gradient-to-b ${colorClass} origin-right transform [transform:rotateY(90deg)] brightness-75 rounded-l-md border-y border-l border-white/10 shadow-[inset_-2px_0_5px_rgba(0,0,0,0.5)]`}>
                        {/* Aksen Tali Pita / Garis di Tulang Buku */}
                        <div className="absolute top-8 w-full h-1 bg-black/20"></div>
                        <div className="absolute top-10 w-full h-1 bg-black/20"></div>
                        <div className="absolute bottom-8 w-full h-1 bg-black/20"></div>
                      </div>

                      {/* Sampul Buku (Cover Depan) */}
                      <div className={`absolute left-0 top-0 w-full h-full bg-gradient-to-br ${colorClass} rounded-r-xl border border-white/10 shadow-2xl overflow-hidden flex flex-col p-6`}>
                        
                        {/* Tekstur Cover (Garis lipatan tulang buku di sebelah kiri) */}
                        <div className="absolute left-0 top-0 w-4 h-full bg-gradient-to-r from-black/40 to-transparent"></div>
                        <div className="absolute left-3 top-0 w-px h-full bg-white/10"></div>
                        
                        {/* Ornamen / Dekorasi Emas di Cover */}
                        <div className="flex-1 border border-white/20 rounded-lg p-4 flex flex-col items-center justify-center text-center relative z-10 backdrop-blur-sm bg-black/10">
                          
                          <Book size={40} className="text-white/80 mb-4 drop-shadow-md" />
                          
                          <h3 className="text-white font-black text-xl md:text-2xl leading-tight mb-2 drop-shadow-md" style={{ fontFamily: "var(--font-amiri), serif" }}>
                            {folder.name}
                          </h3>
                          
                          <div className="w-12 h-px bg-white/30 my-4 mx-auto"></div>
                          
                          <p className="text-white/70 text-xs md:text-sm font-medium line-clamp-3">
                            {folder.description || 'Kumpulan arsip digital Brosur MTA.'}
                          </p>
                        </div>
                      </div>

                      {/* Halaman Kertas (Sisi Kanan - Ketebalan Buku) */}
                      <div className="absolute right-0 top-2 w-4 h-[calc(100%-16px)] bg-[#fdfaf6] origin-left transform [transform:rotateY(90deg)] border-y border-r border-black/10 rounded-r-sm overflow-hidden flex flex-col justify-evenly">
                         {/* Garis-garis tipis untuk efek tumpukan kertas */}
                         {[...Array(20)].map((_, i) => (
                           <div key={i} className="w-full h-[1px] bg-black/5"></div>
                         ))}
                      </div>

                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-12 shadow-sm flex flex-col items-center justify-center text-center h-64 text-zinc-500">
                <Library size={48} className="mb-4 opacity-30" />
                <p className="text-lg">Rak masih kosong. Silakan muat koleksi dari dashboard admin.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

