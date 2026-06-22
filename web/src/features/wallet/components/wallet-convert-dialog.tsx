'use client';

import React, { useState } from 'react';
import { Loader2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useWalletStore } from '@/stores/wallet-store';
import { useUIStore } from '@/stores/ui-store';
import { formatCurrency } from '@/lib/format';

export function WalletConvertDialog() {
  const [open, setOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const { totalBalance, convertAll } = useWalletStore();
  const { addToast } = useUIStore();

  const handleConvertAll = async () => {
    setIsConverting(true);
    try {
      await convertAll();
      addToast('Konversi semua saldo asing ke IDR berhasil dilakukan!', 'success');
      setOpen(false);
    } catch (err) {
      addToast((err as Error).message || 'Gagal melakukan konversi saldo.', 'error');
    } finally {
      setIsConverting(false);
    }
  };

  const hasForeignBalance = totalBalance.USD > 0 || totalBalance.SGD > 0 || totalBalance.MYR > 0 || totalBalance.CNY > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-white">
          <ArrowRightLeft className="size-6 text-blue-500" />
          <span className="text-sm font-medium">Konversi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border border-white/10 bg-zinc-950/90 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>Auto-Convert Saldo Asing</DialogTitle>
          <DialogDescription>Mengonversi seluruh saldo mata uang asing Anda menjadi Rupiah (IDR) secara instan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-sm text-gray-300">
          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
            <p className="font-bold text-white mb-1">Spread & Layanan Platform:</p>
            <p>· Potongan selisih kurs sebesar 1.5% untuk biaya operasional platform.</p>
            <p>· Saldo asing Anda yang bernilai positif akan langsung di-convert.</p>
          </div>
          <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Perkiraan saldo asing Anda saat ini:</span>
            <span className="text-white font-mono font-bold text-xs">
              USD: {formatCurrency(totalBalance.USD, 'USD')} | SGD: {formatCurrency(totalBalance.SGD, 'SGD')}
            </span>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-white hover:bg-white/5">Batal</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 border-none text-white gap-2 flex-1"
            disabled={isConverting || !hasForeignBalance}
            onClick={handleConvertAll}
          >
            {isConverting && <Loader2 className="h-4 w-4 animate-spin" />}
            Convert Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
