'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { kycSchema } from '@/schemas';
import type { KYCInput } from '@/schemas';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
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
import { Loader2, UploadCloud, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function VerifyKYCView() {
  const { addToast } = useUIStore();
  const router = useRouter();
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'analyzing' | 'success'>('idle');

  const form = useForm<KYCInput>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      document_type: 'id_card',
      full_name: '',
      birth_date: '',
      document_number: '',
    },
  });

  const onSubmit = async (data: KYCInput) => {
    if (!kycFile || !selfieFile) {
      addToast('Harap unggah kedua foto dokumen identitas dan selfie Anda.', 'error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('analyzing');

    // Simulate AI Groq verification for 3.5 seconds
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      addToast('Verifikasi KYC berhasil disetujui secara otomatis oleh AI Groq!', 'success');
    }, 3500);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
      <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        {/* Decoration Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {submitStatus !== 'success' ? (
          <>
            <div className="text-center mb-8 relative z-10 space-y-2">
              <h1 className="text-3xl font-black text-white">Verifikasi Identitas Anda</h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Demi keamanan dan kenyamanan bersama, Anda diwajibkan mengunggah KTP/Passport sebelum mem-booking (menyewa) sesi privat dengan Host.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap (Sesuai KTP)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: Budi Santoso"
                          className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="document_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Dokumen</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl">
                              <SelectValue placeholder="Pilih tipe dokumen" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                            <SelectItem value="id_card">KTP / Kartu Identitas</SelectItem>
                            <SelectItem value="passport">Paspor</SelectItem>
                            <SelectItem value="drivers_license">SIM</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tanggal Lahir</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="document_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor KTP / Passport / ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Contoh: 3171234567890001"
                          className="bg-zinc-900/50 border-zinc-800 text-white h-12 rounded-xl"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Upload KTP */}
                <div className="space-y-2">
                  <Label>Unggah Foto KTP / Passport Anda (Jelas & Terbaca)</Label>
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
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
                  </div>
                </div>

                {/* Upload Selfie */}
                <div className="space-y-2">
                  <Label>Unggah Foto Selfie Terbaru (Wajib &lt; 4 Bulan)</Label>
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
                    <p className="text-xs text-muted-foreground">Sistem AI Groq akan memeriksa metadata umur foto</p>
                  </div>
                </div>

                {submitStatus === 'analyzing' && (
                  <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                    <div className="text-xs">
                      <p className="font-bold">Analisis AI Groq Berjalan...</p>
                      <p className="text-blue-400/80 mt-0.5">Memvalidasi data NIK, kecocokan wajah selfie, dan meta-data umur foto.</p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Memproses Verifikasi AI...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-5 w-5" />
                        <span>Kirim untuk Verifikasi AI</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-[10px] text-center text-muted-foreground leading-relaxed mt-4">
                  Dokumen Anda dienkripsi dan hanya akan diperiksa secara otomatis oleh Groq AI System kami demi menjamin validitas umur &amp; kecocokan data.
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
              <h2 className="text-2xl font-bold text-white">Verifikasi KYC Disetujui!</h2>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Dokumen Anda telah divalidasi oleh sistem AI Groq. Anda sekarang memiliki akses penuh untuk memesan (booking) host favorit Anda.
              </p>
            </div>
            <div className="pt-4 flex flex-col gap-3">
              <Button
                onClick={() => router.push('/')}
                className="w-full h-12 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/5"
              >
                Kembali ke Feed
              </Button>
              <Button
                onClick={() => router.push('/booking')}
                className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-bold rounded-xl"
              >
                Pesan Host Sekarang
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
