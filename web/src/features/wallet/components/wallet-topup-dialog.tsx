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
  const [provider, setProvider] = useState('paypal');
  const [txHash, setTxHash] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('usdt');
  const [isProcessing, setIsProcessing] = useState(false);

  const paypalButtonRef = useRef<HTMLDivElement | null>(null);
  const paypalScriptLoaded = useRef(false);

  const {
    paypalClientId,
    createPayPalOrder,
    capturePayPalOrder,
    verifyCrypto,
    topupManual,
    fetchPayPalClientId,
  } = useWalletStore();

  const { addToast } = useUIStore();

  useEffect(() => {
    fetchPayPalClientId().catch(() => {});
  }, [fetchPayPalClientId]);

  // Load PayPal SDK Script dynamically
  useEffect(() => {
    if (!paypalClientId || paypalScriptLoaded.current || typeof window === 'undefined') return;

    const scriptId = 'paypal-sdk-script';
    if (document.getElementById(scriptId)) {
      paypalScriptLoaded.current = true;
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      paypalScriptLoaded.current = true;
    };
    script.onerror = () => {
      console.error('Failed to load PayPal SDK');
    };
    document.body.appendChild(script);
  }, [paypalClientId]);

  // Initialize PayPal Buttons container dynamically
  useEffect(() => {
    if (open && provider === 'paypal' && (window as any).paypal && paypalButtonRef.current) {
      paypalButtonRef.current.innerHTML = '';
      (window as any).paypal.Buttons({
        style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal' },
        createOrder: async () => {
          if (!amount || Number(amount) <= 0) {
            addToast('Masukkan nominal topup yang valid.', 'error');
            return '';
          }
          try {
            const res = await createPayPalOrder(Number(amount));
            return res.id;
          } catch (err) {
            addToast((err as Error).message || 'Gagal membuat pesanan PayPal.', 'error');
            return '';
          }
        },
        onApprove: async (data: any) => {
          try {
            await capturePayPalOrder(data.orderID, Number(amount), currency);
            addToast('Top-up berhasil! Saldo ditambahkan.', 'success');
            setOpen(false);
          } catch (err) {
            addToast((err as Error).message || 'Gagal memproses verifikasi PayPal.', 'error');
          }
        },
        onError: (err: any) => {
          console.error(err);
          addToast('Terjadi kesalahan pada pembayaran PayPal.', 'error');
        }
      }).render(paypalButtonRef.current);
    }
  }, [open, provider, amount, currency, createPayPalOrder, capturePayPalOrder, addToast]);

  const handleManualSubmit = async () => {
    if (!amount || Number(amount) <= 0) {
      addToast('Masukkan nominal yang valid.', 'error');
      return;
    }
    setIsProcessing(true);
    try {
      if (provider === 'crypto') {
        if (!txHash.trim()) {
          addToast('TxHash bukti transfer Kripto wajib diisi.', 'error');
          setIsProcessing(false);
          return;
        }
        const res = await verifyCrypto(txHash.trim(), cryptoNetwork);
        if (res.valid) {
          addToast(`Top-up Crypto berhasil! Saldo ${res.currency} ${res.amount} telah masuk.`, 'success');
          setOpen(false);
        } else {
          addToast(res.error || 'Verifikasi transaksi Crypto gagal. Pastikan TxHash benar.', 'error');
        }
      } else {
        await topupManual(Number(amount), currency, provider === 'bank' ? 'Transfer Bank' : 'E-Wallet');
        addToast('Top-up manual berhasil dikirim! Menunggu verifikasi admin.', 'success');
        setOpen(false);
      }
    } catch (err) {
      addToast((err as Error).message || 'Gagal memproses topup.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-white">
          <ArrowUpCircle className="size-6 text-emerald-500" />
          <span className="text-sm font-medium">Top Up</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border border-white/10 bg-zinc-950/90 text-white">
        <DialogHeader>
          <DialogTitle>Top Up Saldo</DialogTitle>
          <DialogDescription>Tambahkan saldo ke dompet Anda secara instan atau manual</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Pilih Mata Uang</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 text-white border-white/10">
                {CURRENCY_LIST.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
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
            <div className="flex flex-wrap gap-2 mt-2">
              {(currency === 'IDR' ? [50000, 100000, 250000, 500000, 1000000] : [10, 25, 50, 100, 250]).map((amt) => (
                <Button
                  key={amt}
                  variant="secondary"
                  size="sm"
                  className="text-xs bg-white/5 hover:bg-white/10 text-white border-none"
                  onClick={() => setAmount(String(amt))}
                >
                  {currency === 'IDR' ? `${(amt / 1000)}K` : `$${amt}`}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full bg-black/40 border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 text-white border-white/10">
                <SelectItem value="paypal">PayPal / Kartu Kredit (Instan)</SelectItem>
                <SelectItem value="crypto">Kripto (Verify TxHash otomatis)</SelectItem>
                <SelectItem value="bank">Transfer Bank (Verifikasi Manual)</SelectItem>
                <SelectItem value="ewallet">E-Wallet (OVO/Dana/Gopay)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === 'paypal' && (
            <div className="mt-4 p-2 bg-black/20 rounded-xl border border-white/5 min-h-[100px] flex flex-col justify-center">
              <div ref={paypalButtonRef} id="paypal-button-container" className="w-full z-10" />
              <p className="text-[10px] text-gray-500 text-center mt-2">
                Pembayaran via PayPal dikonfirmasi secara instan oleh gateway.
              </p>
            </div>
          )}

          {provider === 'crypto' && (
            <div className="mt-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 space-y-3">
              <h4 className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Instruksi Pembayaran Crypto</h4>
              <p className="text-xs text-gray-300">
                Kirim USDT (TRC-20) atau BNB (BEP-20) ke alamat wallet di bawah sebesar nominal USD yang diinginkan:
              </p>
              <div className="bg-black/60 p-2.5 rounded-lg border border-white/5 flex items-center justify-between gap-2">
                <code className="text-emerald-400 text-xs font-mono break-all select-all">
                  0x3fC97aB2313174C3fC23bB4E54d2A65F8E7C88d9
                </code>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs py-1 h-7 border-none shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText('0x3fC97aB2313174C3fC23bB4E54d2A65F8E7C88d9');
                    addToast('Alamat disalin!', 'success');
                  }}
                >
                  Salin
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Pilih Jaringan</Label>
                <Select value={cryptoNetwork} onValueChange={setCryptoNetwork}>
                  <SelectTrigger className="w-full h-8 bg-black/40 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 text-white border-white/10">
                    <SelectItem value="usdt">USDT (TRC-20)</SelectItem>
                    <SelectItem value="bnb">BNB (BEP-20)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Bukti Transfer (TxHash)</Label>
                <Input
                  placeholder="Masukkan TxHash..."
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="bg-black/40 border-white/10 text-white text-xs h-8"
                />
              </div>
            </div>
          )}

          {(provider === 'bank' || provider === 'ewallet') && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
              ⚡ Deposit via transfer manual diverifikasi oleh Admin Javahade maksimal 1x24 jam.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-white/10 hover:bg-white/5 text-white">Batal</Button>
          {provider !== 'paypal' && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 border-none text-white gap-2"
              disabled={!amount || Number(amount) <= 0 || isProcessing}
              onClick={handleManualSubmit}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              Top Up Sekarang
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
