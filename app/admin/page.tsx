import React from 'react';
import Link from 'next/link';
import { 
  Database, BookOpen, Calendar, Bell, 
  User, UserCog, ArrowRight, Sparkles, Check
} from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch count stats for admin summary
  const [
    { count: totalBrosur },
    { count: totalHadist },
    { count: totalMasukan },
  ] = await Promise.all([
    supabase.from('brosur').select('*', { count: 'exact', head: true }),
    supabase.from('hadist_brosur').select('*', { count: 'exact', head: true }),
    supabase.from('kotak_masukan').select('*', { count: 'exact', head: true }),
  ]);

  const quickActions = [
    {
      title: 'Data Brosur',
      desc: 'Kelola arsip edisi brosur, kategori kajian, dan status dokumen.',
      href: '/admin/data-brosur',
      icon: Database,
    },
    {
      title: 'Data Quran',
      desc: 'Akses indeks surah, ayat, dan sinkronisasi referensi mushaf.',
      href: '/admin/data-quran',
      icon: BookOpen,
    },
    {
      title: 'Kalender',
      desc: 'Agenda dan jadwal kajian brosur Ahad Pagi.',
      href: '/admin/kalender',
      icon: Calendar,
    },
    {
      title: 'Notifikasi',
      desc: 'Tinjau pesan masuk, pertanyaan, dan saran dari jemaah.',
      href: '/admin/notifikasi',
      icon: Bell,
    },
    {
      title: 'Akun Saya',
      desc: 'Atur nama profil, info email, dan pembaruan kata sandi.',
      href: '/admin/akun',
      icon: User,
    },
    {
      title: 'Management Akun',
      desc: 'Kelola otorisasi akun pengguna dan status akses.',
      href: '/admin/management-akun',
      icon: UserCog,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in duration-200">
      
      {/* Banner Ringkas Bersih ala Gemini */}
      <div className="space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
          <Sparkles size={13} className="text-emerald-600" />
          <span>Panel Operasional</span>
        </div>
        
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900">
          Selamat datang di Konsol Admin
        </h1>
        <p className="text-zinc-500 text-sm max-w-2xl leading-relaxed">
          Kelola materi brosur, referensi Qur'an, jadwal kalender, serta pantau komunikasi jemaah dalam satu tampilan bersih dan cepat.
        </p>
      </div>

      {/* Ringkasan Angka Statistik Bersih (Clean Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/60 transition">
          <span className="text-xs font-medium text-zinc-400">Total Brosur</span>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 mt-2">
            {(totalBrosur ?? 0).toLocaleString('id-ID')}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">Edisi terindeks</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/60 transition">
          <span className="text-xs font-medium text-zinc-400">Hadist Brosur</span>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 mt-2">
            {(totalHadist ?? 0).toLocaleString('id-ID')}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">Terekam & dirujuk</span>
        </div>

        <div className="p-5 rounded-2xl bg-[#FAFAFA] hover:bg-zinc-100/60 transition">
          <span className="text-xs font-medium text-zinc-400">Kotak Masukan</span>
          <p className="text-2xl sm:text-3xl font-semibold text-zinc-900 mt-2">
            {(totalMasukan ?? 0).toLocaleString('id-ID')}
          </p>
          <span className="text-xs text-zinc-500 mt-1 block">Pesan dari jemaah</span>
        </div>
      </div>

      {/* Menu Aksi Cepat / Navigasi Modul Bersih */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
            Menu Operasional
          </h2>
          <span className="text-xs text-zinc-400">Pilih modul untuk mulai</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group p-5 rounded-2xl bg-[#FAFAFA] hover:bg-emerald-50/50 transition-all duration-150 flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-white text-zinc-600 group-hover:text-emerald-700 flex items-center justify-center mb-3 transition-colors">
                    <Icon size={18} />
                  </div>
                  <h3 className="font-semibold text-zinc-900 text-sm mb-1 group-hover:text-emerald-700 transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    {action.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-xs font-medium text-zinc-400 group-hover:text-emerald-700 transition-colors">
                  <span>Buka</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}
