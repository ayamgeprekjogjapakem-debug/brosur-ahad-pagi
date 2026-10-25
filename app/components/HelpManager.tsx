'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit3, Trash2, Phone, MessageSquare, CheckCircle, 
  XCircle, AlertCircle, RefreshCw, ExternalLink, UserCheck, 
  Sparkles, HelpCircle, Shield, ArrowUpDown, Search, User
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export interface KonsultanItem {
  id: string;
  nama: string;
  bidang: string;
  nomor_wa: string;
  pesan_pembuka?: string;
  foto_url?: string;
  deskripsi?: string;
  is_active: boolean;
  urutan: number;
  created_at?: string;
}

export default function HelpManager({ role = 'admin' }: { role?: string }) {
  const [items, setItems] = useState<KonsultanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KonsultanItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    bidang: 'Konsultan Hadits & Fiqih',
    nomor_wa: '',
    pesan_pembuka: 'Assalamu\'alaikum Ustadz, mohon izin bertanya mengenai penjelasan hadits di aplikasi Pustaka.',
    foto_url: '',
    deskripsi: '',
    urutan: 1,
    is_active: true,
  });

  const supabase = createClient();

  const fetchItems = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase
        .from('konsultasi_hadits')
        .select('*')
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        // Jika tabel belum dibuat, berikan instruksi ramah
        if (error.code === '42P01') {
          setErrorMsg('Tabel "konsultasi_hadits" belum dibuat di Supabase. Silakan jalankan file "supabase_konsultasi_hadits.sql" di SQL Editor Supabase terlebih dahulu.');
        } else {
          setErrorMsg(error.message);
        }
      } else {
        setItems(data || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const cleanPhoneNumber = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  const handleOpenModal = (item?: KonsultanItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nama: item.nama,
        bidang: item.bidang || 'Konsultan Hadits & Fiqih',
        nomor_wa: item.nomor_wa,
        pesan_pembuka: item.pesan_pembuka || '',
        foto_url: item.foto_url || '',
        deskripsi: item.deskripsi || '',
        urutan: item.urutan ?? 1,
        is_active: item.is_active ?? true,
      });
    } else {
      setEditingItem(null);
      setFormData({
        nama: '',
        bidang: 'Konsultan Hadits & Fiqih',
        nomor_wa: '',
        pesan_pembuka: 'Assalamu\'alaikum Ustadz, mohon izin bertanya mengenai penjelasan hadits di aplikasi Pustaka.',
        foto_url: '',
        deskripsi: '',
        urutan: items.length + 1,
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.nomor_wa.trim()) {
      alert('Nama dan Nomor WhatsApp wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    const formattedPhone = cleanPhoneNumber(formData.nomor_wa);

    const payload = {
      nama: formData.nama.trim(),
      bidang: formData.bidang.trim(),
      nomor_wa: formattedPhone,
      pesan_pembuka: formData.pesan_pembuka.trim(),
      foto_url: formData.foto_url.trim() || null,
      deskripsi: formData.deskripsi.trim() || null,
      urutan: Number(formData.urutan) || 0,
      is_active: formData.is_active,
      updated_at: new Date().toISOString(),
    };

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('konsultasi_hadits')
          .update(payload)
          .eq('id', editingItem.id);

        if (error) throw error;
        setSuccessMsg(`Kontak "${payload.nama}" berhasil diperbarui.`);
      } else {
        const { error } = await supabase
          .from('konsultasi_hadits')
          .insert([payload]);

        if (error) throw error;
        setSuccessMsg(`Kontak baru "${payload.nama}" berhasil ditambahkan.`);
      }

      setIsModalOpen(false);
      fetchItems();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal menyimpan: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: KonsultanItem) => {
    try {
      const nextStatus = !item.is_active;
      const { error } = await supabase
        .from('konsultasi_hadits')
        .update({ is_active: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', item.id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: nextStatus } : i));
    } catch (err: any) {
      alert('Gagal mengubah status: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('konsultasi_hadits')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;
      setItems(prev => prev.filter(i => i.id !== deleteId));
      setDeleteId(null);
      setSuccessMsg('Kontak berhasil dihapus.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Gagal menghapus: ' + err.message);
    }
  };

  const filteredItems = items.filter(item => {
    const q = searchQuery.toLowerCase();
    return (
      item.nama.toLowerCase().includes(q) ||
      item.bidang.toLowerCase().includes(q) ||
      item.nomor_wa.includes(q)
    );
  });

  const activeCount = items.filter(i => i.is_active).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                Konsultasi Hadist & WhatsApp Help
              </h1>
              <p className="text-sm text-zinc-500">
                Kelola daftar narahubung asatidzah & kontak bantuan yang dapat dihubungi pengguna langsung via WhatsApp di aplikasi mobile.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Konsultan</span>
          </button>
        </div>
      </div>

      {/* Alert Success / Error */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Perhatian</p>
            <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900">{items.length}</div>
            <div className="text-xs text-zinc-500 font-medium">Total Kontak Terdaftar</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900">{activeCount}</div>
            <div className="text-xs text-zinc-500 font-medium">Aktif Tampil di Mobile</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Phone className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-900">WhatsApp</div>
            <div className="text-xs text-zinc-500 font-medium">Integrasi Langsung Satu Klik</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-50 p-3 rounded-2xl border border-zinc-200/60">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama konsultan, bidang, nomor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
        <div className="text-xs text-zinc-500 font-medium px-2">
          Menampilkan <span className="text-zinc-900 font-semibold">{filteredItems.length}</span> dari {items.length} konsultan
        </div>
      </div>

      {/* Main Content: Card List / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Memuat daftar konsultan hadist...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-zinc-200 p-8">
          <div className="w-16 h-16 bg-zinc-50 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-3">
            <User className="w-8 h-8 text-zinc-300" />
          </div>
          <h3 className="font-semibold text-zinc-800 text-base mb-1">Belum Ada Konsultan</h3>
          <p className="text-zinc-500 text-xs max-w-sm mx-auto mb-5">
            {searchQuery ? 'Tidak ada kontak yang cocok dengan kata kunci pencarian Anda.' : 'Mulai tambahkan ustadz atau staf bantuan untuk layanan konsultasi hadits langsung ke WhatsApp.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-medium text-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kontak Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => (
            <div 
              key={item.id}
              className={`bg-white rounded-2xl border transition shadow-xs hover:shadow-md p-5 flex flex-col justify-between ${
                item.is_active ? 'border-zinc-200' : 'border-zinc-200/60 opacity-60 bg-zinc-50/50'
              }`}
            >
              <div>
                {/* Header Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 border border-emerald-200">
                      {item.foto_url ? (
                        <img src={item.foto_url} alt={item.nama} className="w-full h-full object-cover" />
                      ) : (
                        <span>{item.nama.substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900 text-base leading-snug">
                        {item.nama}
                      </h3>
                      <span className="inline-block text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md mt-1 border border-emerald-100">
                        {item.bidang}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleActive(item)}
                      title={item.is_active ? 'Klik untuk nonaktifkan' : 'Klik untuk aktifkan'}
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold transition flex items-center gap-1 ${
                        item.is_active 
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' 
                          : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                      }`}
                    >
                      {item.is_active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Nonaktif</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Deskripsi */}
                {item.deskripsi && (
                  <p className="text-xs text-zinc-600 bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 mb-3 leading-relaxed">
                    {item.deskripsi}
                  </p>
                )}

                {/* Info WhatsApp */}
                <div className="space-y-1.5 text-xs text-zinc-600 mb-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono font-medium text-zinc-800">+{item.nomor_wa}</span>
                  </div>
                  {item.pesan_pembuka && (
                    <div className="flex items-start gap-2 text-zinc-500 italic">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">&quot;{item.pesan_pembuka}&quot;</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 mt-2">
                <span className="text-[11px] text-zinc-400 font-medium">
                  Urutan: #{item.urutan}
                </span>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://wa.me/${cleanPhoneNumber(item.nomor_wa)}?text=${encodeURIComponent(item.pesan_pembuka || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition flex items-center gap-1 text-xs font-semibold"
                    title="Tes Chat ke WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Tes WA</span>
                  </a>

                  <button
                    onClick={() => handleOpenModal(item)}
                    className="p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition"
                    title="Edit Kontak"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition"
                    title="Hapus Kontak"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl border border-zinc-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 mb-5">
              <h3 className="font-bold text-lg text-zinc-900">
                {editingItem ? 'Edit Kontak Konsultan' : 'Tambah Konsultan Hadits Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Nama Lengkap & Gelar <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ust. Ahmad Fauzi, Lc., M.A."
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Bidang / Keahlian
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Konsultan Hadits & Fiqih / Dewan Tafsir"
                  value={formData.bidang}
                  onChange={(e) => setFormData({ ...formData, bidang: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 08123456789 atau 628123456789"
                    value={formData.nomor_wa}
                    onChange={(e) => setFormData({ ...formData, nomor_wa: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Format akan otomatis dikonversi ke kode negara (62).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Pesan Pembuka WhatsApp Otomatis
                </label>
                <textarea
                  rows={2}
                  placeholder="Teks awal yang otomatis terisi saat user membuka chat WhatsApp..."
                  value={formData.pesan_pembuka}
                  onChange={(e) => setFormData({ ...formData, pesan_pembuka: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Deskripsi / Keterangan Singkat (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Jadwal respons: Ba'da Ashar - Isya WIB"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Urutan Tampil
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.urutan}
                    onChange={(e) => setFormData({ ...formData, urutan: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Status Aktif
                  </label>
                  <div className="flex items-center gap-3 mt-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                    <span className="text-xs text-zinc-600 font-medium">
                      {formData.is_active ? 'Tampil di Mobile' : 'Disembunyikan'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  URL Foto Profil (Opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/foto.jpg"
                  value={formData.foto_url}
                  onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 font-medium transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm"
                >
                  {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingItem ? 'Simpan Perubahan' : 'Tambahkan Kontak'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialog Konfirmasi Hapus */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-zinc-100 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-center text-zinc-900 text-base mb-1">Hapus Kontak Konsultan?</h4>
            <p className="text-zinc-500 text-center text-xs mb-5">
              Kontak ini tidak akan lagi muncul di layanan konsultasi hadits aplikasi mobile.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition shadow-sm"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
