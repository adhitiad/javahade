'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

/**
 * Dialog 2FA yang muncul saat social login memerlukan verifikasi TOTP.
 * Dirender di main layout agar tersedia di halaman manapun setelah
 * redirect dari OAuth provider.
 */
export function Social2FADialog() {
  const {
    needs2FA,
    isLoading,
    isAuthenticated,
    error,
    submitSocial2FA,
    cancelSocial2FA,
    clearError,
  } = useAuthStore();
  const [totpCode, setTotpCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasNeeds2FA, setWasNeeds2FA] = useState(false);

  // Auto-focus input saat dialog muncul
  useEffect(() => {
    if (needs2FA) {
      setTotpCode('');
      clearError();
      setWasNeeds2FA(true);
      // Small delay agar dialog animation selesai dulu
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [needs2FA, clearError]);

  // Detect successful 2FA completion: was needs2FA, now authenticated
  useEffect(() => {
    if (wasNeeds2FA && isAuthenticated && !needs2FA) {
      toast.success('Berhasil masuk melalui Social Login!');
      setWasNeeds2FA(false);
      // Full reload to ensure all state is fresh
      window.location.href = '/';
    }
  }, [wasNeeds2FA, isAuthenticated, needs2FA]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) return;
    await submitSocial2FA(totpCode);
  };

  const handleCancel = () => {
    cancelSocial2FA();
    setTotpCode('');
    setWasNeeds2FA(false);
  };

  return (
    <Dialog open={needs2FA} onOpenChange={(open) => { if (!open) handleCancel(); }}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle>Verifikasi Dua Faktor</DialogTitle>
          <DialogDescription>
            Akun Anda memiliki 2FA aktif. Masukkan 6 digit kode dari aplikasi authenticator Anda untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            ref={inputRef}
            value={totpCode}
            onChange={(e) => {
              clearError();
              // Only allow digits, max 6
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setTotpCode(val);
            }}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            disabled={isLoading}
          />

          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || totpCode.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Verifikasi'
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Batal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
