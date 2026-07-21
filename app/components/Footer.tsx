'use client';

import React, { useState } from 'react';
import { Heart, AlertCircle, CheckCircle2, MessageSquare, Loader2, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Footer() {
  const [showDonasi, setShowDonasi] = useState(false);
  const [showMasukan, setShowMasukan] = useState(false);
  const [isFeedbackEnabled, setIsFeedbackEnabled] = useState(true);

  // Ambil pengaturan fitur masukan
  React.useEffect(() => {
    fetch('/api/settings?key=is_feedback_enabled')
      .then(res => res.json())
      .then(data => {
        if (data.value === 'false') setIsFeedbackEnabled(false);
      })
      .catch(() => { });
  }, []);

  // State form masukan
  const [formData, setFormData] = useState({
    nama_terang: '',
    cabang_instansi: '',
    email: '',
    no_wa: '',
    pesan: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [waError, setWaError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'no_wa') setWaError('');
    if (submitStatus !== 'idle') setSubmitStatus('idle');
  };

  const validateWa = (wa: string) => {
    // Memastikan WA hanya angka atau karakter +, dengan panjang 10-15
    const waRegex = /^\+?[0-9]{10,15}$/;
    return waRegex.test(wa);
  };

  const handleSubmitMasukan = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateWa(formData.no_wa)) {
      setWaError('Nomor WhatsApp tidak valid. Gunakan format angka 10-15 digit (contoh: 081234567890).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/masukan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Gagal mengirim pesan');

      setSubmitStatus('success');
      setFormData({
        nama_terang: '',
        cabang_instansi: '',
        email: '',
        no_wa: '',
        pesan: ''
      });

      // Auto close after 3 seconds
      setTimeout(() => {
        setShowMasukan(false);
        setSubmitStatus('idle');
      }, 3000);

    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <footer className="w-full border-t border-black/5 dark:border-white/5 bg-white/30 dark:bg-black/30 backdrop-blur-md mt-auto">
      <div className="max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center">

        {/* Main Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
          <button
            onClick={() => {
              setShowMasukan(false);
              setShowDonasi(!showDonasi);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold transition-all duration-300 ${showDonasi
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20'
              }`}
          >
            <Heart size={18} className={showDonasi ? 'animate-pulse' : ''} />
            Donasi
          </button>

          {isFeedbackEnabled ? (
            <button
              onClick={() => {
                setShowDonasi(false);
                setShowMasukan(!showMasukan);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${showMasukan
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5'
                }`}
            >
              <MessageSquare size={18} />
              Kirim Pesan/Masukan
            </button>
          ) : (
            <div className="flex items-center gap-2 px-5 py-2.5 rounded-full font-medium text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-black/5 dark:border-white/5" title="Kotak Masukan sedang ditutup oleh Admin">
              <MessageSquare size={18} className="opacity-50" />
              Kotak Masukan Ditutup
            </div>
          )}
        </div>

        {/* Expandable Masukan Form */}
        <div
          className={`overflow-hidden transition-all duration-500 ease-in-out max-w-2xl w-full ${showMasukan ? 'max-h-[800px] opacity-100 mb-10' : 'max-h-0 opacity-0 mb-0'
            }`}
        >
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-black/5 dark:border-white/5 relative shadow-sm">
            <h3 className="text-xl font-bold mb-6 text-left">Tinggalkan Pesan</h3>

            {submitStatus === 'success' ? (
              <div className="flex flex-col items-center justify-center py-10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={60} className="mb-4" />
                <h4 className="text-xl font-bold">Pesan Terkirim!</h4>
                <p className="text-sm mt-2 opacity-80">Terima kasih atas masukan Anda. Kami akan segera membacanya.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitMasukan} className="space-y-4 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Nama Terang *</label>
                    <input required type="text" name="nama_terang" value={formData.nama_terang} onChange={handleInputChange} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" placeholder="Fulan bin Fulan" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Cabang MTA / Instansi *</label>
                    <input required type="text" name="cabang_instansi" value={formData.cabang_instansi} onChange={handleInputChange} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" placeholder="MTA Cabang X / Umum" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">No. WhatsApp *</label>
                    <input required type="text" name="no_wa" value={formData.no_wa} onChange={handleInputChange} className={`w-full bg-zinc-50 dark:bg-zinc-950 border ${waError ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : 'border-zinc-200 dark:border-zinc-800 focus:border-blue-500 focus:ring-blue-500'} rounded-xl px-4 py-2.5 focus:outline-none focus:ring-1 transition-all text-sm`} placeholder="081234567890" />
                    {waError && <p className="text-red-500 text-xs mt-1 font-medium">{waError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Email (Opsional)</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm" placeholder="email@contoh.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Isi Pesan / Laporan *</label>
                  <textarea required name="pesan" value={formData.pesan} onChange={handleInputChange} rows={4} className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm resize-none" placeholder="Tuliskan saran, kritik, laporan kesalahan, atau masukan Anda di sini..."></textarea>
                </div>

                {submitStatus === 'error' && (
                  <p className="text-red-500 text-sm font-medium">Terjadi kesalahan. Silakan coba lagi.</p>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70 shadow-lg shadow-blue-500/20">
                    {isSubmitting ? (
                      <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> Mengirim...</>
                    ) : (
                      <><Send size={18} /> Kirim Pesan</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Footer (Bottom Bar) */}
      <div className="w-full border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 py-6 mt-4">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-zinc-400 text-sm font-medium gap-4">
          <p className="flex items-center gap-2">
            Dibuat untuk mempermudah akses ilmu.
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700"></span>
            Non-Official
          </p>
          <p>
            &copy; {new Date().getFullYear()} UlilAlbab Team
          </p>
        </div>
      </div>
    </footer>

    {/* Popup / Modal Donasi - Dipindahkan ke luar <footer> agar fixed inset-0 merujuk ke viewport */}
    <AnimatePresence>
      {showDonasi && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowDonasi(false)}
        >
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-xl w-full bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950 dark:to-orange-950 p-8 rounded-3xl shadow-2xl relative border border-rose-200 dark:border-rose-900 overflow-hidden"
          >
            {/* Close Button */}
            <button 
              onClick={() => setShowDonasi(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-20"
              title="Tutup"
            >
              <X size={20} className="text-rose-900 dark:text-rose-200" />
            </button>

            <div className="absolute -top-4 -right-4 text-rose-500/10 dark:text-rose-500/5 pointer-events-none">
              <Heart size={160} />
            </div>
            
            <h3 className="text-xl md:text-2xl font-black text-rose-900 dark:text-rose-400 mb-6 relative z-10" style={{ fontFamily: "var(--font-amiri), serif" }}>
              Terkait Donasi...
            </h3>
            
            <div className="space-y-4 text-rose-900/80 dark:text-rose-200/90 leading-relaxed text-sm md:text-base relative z-10 text-left font-medium">
              <p>
                Tidak perlu menyisihkan harta Anda. Jika Anda merasa website arsip ini bermanfaat, <strong>cukup doakan kami</strong> di sela-sela waktu mustajab Anda.
              </p>
              <p>
                Semoga Allah ﷻ menerima upaya kecil yang penuh kekurangan ini, mencatatnya sebagai amal shalih yang kelak memberatkan timbangan kebaikan, serta senantiasa memberikan taufik dan kemudahan pada setiap urusan kita di dunia maupun akhirat.
              </p>
              
              <div className="h-px w-full bg-rose-200 dark:bg-rose-900/50 my-6"></div>
              
              <p className="flex items-start gap-3 text-rose-900 dark:text-rose-300 font-semibold bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-rose-200/50 dark:border-rose-900/30">
                <CheckCircle2 size={24} className="shrink-0 mt-0.5 text-rose-600 dark:text-rose-500" />
                <span>
                  Apabila Anda menemukan kesalahan (baik pada teks maupun sistem), mohon jangan segan untuk mengingatkan kami dengan cara yang ahsan dan sesuai sunnah.
                </span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
