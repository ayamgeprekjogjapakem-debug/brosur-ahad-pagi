'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Lock, Mail, ArrowRight, Loader2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        }
      }
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsLoading(false);
      return;
    }

    setSuccessMsg('Registrasi berhasil! Namun akun Anda harus diaktifkan oleh Super Admin sebelum bisa login ke Dashboard.');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-accent/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Link href="/" className="flex items-center justify-center gap-2 mb-8 group">
          <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
            <BookOpen className="text-white" size={24} />
          </div>
          <span className="font-extrabold text-2xl tracking-tight">Brosur Ahad Pagi</span>
        </Link>

        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/5 dark:border-white/5 rounded-3xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Daftar Akun Admin</h1>
            <p className="text-zinc-500 text-sm">Buat akun untuk mengelola arsip brosur.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl text-center font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm rounded-xl text-center font-medium">
                {successMsg}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama Admin"
                  required
                  className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/50 focus:bg-white dark:focus:bg-black rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@admin.com"
                  required
                  className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/50 focus:bg-white dark:focus:bg-black rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  className="w-full bg-black/5 dark:bg-white/5 border border-transparent focus:border-accent/50 focus:bg-white dark:focus:bg-black rounded-xl pl-12 pr-4 py-3.5 text-sm outline-none transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !!successMsg}
              className="w-full bg-accent text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-70 mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Daftar Sekarang</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-500">
            Sudah punya akun? <Link href="/login" className="text-accent font-bold hover:underline">Masuk di sini</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
