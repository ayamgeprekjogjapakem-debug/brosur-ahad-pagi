'use client';

import React, { useState, useEffect } from 'react';
import { Key, X, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccessCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (code: string) => void;
  unclosable?: boolean;
}

export default function AccessCodeModal({ isOpen, onClose, onSuccess, unclosable = false }: AccessCodeModalProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Jika sudah pernah sukses dan tersimpan
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Kode akses tidak boleh kosong');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/access-codes/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.valid) {
        setSuccess(true);
        localStorage.setItem('mta_premium_access', data.code);
        if (data.allowed_features) {
          localStorage.setItem('mta_premium_features', JSON.stringify(data.allowed_features));
        }
        setTimeout(() => {
          onSuccess(data.code);
          onClose();
        }, 1500);
      } else {
        setError(data.error || 'Kode akses tidak valid');
      }
    } catch (err) {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={unclosable ? undefined : onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[101] p-4"
          >
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 overflow-hidden">
              <div className="relative h-28 bg-emerald-600 p-6 flex flex-col justify-end">
                {!unclosable && (
                  <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center -mb-10 relative z-10 border border-emerald-100">
                  <Key className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
              
              <div className="pt-12 p-8">
                <h2 className="text-xl font-bold text-zinc-900 mb-1.5">Buka Akses</h2>
                <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
                  Masukkan kode akses yang Anda miliki untuk membuka seluruh fitur premium dan konten eksklusif.
                </p>

                {success ? (
                  <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex items-center gap-3 border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <div>
                      <p className="font-bold">Akses Berhasil Dibuka!</p>
                      <p className="text-sm opacity-90">Memuat fitur premium...</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="Masukkan Kode (cth: MTA-XXXX)"
                        className="w-full px-4 py-3.5 bg-zinc-50/50 border border-zinc-200 rounded-xl font-mono text-center text-lg font-bold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-white transition-all uppercase"
                      />
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded-lg border border-red-100">
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !code.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-100 disabled:text-zinc-400 text-white font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verifikasi Kode'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
