'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserCog, Shield, ShieldCheck, UserCheck, UserX, Loader2, 
  Sparkles, Search, RefreshCw, CheckCircle2, AlertCircle, Mail, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');
  const [activatingAll, setActivatingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
      } else {
        setErrorMsg(data.error || 'Gagal memuat data pengguna.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleActivateAll = async () => {
    if (!confirm('Apakah Anda yakin ingin mengaktifkan SEMUA pengguna sebagai Admin?')) return;
    setActivatingAll(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate_all' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Semua pengguna berhasil diaktifkan!');
        await fetchUsers();
      } else {
        setErrorMsg(data.error || 'Gagal mengaktifkan semua pengguna.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setActivatingAll(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle_active', 
          userId, 
          isActive: !currentStatus 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
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

  const handleSetRole = async (userId: string, nextRole: string) => {
    setUpdatingId(userId);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'toggle_role', 
          userId, 
          role: nextRole 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
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

  const handleToggleRole = (userId: string, currentRole: string) => {
    // Rotasi role: user -> admin -> super-admin -> user
    const roleCycle: Record<string, string> = {
      'user': 'admin',
      'admin': 'super-admin',
      'super-admin': 'user',
    };
    const nextRole = roleCycle[currentRole] || 'admin';
    handleSetRole(userId, nextRole);
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term);
  });

  return (
    <div className="p-6 md:p-10 w-full max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white  border border-black/5  rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCog className="text-accent" size={26} />
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Akses Admin & User</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Kelola role Super Admin, Admin, dan User serta aktifkan akses untuk seluruh pengguna terdaftar pada sistem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            title="Segarkan Data"
            disabled={loading}
            className="p-3 bg-black/5  hover:bg-black/10  rounded-2xl transition-all disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleActivateAll}
            disabled={activatingAll || loading}
            className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          >
            {activatingAll ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Mengaktifkan...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Aktifkan Semua Pengguna</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert / Feedback Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600  font-bold text-sm rounded-2xl flex items-center gap-3"
          >
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-500/10 border border-red-500/20 text-red-600  font-bold text-sm rounded-2xl flex items-center gap-3"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white  border border-black/5  rounded-2xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all shadow-sm"
          />
        </div>

        <div className="text-xs font-bold text-zinc-500 bg-black/5  px-4 py-3 rounded-2xl">
          Total Pengguna: <span className="text-zinc-900 ">{filteredUsers.length}</span>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white  border border-black/5  rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
            <Loader2 size={32} className="animate-spin text-accent" />
            <p className="text-sm font-semibold">Memuat daftar pengguna...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <UserX size={36} className="text-zinc-300 " />
            <p className="text-base font-bold text-zinc-600 ">Tidak ada pengguna yang ditemukan</p>
            {search && <p className="text-xs">Coba ubah kata kunci pencarian Anda.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/5  bg-black/[0.02] [0.02] text-[11px] font-extrabold uppercase tracking-widest text-zinc-400">
                  <th className="py-4 px-6">Pengguna</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Status Akses</th>
                  <th className="py-4 px-6">Tanggal Daftar</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5  text-sm font-medium">
                {filteredUsers.map((u) => {
                  const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();
                  const isBusy = updatingId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-black/[0.01] [0.01] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent/80 to-accent text-white font-extrabold text-sm flex items-center justify-center shadow-md shadow-accent/20 shrink-0">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-900 ">{u.name}</p>
                            <p className="text-xs text-zinc-400 font-mono">ID: {u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-zinc-600 ">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-zinc-400" />
                          <span>{u.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            disabled={isBusy}
                            title="Klik untuk rotasi role (User -> Admin -> Super Admin)"
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                              u.role === 'super-admin'
                                ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20'
                                : u.role === 'admin'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/20'
                            }`}
                          >
                            <Shield size={13} />
                            <span className="uppercase">{u.role === 'super-admin' ? 'Super Admin' : u.role === 'admin' ? 'Admin' : 'User'}</span>
                          </button>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs border ${
                            u.is_active
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 '
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-600  animate-pulse'
                          }`}
                        >
                          {u.is_active ? <UserCheck size={14} /> : <UserX size={14} />}
                          <span>{u.is_active ? 'Aktif' : 'Menunggu Aktivasi'}</span>
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-zinc-400">
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

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleActive(u.id, u.is_active)}
                          disabled={isBusy}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                            u.is_active
                              ? 'bg-red-500/10 text-red-600  hover:bg-red-500 hover:text-white'
                              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/20'
                          }`}
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin inline mr-1" />
                          ) : null}
                          {u.is_active ? 'Nonaktifkan' : 'Aktifkan Pengguna'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
