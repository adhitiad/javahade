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
    <div className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`flex size-8 items-center justify-center rounded-full ${bgColor} ${color}`}>
          {icon}
        </div>
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-extrabold ${color}`}>
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
  const { transactions, totalBalance, fetchTransactions } = useWalletStore();
  const earningsData = useMemo(() => generateEarningsData(transactions), [transactions]);

  // Load wallet data on mount
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
          <Wallet className="size-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">Dompet Saya</h1>
          <p className="text-muted-foreground mt-1">Kelola saldo, transaksi, dan pendapatan Anda dengan mudah</p>
        </div>
      </div>

      {/* ── Balance Overview ─────────────────────────────────── */}
      <Carousel opts={{ align: "start", loop: false }} className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4 py-4">
          <CarouselItem className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
            <Card className="h-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 text-white border-none overflow-hidden relative shadow-2xl hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-4 right-4 size-40 rounded-full bg-white/30 blur-3xl" />
                <div className="absolute -bottom-8 -left-8 size-32 rounded-full bg-white/30 blur-3xl" />
              </div>
              <CardHeader className="pb-2 relative z-10">
                <CardDescription className="text-emerald-50 text-xs font-semibold uppercase tracking-wider mb-1">
                  Saldo Utama (IDR)
                </CardDescription>
                <CardTitle className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-md">
                  {formatCurrency(totalBalance.IDR, 'IDR')}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <p className="text-emerald-100 text-sm font-medium">Rupiah Indonesia</p>
                <div className="mt-6 flex items-center gap-2 text-xs text-emerald-200 bg-black/20 w-fit px-3 py-1.5 rounded-full backdrop-blur-md">
                  <TrendingUp className="size-3.5" />
                  <span>Sinkronisasi Real-time</span>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>

          {(['USD', 'SGD', 'MYR', 'CNY'] as Currency[]).map((currency) => {
            const balance = totalBalance[currency] || 0;
            return (
              <CarouselItem key={currency} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="h-full relative overflow-hidden bg-card/60 backdrop-blur-xl border-border/50 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500" />
                  <CardContent className="p-6 flex flex-col justify-between h-full relative z-10">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-4">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm shadow-inner ring-1 ring-emerald-500/20">
                          {currency}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">
                            {currency === 'USD' ? 'Dolar AS' : currency === 'SGD' ? 'Dolar Singapura' : currency === 'MYR' ? 'Ringgit Malaysia' : 'Yuan Tiongkok'}
                          </p>
                          <p className="font-extrabold text-2xl text-foreground">
                            {formatCurrency(balance, currency)}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 bg-muted rounded-full">
                        <DollarSign className="size-5 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious className="left-0 -ml-4 bg-background/80 backdrop-blur-md hover:bg-background shadow-md border-border" />
          <CarouselNext className="right-0 -mr-4 bg-background/80 backdrop-blur-md hover:bg-background shadow-md border-border" />
        </div>
      </Carousel>

      {/* ── Quick Actions ────────────────────────────────────── */}
      <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-lg overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <WalletTopUpDialog />
            <WalletConvertDialog />
            
            <Button variant="outline" className="w-full h-auto py-5 flex-col gap-3 border-border/50 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:shadow-md transition-all rounded-xl group">
              <div className="p-3 bg-violet-500/10 rounded-full group-hover:scale-110 group-hover:bg-violet-500/20 transition-all duration-300">
                <Gift className="size-6 text-violet-500" />
              </div>
              <span className="text-sm font-semibold">Kirim Hadiah</span>
            </Button>

            {userRole === 'host' && (
              <WalletWithdrawDialog />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Earnings Chart (Host Only) ───────────────────────── */}
      {userRole === 'host' && (
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Pendapatan 30 Hari Terakhir</CardTitle>
            <CardDescription>Visualisasi detail pendapatan berdasarkan sumber kontribusi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-background/40 rounded-xl border border-border/50 mb-6">
              <EarningsChart data={earningsData} height={320} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SummaryCard label="Langganan" amount={earningsData.subscriptions.reduce((a, b) => a + b, 0)} color="text-rose-500 dark:text-rose-400" bgColor="bg-rose-500/10" icon={<TrendingUp className="size-5" />} />
              <SummaryCard label="Tips" amount={earningsData.tips.reduce((a, b) => a + b, 0)} color="text-amber-500 dark:text-amber-400" bgColor="bg-amber-500/10" icon={<Send className="size-5" />} />
              <SummaryCard label="Booking" amount={earningsData.bookings.reduce((a, b) => a + b, 0)} color="text-emerald-500 dark:text-emerald-400" bgColor="bg-emerald-500/10" icon={<Clock className="size-5" />} />
              <SummaryCard label="Hadiah" amount={earningsData.gifts.reduce((a, b) => a + b, 0)} color="text-violet-500 dark:text-violet-400" bgColor="bg-violet-500/10" icon={<Gift className="size-5" />} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Transaction History ──────────────────────────────── */}
      <WalletTransactionHistory transactions={transactions} />
    </div>
  );
}
