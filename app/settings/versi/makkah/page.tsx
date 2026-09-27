'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, BookOpen, BrainCircuit, ShieldCheck, Zap } from 'lucide-react';

export default function MakkahVersionPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Sticky Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/settings?tab=changelog" className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-2 transition-colors">
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <div className="text-sm font-bold tracking-widest text-emerald-400 uppercase">
            Pustaka MTA
          </div>
        </div>
      </header>

      <main className="pt-24 pb-32">
        {/* Hero Section */}
        <section className="relative px-6 pt-20 pb-32 flex flex-col items-center justify-center text-center min-h-[70vh]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-900/20 blur-[120px] rounded-full" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative z-10"
          >
            <h2 className="text-emerald-400 font-semibold tracking-widest uppercase mb-4">Versi 1.0.0</h2>
            <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 bg-gradient-to-br from-white via-white to-white/40 bg-clip-text text-transparent">
              Makkah.
            </h1>
            <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto font-medium">
              Langkah pertama menuju peradaban literasi digital yang kokoh dan berpusat pada dalil.
            </p>
          </motion.div>
        </section>

        {/* Why Makkah Section */}
        <section className="max-w-5xl mx-auto px-6 py-24">
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-16 text-center"
          >
            <Sparkles className="w-12 h-12 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Mengapa "Makkah"?</h2>
            <div className="text-lg md:text-xl text-white/70 leading-relaxed max-w-3xl mx-auto space-y-6">
              <p>
                Sama halnya dengan kota <strong>Makkah</strong> yang menjadi tempat turunnya wahyu pertama dan titik awal perjuangan dakwah Islam, rilis perdana ini merepresentasikan <strong>pondasi awal</strong> dari ekosistem Pustaka MTA.
              </p>
              <p>
                Versi Makkah dibangun untuk memastikan akar yang kuat—memastikan bahwa teknologi pencarian dan kecerdasan buatan (AI) yang kami gunakan murni berpusat pada Al-Qur'an, As-Sunnah, dan Brosur MTA tanpa ada distorsi pemahaman.
              </p>
            </div>
          </motion.div>
        </section>

        {/* Features Grid - Apple Style */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-10 overflow-hidden relative group"
            >
              <div className="relative z-10">
                <BrainCircuit className="w-10 h-10 text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">AI Pustaka (Anti-Inferensi)</h3>
                <p className="text-white/60">
                  Otak kecerdasan buatan yang dikunci ketat. AI tidak bisa mengarang bebas dan hanya akan menjawab jika dalil tersebut benar-benar ada di dalam brosur.
                </p>
              </div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 blur-3xl rounded-full group-hover:bg-emerald-500/20 transition-all duration-700" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-10 overflow-hidden relative group"
            >
              <div className="relative z-10">
                <BookOpen className="w-10 h-10 text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Integrasi Data Terpadu</h3>
                <p className="text-white/60">
                  Al-Qur'an, Brosur, dan Kalender Hisab menyatu dalam satu ekosistem antarmuka yang bersih dan bebas gangguan.
                </p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6 }}
              className="bg-zinc-900 border border-white/10 rounded-3xl p-10 overflow-hidden relative md:col-span-2 group"
            >
              <div className="relative z-10 md:w-1/2">
                <Zap className="w-10 h-10 text-emerald-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Performa Sekelas Kilat</h3>
                <p className="text-white/60 text-lg">
                  Dibangun dengan arsitektur modern. Riwayat percakapan dan dalil tersimpan langsung di perangkat Anda melalui <em>Local Cache</em>, memastikan kecepatan akses maksimum dan privasi mutlak.
                </p>
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-emerald-900/20 to-transparent pointer-events-none" />
            </motion.div>

          </div>
        </section>

      </main>
    </div>
  );
}
