'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  ShieldAlert, ShieldCheck, Users, Sparkles, RefreshCw, 
  CheckCircle2, AlertCircle, AlertTriangle, KeyRound, UserCheck, 
  UserX, Shield, Lock, Search, Cpu, Database, Server, Flame
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

interface SuperAdminClientProps {
  currentUserId: string;
  currentUserEmail: string;
}

export default function AdminSuperAdminClient({
  currentUserId,
  currentUserEmail,
}: SuperAdminClientProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activatingAll, setActivatingAll] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // System statistics
  const [stats, setStats] = useState({
    total: 0,
    superAdmins: 0,
    admins: 0,
    regularUsers: 0,
    activeCount: 0,
    pendingCount: 0,
  });

  const fetchUsers = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        computeStats(data.users);
      } else {
        setErrorMsg(data.error || 'Gagal mengambil data pengguna.');
      }
    } catch (err: any) {
      setErrorMsg('Gagal terhubung ke endpoint manajemen pengguna.');
    } finally {
      setLoading(false);
    }
  };

  const computeStats = (userList: UserItem[]) => {
    const total = userList.length;
    const superAdmins = userList.filter(u => u.role === 'super-admin').length;
    const admins = userList.filter(u => u.role === 'admin').length;
    const regularUsers = userList.filter(u => u.role === 'user').length;
    const activeCount = userList.filter(u => u.is_active).length;
    const pendingCount = total - activeCount;

    setStats({
      total,
      superAdmins,
      admins,
      regularUsers,
      activeCount,
      pendingCount,
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleActivateAll = async () => {
    if (!confirm('Peringatan Otoritas Penuh: Apakah Anda yakin ingin mengaktifkan akses untuk SEMUA pengguna yang terdaftar pada sistem?')) {
      return;
    }
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
        setSuccessMsg(data.message || 'Semua pengguna berhasil diaktifkan aksesnya!');
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

  const handleToggleActive = async (targetUser: UserItem) => {
    if (targetUser.id === currentUserId) {
      setErrorMsg('Anda tidak dapat menonaktifkan akun Super Admin Anda sendiri.');
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
        setUsers(prev => {
          const next = prev.map(u => (u.id === targetUser.id ? { ...u, is_active: !targetUser.is_active } : u));
          computeStats(next);
          return next;
        });
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
      setErrorMsg('Anda tidak dapat menurunkan role akun Anda sendiri.');
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
        setUsers(prev => {
          const next = prev.map(u => (u.id === targetUser.id ? { ...u, role: nextRole } : u));
          computeStats(next);
          return next;
        });
      } else {
        setErrorMsg(data.error || 'Gagal mengubah role.');
      }
    } catch (err: any) {
      setErrorMsg('Terjadi kesalahan koneksi.');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (u.name || '').toLowerCase().includes(term) || (u.email || '').toLowerCase().includes(term) || u.role.toLowerCase().includes(term);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 font-sans pb-16">
      {/* Top Banner Otoritas Super Admin */}
      <div className="bg-gradient-to-r from-zinc-900 via-indigo-950 to-zinc-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-indigo-500/20 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shrink-0 shadow-md border border-white/10 bg-white/5">
              <Image
                src="/images/logo_rb.png"
                alt="Logo Pustaka"
                fill
                sizes="56px"
                className="object-contain"
              />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                <ShieldAlert size={13} className="text-indigo-400" />
                <span>Otoritas Tertinggi Sistem</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Super Admin Console
              </h1>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
                Kelola hak akses pengguna, tetapkan Super Admin, dan pantau seluruh sistem Brosur Ahad Pagi.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={fetchUsers}
              disabled={loading}
              title="Segarkan Data"
              className="p-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl transition disabled:opacity-50 border border-white/10"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleActivateAll}
              disabled={activatingAll || loading}
              className="px-5 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles size={16} />
              <span>{activatingAll ? 'Mengaktifkan...' : 'Aktivasi Massal Semua User'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Statistik Hak Akses */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Total Akun</span>
          <p className="text-2xl font-bold text-zinc-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-200/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block">Super Admin</span>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.superAdmins}</p>
        </div>
        <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">Admin</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">{stats.admins}</p>
        </div>
        <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">Pengguna Biasa</span>
          <p className="text-2xl font-bold text-zinc-800 mt-1">{stats.regularUsers}</p>
        </div>
        <div className="bg-teal-50/50 border border-teal-200/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-teal-600 uppercase tracking-wider block">Akun Aktif</span>
          <p className="text-2xl font-bold text-teal-900 mt-1">{stats.activeCount}</p>
        </div>
        <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">Nonaktif</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">{stats.pendingCount}</p>
        </div>
      </div>

      {/* Alert Feedbacks */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold">
              Tutup
            </button>
          </motion.div>
        )}

        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm font-medium rounded-2xl flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-red-600 hover:text-red-800 text-xs font-bold">
              Tutup
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, email, atau role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-zinc-400"
          />
        </div>

        <div className="text-xs font-semibold text-zinc-500 bg-white border border-zinc-200 px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto">
          <span>Hasil Pencarian:</span>
          <span className="font-bold text-zinc-800">{filteredUsers.length} Akun</span>
        </div>
      </div>

      {/* Users Control Table */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-600" />
            <h2 className="text-sm font-bold text-zinc-800">Daftar & Hak Akses Pengguna Lengkap</h2>
          </div>
          <span className="text-[11px] text-zinc-400 font-medium">
            Super Admin berhak mengatur role & status seluruh pengguna
          </span>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-zinc-400 gap-2">
            <RefreshCw size={28} className="animate-spin text-indigo-600" />
            <p className="text-xs font-medium">Memuat data pengguna dari auth & database...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-1">
            <p className="text-sm font-semibold text-zinc-600">Tidak ada pengguna yang cocok</p>
            <p className="text-xs">Ubah kata kunci pencarian Anda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                  <th className="py-3 px-5">Pengguna</th>
                  <th className="py-3 px-5">Email</th>
                  <th className="py-3 px-5">Otoritas Role</th>
                  <th className="py-3 px-5">Status Aktivasi</th>
                  <th className="py-3 px-5 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isBusy = updatingId === u.id;
                  const initial = (u.name || u.email || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={u.id} className={`hover:bg-zinc-50/60 transition ${isSelf ? 'bg-indigo-50/20' : ''}`}>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${
                            u.role === 'super-admin' 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : u.role === 'admin' 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-zinc-900 text-sm">{u.name}</p>
                              {isSelf && (
                                <span className="bg-indigo-100 text-indigo-800 font-bold text-[10px] px-1.5 py-0.5 rounded-md border border-indigo-200">
                                  Anda (Super Admin)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono">ID: {u.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-xs text-zinc-600">
                        <span>{u.email}</span>
                      </td>

                      <td className="py-3.5 px-5">
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                            <Shield size={12} />
                            <span>SUPER ADMIN</span>
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={isBusy}
                            onChange={(e) => handleSetRole(u, e.target.value)}
                            className="bg-white border border-zinc-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="user">User (Pengguna)</option>
                            <option value="admin">Admin (Pengelola)</option>
                            <option value="super-admin">Super Admin (Akses Penuh)</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs border ${
                          u.is_active 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {u.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
                          <span>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {isSelf ? (
                          <span className="text-[11px] font-semibold text-zinc-400 italic">
                            Akun Utama (Terkunci)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={isBusy}
                            className={`px-3 py-1.5 rounded-lg font-medium text-xs transition border ${
                              u.is_active
                                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50'
                                : 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                            } disabled:opacity-50`}
                          >
                            {isBusy ? 'Memproses...' : u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
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
    </div>
  );
}
