'use client';

import React from 'react';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  TrendingUp,
  CreditCard,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatCurrency, timeSince } from '@/lib/format';
import type { WalletTransaction, TransactionType } from '@/types';

function TicketIcon(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  const { size = 20, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}

function getTransactionIcon(type: TransactionType) {
  switch (type) {
    case 'deposit':
      return <ArrowUpCircle className="size-5 text-emerald-500" />;
    case 'withdraw':
      return <ArrowDownCircle className="size-5 text-red-500" />;
    case 'earning':
      return <TrendingUp className="size-5 text-purple-500" />;
    case 'fee_deduction':
    case 'subscription':
      return <CreditCard className="size-5 text-gray-400" />;
    case 'ticket':
      return <TicketIcon className="size-5 text-amber-500" />;
    case 'refund':
      return <ArrowUpCircle className="size-5 text-blue-500" />;
    default:
      return <Wallet className="size-5 text-gray-400" />;
  }
}

function getTransactionTypeLabel(type: TransactionType): string {
  const labels: Record<TransactionType, string> = {
    deposit: 'Setoran',
    withdraw: 'Penarikan',
    earning: 'Pendapatan',
    refund: 'Pengembalian',
    subscription: 'Langganan',
    ticket: 'Tiket',
    fee_deduction: 'Biaya',
  };
  return labels[type] ?? type;
}

export function WalletTransactionHistory({ transactions }: { transactions: WalletTransaction[] }) {
  return (
    <Card className="bg-card/60 backdrop-blur-xl border-border/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Riwayat Transaksi (Buku Besar)</CardTitle>
            <CardDescription>Transaksi riil di dompet Anda</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-accent hover:text-accent-foreground font-medium rounded-xl">
            Lihat Semua
            <ChevronRight className="size-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-1 pr-2">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all cursor-pointer group hover:shadow-sm border border-transparent hover:border-border/50"
                >
                  <div className="flex size-11 items-center justify-center rounded-full bg-muted shrink-0 group-hover:bg-background group-hover:scale-110 transition-all shadow-inner border border-border/50">
                    {getTransactionIcon(tx.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate text-foreground group-hover:text-primary transition-colors">{tx.notes || getTransactionTypeLabel(tx.transaction_type)}</p>
                      {tx.status === 'pending' && (
                        <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 shrink-0">
                          Pending
                        </Badge>
                      )}
                      {tx.status === 'failed' && (
                        <Badge variant="destructive" className="text-xs shrink-0 shadow-sm">Gagal</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{getTransactionTypeLabel(tx.transaction_type)}</span>
                      <span>·</span>
                      <span>{timeSince(tx.created_at)}</span>
                      {tx.id && (
                        <>
                          <span>·</span>
                          <span className="font-mono text-[10px] opacity-60">{tx.id.slice(0, 8)}...</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-semibold ${
                        ['deposit', 'earning', 'refund'].includes(tx.transaction_type)
                          ? 'text-emerald-500'
                          : 'text-red-500'
                      }`}
                    >
                      {['deposit', 'earning', 'refund'].includes(tx.transaction_type) ? '+' : '-'}
                      {formatCurrency(tx.amount, tx.currency)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Belum ada riwayat transaksi di dompet ini.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
