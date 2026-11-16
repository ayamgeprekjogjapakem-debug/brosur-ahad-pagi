import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { FolderArchive, BookOpen, ScrollText, ArrowRight, Menu } from 'lucide-react';
import Link from 'next/link';
import MainSidebar from '@/app/components/MainSidebar';
import HeaderUserDropdown from '@/app/components/HeaderUserDropdown';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Koleksi Tematik Brosur | Pustaka MTA',
  description: 'Jelajahi kumpulan brosur Ahad Pagi Majlis Tafsir Al-Qur\'an yang telah dikelompokkan secara tematik.',
};

export default async function KoleksiIndexPage() {
  const supabase = await createClient();

  // Ambil daftar folder, disabled_folders, serta hitungan brosur per folder
  const [{ data: foldersRaw }, { data: settingData }] = await Promise.all([
    supabase.from('folders').select('id, name, slug, description, created_at').order('name', { ascending: true }),
    supabase.from('system_settings').select('value').eq('key', 'disabled_folders').maybeSingle(),
  ]);

  let disabledList: string[] = [];
  if (settingData?.value) {
    try {
      const parsed = JSON.parse(settingData.value);
      if (Array.isArray(parsed)) disabledList = parsed;
    } catch (e) {}
  }

  // Filter folder yang aktif saja untuk publik
  const folders = (foldersRaw || []).filter(
    (f) => !disabledList.includes(f.slug) && !disabledList.includes(f.id)
  );

  // Ambil count brosur per folder
  const { data: brosurs } = await supabase
    .from('brosur')
    .select('folder_id')
    .not('folder_id', 'is', null);

  const counts: Record<string, number> = {};
  if (brosurs) {
    brosurs.forEach((b) => {
      if (b.folder_id) {
        counts[b.folder_id] = (counts[b.folder_id] || 0) + 1;
      }
    });
  }

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      <MainSidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-white">
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('toggle-main-sidebar'));
                }
              }}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <Link href="/bap" className="text-slate-400 hover:text-slate-600 transition">
                Brosur
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-emerald-700 font-medium">Koleksi Tematik</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HeaderUserDropdown />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
          <div className="max-w-5xl mx-auto space-y-6 pb-20">
            {/* Header Title */}
            <div className="flex flex-col items-center justify-center py-6 mb-2 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                <FolderArchive size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
                Koleksi Tematik Brosur
              </h1>
              <p className="text-slate-500 text-sm max-w-lg mt-1.5">
                Kumpulan brosur Ahad Pagi yang dikelompokkan berdasarkan tema kajian, fiqih, dan topik pembahasan penting.
              </p>
            </div>

            {/* Grid Koleksi */}
            {(!folders || folders.length === 0) ? (
              <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <FolderArchive size={24} />
                </div>
                <h3 className="text-base font-semibold text-slate-800">Belum Ada Koleksi</h3>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">
                  Koleksi tematik belum ditambahkan di panel admin.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder, idx) => {
                  const count = counts[folder.id] || 0;
                  return (
                    <Link
                      key={folder.id}
                      href={`/koleksi/${folder.slug}`}
                      className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center">
                            <FolderArchive size={20} />
                          </div>
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            {count} Edisi
                          </span>
                        </div>
                        <h2 className="font-bold text-slate-800 text-[16px] group-hover:text-emerald-700 leading-snug transition-colors">
                          {folder.name}
                        </h2>
                        {folder.description && (
                          <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 leading-relaxed">
                            {folder.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 group-hover:text-emerald-600 transition-colors">
                        <span>Buka Koleksi</span>
                        <ArrowRight size={14} className="transform translate-x-0 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
