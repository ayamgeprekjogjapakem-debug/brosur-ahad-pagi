import React from 'react';
import Link from 'next/link';
import { 
  Megaphone, Calendar, BookOpen, AlertTriangle, 
  Info, Pin, ArrowLeft, Clock, Share2
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export const metadata = {
  title: 'Warta & Pengumuman Resmi - Brosur Ahad Pagi',
  description: 'Informasi resmi seputar majelis kajian Ahad Pagi, rilis edisi brosur dakwah, dan kabar jamaah.',
};

export default async function PublicPengumumanPage() {
  const supabase = await createClient();

  const { data: pengumumanList } = await supabase
    .from('pengumuman')
    .select('*')
    .eq('is_active', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  const items = pengumumanList || [];

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'kajian':
        return {
          label: 'Kajian Ahad Pagi',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: Calendar,
        };
      case 'brosur':
        return {
          label: 'Edisi Brosur',
          className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: BookOpen,
        };
      case 'urgent':
        return {
          label: 'Penting',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Warta Umum',
          className: 'bg-sky-50 text-sky-700 border-sky-200',
          icon: Info,
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header */}
      <header className="bg-white border-b border-zinc-200/80 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-600 hover:text-zinc-900 transition"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Beranda</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-zinc-500">Warta Terkini</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200/60">
            <Megaphone size={13} className="text-emerald-600" />
            <span>Pusat Informasi & Notifikasi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
            Warta & Pengumuman Resmi
          </h1>
          <p className="text-sm text-zinc-500 max-w-xl leading-relaxed">
            Informasi aktual mengenai jadwal majelis kajian Ahad Pagi, rilis edisi brosur dakwah terbaru, dan pengumuman jemaah.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4 pb-20">
        {items.length === 0 ? (
          <div className="p-12 text-center bg-white border border-zinc-200/80 rounded-2xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400">
              <Megaphone size={22} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800">Belum Ada Pengumuman Baru</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Saat ini belum ada warta atau informasi pengumuman baru yang diterbitkan. Silakan periksa kembali nanti.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const badge = getCategoryBadge(item.kategori);
              const BadgeIcon = badge.icon;

              return (
                <article
                  key={item.id}
                  className={`p-6 bg-white border rounded-2xl transition space-y-4 shadow-2xs ${
                    item.is_pinned
                      ? 'border-emerald-300 ring-1 ring-emerald-400/20'
                      : 'border-zinc-200/80 hover:border-zinc-300'
                  }`}
                >
                  {/* Category & Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {item.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Pin size={10} className="fill-amber-600" />
                          Penting & Disematkan
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}>
                        <BadgeIcon size={11} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(item.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-bold text-zinc-900 leading-snug">
                    {item.judul}
                  </h2>

                  {/* Banner jika ada */}
                  {item.banner_url && (
                    <div className="rounded-xl overflow-hidden aspect-[21/9] bg-zinc-100 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.banner_url}
                        alt={item.judul}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Content */}
                  <div className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {item.konten}
                  </div>

                  {/* Footer */}
                  <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
                    <span>
                      Diterbitkan oleh: <strong className="text-zinc-600 font-medium">{item.author_name || 'Admin'}</strong>
                    </span>

                    <span className="text-[11px] text-emerald-600 font-medium">
                      Brosur Ahad Pagi Official
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
