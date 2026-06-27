'use client';

import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { loginSchema } from '@/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { LoginInput } from '@/schemas';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export function AuthLoginTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const syncRes = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totp_code: twoFactorCode })
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.tokens?.access) {
          localStorage.setItem('access_token', syncData.tokens.access);
        }
        if (syncData.tokens?.refresh) {
          localStorage.setItem('refresh_token', syncData.tokens.refresh);
        }
        toast.success('Berhasil masuk!');
        window.location.href = '/';
      } else {
        const syncData = await syncRes.json();
        setError(syncData.error || 'Kode 2FA tidak valid');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const cancel2FA = async () => {
    setIs2FARequired(false);
    setTwoFactorCode("");
    await authClient.signOut();
  };

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    setIsLoading(true);
    try {
      const { data: signInData, error: signInError } = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError(signInError.message || 'Gagal masuk');
        return;
      }

      // Sync Better Auth session ke Django agar Go services bisa autentikasi
      try {
        const syncRes = await fetch('/api/auth/sync', { method: 'POST' });
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          // Simpan JWT tokens dari Django ke localStorage
          if (syncData.tokens?.access) {
            localStorage.setItem('access_token', syncData.tokens.access);
          }
          if (syncData.tokens?.refresh) {
            localStorage.setItem('refresh_token', syncData.tokens.refresh);
          }
          toast.success('Berhasil masuk!');
          window.location.href = '/'; 
        } else {
          const syncData = await syncRes.json();
          if (syncData.error === '2fa_required') {
            setIs2FARequired(true);
            return; // Stay on loading false, wait for 2FA
          }
          console.warn('Django sync gagal:', syncData);
          toast.success('Berhasil masuk, namun sinkronisasi gagal.');
          window.location.href = '/';
        }
      } catch (syncErr) {
        console.warn('Django sync error:', syncErr);
        toast.success('Berhasil masuk!');
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  if (is2FARequired) {
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center space-y-2 mb-2">
          <h3 className="font-semibold">Verifikasi Dua Faktor</h3>
          <p className="text-sm text-muted-foreground">Masukkan 6 digit kode dari aplikasi authenticator Anda.</p>
        </div>
        <form onSubmit={handle2FASubmit} className="flex flex-col gap-4">
          <Input
            value={twoFactorCode}
            onChange={(e) => {
              setError(null);
              setTwoFactorCode(e.target.value);
            }}
            placeholder="000000"
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isLoading || twoFactorCode.length !== 6}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Verifikasi'}
          </Button>
          <Button type="button" variant="ghost" onClick={cancel2FA} disabled={isLoading}>
            Batal
          </Button>
        </form>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="nama@email.com"
                  autoComplete="email"
                  {...field}
                  onChange={(e) => {
                    setError(null);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    alert('Fitur lupa password akan segera tersedia');
                  }}
                >
                  Lupa password?
                </button>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    {...field}
                    onChange={(e) => {
                      setError(null);
                      field.onChange(e);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin mr-2" />
              Masuk...
            </>
          ) : (
            'Masuk'
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Atau lanjutkan dengan</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/auth-callback' })}
            disabled={isLoading}
          >
            Google
          </Button>
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => authClient.signIn.social({ provider: 'facebook', callbackURL: '/auth-callback' })}
            disabled={isLoading}
          >
            Facebook
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onSwitchTab('register')}
          >
            Belum punya akun?{' '}
            <span className="text-primary font-medium hover:underline">Daftar sekarang</span>
          </button>
        </div>
      </form>
    </Form>
  );
}
