'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, ArrowUpCircle } from 'lucide-react';
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
import { formatCurrencyLabel } from '@/lib/format';

const CURRENCY_LIST: { value: Currency; label: string }[] = [
  { value: 'IDR', label: 'IDR - Rupiah Indonesia' },
  { value: 'USD', label: 'USD - Dollar Amerika' },
  { value: 'SGD', label: 'SGD - Dollar Singapura' },
];

export function WalletTopUpDialog() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [provider, setProvider] = useState('verotel');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    topupManual,
  } = useWalletStore();

  const { addToast } = useUIStore();

  useEffect(() => {
    // If you need any initialization for these gateways later
  }, []);

  const handleManualSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      addToast('Masukkan nominal yang valid.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      await topupManual(Number(amount), currency, provider);
      addToast(`Top-up melalui ${provider} sedang diproses! Menunggu webhook dari gateway.`, 'success');
      setOpen(false);
    } catch (err) {
      addToast((err as Error).message || 'Gagal memproses topup.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto py-5 flex-col gap-3 border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all rounded-xl group">
          <div className="p-3 bg-emerald-500/10 rounded-full group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-300">
            <ArrowUpCircle className="size-6 text-emerald-500" />
          </div>
          <span className="text-sm font-semibold">Top Up</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Top Up Saldo</DialogTitle>
          <DialogDescription>Tambahkan saldo ke dompet Anda secara instan atau manual</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Pilih Mata Uang</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-full bg-background/50 border-border/50 hover:bg-accent hover:border-accent transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/50 rounded-xl">
                {CURRENCY_LIST.map((c) => (
                  <SelectItem key={c.value} value={c.value} className="cursor-pointer">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Jumlah</Label>
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground group-focus-within:text-emerald-500 transition-colors">
                {formatCurrencyLabel(currency)}
              </span>
              <Input
                type="number"
                placeholder="Masukkan jumlah"
                className="pl-12 bg-background/50 border-border/50 font-mono text-lg h-12 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500 rounded-xl transition-all"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {(currency === 'IDR' ? [50000, 100000, 250000, 500000, 1000000] : [10, 25, 50, 100, 250]).map((amt) => (
                <Button
                  key={amt}
                  variant="secondary"
                  size="sm"
                  className="text-xs bg-muted/50 hover:bg-emerald-500 hover:text-white transition-colors rounded-lg flex-1 sm:flex-none"
                  onClick={() => setAmount(String(amt))}
                >
                  {currency === 'IDR' ? `${(amt / 1000)}K` : `$${amt}`}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Metode Pembayaran</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full bg-background/50 border-border/50 hover:bg-accent hover:border-accent transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border/50 rounded-xl">
                <SelectItem value="verotel" className="cursor-pointer">Verotel (Credit Card / 18+)</SelectItem>
                <SelectItem value="segpay" className="cursor-pointer">Segpay (Credit Card / 18+)</SelectItem>
                <SelectItem value="netbilling" className="cursor-pointer">NETbilling (Credit Card / 18+)</SelectItem>
                <SelectItem value="elotpay" className="cursor-pointer">ELotPay (Local Payment)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-700 dark:text-blue-300 flex items-start gap-3 shadow-sm">
            <span className="text-lg">⚡</span>
            <p>Sistem ini menggunakan metode pembayaran eksternal (Gateway). Anda akan dialihkan setelah konfirmasi.</p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-border/50 hover:bg-accent transition-colors">Batal</Button>
          <Button
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md hover:shadow-lg transition-all rounded-xl gap-2 font-semibold"
              disabled={!amount || Number(amount) <= 0 || isProcessing}
              onClick={handleManualSubmit}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Konfirmasi Top Up
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
