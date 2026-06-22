'use client';

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFamilyStore } from '@/stores/family-store';
import { useContentStore } from '@/stores/content-store';

export function ShareContentDialog({
  open,
  onOpenChange,
  familyId,
  onShareSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  onShareSuccess: () => void;
}) {
  const { posts, fetchFeed } = useContentStore();
  const { shareContent } = useFamilyStore();
  const [selectedPostId, setSelectedPostId] = useState('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (open && posts.length === 0) {
      fetchFeed();
    }
  }, [open, posts, fetchFeed]);

  const handleShare = async () => {
    if (!selectedPostId) return;
    setIsSharing(true);
    try {
      await shareContent(familyId, selectedPostId, message);
      setSelectedPostId('');
      setMessage('');
      onOpenChange(false);
      onShareSuccess();
    } catch {
      // Handled by store
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle>Bagikan Konten ke Agensi</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Pilih salah satu postingan Anda untuk dibagikan dengan seluruh anggota grup keluarga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="post-select">Pilih Postingan</Label>
            <Select onValueChange={setSelectedPostId} defaultValue={selectedPostId}>
              <SelectTrigger className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                <SelectValue placeholder="Pilih postingan..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-800 text-white">
                {posts.map((post) => (
                  <SelectItem key={post.id} value={post.id}>
                    {post.title || post.body.slice(0, 30)} ({post.content_type})
                  </SelectItem>
                ))}
                {posts.length === 0 && (
                  <SelectItem value="none" disabled>Tidak ada postingan tersedia</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="share-message">Pesan Pengantar (Opsional)</Label>
            <Textarea
              id="share-message"
              placeholder="Tulis pesan untuk postingan ini..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white rounded-xl resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-800 rounded-xl">
            Batal
          </Button>
          <Button
            onClick={handleShare}
            disabled={!selectedPostId || isSharing}
            className="bg-rose-500 hover:bg-rose-600 rounded-xl"
          >
            {isSharing && <Loader2 className="size-4 animate-spin mr-1.5" />}
            Bagikan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
