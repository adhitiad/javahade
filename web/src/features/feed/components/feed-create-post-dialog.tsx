'use client';

import React, { useState } from 'react';
import { Lock, ImageIcon, Video, FileText, Music, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ContentType } from '@/types';
import { useContentStore } from '@/stores/content-store';

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Teks', icon: <FileText className="size-4" /> },
  { value: 'image', label: 'Gambar', icon: <ImageIcon className="size-4" /> },
  { value: 'video', label: 'Video', icon: <Video className="size-4" /> },
  { value: 'audio', label: 'Audio', icon: <Music className="size-4" /> },
];

export function CreatePostDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { createPost } = useContentStore();
  const [contentType, setContentType] = useState<ContentType>('text');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [priceOverride, setPriceOverride] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setIsSubmitting(true);
    try {
      await createPost({
        content_type: contentType,
        title: title || undefined,
        body: body,
        is_premium: isPremium,
        is_pinned: false,
        price_override: priceOverride ? parseFloat(priceOverride) : undefined,
      });
      setTitle('');
      setBody('');
      setIsPremium(false);
      setPriceOverride('');
      setContentType('text');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Buat Postingan</DialogTitle>
          <DialogDescription className="text-zinc-400">Bagikan konten menarik dengan pengikut Anda</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium text-zinc-300">Jenis Konten</Label>
            <div className="grid grid-cols-4 gap-2">
              {CONTENT_TYPE_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={contentType === opt.value ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 flex flex-col gap-1 text-[10px] border-zinc-800"
                  onClick={() => setContentType(opt.value)}
                >
                  {opt.icon}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-title" className="text-sm font-medium text-zinc-300">Judul <span className="text-muted-foreground font-normal">(opsional)</span></Label>
            <Input id="post-title" placeholder="Masukkan judul postingan..." value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white h-10 rounded-xl" maxLength={100} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="post-body" className="text-sm font-medium text-zinc-300">Konten <span className="text-destructive">*</span></Label>
            <Textarea id="post-body" placeholder="Tulis sesuatu yang menarik..." value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={5000} className="resize-none bg-zinc-900 border-zinc-800 text-white rounded-xl" />
            <p className="text-xs text-muted-foreground text-right">{body.length}/5000</p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-zinc-800 p-3 bg-zinc-900/20">
            <div className="flex flex-col gap-0.5">
              <Label className="text-sm font-medium flex items-center gap-1.5 text-zinc-200"><Lock className="size-3.5" />Konten Premium</Label>
              <p className="text-[10px] text-muted-foreground">Hanya pelanggan berlangganan yang bisa melihat</p>
            </div>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
          </div>

          {isPremium && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="post-price" className="text-sm font-medium text-zinc-300">Harga Khusus (USD)</Label>
              <Input id="post-price" type="number" placeholder="Contoh: 10.00" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} className="bg-zinc-900 border-zinc-800 text-white h-10 rounded-xl" min={0} />
              <p className="text-[10px] text-muted-foreground">Kosongkan jika menggunakan harga berlangganan default</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-800 rounded-xl hover:bg-zinc-800 text-white">Batal</Button>
          <Button onClick={handleSubmit} disabled={!body.trim() || isSubmitting} className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 rounded-xl border-none">
            {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Publikasikan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
