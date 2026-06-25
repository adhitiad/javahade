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
        <Button variant="outline" className="w-full h-auto py-5 flex-col gap-3 border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all rounded-xl group">
          <div className="p-3 bg-blue-500/10 rounded-full group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-300">
            <ArrowRightLeft className="size-6 text-blue-500" />
          </div>
          <span className="text-sm font-semibold">Konversi</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent">Auto-Convert Saldo Asing</DialogTitle>
          <DialogDescription>Mengonversi seluruh saldo mata uang asing Anda menjadi Rupiah (IDR) secara instan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3 text-sm text-muted-foreground">
          <div className="p-4 bg-background/80 shadow-inner border border-border/50 rounded-xl space-y-2">
            <p className="font-bold text-foreground mb-1">Spread & Layanan Platform:</p>
            <p className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> Potongan selisih kurs sebesar 1.5% untuk biaya operasional platform.</p>
            <p className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">•</span> Saldo asing Anda yang bernilai positif akan langsung di-convert.</p>
          </div>
          <div className="p-4 border border-emerald-500/20 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-xl flex flex-col gap-1.5 shadow-sm">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Perkiraan saldo asing Anda saat ini:</span>
            <span className="text-foreground font-mono font-bold text-sm">
              USD: {formatCurrency(totalBalance.USD, 'USD')} | SGD: {formatCurrency(totalBalance.SGD, 'SGD')}
            </span>
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-border/50 hover:bg-accent transition-colors">Batal</Button>
          <Button
            className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-md hover:shadow-lg transition-all border-none text-white gap-2 flex-1 rounded-xl font-semibold"
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
