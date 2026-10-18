'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User, Mail, Shield, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminAkunPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');
  const [msgError, setMsgError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data: p } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (p) {
          setProfile(p);
          setName(p.name || user.user_metadata?.full_name || '');
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setMsgSuccess('');
    setMsgError('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name })
        .eq('id', user.id);

      if (error) throw error;
      setMsgSuccess('Profil Anda berhasil diperbarui!');
    } catch (err: any) {
      setMsgError(err.message || 'Gagal memperbarui profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsgError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setMsgError('Kata sandi minimal 6 karakter.');
      return;
    }

    setSavingPassword(true);
    setMsgSuccess('');
    setMsgError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      setMsgSuccess('Kata sandi berhasil diubah!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMsgError(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-3">
        <Loader2 size={32} className="animate-spin text-emerald-600" />
        <p className="text-xs font-semibold">Memuat data akun...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            {(user?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Pengaturan Akun Saya
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Kelola nama tampilan, email, dan keamanan kata sandi akun Anda.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
          <Shield size={14} />
          <span>{profile?.role || 'Admin'}</span>
        </div>
      </div>

      {/* Alert Messages */}
      {msgSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs rounded-2xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{msgSuccess}</span>
        </div>
      )}
      {msgError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-600 font-bold text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{msgError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form Profil */}
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/10">
            <User size={18} className="text-emerald-600" />
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Informasi Pribadi</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-500 font-semibold mb-1.5">Alamat Email (Login)</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-xl pl-10 pr-3 py-2.5 text-zinc-500 font-medium cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1.5">Nama Lengkap / Tampilan</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tampilan"
                required
                className="w-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <div>
              <label className="block text-zinc-500 font-semibold mb-1.5">Role Sistem</label>
              <input
                type="text"
                value={(profile?.role || 'admin').toUpperCase()}
                disabled
                className="w-full bg-black/5 dark:bg-white/5 border border-transparent rounded-xl px-3.5 py-2.5 text-zinc-500 font-bold uppercase cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingProfile ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Profil'}
            </button>
          </form>
        </div>

        {/* Form Ubah Password */}
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-3 border-b border-black/5 dark:border-white/10">
            <KeyRound size={18} className="text-emerald-600" />
            <h2 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Keamanan & Sandi</h2>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1.5">Kata Sandi Baru</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="w-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 font-semibold mb-1.5">Ulangi Kata Sandi Baru</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi kata sandi"
                required
                className="w-full bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-zinc-100 outline-none focus:border-emerald-500 transition font-medium"
              />
            </div>

            <p className="text-[11px] text-zinc-400">
              Pastikan kata sandi Anda kuat untuk mengamankan hak akses administrasi brosur.
            </p>

            <button
              type="submit"
              disabled={savingPassword}
              className="w-full py-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingPassword ? <Loader2 size={16} className="animate-spin" /> : 'Perbarui Kata Sandi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
