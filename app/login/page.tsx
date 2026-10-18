'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lock, Mail, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'super-admin') {
          router.replace('/dashboard');
        } else {
          router.replace('/admin');
        }
      }
    };
    checkActiveSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'super-admin') {
          router.replace('/dashboard');
        } else {
          router.replace('/admin');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message || 'Email atau kata sandi tidak sesuai.');
      setIsLoading(false);
      return;
    }

    if (data?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'super-admin') {
        router.push('/dashboard');
      } else {
        router.push('/admin');
      }
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans flex flex-col justify-between p-4 sm:p-6 antialiased selection:bg-emerald-50 selection:text-emerald-700">
      
      {/* Top Clean Minimalist Header (Logo Utama logo_rb.png) */}
      <header className="max-w-md w-full mx-auto flex items-center justify-center pt-8 pb-3">
        <Link href="/" className="flex flex-col items-center gap-2 group text-center">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-200">
            <Image
              src="/images/logo_rb.png"
              alt="Logo Pustaka Brosur Ahad Pagi"
              fill
              sizes="64px"
              priority
              className="object-contain"
            />
          </div>
          <div className="flex flex-col items-center">
            <span className="font-bold text-base tracking-tight text-zinc-900">Brosur Ahad Pagi</span>
            <span className="text-[11px] text-zinc-400 font-medium">Pustaka & Konsol Administrasi</span>
          </div>
        </Link>
      </header>

      {/* Main Authentication Card - Clean Gemini Emerald Palette */}
      <div className="flex-1 flex items-center justify-center py-6">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-[400px]"
        >
          {/* Card Wrapper with Clean Gemini Style */}
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-7 sm:p-9 shadow-xs hover:shadow-sm transition-all space-y-6">
            
            {/* Header Title */}
            <div className="space-y-1.5 text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold">
                <Sparkles size={13} className="text-emerald-600" />
                <span>Masuk Sistem</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
                Selamat Datang
              </h1>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Silakan masukkan email dan kata sandi untuk mengelola data brosur dan sistem.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-center gap-2 font-medium"
              >
                <AlertCircle size={15} className="shrink-0 text-red-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 block pl-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    required
                    className="w-full bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between pl-1">
                  <label className="text-xs font-semibold text-zinc-700">
                    Kata Sandi
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 placeholder:text-zinc-400 outline-none transition-all font-medium"
                  />
                </div>
              </div>

              {/* Submit Pill Button (Emerald Green - Selaras dengan Admin Console) */}
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition active:scale-[0.99] disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={15} />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Konsol</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Security Assurance (Tanpa kata Supabase) */}
            <div className="pt-2 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
              <ShieldCheck size={13} className="text-emerald-600" />
              <span>Akses terautentikasi & terenkripsi aman</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer Minimalist */}
      <footer className="max-w-md w-full mx-auto text-center pb-4 text-xs text-zinc-400">
        <p>&copy; {new Date().getFullYear()} Brosur Ahad Pagi</p>
      </footer>
    </div>
  );
}
