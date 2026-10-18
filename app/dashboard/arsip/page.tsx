'use client';

import React, { useEffect, useState } from 'react';
import { 
  FileStack, Trash2, Download, Loader2, Edit2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FolderArchive, FileText, Database, Sparkles, X, Check,
  HardDrive, Calendar, ArrowRight, ShieldAlert, Folder
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function ArsipPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const [isExtracting, setIsExtracting] = useState<string | null>(null);
  const [extractProgress, setExtractProgress] = useState(0);

  // States for Selective Extraction Modal
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentArchiveName, setCurrentArchiveName] = useState<string>('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [extractDestination, setExtractDestination] = useState<'brosur' | 'hadist_chm'>('brosur');

  // Progress Bar Simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isExtracting) {
      setExtractProgress(0);
      interval = setInterval(() => {
        setExtractProgress((prev) => {
          if (prev >= 99) return 99;
          const increment = prev < 50 ? Math.random() * 2 + 1 : Math.random() * 0.5 + 0.1;
          return Math.min(prev + increment, 99);
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isExtracting]);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.storage.from('chm-uploads').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (!error && data) {
      setFiles(data.filter((f) => f.name !== '.emptyFolderPlaceholder'));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const filteredFiles = files.filter((f) =>
    (f.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredFiles.length, pageSize]);

  // Pagination calculation
  const totalItems = filteredFiles.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  const handlePreview = async (fileName: string) => {
    const valid = ['.zip', '.chm', '.pdf', '.html', '.htm'];
    if (!valid.some((ext) => fileName.endsWith(ext))) {
      alert('Hanya berkas berformat .zip, .chm, .pdf, atau .html yang dapat diekstrak ke Database.');
      return;
    }

    setIsPreviewing(true);
    setCurrentArchiveName(fileName);
    setPreviewFiles([]);
    setSelectedFiles([]);
    setCollapsedFolders({});

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, action: 'preview' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan saat pratinjau berkas.');

      setPreviewFiles(data.files || []);
      setSelectedFiles(data.files || []);
      setIsExtractModalOpen(true);
    } catch (err: any) {
      alert(`Gagal mengambil pratinjau berkas: ${err.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleProcessExtract = async () => {
    if (selectedFiles.length === 0) {
      alert('Pilih setidaknya satu berkas untuk diekstrak.');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin mengekstrak ${selectedFiles.length} berkas terpilih ke Database?`)) return;

    setIsExtractModalOpen(false);
    setIsExtracting(currentArchiveName);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: currentArchiveName,
          action: 'extract',
          selectedFiles: selectedFiles,
          destination: extractDestination,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan pemrosesan.');

      alert(data.message || 'Ekstraksi berkas berhasil diselesaikan!');
      router.refresh();
    } catch (err: any) {
      alert(`Gagal mengekstrak berkas: ${err.message}`);
    } finally {
      setIsExtracting(null);
    }
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setSelectedFiles(checked ? previewFiles : []);
  };

  const handleToggleFolder = (folderFiles: string[], checked: boolean) => {
    if (checked) {
      setSelectedFiles((prev) => Array.from(new Set([...prev, ...folderFiles])));
    } else {
      setSelectedFiles((prev) => prev.filter((f) => !folderFiles.includes(f)));
    }
  };

  const handleToggleFile = (file: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles((prev) => [...prev, file]);
    } else {
      setSelectedFiles((prev) => prev.filter((f) => f !== file));
    }
  };

  // Group files by directory
  const groupedFiles = previewFiles.reduce((acc, file) => {
    const parts = file.split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '/ (Root)';
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(file);
    return acc;
  }, {} as Record<string, string[]>);

  const handleCollapseAll = (collapse: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(groupedFiles).forEach((folder) => {
      newState[folder] = collapse;
    });
    setCollapsedFolders(newState);
  };

  const handleRename = async (oldName: string) => {
    const newName = prompt('Masukkan nama berkas baru (termasuk ekstensi .chm, .zip, atau .pdf):', oldName);
    if (!newName || newName === oldName) return;

    const valid = ['.chm', '.zip', '.pdf', '.html', '.htm'];
    if (!valid.some((ext) => newName.endsWith(ext))) {
      alert('Ekstensi berkas harus tetap .chm, .zip, .pdf, atau .html');
      return;
    }

    setIsRenaming(oldName);
    const { error: copyError } = await supabase.storage.from('chm-uploads').copy(oldName, newName);

    if (copyError) {
      alert(`Gagal menduplikasi nama baru: ${copyError.message}`);
    } else {
      const { data: removeData, error: removeError } = await supabase.storage.from('chm-uploads').remove([oldName]);
      if (removeError) {
        alert(`Nama baru berhasil dibuat, tetapi gagal menghapus nama lama: ${removeError.message}`);
      } else if (removeData && removeData.length === 0) {
        alert('Nama baru berhasil dibuat, tetapi nama lama tidak dapat dihapus.');
      }
      setFiles((prev) => prev.map((f) => (f.name === oldName ? { ...f, name: newName } : f)));
      router.refresh();
    }
    setIsRenaming(null);
  };

  const handleDelete = async (fileName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus arsip "${fileName}"?`)) return;

    setIsDeleting(fileName);
    const { data, error } = await supabase.storage.from('chm-uploads').remove([fileName]);

    if (error) {
      alert(`Gagal menghapus berkas: ${error.message}`);
    } else if (data && data.length === 0) {
      alert('Gagal menghapus berkas: Berkas tidak ditemukan atau ditolak oleh izin penyimpanan.');
    } else {
      setFiles((prev) => prev.filter((f) => f.name !== fileName));
      router.refresh();
    }
    setIsDeleting(null);
  };

  const getPublicUrl = (fileName: string) => {
    return supabase.storage.from('chm-uploads').getPublicUrl(fileName).data.publicUrl;
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-6 md:py-8 font-sans antialiased text-slate-800 select-none space-y-6">
      {/* Header Banner Section */}
      <div className="text-center space-y-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-xs font-medium">
          <Sparkles size={12} className="text-emerald-600" />
          <span>Pusat Penyimpanan Berkas</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Kelola Berkas &{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent font-extrabold">
            Arsip Mentah
          </span>
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed font-normal">
          Kelola berkas mentah (CHM, ZIP, PDF, HTML) yang telah tersimpan di Cloud Storage untuk diekstrak ke basis data.
        </p>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-none space-y-0">
        {/* Table Top Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <FolderArchive size={16} className="text-emerald-600" />
            <span>Daftar Berkas Arsip</span>
            <span className="ml-1 text-[11px] font-normal text-slate-400 font-mono">
              ({totalItems} berkas)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <input
              type="text"
              placeholder="Cari nama berkas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition w-full sm:w-56"
            />
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={28} />
            <p className="text-xs font-medium">Memuat daftar arsip...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-1">
            <FolderArchive size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">Belum ada berkas arsip yang ditemukan</p>
            <p className="text-[11px] text-slate-400">Silakan unggah berkas baru melalui menu Upload Berkas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-5">Nama Berkas</th>
                  <th className="py-3 px-5">Ukuran</th>
                  <th className="py-3 px-5">Tanggal Unggah</th>
                  <th className="py-3 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedFiles.map((file) => {
                  const ext = file.name.split('.').pop()?.toLowerCase();
                  const isZip = ext === 'zip';
                  const isPdf = ext === 'pdf';
                  const isChm = ext === 'chm';

                  return (
                    <tr key={file.name} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            {isZip ? (
                              <FolderArchive size={15} />
                            ) : isPdf ? (
                              <FileText size={15} className="text-rose-500" />
                            ) : isChm ? (
                              <FileStack size={15} className="text-emerald-700" />
                            ) : (
                              <FileText size={15} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-xs truncate max-w-xs sm:max-w-md">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                              ID: {file.id?.slice(0, 8) || 'storage'}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 text-slate-500 font-mono text-[11px]">
                        {(file.metadata?.size / 1024 / 1024).toFixed(2)} MB
                      </td>

                      <td className="py-3.5 px-5 text-slate-500 text-xs">
                        {new Date(file.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {(isZip || isChm || isPdf || ext === 'html' || ext === 'htm') && (
                            <button
                              onClick={() => handlePreview(file.name)}
                              disabled={isExtracting === file.name || isRenaming === file.name || isPreviewing}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg text-xs font-semibold transition active:scale-95 disabled:opacity-50"
                              title="Pilih dan Ekstrak ke Database"
                            >
                              {isExtracting === file.name || (isPreviewing && currentArchiveName === file.name) ? (
                                <Loader2 className="animate-spin" size={13} />
                              ) : (
                                'Ekstrak to Database'
                              )}
                            </button>
                          )}

                          {isPdf && (
                            <button
                              onClick={() => router.push(`/dashboard/data/create?pdf=${encodeURIComponent(file.name)}`)}
                              className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200/60 rounded-lg text-xs font-semibold transition"
                              title="Lengkapi data teks PDF"
                            >
                              Lengkapi Data
                            </button>
                          )}

                          <button
                            onClick={() => handleRename(file.name)}
                            disabled={isRenaming === file.name}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                            title="Ubah nama berkas"
                          >
                            {isRenaming === file.name ? <Loader2 className="animate-spin" size={14} /> : <Edit2 size={14} />}
                          </button>

                          <a
                            href={getPublicUrl(file.name)}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                            title="Unduh berkas"
                          >
                            <Download size={14} />
                          </a>

                          <button
                            onClick={() => handleDelete(file.name)}
                            disabled={isDeleting === file.name}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                            title="Hapus berkas"
                          >
                            {isDeleting === file.name ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {!isLoading && totalItems > 0 && (
              <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Tampilkan:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-800 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">
                    Menampilkan <strong className="text-slate-900">{startIndex + 1}</strong> -{' '}
                    <strong className="text-slate-900">{endIndex}</strong> dari{' '}
                    <strong className="text-slate-900">{totalItems}</strong> berkas
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selective Extraction Modal */}
      {isExtractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pilih Berkas untuk Diekstrak</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Arsip: <span className="font-semibold text-slate-800">{currentArchiveName}</span>
                </p>
              </div>
              <div className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-lg text-xs font-semibold">
                {selectedFiles.length} / {previewFiles.length} Dipilih
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar text-xs">
              <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
                <button
                  onClick={() => handleToggleSelectAll(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                >
                  Centang Semua
                </button>
                <button
                  onClick={() => handleToggleSelectAll(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Bersihkan Centang
                </button>
                <button
                  onClick={() => handleCollapseAll(true)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Tutup Semua Folder
                </button>
                <button
                  onClick={() => handleCollapseAll(false)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Buka Semua Folder
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(groupedFiles).map(([folder, folderFiles]) => {
                  const isAllFolderSelected = folderFiles.every((f) => selectedFiles.includes(f));
                  const isCollapsed = collapsedFolders[folder] || false;

                  return (
                    <div key={folder} className="border border-slate-200/80 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-3.5 py-2.5 flex items-center justify-between">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                            checked={isAllFolderSelected}
                            onChange={(e) => handleToggleFolder(folderFiles, e.target.checked)}
                          />
                          <span className="font-semibold text-slate-800 flex items-center gap-2">
                            <Folder size={14} className="text-emerald-600" />
                            {folder}
                          </span>
                        </label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {folderFiles.length} berkas
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                          {folderFiles.map((file, idx) => (
                            <label
                              key={idx}
                              className="flex items-center gap-2 p-2 border border-slate-100 hover:bg-slate-50 rounded-lg cursor-pointer transition text-xs"
                            >
                              <input
                                type="checkbox"
                                className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                                checked={selectedFiles.includes(file)}
                                onChange={(e) => handleToggleFile(file, e.target.checked)}
                              />
                              <span className="text-slate-700 truncate">{file.split('/').pop()}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-medium text-slate-600">Simpan ke:</span>
                <select
                  value={extractDestination}
                  onChange={(e) => setExtractDestination(e.target.value as any)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs text-slate-800 focus:outline-none"
                >
                  <option value="brosur">Koleksi Brosur</option>
                  <option value="hadist_chm">Koleksi Hadist (CHM)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsExtractModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessExtract}
                  disabled={selectedFiles.length === 0}
                  className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition disabled:opacity-50"
                >
                  Proses Ekstrak
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Extraction Loader / Overlay */}
      {isExtracting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center space-y-4 shadow-xl">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <div>
              <h3 className="text-base font-bold text-slate-900">Mengekstrak Arsip</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                {isExtracting}
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${extractProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between w-full text-xs text-slate-500 font-mono">
              <span>Mengekstrak konten...</span>
              <span className="font-bold text-emerald-600">{Math.floor(extractProgress)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
