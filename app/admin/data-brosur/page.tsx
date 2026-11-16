'use client';

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AdminDataBrosurView from './AdminDataBrosurView';

export default function AdminDataBrosurPage() {
  return (
    <Suspense fallback={
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={24} />
        <p className="text-xs text-zinc-400 font-medium">Memuat database brosur...</p>
      </div>
    }>
      <AdminDataBrosurView initialTab="brosur" />
    </Suspense>
  );
}
