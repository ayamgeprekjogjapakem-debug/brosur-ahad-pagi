'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserCog, Shield, ShieldCheck, UserCheck, UserX, Loader2, 
  Search, RefreshCw, CheckCircle2, AlertCircle, Mail, Calendar,
  UserPlus, X, Lock, KeyRound, Sparkles, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminManagementAkunPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserRole, setCurrentUserRole] = useState<string>('admin');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Modal Registrasi Pengguna Baru
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'user' | 'admin' | 'super-admin'>('user');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  const supabase = createClient();
  const isSuperAdmin = currentUserRole === 'super-admin';

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Dapatkan profil user yang sedang login secara langsung dari Supabase Client
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (prof?.role) {
          setCurrentUserRole(prof.role);
        }
      }

      // 2. Fetch list pengguna dari endpoint API
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && Array.isArray(data.users) && data.users.length > 0) {
        setUsers(data.users);
        if (data.currentUserId) setCurrentUserId(data.currentUserId);
        if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);
      } else {
        // Fallback: Jika endpoint API gagal membaca (misal RLS/Service Key), ambil langsung via Supabase client
        const { data: clientProfiles } = await supabase.from('profiles').select('*');
        let mapped: UserItem[] = [];
        if (clientProfiles && clientProfiles.length > 0) {
          mapped = clientProfiles.map((p: any) => ({
            id: p.id,
            email: p.email || (p.id === user?.id ? user?.email : '') || `user-${p.id.slice(0, 8)}@brosur.local`,
            name: p.name || p.full_name || (p.id === user?.id ? (user?.user_metadata?.name || user?.email?.split('@')[0]) : '') || 'Pengguna',
            role: p.role || 'user',
            is_active: Boolean(p.is_active),
            created_at: p.created_at || new Date().toISOString(),
          }));
        }

        // Pastikan user saat ini ada di list
        if (user && !mapped.some((m) => m.id === user.id)) {
          mapped.unshift({
            id: user.id,
            email: user.email || (currentUserRole === 'super-admin' ? 'superadmin@brosurahad.id' : 'admin@brosurahad.id'),
            name: user.user_metadata?.name || user.email?.split('@')[0] || (currentUserRole === 'super-admin' ? 'Super Admin' : 'Admin'),
            role: currentUserRole || 'admin',
            is_active: true,
            created_at: user.created_at || new Date().toISOString(),
          });
        }

        // Jika user yang login adalah admin biasa, jangan munculkan akun super-admin
        if (currentUserRole !== 'super-admin') {
          mapped = mapped.filter((m) => m.role !== 'super-admin');
        }

        setUsers(mapped);
        if (data.error) {
          console.warn('API /api/users returned error, used client fallback:', data.error);
        }
      }
    } catch (err: any) {
      // Fallback jika fetch network error
      const { data: { user } } = await supabase.auth.getUser();
      const fallbackList: UserItem[] = [];
      if (user) {
        fallbackList.push({
          id: user.id,
          email: user.email || 'admin@brosurahad.id',
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'Admin',
          role: currentUserRole || 'admin',
          is_active: true,
          created_at: user.created_at || new Date().toISOString(),
        });
      }
      setUsers(fallbackList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (targetUser: UserItem) => {
    if (targetUser.id === currentUserId) {
      setErrorMsg('Anda tidak dapat mengubah status akun Anda sendiri.');
      return;
    }
    if (!isSuperAdmin && targetUser.role === 'super-admin') {
      setErrorMsg('Admin tidak diizinkan mengubah status Super Admin.');
      return;
    }

    setUpdatingId(targetUser.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle_active', 
          userId: targetUser.id, 
          isActive: !targetUser.is_active 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: !targetUser.is_active } : u))
        );
      } else {
        setErrorMsg(data.error || 'Gagal memperbarui status pengguna.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal mengubah status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSetRole = async (targetUser: UserItem, nextRole: string) => {
    if (targetUser.id === currentUserId) {
      setErrorMsg('Anda tidak dapat mengubah role akun Anda sendiri.');
      return;
    }
    if (!isSuperAdmin && targetUser.role === 'super-admin') {
      setErrorMsg('Admin tidak memiliki hak akses mengubah akun Super Admin.');
      return;
    }
    if (!isSuperAdmin && nextRole === 'super-admin') {
      setErrorMsg('Admin hanya bisa menetapkan role User atau Admin.');
      return;
    }

    setUpdatingId(targetUser.id);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle_role', 
          userId: targetUser.id, 
          role: nextRole 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
        );
      } else {
        setErrorMsg(data.error || 'Gagal memperbarui role pengguna.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal mengubah role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_user',
          name: regName,
          email: regEmail,
          password: regPassword,
          role: regRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Pengguna baru berhasil didaftarkan!');
        setShowRegisterModal(false);
        setRegName('');
        setRegEmail('');
        setRegPassword('');
        setRegRole('user');
        await fetchUsers();
      } else {
        setRegError(data.error || 'Gagal mendaftarkan pengguna baru.');
      }
    } catch (err: any) {
      setRegError('Terjadi kesalahan koneksi.');
    } finally {
      setRegLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Jika login sebagai admin biasa, jangan tampilkan akun super-admin
    if (!isSuperAdmin && u.role === 'super-admin') return false;

    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (u.name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term) ||
      (u.role || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCog size={22} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">Manajemen Akun & Hak Akses</h1>
              <p className="text-xs text-zinc-500 font-medium">
                Kelola hak akses pengguna, daftarkan akun baru, dan kontrol aktivasi sistem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchUsers}
            disabled={loading}
            title="Segarkan Data"
            className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            <UserPlus size={16} />
            <span>Registrasi Pengguna Baru</span>
          </button>
        </div>
      </div>

      {/* Role notice banner if Admin */}
      {!isSuperAdmin && (
        <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-800 text-xs sm:text-sm flex items-start gap-2.5">
          <AlertTriangle size={18} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Mode Akun Admin:</span>
            <p className="text-amber-700/90 text-xs">
              Sesuai aturan keamanan, Anda tidak dapat mengubah status/role akun Anda sendiri, dan hanya dapat mengelola pengguna dengan role <span className="font-semibold text-amber-900">User</span> atau <span className="font-semibold text-amber-900">Admin</span>.
            </p>
          </div>
        </div>
      )}

      {/* Alert / Feedback Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
              <X size={16} />
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-3.5 bg-red-50 border border-red-200 text-red-800 text-sm font-medium rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari nama atau email akun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-zinc-400"
          />
        </div>

        <div className="text-xs font-medium text-zinc-500 bg-white border border-zinc-200 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto">
          <span>Total Pengguna:</span>
          <span className="font-bold text-zinc-800">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2.5">
            <Loader2 size={28} className="animate-spin text-emerald-600" />
            <p className="text-xs font-medium">Memuat data pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <UserX size={32} className="text-zinc-300" />
            <p className="text-sm font-semibold text-zinc-600">Tidak ada pengguna ditemukan</p>
            {search && <p className="text-xs text-zinc-400">Silakan sesuaikan kata kunci pencarian Anda.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-5">Pengguna</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Role Akses</th>
                  <th className="py-3 px-5">Status</th>
                  <th className="py-3 px-5">Terdaftar</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isTargetSuperAdmin = u.role === 'super-admin';
                  // Admin tidak bisa mengubah dirinya sendiri dan tidak bisa mengubah super-admin
                  const isLocked = isSelf || (!isSuperAdmin && isTargetSuperAdmin);
                  const isBusy = updatingId === u.id;
                  const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={u.id} className={`hover:bg-zinc-50/60 transition-colors ${isSelf ? 'bg-emerald-50/20' : ''}`}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            isSelf 
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isTargetSuperAdmin 
                              ? 'bg-indigo-600 text-white' 
                              : u.role === 'admin' 
                              ? 'bg-zinc-800 text-white' 
                              : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-zinc-900 text-sm leading-tight">{u.name}</p>
                              {isSelf && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-1.5 py-0.5 rounded-md border border-emerald-300">
                                  Anda
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono">ID: {u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-zinc-600">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Mail size={13} className="text-zinc-400 shrink-0" />
                          <span className="truncate max-w-[180px] sm:max-w-xs">{u.email}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        {isLocked ? (
                          // Tampilan statis jika dikunci
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                            u.role === 'super-admin'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : u.role === 'admin'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                          }`}>
                            <Lock size={11} className="text-zinc-400" />
                            <span className="capitalize">{u.role === 'super-admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}</span>
                          </span>
                        ) : (
                          // Dropdown selector jika boleh diubah
                          <select
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) => handleSetRole(u, e.target.value)}
                            className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super-admin">Super Admin</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                            u.is_active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}
                        >
                          {u.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
                          <span>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-zinc-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} />
                          <span>
                            {new Date(u.created_at).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-[11px] font-semibold text-zinc-400 italic">
                            Terkunci (Akun Anda)
                          </span>
                        ) : !isSuperAdmin && isTargetSuperAdmin ? (
                          <span className="text-[11px] font-semibold text-zinc-400 italic">
                            Akses Terbatas
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isBusy}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all border ${
                              u.is_active
                                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                            } disabled:opacity-50`}
                          >
                            {isBusy && <Loader2 size={12} className="animate-spin inline mr-1" />}
                            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRASI PENGGUNA BARU */}
      <AnimatePresence>
        {showRegisterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-zinc-200 p-6 max-w-md w-full shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <UserPlus size={18} />
                  </div>
                  <h3 className="font-bold text-zinc-900 text-base">Registrasi Pengguna Baru</h3>
                </div>
                <button
                  onClick={() => setShowRegisterModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {regError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterUser} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ahmad Fauzi"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Alamat Email</label>
                  <input
                    type="email"
                    required
                    placeholder="nama@brosurahad.id"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Password Sementara</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimal 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Tentukan Role Hak Akses</label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as 'user' | 'admin' | 'super-admin')}
                    className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-sm font-medium text-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="user">User (Akses Pengguna Standar)</option>
                    <option value="admin">Admin (Akses Pengelola)</option>
                    {isSuperAdmin && <option value="super-admin">Super Admin (Akses Penuh)</option>}
                  </select>
                  {!isSuperAdmin && (
                    <p className="text-[11px] text-zinc-400">
                      Sebagai Admin, Anda dapat mendaftarkan role <span className="font-semibold text-zinc-600">User</span> atau <span className="font-semibold text-zinc-600">Admin</span>.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRegisterModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={regLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                  >
                    {regLoading && <Loader2 size={13} className="animate-spin" />}
                    <span>Daftarkan Akun</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
