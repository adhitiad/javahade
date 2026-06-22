'use client';

import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { registerSchema } from '@/schemas';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { RegisterInput } from '@/schemas';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';

export function AuthRegisterTab({ onSwitchTab }: { onSwitchTab: (tab: string) => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      confirm_password: '',
      gender: 'U',
      date_of_birth: '',
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    setError(null);
    setIsLoading(true);
    try {
      // Mengirim payload ke Better Auth beserta custom field yang sudah didaftarkan
      const { data: signUpData, error: signUpError } = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.username,
        gender: data.gender,
        date_of_birth: data.date_of_birth,
      });

      if (signUpError) {
        setError(signUpError.message || 'Gagal mendaftar');
        return;
      }

      // Sync Better Auth session ke Django agar backend juga buat user
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
          console.warn('Django sync gagal setelah register');
        }
      } catch (syncErr) {
        console.warn('Django sync error:', syncErr);
      }

      toast.success('Pendaftaran berhasil! Selamat datang.');
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat pendaftaran');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="username_anda"
                  autoComplete="username"
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
          name="date_of_birth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tanggal Lahir</FormLabel>
              <FormControl>
                <Input
                  type="date"
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
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Kelamin</FormLabel>
              <Select
                onValueChange={(val) => {
                  setError(null);
                  field.onChange(val);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="M">Laki-laki</SelectItem>
                  <SelectItem value="F">Perempuan</SelectItem>
                  <SelectItem value="U">Tidak ingin menyebutkan</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    autoComplete="new-password"
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

        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Konfirmasi Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
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
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
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
              Mendaftar...
            </>
          ) : (
            'Daftar'
          )}
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Atau daftar dengan</span>
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

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          Dengan mendaftar, Anda menyetujui{' '}
          <button type="button" className="text-primary hover:underline">
            Syarat & Ketentuan
          </button>{' '}
          dan{' '}
          <button type="button" className="text-primary hover:underline">
            Kebijakan Privasi
          </button>{' '}
          kami.
        </p>

        <div className="text-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => onSwitchTab('login')}
          >
            Sudah punya akun?{' '}
            <span className="text-primary font-medium hover:underline">Masuk di sini</span>
          </button>
        </div>
      </form>
    </Form>
  );
}
