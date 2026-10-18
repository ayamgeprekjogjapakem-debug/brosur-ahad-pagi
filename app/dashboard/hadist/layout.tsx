'use client';

import React from 'react';
import HadistNavTabs from './components/HadistNavTabs';

export default function HadistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#fafafa]">
      <HadistNavTabs />
      <div className="flex-1 w-full overflow-y-auto relative">
        {children}
      </div>
    </div>
  );
}
