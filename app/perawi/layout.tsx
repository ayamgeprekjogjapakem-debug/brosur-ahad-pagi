import React from 'react';
import RequireSpecialAccess from '@/app/components/RequireSpecialAccess';

export default function PerawiLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSpecialAccess featureId="perawi">
      {children}
    </RequireSpecialAccess>
  );
}
