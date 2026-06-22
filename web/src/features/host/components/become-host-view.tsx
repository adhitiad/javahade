'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { creatorApplySchema } from '@/schemas';
import type { CreatorApplyInput } from '@/schemas';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
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
import { Loader2, UploadCloud, ShieldAlert, CheckCircle2, Star } from 'lucide-react';

export default function BecomeHostView() {
  const { addToast } = useUIStore();
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [portfolioFiles, setPortfolioFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'analyzing' | 'success'>('idle');

  const form = useForm<CreatorApplyInput>({
    resolver: zodResolver(creatorApplySchema),
    defaultValues: {
      display_name: '',
      category: 'entertainment',
      bio: '',
      website: '',
    },
  });

  // Guard: User must be logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="size-16 text-rose-500 mx-auto" />
        <h2 className="text-2xl font-bold">Akses Ditolak</h2>
        <p className="text-muted-foreground">Silakan masuk ke akun Anda terlebih dahulu untuk menjadi Host.</p>
        <Button onClick={() => router.push('/login')} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          Masuk Sekarang
        </Button>
      </div>
    );
  }

  // Guard: Gender Validation (Female only)
  if (user.gender !== 'F') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-3xl text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Pendaftaran Ditolak</h2>
            <p className="text-sm text-red-300 max-w-md mx-auto leading-relaxed">
              Hanya pengguna berjenis kelamin Perempuan yang diizinkan mendaftar sebagai Host/Kreator di Javahade.
            </p>
          </div>
          <div className="pt-4">
            <Button
              onClick={() => router.push('/')}
              className="bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/5 px-6"
            >
              Kembali ke Beranda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPortfolioFiles(e.target.files);
  };

  const onSubmit = async (data: CreatorApplyInput) => {
    if (!kycFile || !selfieFile) {
      addToast('Harap unggah kedua foto dokumen identitas dan foto selfie memegang KTP.', 'error');
      return;
    }

    if (!portfolioFiles || portfolioFiles.length < 3) {
      addToast('Anda diwajibkan mengunggah minimal 3 foto portfolio bebas untuk verifikasi profil.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('analyzing');

    // Simulate AI Groq verification for 4 seconds
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      // Upgrade user role to host locally
      updateUser({ role: 'host', is_verified: true });
      addToast('Selamat! Pendaftaran Host disetujui secara instan oleh AI Groq.', 'success');
    }, 4000);
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decoration Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {submitStatus !== 'success' ? (
          <>
            <div className="text-center mb-8 relative z-10 space-y-2">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-pink-500/20">
                🌟
              </div>
              <h1 className="text-3xl font-bold text-white">Upgrade Akun Menjadi Host</h1>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Bergabunglah sebagai kreator dan mulai hasilkan uang dari karya, live stream, dan konten eksklusif Anda.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10 max-w-xl mx-auto">
                <FormField
                  control={form.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Panggung (Display Name)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: Alice Wonderland"
                          className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-[10px] text-muted-foreground mt-1">Ini adalah nama yang akan dilihat oleh Fans Anda.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori Konten</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl">
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                          <SelectItem value="entertainment">Entertainment</SelectItem>
                          <SelectItem value="lesbian">Lesbian</SelectItem>
                          <SelectItem value="lifestyle">Lifestyle</SelectItem>
                          <SelectItem value="beauty">Beauty & Fashion</SelectItem>
                          <SelectItem value="fitness">Fitness & Health</SelectItem>
                          <SelectItem value="travel">Travel</SelectItem>
                          <SelectItem value="art">Art & Craft</SelectItem>
                          <SelectItem value="finance">Finance & Business</SelectItem>
                          <SelectItem value="tech">Technology</SelectItem>
                          <SelectItem value="sex">Sex</SelectItem>
                          <SelectItem value="fetish">Fetish</SelectItem>
                          <SelectItem value="other">Lainnya</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nama Lengkap (Sesuai KTP)</Label>
                    <Input
                      required
                      placeholder="Contoh: Alice Sutomo"
                      className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Lahir</Label>
                    <Input
                      required
                      type="date"
                      className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Nomor Identitas (NIK KTP / Passport / ID Card No)</Label>
                  <Input
                    required
                    placeholder="Contoh: 3171234567890001"
                    className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                  />
                </div>

                {/* Upload KTP */}
                <div className="space-y-2">
                  <Label>Dokumen Identitas (KYC: KTP/Passport/ID Card)</Label>
                  <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center bg-zinc-900/20 hover:bg-zinc-900/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-semibold text-white">
                      {kycFile ? kycFile.name : 'Pilih file dokumen'}
                    </p>
                  </div>
                </div>

                {/* Upload Selfie */}
                <div className="space-y-2">
                  <Label>Foto Selfie Memegang KTP (Terbaru)</Label>
                  <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center bg-zinc-900/20 hover:bg-zinc-900/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-semibold text-white">
                      {selfieFile ? selfieFile.name : 'Pilih file selfie'}
                    </p>
                    <p className="text-xs text-rose-400">Hanya pengguna Perempuan yang akan disetujui. Diverifikasi oleh AI Groq.</p>
                  </div>
                </div>

                {/* Upload Portofolio */}
                <div className="space-y-2">
                  <Label>Portfolio Wajah Bebas (Wajib Minimal 3 Foto)</Label>
                  <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-xl p-6 text-center bg-zinc-900/20 hover:bg-zinc-900/30 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePortfolioChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-semibold text-white">
                      {portfolioFiles ? `${portfolioFiles.length} file terpilih` : 'Pilih minimal 3 foto bebas'}
                    </p>
                    <p className="text-xs text-muted-foreground">Foto-foto ini akan dipajang di profil publik Anda sebagai bukti keabsahan identitas.</p>
                  </div>
                </div>

                {submitStatus === 'analyzing' && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-455 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                    <div className="text-xs text-blue-400">
                      <p className="font-bold">Groq AI Verifying KYC...</p>
                      <p className="text-blue-400/80 mt-0.5">Memeriksa struktur wajah portofolio terhadap selfie memegang identitas.</p>
                    </div>
                  </div>
                )}

                <div className="pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Mendaftarkan Host...</span>
                      </>
                    ) : (
                      <span>Daftar Sekarang</span>
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-[10px] text-muted-foreground">
                  Dengan mendaftar, Anda menyetujui Syarat dan Ketentuan Kreator Javahade.
                </p>
              </form>
            </Form>
          </>
        ) : (
          <div className="text-center py-10 space-y-6 relative z-10">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Akun Host Berhasil Diaktifkan!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Pendaftaran Anda disetujui secara instan oleh AI Groq. Anda sekarang resmi menjadi Host/Kreator di Javahade.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push('/')}
                className="w-full sm:w-auto h-12 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/5 px-6"
              >
                Ke Feed Utama
              </Button>
              <Button
                onClick={() => router.push('/host/tiers')}
                className="w-full sm:w-auto h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl px-6"
              >
                Kelola Paket Subs
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
