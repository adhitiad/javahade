'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  FileCheck,
  Award,
  RefreshCw,
  DollarSign,
  Flag,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminDashboardTab } from './admin-dashboard-tab';
import { AdminWithdrawalsTab } from './admin-withdrawals-tab';
import { AdminKYCTab } from './admin-kyc-tab';
import { AdminReportsTab } from './admin-reports-tab';
import { AdminBadgesTab } from './admin-badges-tab';
import type { HostBadge } from '@/types';


export default function AdminView() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'withdrawals' | 'kyc' | 'reports' | 'badges'>('dashboard');
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [kycList, setKycList] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [newBadge, setNewBadge] = useState({ name: '', description: '', icon: '⭐', bonus_idr: 0 });

  useEffect(() => {
    api.get('/admin/withdrawals/').then((res: any) => setWithdrawals(res.results || [])).catch(() => {});
    api.get('/admin/kyc/').then((res: any) => setKycList(res.results || [])).catch(() => {});
    api.get('/admin/reports/').then((res: any) => setReports(res.results || [])).catch(() => {});
    api.get('/admin/badges/').then((res: any) => setBadges(res.results || [])).catch(() => {});
  }, []);

  // KYC Actions
  const handleKYCAction = (id: string, action: 'approved' | 'rejected') => {
    setKycList(prev => prev.map(k => k.id === id ? { ...k, status: action } : k));
  };

  // Report Actions
  const handleReportAction = (id: string, action: 'actioned' | 'dismissed') => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
  };

  // Badge Actions
  const handleCreateBadge = () => {
    if (!newBadge.name.trim()) return;
    const badge: HostBadge = {
      id: `b_${Date.now()}`,
      ...newBadge,
    };
    setBadges(prev => [...prev, badge]);
    setNewBadge({ name: '', description: '', icon: '⭐', bonus_idr: 0 });
  };

  const handleDeleteBadge = (id: string) => {
    setBadges(prev => prev.filter(b => b.id !== id));
  };

  const tabs = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: RefreshCw },
    { key: 'withdrawals' as const, label: 'Penarikan', icon: DollarSign },
    { key: 'kyc' as const, label: 'KYC', icon: FileCheck },
    { key: 'reports' as const, label: 'Laporan', icon: Flag },
    { key: 'badges' as const, label: 'Lencana', icon: Award },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-rose-500" />
          Panel Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola platform, tinjau laporan, dan kelola pengguna
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto py-1 bg-muted">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className="text-xs shrink-0"
            >
              <tab.icon className="mr-1.5 h-3.5 w-3.5" />
              {tab.label}
              {tab.key === 'kyc' && kycList.filter(k => k.status === 'pending').length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[9px] bg-amber-500 hover:bg-amber-500 text-white">
                  {kycList.filter(k => k.status === 'pending').length}
                </Badge>
              )}
              {tab.key === 'reports' && reports.filter(r => r.status === 'pending').length > 0 && (
                <Badge className="ml-1.5 h-4 min-w-4 px-1 text-[9px] bg-rose-500 hover:bg-rose-500 text-white">
                  {reports.filter(r => r.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {activeTab === 'dashboard' && (
        <AdminDashboardTab
          withdrawals={withdrawals}
          kycList={kycList}
          reports={reports}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'withdrawals' && (
        <AdminWithdrawalsTab withdrawals={withdrawals} />
      )}

      {activeTab === 'kyc' && (
        <AdminKYCTab kycList={kycList} handleKYCAction={handleKYCAction} />
      )}

      {activeTab === 'reports' && (
        <AdminReportsTab reports={reports} handleReportAction={handleReportAction} />
      )}

      {activeTab === 'badges' && (
        <AdminBadgesTab
          badges={badges}
          newBadge={newBadge}
          setNewBadge={setNewBadge}
          handleCreateBadge={handleCreateBadge}
          handleDeleteBadge={handleDeleteBadge}
        />
      )}
    </div>
  );
}