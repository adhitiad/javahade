'use client';

import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Clock, FileCheck, AlertTriangle, Users, DollarSign, Activity } from 'lucide-react';
import type { Payout, KYCDocument, Report } from '@/types';

interface AdminDashboardTabProps {
  withdrawals: Payout[];
  kycList: KYCDocument[];
  reports: Report[];
  setActiveTab: (tab: 'dashboard' | 'withdrawals' | 'kyc' | 'reports' | 'badges') => void;
}

export function AdminDashboardTab({ withdrawals, kycList, reports, setActiveTab }: AdminDashboardTabProps) {
  const STATS = [
    { label: 'Total Pengguna', value: '12,450', change: '+12% bulan ini', icon: Users, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
    { label: 'Pendapatan', value: 'Rp 450M', change: '+8% bulan ini', icon: DollarSign, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    { label: 'Sesi Streaming', value: '842', change: '+24% bulan ini', icon: Activity, color: 'text-amber-500', bgColor: 'bg-amber-500/10' }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`${stat.bgColor} p-2.5 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">{stat.change}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('withdrawals')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Penarikan Menunggu</p>
              <p className="text-xs text-muted-foreground">{withdrawals.length} permintaan</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('kyc')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-lg">
              <FileCheck className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">KYC Menunggu Review</p>
              <p className="text-xs text-muted-foreground">{kycList.filter(k => k.status === 'pending').length} dokumen</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('reports')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-rose-500/10 p-2 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Laporan Masuk</p>
              <p className="text-xs text-muted-foreground">{reports.filter(r => r.status === 'pending').length} laporan aktif</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
