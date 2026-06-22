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

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

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
        const syncRes = await fetch('/api/auth/sync');
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          // Simpan JWT tokens dari Django ke localStorage
          if (syncData.tokens?.access) {
            localStorage.setItem('access_token', syncData.tokens.access);
          }
          if (syncData.tokens?.refresh) {
            localStorage.setItem('refresh_token', syncData.tokens.refresh);
          }
        } else {
          console.warn('Django sync gagal, melanjutkan dengan Better Auth session saja');
        }
      } catch (syncErr) {
        console.warn('Django sync error:', syncErr);
      }

      toast.success('Berhasil masuk!');
      window.location.href = '/'; 
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

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
            onClick={() => authClient.signIn.social({ provider: 'google', callbackURL: '/' })}
            disabled={isLoading}
          >
            Google
          </Button>
          <Button 
            variant="outline" 
            type="button" 
            onClick={() => authClient.signIn.social({ provider: 'facebook', callbackURL: '/' })}
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
