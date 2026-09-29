import React from 'react';
import HadistSidebar from './components/HadistSidebar';

export default function Hadist9ImamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-full flex font-sans bg-[#fbfbfd]">
      <HadistSidebar />
      <div className="flex-1 overflow-hidden flex flex-col relative z-10">
        {children}
      </div>
    </div>
  );
}
