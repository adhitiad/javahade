'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useUIStore } from '@/stores/ui-store';

export function FeedReportDialog({
  open,
  postId,
  onClose,
}: {
  open: boolean;
  postId: string | null;
  onClose: () => void;
}) {
  const [selectedReportReason, setSelectedReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { addToast } = useUIStore();

  const handleReportSubmit = async () => {
    if (!postId) return;
    setIsSubmittingReport(true);
    try {
      const { api } = await import('@/lib/api');
      await api.post('/moderation/reports/create/', {
        content_type: 'post',
        object_id: postId,
        reason: selectedReportReason,
        description: reportDescription,
      });
      addToast('Laporan Anda berhasil dikirim dan akan segera ditinjau.', 'success');
      onClose();
      setReportDescription('');
    } catch (err) {
      addToast((err as Error).message || 'Gagal mengirim laporan.', 'error');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="glass border border-white/10 max-w-md rounded-3xl bg-zinc-950/90 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Laporkan Postingan</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Mengapa Anda melaporkan postingan ini? Laporan Anda bersifat anonim.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 my-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Alasan Pelaporan</label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'spam', label: 'Spam / Iklan tidak diinginkan' },
                { value: 'harassment', label: 'Pelecehan / Perundungan' },
                { value: 'inappropriate', label: 'Konten Tidak Pantas / Seksual' },
                { value: 'copyright', label: 'Pelanggaran Hak Cipta' },
                { value: 'impersonation', label: 'Peniruan Identitas' },
                { value: 'other', label: 'Lainnya' },
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center justify-between ${
                    selectedReportReason === r.value
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-white/5 bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                  onClick={() => setSelectedReportReason(r.value)}
                >
                  <span>{r.label}</span>
                  {selectedReportReason === r.value && (
                    <span className="size-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Keterangan Tambahan (Opsional)</label>
            <textarea
              className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all resize-none"
              placeholder="Berikan detail tambahan tentang laporan Anda..."
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" className="flex-1 py-4 text-gray-300 hover:text-white" onClick={onClose}>Batal</Button>
          <Button className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all border-none" onClick={handleReportSubmit} disabled={isSubmittingReport}>
            {isSubmittingReport ? 'Mengirim...' : 'Kirim Laporan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
