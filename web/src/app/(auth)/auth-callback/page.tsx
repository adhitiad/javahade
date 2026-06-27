'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const router = useRouter();
  const { syncSocialLogin } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      try {
        const needs2FA = await syncSocialLogin();
        if (mounted) {
          if (needs2FA) {
            // Jangan redirect, Social2FADialog yang di providers.tsx akan muncul
            return;
          }

          toast.success('Berhasil masuk melalui layanan Social!');
          // Arahkan ke dashboard
          router.replace('/');
        }
      } catch (err: any) {
        if (mounted) {
          console.error(err);
          setError('Gagal menghubungkan sesi Anda. Silakan coba login kembali.');
          toast.error('Gagal menghubungkan sesi.');
          setTimeout(() => {
            router.replace('/login');
          }, 3000);
        }
      }
    };

    sync();

    return () => {
      mounted = false;
    };
  }, [syncSocialLogin, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 text-center">
        {error ? (
          <div className="text-destructive">
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Mengalihkan ke halaman login...</p>
          </div>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Menghubungkan akun...</h2>
            <p className="text-muted-foreground">Harap tunggu sebentar.</p>
          </>
        )}
      </div>
    </div>
  );
}
