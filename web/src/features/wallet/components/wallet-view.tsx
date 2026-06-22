'use client';

import React, { useMemo, useEffect } from 'react';
import { Wallet, Gift, TrendingUp, DollarSign, Clock, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import EarningsChart from '@/features/wallet/components/earnings-chart';
import { useWalletStore } from '@/stores/wallet-store';
import { formatCurrency } from '@/lib/format';
import type { Currency, WalletTransaction, EarningsChartData } from '@/types';

// Import newly extracted components
import { WalletTopUpDialog } from './wallet-topup-dialog';
import { WalletConvertDialog } from './wallet-convert-dialog';
import { WalletWithdrawDialog } from './wallet-withdraw-dialog';
import { WalletTransactionHistory } from './wallet-transaction-history';

// Generate earnings chart data for last 30 days based on actual transactions
function generateEarningsData(transactions: WalletTransaction[]): EarningsChartData {
  const labels: string[] = [];
  const subscriptions: number[] = [];
  const tips: number[] = [];
  const bookings: number[] = [];
  const gifts: number[] = [];
  
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 29); // 30 days including today

  // Pre-fill last 30 days
  const grouped: Record<string, { subscriptions: number, tips: number, bookings: number, gifts: number }> = {};
  
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    labels.push(dateStr);
    grouped[dateStr] = { subscriptions: 0, tips: 0, bookings: 0, gifts: 0 };
  }

  // Populate from transactions
  transactions.forEach(tx => {
    if (tx.transaction_type === 'earning' || tx.transaction_type === 'deposit') {
      const txDate = new Date(tx.created_at);
      const dateStr = txDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      if (grouped[dateStr]) {
        const note = tx.notes?.toLowerCase() || '';
        if (note.includes('langganan') || note.includes('subscription')) {
           grouped[dateStr].subscriptions += tx.amount;
        } else if (note.includes('hadiah') || note.includes('gift')) {
           grouped[dateStr].gifts += tx.amount;
        } else if (note.includes('tiket') || note.includes('ticket') || note.includes('booking')) {
           grouped[dateStr].bookings += tx.amount;
        } else {
           grouped[dateStr].tips += tx.amount; 
        }
      }
    }
  });

  labels.forEach(label => {
    subscriptions.push(grouped[label].subscriptions);
    tips.push(grouped[label].tips);
    bookings.push(grouped[label].bookings);
    gifts.push(grouped[label].gifts);
  });

  return { labels, subscriptions, tips, bookings, gifts };
}

// ─── Summary Card Sub-component ──────────────────────────────────
function SummaryCard({ label, amount, color, bgColor, icon }: {
  label: string;
  amount: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className={`flex size-7 items-center justify-center rounded-full ${bgColor} ${color}`}>
          {icon}
        </div>
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold ${color}`}>
        {new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR',
          minimumFractionDigits: 0,
          notation: 'compact',
          compactDisplay: 'short',
        }).format(amount)}
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
interface WalletViewProps {
  userRole?: 'user' | 'host';
}

export default function WalletView({ userRole = 'user' }: WalletViewProps) {
  const { transactions, totalBalance, fetchTransactions, fetchPayPalClientId } = useWalletStore();
  const earningsData = useMemo(() => generateEarningsData(transactions), [transactions]);

  // Load wallet data & PayPal Client ID on mount
  useEffect(() => {
    fetchTransactions();
    fetchPayPalClientId().catch(() => {});
  }, [fetchTransactions, fetchPayPalClientId]);

  return (
    <div className="w-full space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wallet className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dompet Saya</h1>
          <p className="text-muted-foreground text-sm">Kelola saldo, transaksi, dan pendapatan Anda</p>
        </div>
      </div>

      {/* ── Balance Overview ─────────────────────────────────── */}
      <Carousel opts={{ align: "start" }} className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
            <Card className="h-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border-none overflow-hidden relative shadow-xl">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 size-32 rounded-full bg-white/20 blur-2xl" />
                <div className="absolute bottom-4 left-4 size-24 rounded-full bg-white/20 blur-2xl" />
              </div>
              <CardHeader className="pb-2 relative">
                <CardDescription className="text-emerald-100 text-xs font-medium uppercase tracking-wider">
                  Saldo Utama (IDR)
                </CardDescription>
                <CardTitle className="text-3xl font-bold tracking-tight">
                  {formatCurrency(totalBalance.IDR, 'IDR')}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-emerald-100 text-sm">Rupiah Indonesia</p>
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-200">
                  <TrendingUp className="size-3.5" />
                  <span>Sinkron dengan database backend</span>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          {(['USD', 'SGD', 'MYR', 'CNY'] as Currency[]).map((currency) => {
            const balance = totalBalance[currency] || 0;
            return (
              <CarouselItem key={currency} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="h-full relative overflow-hidden bg-gray-900/40 border-white/5 glass">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs">
                          {currency}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{currency === 'USD' ? 'Dolar AS' : currency === 'SGD' ? 'Dolar Singapura' : currency === 'MYR' ? 'Ringgit Malaysia' : 'Yuan Tiongkok'}</p>
                          <p className="font-semibold text-sm mt-0.5">
                            {formatCurrency(balance, currency)}
                          </p>
                        </div>
                      </div>
                      <DollarSign className="size-4 text-muted-foreground/30" />
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious className="left-0 -ml-4" />
          <CarouselNext className="right-0 -mr-4" />
        </div>
      </Carousel>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <Card className="bg-gray-900/40 border-white/5 glass">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <WalletTopUpDialog />
            <WalletConvertDialog />
            
            <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2 border-white/5 bg-white/5 hover:bg-white/10 text-white">
              <Gift className="size-6 text-violet-500" />
              <span className="text-sm font-medium">Kirim Hadiah</span>
            </Button>

            {userRole === 'host' && (
              <WalletWithdrawDialog />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Earnings Chart (Host Only) ───────────────────────── */}
      {userRole === 'host' && (
        <Card className="bg-gray-900/40 border-white/5 glass">
          <CardHeader>
            <CardTitle className="text-lg">Pendapatan 30 Hari Terakhir</CardTitle>
            <CardDescription>Grafik pendapatan berdasarkan sumber</CardDescription>
          </CardHeader>
          <CardContent>
            <EarningsChart data={earningsData} height={320} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              <SummaryCard label="Langganan" amount={earningsData.subscriptions.reduce((a, b) => a + b, 0)} color="text-rose-500" bgColor="bg-rose-500/10" icon={<TrendingUp className="size-4" />} />
              <SummaryCard label="Tips" amount={earningsData.tips.reduce((a, b) => a + b, 0)} color="text-amber-500" bgColor="bg-amber-500/10" icon={<Send className="size-4" />} />
              <SummaryCard label="Booking" amount={earningsData.bookings.reduce((a, b) => a + b, 0)} color="text-emerald-500" bgColor="bg-emerald-500/10" icon={<Clock className="size-4" />} />
              <SummaryCard label="Hadiah" amount={earningsData.gifts.reduce((a, b) => a + b, 0)} color="text-violet-500" bgColor="bg-violet-500/10" icon={<Gift className="size-4" />} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Transaction History ──────────────────────────────── */}
      <WalletTransactionHistory transactions={transactions} />
    </div>
  );
}
