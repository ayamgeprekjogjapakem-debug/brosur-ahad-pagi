import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { FolderArchive } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function FolderPage({ 
  params
}: { 
  params: Promise<{ slug: string }>
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  const supabase = await createClient();
  
  // Ambil detail Folder
  const { data: folder } = await supabase
    .from('folders')
    .select('id, name')
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

  // Ambil Brosur TERBARU dalam folder ini
  const { data: newestBrosur } = await supabase
    .from('brosur')
    .select('slug')
    .eq('folder_id', folder.id)
    .order('tahun', { ascending: false })
    .limit(1)
    .single();
    
  // Jika ada brosur, LANGSUNG lempar ke halaman bacanya (karena sudah pakai sidebar)
  if (newestBrosur) {
    redirect(`/${newestBrosur.slug}`);
  }

  // Jika folder kosong
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
      <FolderArchive size={48} className="text-zinc-300 mb-6" />
      <h1 className="text-3xl font-extrabold mb-4">{folder.name} Masih Kosong</h1>
      <p className="text-zinc-500 mb-8 max-w-md">Belum ada brosur apa pun di dalam koleksi ini.</p>
      <Link href="/" className="bg-accent text-white px-6 py-3 rounded-xl font-bold hover:bg-accent/90 transition-colors">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
