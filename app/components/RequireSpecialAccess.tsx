'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { verifyAccessCodeOnline } from '@/utils/accessCodeHelper';

export default function RequireSpecialAccess({
  children,
  featureId,
}: {
  children: React.ReactNode;
  featureId: string;
}) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async () => {
      // 1. Verifikasi kode akses secara online ke server database
      const result = await verifyAccessCodeOnline();
      if (!isMounted) return;

      if (!result.valid) {
        setIsAuthorized(false);
        return;
      }

      // 2. Cocokkan izin fitur setelah diselaraskan dari database server
      const featuresStr = localStorage.getItem('mta_premium_features');
      if (featuresStr) {
        try {
          const allowed = JSON.parse(featuresStr);
          if (Array.isArray(allowed) && allowed.includes(featureId)) {
            setIsAuthorized(true);
            return;
          }
        } catch {
          // Abaikan jika format JSON tidak valid
        }
      }

      setIsAuthorized(false);
    };

    checkAccess();

    return () => {
      isMounted = false;
    };
  }, [featureId]);

  if (isAuthorized === null) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm text-slate-500">
          Mohon tunggu sebentar, sedang memeriksa izin akses...
        </p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white px-6">
        <div className="max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto mb-5">
            <Lock className="w-5 h-5 text-slate-600" strokeWidth={1.75} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-slate-900 mb-2">
            Akses Terbatas
          </h1>

          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            Mohon maaf, halaman ini hanya tersedia untuk pengguna dengan kode
            akses khusus. Silakan hubungi admin atau masukkan kode akses Anda
            terlebih dahulu untuk melanjutkan.
          </p>

          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 px-5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}