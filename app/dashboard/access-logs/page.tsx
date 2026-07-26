'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { format, startOfToday, endOfToday, startOfYesterday, endOfYesterday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Activity, ShieldBan, ChevronRight, User, Globe, Smartphone, 
  ChevronLeft, ChevronsLeft, ChevronsRight 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

export default function AccessLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [activeTab, setActiveTab] = useState<'app' | 'web'>('app');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, activeTab, pageSize]);

  const fetchLogs = async () => {
    setIsLoading(true);
    let query = supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000); // Batas maksimal yang cukup besar untuk semua filter waktu

    if (dateFilter !== 'all') {
      let start, end;
      if (dateFilter === 'today') {
        start = startOfToday();
        end = endOfToday();
      } else if (dateFilter === 'yesterday') {
        start = startOfYesterday();
        end = endOfYesterday();
      } else if (dateFilter === 'this_week') {
        start = startOfWeek(new Date(), { weekStartsOn: 1 });
        end = endOfWeek(new Date(), { weekStartsOn: 1 });
      } else if (dateFilter === 'this_month') {
        start = startOfMonth(new Date());
        end = endOfMonth(new Date());
      }
      if (start && end) {
        query = query
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
      }
    }

    if (activeTab === 'app') {
      query = query.neq('app_version', 'Web');
    } else {
      query = query.eq('app_version', 'Web');
    }

    const { data, error } = await query;
    
    if (data) {
      setLogs(data);
    }
    setIsLoading(false);
  };

  type GroupedLog = { ip: string; location: string; count: number; logs: any[] };

  const groupedLogs = logs.reduce((acc, log) => {
    if (!acc[log.ip_address]) {
      acc[log.ip_address] = {
        ip: log.ip_address,
        location: log.location,
        count: 0,
        logs: []
      };
    }
    acc[log.ip_address].count += 1;
    acc[log.ip_address].logs.push(log);
    if (log.location && log.location !== 'Unknown' && acc[log.ip_address].location === 'Unknown') {
        acc[log.ip_address].location = log.location;
    }
    return acc;
  }, {} as Record<string, GroupedLog>);
  
  const groupedArray = (Object.values(groupedLogs) as GroupedLog[]).sort((a, b) => b.count - a.count);

  // Pagination kalkulasi
  const totalItems = groupedArray.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedArray = groupedArray.slice(startIndex, endIndex);

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2 mb-4">
            <Activity size={24} className="text-accent" />
            Log Akses Pengguna
          </h1>
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('app')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'app' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Smartphone size={16} /> Aplikasi Mobile
            </button>
            <button
              onClick={() => setActiveTab('web')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'web' 
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              <Globe size={16} /> Pengunjung Web
            </button>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-end gap-4 mt-2 md:mt-0">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white px-4 py-2.5 rounded-xl text-sm outline-none focus:border-accent font-medium"
          >
            <option value="today">Hari Ini</option>
            <option value="yesterday">Kemarin</option>
            <option value="this_week">Pekan Ini</option>
            <option value="this_month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
          <Link 
            href="/dashboard/blocked-ips"
            className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-opacity text-sm"
          >
            <ShieldBan size={16} /> Kelola Blokir IP
          </Link>
        </div>
      </div>
      
      <div className="bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Pengunjung (IP)</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400">Lokasi</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400 text-center">Total Akses</th>
                <th className="p-4 font-semibold text-sm text-zinc-600 dark:text-zinc-400"></th>
              </tr>
            </thead>
            <tbody>
              {groupedArray.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    Belum ada data akses terekam untuk periode ini.
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-zinc-500">
                    Memuat data...
                  </td>
                </tr>
              ) : (
                paginatedArray.map((group) => (
                  <tr 
                    key={group.ip}
                    onClick={() => router.push(`/dashboard/access-logs/${group.ip}`)}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors cursor-pointer group"
                  >
                    <td className="p-4 text-sm font-semibold flex items-center gap-3">
                      <div className="bg-zinc-100 dark:bg-zinc-800 p-2 rounded-lg text-zinc-500 dark:text-zinc-400 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
                        <User size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-zinc-900 dark:text-zinc-100">{group.ip}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                      {group.location || 'Unknown'}
                    </td>
                    <td className="p-4 text-sm font-bold text-accent text-center">
                      <span className="bg-accent/10 px-3 py-1 rounded-full">
                        {group.count}x
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-500 text-right">
                      <div className="flex items-center justify-end gap-1 group-hover:text-accent transition-colors">
                        <span className="text-xs">Lihat Detail</span>
                        <ChevronRight size={16} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        {!isLoading && totalItems > 0 && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs md:text-sm font-medium text-zinc-600 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span>Tampilkan:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-1.5 text-xs md:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>baris</span>
              </div>
              <span className="text-zinc-400">|</span>
              <span>
                Menampilkan <strong className="text-zinc-900 dark:text-zinc-100">{startIndex + 1}</strong> -{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">{endIndex}</strong> dari{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">{totalItems}</strong> IP
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="Halaman Pertama"
                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                title="Halaman Sebelumnya"
                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-3 py-1.5 text-xs md:text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                title="Halaman Selanjutnya"
                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Halaman Terakhir"
                className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
