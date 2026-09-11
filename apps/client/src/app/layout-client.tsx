'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navigation from '@/components/Navigation';

export default function RootLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  
  // Always show navigation for now (debug)
  const showNavigation = true;

  return (
    <>
      {showNavigation && <Navigation />}
      {children}
    </>
  );
}
