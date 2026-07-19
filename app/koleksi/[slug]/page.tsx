import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { ArrowLeft, BookOpen, FolderArchive, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default async function FolderPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  const slug = resolvedParams.slug;
  const page = parseInt(resolvedSearchParams.page as string) || 1;
  const limit = 24; // 24 brosur per halaman
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const supabase = await createClient();
  
  // Ambil detail Folder
  const { data: folder } = await supabase
    .from('folders')
    .select('*')
    .eq('slug', slug)
    .single();
    
  if (!folder) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
        <FolderArchive size={48} className="text-zinc-300 mb-6" />
        <h1 className="text-3xl font-extrabold mb-4">Folder Tidak Ditemukan</h1>
        <p className="text-zinc-500 mb-8 max-w-md">Kategori yang Anda cari mungkin sudah dihapus atau tautan tidak valid.</p>
        <Link href="/" className="bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors">
          Kembali ke Beranda
        </Link>
      </div>
    );
  }

  // Ambil isi Brosur dalam folder ini (dengan pagenasi)
  const { data: brosurList, count } = await supabase
    .from('brosur')
    .select('judul, slug, tahun', { count: 'exact' })
    .eq('folder_id', folder.id)
    .order('tahun', { ascending: false })
    .range(from, to);
    
  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <header className="p-6 md:p-8 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-black/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-3 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FolderArchive className="text-white" size={20} />
            </div>
            <span className="font-extrabold text-xl tracking-tight hidden sm:block">Koleksi Digital</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-8 md:p-12 max-w-4xl mx-auto w-full">
        <div className="mb-12 border-b border-black/5 dark:border-white/5 pb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">{folder.name}</h1>
          <p className="text-zinc-500 text-lg leading-relaxed max-w-2xl">
            {folder.description || 'Tidak ada deskripsi untuk kategori ini.'}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm font-bold text-zinc-500 uppercase tracking-widest">
            <BookOpen size={16} /> Daftar Isi ({totalItems} Brosur)
          </div>
          <div className="text-sm text-zinc-500">
            Halaman {page} dari {totalPages || 1}
          </div>
        </div>

        {brosurList && brosurList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {brosurList.map((brosur) => (
              <Link 
                key={brosur.slug} 
                href={`/${brosur.slug}`}
                className="group bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-2xl p-5 hover:border-accent hover:shadow-lg hover:shadow-accent/5 transition-all flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-extrabold bg-accent/10 text-accent px-2 py-0.5 rounded uppercase tracking-wider">
                      {brosur.tahun}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg truncate group-hover:text-accent transition-colors">{brosur.judul}</h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-colors shrink-0">
                  <ArrowRight size={18} />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-12 text-center text-zinc-500">
            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Kategori ini belum memiliki brosur.</p>
          </div>
        )}

        {/* Kontrol Pagenasi */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link 
                href={`/koleksi/${slug}?page=${page - 1}`}
                className="px-6 py-3 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-xl font-bold hover:border-accent hover:text-accent transition-colors shadow-sm"
              >
                Sebelumnya
              </Link>
            ) : (
              <button disabled className="px-6 py-3 bg-black/5 dark:bg-white/5 rounded-xl font-bold opacity-50 cursor-not-allowed">
                Sebelumnya
              </button>
            )}

            <div className="text-sm font-bold text-zinc-500">
              {page} / {totalPages}
            </div>

            {page < totalPages ? (
              <Link 
                href={`/koleksi/${slug}?page=${page + 1}`}
                className="px-6 py-3 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-xl font-bold hover:border-accent hover:text-accent transition-colors shadow-sm"
              >
                Selanjutnya
              </Link>
            ) : (
              <button disabled className="px-6 py-3 bg-black/5 dark:bg-white/5 rounded-xl font-bold opacity-50 cursor-not-allowed">
                Selanjutnya
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
