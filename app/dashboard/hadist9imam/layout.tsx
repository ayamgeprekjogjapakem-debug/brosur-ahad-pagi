import React from 'react';
import Hadist9ImamNavTabs from './components/Hadist9ImamNavTabs';

export default function Hadist9ImamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#fafafa]">
      <Hadist9ImamNavTabs />
      <div className="flex-1 w-full overflow-y-auto relative">
        {children}
      </div>
    </div>
  );
}
