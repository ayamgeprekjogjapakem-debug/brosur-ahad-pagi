'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export default function MainContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHadist9Imam = pathname?.startsWith('/dashboard/hadist9imam');
  const isHadistDashboard = pathname?.startsWith('/dashboard/hadist') && !isHadist9Imam;
  const isDashboardRoot = pathname === '/dashboard';

  return (
    <main className={`flex-1 overflow-x-hidden flex flex-col custom-scrollbar ${
      isHadist9Imam 
        ? 'p-0 overflow-hidden' 
        : isHadistDashboard 
        ? 'pt-2 px-2 pb-2 md:pt-4 md:px-4 md:pb-4 overflow-hidden' 
        : 'p-4 sm:p-6 md:p-8 overflow-y-auto'
    }`}>
      {children}
    </main>
  );
}
