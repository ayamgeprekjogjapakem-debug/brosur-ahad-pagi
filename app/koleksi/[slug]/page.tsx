import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { FolderArchive, ArrowLeft, BookOpen, ScrollText, Calendar, Search, EyeOff } from 'lucide-react';
import Link from 'next/link';
import KoleksiDetailClient from './KoleksiDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const supabase = await createClient();

  const { data: folder } = await supabase
    .from('folders')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle();

  if (!folder) {
    return {
      title: 'Koleksi Tidak Ditemukan | Pustaka MTA',
    };
  }

  return {
    title: `Koleksi: ${folder.name} | Pustaka MTA`,
    description: folder.description || `Kumpulan arsip brosur tematik ${folder.name} Majlis Tafsir Al-Qur'an.`,
  };
}

export default async function KoleksiSlugPage({ 
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
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle();

  if (!folder) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 shadow-sm">
          <FolderArchive size={32} />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Koleksi Tidak Ditemukan</h1>
        <p className="text-slate-500 mb-6 max-w-md text-sm">
          Koleksi yang Anda cari mungkin telah dihapus atau tautannya tidak valid.
        </p>
        <Link 
          href="/bap" 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Kembali ke Arsip Brosur
        </Link>
      </div>
    );
  }

  // Periksa apakah koleksi ini sedang dinonaktifkan oleh admin
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'disabled_folders')
    .maybeSingle();

  let isDisabled = false;
  if (settingData?.value) {
    try {
      const disabledList = JSON.parse(settingData.value);
      if (Array.isArray(disabledList)) {
        isDisabled = disabledList.includes(slug) || disabledList.includes(folder.id);
      }
    } catch (e) {}
  }

  if (isDisabled) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 text-zinc-500 flex items-center justify-center mb-6 shadow-sm border border-zinc-200/80">
          <EyeOff size={32} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-semibold mb-3">
          Status: Dinonaktifkan
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Koleksi Sedang Dinonaktifkan</h1>
        <p className="text-slate-500 mb-6 max-w-md text-sm leading-relaxed">
          Koleksi &quot;{folder.name}&quot; saat ini sedang dinonaktifkan oleh administrator dan disembunyikan dari publik.
        </p>
        <div className="flex items-center gap-3">
          <Link 
            href="/koleksi" 
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs"
          >
            Lihat Koleksi Lainnya
          </Link>
          <Link 
            href="/bap" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Ke Arsip Brosur
          </Link>
        </div>
      </div>
    );
  }

  // Ambil daftar brosur dalam koleksi ini
  const { data: brosurList } = await supabase
    .from('brosur')
    .select('id, judul, slug, tahun, created_at')
    .eq('folder_id', folder.id)
    .order('tahun', { ascending: false })
    .order('judul', { ascending: true });

  return (
    <KoleksiDetailClient 
      folder={folder} 
      initialBrosurList={brosurList || []} 
    />
  );
}
