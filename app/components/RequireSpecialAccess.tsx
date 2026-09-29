'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function RequireSpecialAccess({ children, featureId }: { children: React.ReactNode, featureId: string }) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const featuresStr = localStorage.getItem('mta_premium_features');
    if (featuresStr) {
      try {
        const allowed = JSON.parse(featuresStr);
        if (allowed.includes(featureId)) {
          setIsAuthorized(true);
          return;
        }
      } catch (e) {}
    }
    setIsAuthorized(false);
  }, [featureId]);

  if (isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-zinc-500 font-medium">Memverifikasi hak akses...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-zinc-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900 mb-3">Akses Ditolak</h1>
          <p className="text-zinc-500 mb-8 leading-relaxed">
            Halaman ini membutuhkan kode akses khusus (VIP/Spesial). Kode akses Anda saat ini tidak memiliki izin untuk melihat halaman ini.
          </p>
          <Link 
            href="/"
            className="w-full inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
