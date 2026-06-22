'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Payout } from '@/types';

function WithdrawalActions({ withdrawal }: { withdrawal: Payout }) {
  const [status, setStatus] = useState(withdrawal.status);

  if (status !== 'pending') return (
    <Badge className={`${status === 'completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
      {status === 'completed' ? 'Disetujui' : 'Ditolak'}
    </Badge>
  );

  return (
    <div className="flex gap-1 justify-end">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
        onClick={() => setStatus('completed')}
      >
        <CheckCircle className="mr-1 h-3 w-3" />
        Setujui
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        onClick={() => setStatus('failed')}
      >
        <XCircle className="mr-1 h-3 w-3" />
        Tolak
      </Button>
    </div>
  );
}

export function AdminWithdrawalsTab({ withdrawals }: { withdrawals: Payout[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Penarikan Menunggu Persetujuan</CardTitle>
        <CardDescription>Daftar permintaan penarikan dana dari kreator</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Kreator</TableHead>
                <TableHead className="text-xs">Jumlah</TableHead>
                <TableHead className="text-xs">Mata Uang</TableHead>
                <TableHead className="text-xs">Metode</TableHead>
                <TableHead className="text-xs">Waktu</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-slate-500 text-white text-[10px]">
                          C
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{w.creator}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-mono font-medium">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: w.currency }).format(w.amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{w.currency}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{w.method}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{format(new Date(w.created_at), 'dd MMM yyyy')}</TableCell>
                  <TableCell className="text-right">
                    <WithdrawalActions withdrawal={w} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
