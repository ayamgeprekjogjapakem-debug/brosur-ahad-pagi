import React from 'react';
import RequireSpecialAccess from '@/app/components/RequireSpecialAccess';

export default function HadistLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSpecialAccess featureId="hadist">
      {children}
    </RequireSpecialAccess>
  );
}
