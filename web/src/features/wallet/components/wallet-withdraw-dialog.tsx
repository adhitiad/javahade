'use client';

import React, { useState } from 'react';
import { Loader2, ArrowDownCircle } from 'lucide-react';
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
import type { Currency } from '@/types';
import { formatCurrency, formatCurrencyLabel } from '@/lib/format';

export function WalletWithdrawDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('IDR');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { totalBalance, requestPayout } = useWalletStore();
  const { addToast } = useUIStore();

  const handleWithdraw = async () => {
    if (!amount || Number(amount) <= 0) {
      addToast('Masukkan nominal penarikan yang valid.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await requestPayout(Number(amount), currency);
      addToast(`Permintaan penarikan ${currency} ${amount} berhasil diajukan.`, 'success');
      setOpen(false);
    } catch (err) {
      addToast((err as Error).message || 'Gagal memproses penarikan saldo.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto py-5 flex-col gap-3 border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all rounded-xl group">
          <div className="p-3 bg-red-500/10 rounded-full group-hover:scale-110 group-hover:bg-red-500/20 transition-all duration-300">
            <ArrowDownCircle className="size-6 text-red-500" />
          </div>
          <span className="text-sm font-semibold">Tarik Dana</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-red-500 to-rose-500 bg-clip-text text-transparent">Tarik Dana</DialogTitle>
          <DialogDescription>Tarik saldo operasional utama Anda</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Mata Uang Penarikan</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-full bg-background/50 border-border/50 hover:bg-accent hover:border-accent transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/50 rounded-xl">
                <SelectItem value="IDR" className="cursor-pointer">IDR - Rupiah Indonesia</SelectItem>
                <SelectItem value="USD" className="cursor-pointer">USD - Dollar Amerika</SelectItem>
                <SelectItem value="SGD" className="cursor-pointer">SGD - Dollar Singapura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Jumlah</Label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground group-focus-within:text-red-500 transition-colors">
                {formatCurrencyLabel(currency)}
              </span>
              <Input
                type="number"
                placeholder="Masukkan jumlah"
                className="pl-12 bg-background/50 border-border/50 font-mono text-lg h-12 focus-visible:ring-red-500/50 focus-visible:border-red-500 rounded-xl transition-all"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground font-medium">
              Saldo tersedia: <span className="text-foreground">{formatCurrency(totalBalance[currency] || 0, currency)}</span>
            </p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-sm text-amber-700 dark:text-amber-400 shadow-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <p>Penarikan saldo memerlukan konfirmasi admin sebelum ditransfer. Status penarikan akan bertambah ke riwayat transaksi.</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-border/50 hover:bg-accent transition-colors">Batal</Button>
          <Button
            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all border-none text-white gap-2 font-semibold rounded-xl"
            disabled={!amount || Number(amount) <= 0 || isProcessing || Number(amount) > (totalBalance[currency] || 0)}
            onClick={handleWithdraw}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            Konfirmasi Penarikan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
