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
        <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-white">
          <ArrowDownCircle className="size-6 text-red-500" />
          <span className="text-sm font-medium">Tarik Dana</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border border-white/10 bg-zinc-950/90 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tarik Dana</DialogTitle>
          <DialogDescription>Tarik saldo operasional utama Anda</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Mata Uang Penarikan</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 text-white border-white/10">
                <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
                <SelectItem value="USD">USD - Dollar Amerika</SelectItem>
                <SelectItem value="SGD">SGD - Dollar Singapura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Jumlah</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {formatCurrencyLabel(currency)}
              </span>
              <Input
                type="number"
                placeholder="Masukkan jumlah"
                className="pl-12 bg-black/40 border-white/10 text-white font-mono text-lg"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Saldo tersedia: {formatCurrency(totalBalance[currency] || 0, currency)}
            </p>
          </div>

          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-300">
            ⚠️ Penarikan saldo memerlukan konfirmasi admin sebelum ditransfer. Status penarikan akan bertambah ke riwayat transaksi.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 text-white hover:bg-white/5">Batal</Button>
          <Button
            className="bg-red-600 hover:bg-red-700 border-none text-white gap-2"
            disabled={!amount || Number(amount) <= 0 || isProcessing || Number(amount) > (totalBalance[currency] || 0)}
            onClick={handleWithdraw}
          >
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            Tarik Dana
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
