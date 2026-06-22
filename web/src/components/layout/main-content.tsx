'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname === '/chat';

  return (
    <main
      className={cn(
        'flex-1 transition-all duration-200',
        isChat ? '' : 'pb-20 lg:pb-4'
      )}
    >
      {isChat ? (
        <div className="h-[calc(100vh-3.5rem)]">{children}</div>
      ) : (
        children
      )}
    </main>
  );
}
