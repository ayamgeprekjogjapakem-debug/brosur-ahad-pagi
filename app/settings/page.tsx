'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { BookOpen, X, Info, ShieldCheck, History, ArrowLeft, Menu, Settings, Database, Sliders } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('changelog');
  const pathname = usePathname();
  const router = useRouter();

  // Handle window resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync tab with URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab) setActiveTab(tab);
    }
  }, []);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/settings?tab=${tabId}`);
    }
  };

  return (
    <div className="flex h-screen bg-[#fafaf9] font-sans selection:bg-emerald-200 overflow-hidden">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-900/50 z-30 backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* System Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 lg:relative bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-hidden flex flex-col shrink-0
          ${isSidebarOpen ? 'w-[280px] sm:w-[300px] translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'}
        `}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 group text-left cursor-pointer outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-[13px] font-extrabold text-slate-900 leading-tight">Pustaka MTA</h1>
              <p className="text-[9px] font-bold text-emerald-600 tracking-widest uppercase">Pusat Sistem</p>
            </div>
          </Link>
          <button
            className="lg:hidden p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Pengaturan Sistem</p>
            <div className="relative flex flex-col space-y-1">
              {[
                { id: 'changelog', label: 'Changelog & Versi', icon: History, onClick: () => handleTabChange('changelog') },
                { id: 'data', label: 'Sumber Data', icon: Database, onClick: () => handleTabChange('data') },
                { id: 'calibration', label: 'Kalibrasi Sistem', icon: Sliders, onClick: () => handleTabChange('calibration') },
                { id: 'about', label: 'Tentang Aplikasi', icon: Info, onClick: () => handleTabChange('about') },
                { id: 'privacy', label: 'Privasi & Keamanan', icon: ShieldCheck, onClick: () => handleTabChange('privacy') },
              ].map((menu) => {
                const isActive = activeTab === menu.id;
                return (
                  <button
                    key={menu.id}
                    onClick={menu.onClick}
                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors z-10 ${isActive ? 'text-emerald-800 font-semibold' : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <menu.icon className="w-4 h-4" /> {menu.label}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="active-system-menu"
                        className="absolute inset-0 bg-emerald-50 rounded-lg -z-10"
                        initial={false}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 text-[10px] text-center text-slate-400 font-medium bg-slate-50">
          Hak Cipta © {new Date().getFullYear()} MTA
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-4 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="w-10 h-10 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
              title="Toggle Sidebar"
            >
              <Menu size={18} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-300">/</span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide">Pengaturan</span>
              <span className="text-sm font-semibold text-slate-300">/</span>
              <span className="text-sm font-semibold text-emerald-700 tracking-wide capitalize">
                {activeTab === 'changelog' ? 'Changelog & Versi'
                  : activeTab === 'data' ? 'Sumber Data'
                    : activeTab === 'calibration' ? 'Kalibrasi Sistem'
                      : activeTab === 'about' ? 'Tentang Aplikasi'
                        : 'Privasi & Keamanan'}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">

            {activeTab === 'changelog' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="border-b border-slate-200 pb-6 mb-8">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <History className="w-8 h-8 text-emerald-600" />
                    Changelog Pustaka MTA
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Riwayat pembaruan dan perubahan sistem.
                  </p>
                </div>

                <div className="space-y-12">
                  {/* Version 1.0.0 */}
                  <div className="relative pl-8 border-l-2 border-emerald-100">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-emerald-500 rounded-full ring-4 ring-white" />
                    <div className="mb-2">
                      <Link href="/settings/versi/makkah" className="inline-block px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold rounded-full mb-2 transition-colors cursor-pointer">
                        v1.0.0 (Makkah) &rarr;
                      </Link>
                      <h3 className="text-lg font-bold text-slate-800">Peluncuran Perdana AI Pustaka & UI Baru</h3>
                      <p className="text-sm text-slate-500 mt-1">September 2026</p>
                    </div>
                    <div className="text-slate-600 text-sm space-y-2 mt-4">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Rilis perdana Pustaka MTA versi Makkah.</li>
                        <li>Integrasi Sidebar Global yang terpadu untuk navigasi antar fitur (Pencarian, Al-Qur'an, Brosur).</li>
                        <li>Peluncuran fitur <strong>AI Pustaka</strong> yang dapat membantu Guru Daerah mencari referensi spesifik dari brosur.</li>
                        <li>Penyimpanan cache lokal untuk riwayat simulasi AI dan Dalil Tersimpan.</li>
                        <li>Peningkatan UI/UX menggunakan desain modern yang minimalis namun premium.</li>
                        <li>Perbaikan aturan dan proteksi pada otak AI (Anti-Inferensi).</li>
                      </ul>
                    </div>
                  </div>

                  {/* Version Beta */}
                  <div className="relative pl-8 border-l-2 border-slate-100">
                    <div className="absolute -left-2 top-0 w-4 h-4 bg-slate-300 rounded-full ring-4 ring-white" />
                    <div className="mb-2">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full mb-2">Beta Release</span>
                      <h3 className="text-lg font-bold text-slate-800">Tahap Pengembangan Awal</h3>
                      <p className="text-sm text-slate-500 mt-1">Agustus 2026</p>
                    </div>
                    <div className="text-slate-600 text-sm space-y-2 mt-4">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Pembuatan arsitektur RAG (Retrieval-Augmented Generation) untuk pencarian vektor brosur.</li>
                        <li>Digitalisasi data Brosur Ahad Pagi (1995-2026).</li>
                        <li>Pembuatan Master Perawi.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'about' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="border-b border-slate-200 pb-6 mb-8">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <Info className="w-8 h-8 text-emerald-600" />
                    Tentang Aplikasi
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Informasi seputar Pustaka MTA versi Makkah.
                  </p>
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 text-sm md:text-base leading-relaxed">
                  <p>
                    Pustaka MTA adalah sebuah platform literasi digital terpadu yang dirancang khusus untuk memfasilitasi kebutuhan para Guru Daerah dan Jamaah Majlis Tafsir Al-Qur'an (MTA) dalam mencari, memahami, dan menyebarkan referensi keislaman secara cepat dan akurat.
                  </p>
                  <h3 className="font-bold text-slate-800 mt-6 mb-2">Tim Pengembang</h3>
                  <p>Aplikasi ini dikembangkan secara kolaboratif atas arahan dari <strong>Pengurus MTA Pusat</strong> oleh:</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>Tim Ilmu MTA</li>
                    <li>Tim IT MTA</li>
                    <li>Pemuda MTA</li>
                  </ul>
                  <h3 className="font-bold text-slate-800 mt-6 mb-2">Visi & Misi</h3>
                  <p>
                    Menghadirkan teknologi kecerdasan buatan (AI) yang tunduk pada koridor syariat dan dalil, demi memastikan bahwa dakwah tetap berpijak pada referensi shahih (Al-Qur'an dan As-Sunnah) dengan kemudahan akses di era digital.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'privacy' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="border-b border-slate-200 pb-6 mb-8">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-emerald-600" />
                    Privasi & Keamanan
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Kebijakan keamanan data dan privasi pengguna.
                  </p>
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 text-sm md:text-base leading-relaxed">
                  <h3 className="font-bold text-slate-800 mt-2 mb-2">Keamanan Pencarian & Cache Lokal</h3>
                  <p>
                    Kami sangat menghargai privasi pengguna. Oleh karena itu, fitur seperti <strong>Dalil Tersimpan</strong> dan <strong>Riwayat Percakapan AI</strong> diatur agar disimpan di dalam <em>cache</em> peramban (browser) masing-masing pengguna (secara lokal), sehingga data tersebut tetap menjadi privasi pengguna dan tidak dikumpulkan ke server pusat tanpa persetujuan.
                  </p>
                  <h3 className="font-bold text-slate-800 mt-6 mb-2">Integritas Data (Anti-Inferensi)</h3>
                  <p>
                    Sistem <strong>AI Pustaka</strong> yang kami terapkan dirancang dengan protokol ketat (Anti-Inferensi) untuk mencegah kecerdasan buatan mengambil kesimpulan liar di luar brosur. AI hanya akan memberikan jawaban berdasarkan apa yang secara nyata dan eksplisit tertulis di dalam database Brosur MTA, guna menjaga kemurnian pemahaman agama dari opini bebas AI.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'data' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="border-b border-slate-200 pb-6 mb-8">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <Database className="w-8 h-8 text-emerald-600" />
                    Sumber Data
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Informasi terkait basis data dan manajemen referensi sistem.
                  </p>
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 text-sm md:text-base leading-relaxed">
                  <p>
                    Pustaka MTA dibangun dengan komitmen penuh untuk menjaga otentisitas dan keandalan referensi. Berikut adalah rincian sumber data resmi yang menopang ekosistem aplikasi ini:
                  </p>
                  <ul className="list-disc pl-5 mt-4 space-y-3">
                    <li>
                      <strong>Brosur Ahad Pagi MTA:</strong> Merupakan jantung dan fokus utama dari sistem pencarian cerdas maupun AI Pustaka. Seluruh pangkalan data (database) dikompilasi secara eksklusif dari naskah asli kajian Brosur Ahad Pagi Majlis Tafsir Al-Qur'an (MTA).
                    </li>
                    <li>
                      <strong>Al-Qur'an Digital:</strong> Teks ayat, pedoman transliterasi, terjemahan dan diselaraskan dengan standar resmi Kementerian Agama Republik Indonesia (Kemenag RI).
                    </li>
                    <li>
                      <strong>Kalender & Waktu:</strong> Sistem penanggalan Hijriah dan jadwal waktu disesuaikan dengan almanak hisab dari BMKG serta pedoman takwim resmi Kemenag RI.
                    </li>
                  </ul>
                  <p className="mt-4">
                    Setiap pencapaian, integrasi data baru, maupun pengembangan sistem yang telah kami lakukan akan selalu didokumentasikan dan diselaraskan secara transparan di dalam halaman <strong>Changelog & Versi</strong>.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'calibration' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="border-b border-slate-200 pb-6 mb-8">
                  <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                    <Sliders className="w-8 h-8 text-emerald-600" />
                    Kalibrasi Sistem
                  </h1>
                  <p className="text-slate-500 mt-2">
                    Pengaturan parameter dan kalibrasi RAG AI Pustaka.
                  </p>
                </div>
                <div className="prose prose-slate max-w-none text-slate-600 text-sm md:text-base leading-relaxed">
                  <p>Pengaturan sensitivitas pencarian AI, batas toleransi kecocokan teks, dan metrik akurasi saat merespons tanya jawab pengguna.</p>
                </div>
              </motion.div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
