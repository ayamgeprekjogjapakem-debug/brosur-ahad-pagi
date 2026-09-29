'use client';

import React from 'react';
import HadistSidebar from './components/HadistSidebar';

export default function HadistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-white/75  rounded-3xl overflow-hidden">
      <HadistSidebar />
      <div className="flex-1 w-full h-full overflow-y-auto relative flex flex-col">
        {children}
      </div>
    </div>
  );
}
