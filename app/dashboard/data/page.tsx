'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Plus, Edit2, Trash2, Search, Database, FolderArchive, FileText, CheckSquare } from 'lucide-react';
import Link from 'next/link';

export default function DataBrosurPage() {
  const [activeTab, setActiveTab] = useState<'brosur' | 'folder'>('brosur');
  const [brosurs, setBrosurs] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // State untuk Fitur Pindah Masal (Bulk Move)
  const [selectedBrosurs, setSelectedBrosurs] = useState<string[]>([]);
  const [bulkFolderId, setBulkFolderId] = useState<string>('');
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
  
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch Brosur
    const { data: brosurData } = await supabase
      .from('brosur')
      .select('id, judul, tahun, slug, created_at, folder_id, folders(name)')
      .order('tahun', { ascending: false });
      
    if (brosurData) setBrosurs(brosurData);
    
    // Fetch Folders
    const { data: folderData } = await supabase
      .from('folders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (folderData) setFolders(folderData);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteBrosur = async (id: string, judul: string) => {
    if (!window.confirm(`Yakin ingin menghapus brosur "${judul}"?`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('brosur').delete().eq('id', id);
    if (error) alert(`Gagal menghapus: ${error.message}`);
    else {
      setBrosurs(brosurs.filter(b => b.id !== id));
      setSelectedBrosurs(selectedBrosurs.filter(s => s !== id));
    }
    setDeletingId(null);
  };

  const handleDeleteFolder = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus folder "${name}"?\nPERINGATAN: Pastikan tidak ada brosur di dalam folder ini atau brosur tersebut akan ikut terhapus / kehilangan referensi!`)) return;
    setDeletingId(id);
    const { error } = await supabase.from('folders').delete().eq('id', id);
    if (error) alert(`Gagal menghapus: ${error.message}`);
    else setFolders(folders.filter(f => f.id !== id));
    setDeletingId(null);
  };

  const filteredBrosurs = brosurs.filter(b => 
    b.judul.toLowerCase().includes(search.toLowerCase()) || 
    b.tahun.toString().includes(search)
  );

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(search.toLowerCase()))
  );

  // Bulk Actions Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedBrosurs(filteredBrosurs.map(b => b.id));
    } else {
      setSelectedBrosurs([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedBrosurs.includes(id)) {
      setSelectedBrosurs(selectedBrosurs.filter(b => b !== id));
    } else {
      setSelectedBrosurs([...selectedBrosurs, id]);
    }
  };

  const handleBulkMove = async () => {
    if (!bulkFolderId) return alert('Silakan pilih folder tujuan terlebih dahulu!');
    if (!window.confirm(`Pindahkan ${selectedBrosurs.length} brosur ke folder terpilih?`)) return;

    setIsUpdatingBulk(true);
    const { error } = await supabase
      .from('brosur')
      .update({ folder_id: bulkFolderId })
      .in('id', selectedBrosurs);

    if (error) {
      alert(`Gagal memindahkan brosur: ${error.message}`);
    } else {
      setSelectedBrosurs([]);
      setBulkFolderId('');
      fetchData(); // Muat ulang data agar tampilan folder terbaru terlihat
    }
    setIsUpdatingBulk(false);
  };

  return (
    <main className="p-8 md:p-12 w-full max-w-7xl mx-auto">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <Database className="text-accent" /> Data Brosur & Koleksi
          </h1>
          <p className="text-zinc-500">Kelola brosur dan master koleksi (kategori) arsip Anda.</p>
        </div>
        
        {activeTab === 'brosur' ? (
          <Link 
            href="/dashboard/data/create" 
            className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-accent/90 transition-colors shrink-0"
          >
            <Plus size={18} /> Tambah Brosur
          </Link>
        ) : (
          <Link 
            href="/dashboard/data/folder/create" 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shrink-0"
          >
            <Plus size={18} /> Buat Koleksi Baru
          </Link>
        )}
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-black/5 dark:border-white/5 pb-2">
        <button 
          onClick={() => { setActiveTab('brosur'); setSelectedBrosurs([]); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'brosur' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-accent' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <FileText size={18} /> Brosur Terisi ({brosurs.length})
        </button>
        <button 
          onClick={() => { setActiveTab('folder'); setSelectedBrosurs([]); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors ${activeTab === 'folder' ? 'bg-white dark:bg-zinc-900 border-t border-l border-r border-black/5 dark:border-white/5 text-blue-600' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
        >
          <FolderArchive size={18} /> Master Koleksi ({folders.length})
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm rounded-tl-none">
        
        <div className="mb-6 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder={activeTab === 'brosur' ? "Cari judul atau tahun brosur..." : "Cari nama koleksi..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all"
          />
        </div>

        {/* Action Bar Muncul Jika Ada Brosur Terpilih */}
        {activeTab === 'brosur' && selectedBrosurs.length > 0 && (
          <div className="mb-6 bg-accent/10 border border-accent/20 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="font-bold flex items-center gap-2">
              <CheckSquare className="text-accent" size={20} />
              <span className="text-accent">{selectedBrosurs.length} Brosur Terpilih</span>
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <select 
                value={bulkFolderId}
                onChange={(e) => setBulkFolderId(e.target.value)}
                className="bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-accent flex-1 md:w-48"
              >
                <option value="" disabled>-- Pindah ke Koleksi --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              
              <button 
                onClick={handleBulkMove}
                disabled={isUpdatingBulk || !bulkFolderId}
                className="bg-accent text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-accent/90 disabled:opacity-50 transition-colors shrink-0 flex items-center gap-2"
              >
                {isUpdatingBulk ? <Loader2 className="animate-spin" size={16} /> : 'Terapkan'}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="animate-spin mb-4 text-accent" size={32} />
            <p>Memuat data...</p>
          </div>
        ) : activeTab === 'brosur' ? (
          /* TAB BROSUR */
          filteredBrosurs.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p>Tidak ada brosur yang ditemukan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5 text-zinc-500 text-sm">
                    <th className="p-4 w-12">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-accent cursor-pointer rounded"
                        checked={filteredBrosurs.length > 0 && selectedBrosurs.length === filteredBrosurs.length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="p-4 font-bold">Judul</th>
                    <th className="p-4 font-bold">Tahun</th>
                    <th className="p-4 font-bold">Koleksi</th>
                    <th className="p-4 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBrosurs.map((brosur) => (
                    <tr key={brosur.id} className={`border-b border-black/5 dark:border-white/5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors ${selectedBrosurs.includes(brosur.id) ? 'bg-accent/5 dark:bg-accent/10' : ''}`}>
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 accent-accent cursor-pointer rounded"
                          checked={selectedBrosurs.includes(brosur.id)}
                          onChange={() => handleSelectOne(brosur.id)}
                        />
                      </td>
                      <td className="p-4 font-bold max-w-[200px] truncate" title={brosur.judul}>
                        {brosur.judul}
                      </td>
                      <td className="p-4">
                        <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold">
                          {brosur.tahun}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-zinc-500">
                        {brosur.folders ? (
                          <span className="flex items-center gap-1"><FolderArchive size={14} className="text-blue-500"/> {brosur.folders.name}</span>
                        ) : (
                          <span className="italic text-zinc-400">Tidak ada koleksi</span>
                        )}
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <Link 
                          href={`/dashboard/data/edit/${brosur.id}`}
                          className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                          title="Edit Brosur"
                        >
                          <Edit2 size={16} />
                        </Link>
                        <button 
                          onClick={() => handleDeleteBrosur(brosur.id, brosur.judul)}
                          disabled={deletingId === brosur.id}
                          className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                          title="Hapus Brosur"
                        >
                          {deletingId === brosur.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* TAB FOLDER */
          filteredFolders.length === 0 ? (
            <div className="py-20 text-center text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <p>Tidak ada koleksi yang ditemukan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFolders.map((folder) => (
                <div key={folder.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col hover:border-blue-500/50 transition-colors group bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                        <FolderArchive size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{folder.name}</h3>
                        <p className="text-xs text-zinc-500 font-mono">/{folder.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link 
                        href={`/dashboard/data/folder/edit/${folder.id}`}
                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </Link>
                      <button 
                        onClick={() => handleDeleteFolder(folder.id, folder.name)}
                        disabled={deletingId === folder.id}
                        className="p-2 bg-black/5 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      >
                        {deletingId === folder.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 flex-1">
                    {folder.description || <span className="italic opacity-50">Tidak ada deskripsi</span>}
                  </p>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}
