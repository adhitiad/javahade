'use client';

import React, { useEffect, useState } from 'react';
import { usePaymentStore } from '@/stores/usePaymentStore';
import TopUpModal from './TopUpModal';

export default function BalanceDisplay() {
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const { balance, lockedBalance, fetchBalance, isLoading } = usePaymentStore((state) => ({
    balance: state.balance,
    lockedBalance: state.lockedBalance,
    fetchBalance: state.fetchBalance,
    isLoading: state.isLoading,
  }));

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const formattedBalance = (balance / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  return (
    <div className="flex items-center space-x-4">
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium text-slate-300">
          {isLoading ? 'Memuat...' : formattedBalance}
        </span>
        {lockedBalance > 0 && (
          <span className="text-xs text-slate-500">
            Ter kunci: {(lockedBalance / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </span>
        )}
      </div>
      <button
        onClick={() => setIsTopUpOpen(true)}
        className="px-3 py-1.5 text-sm font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-md transition-colors"
      >
        Top Up
      </button>

      <TopUpModal isOpen={isTopUpOpen} onClose={() => setIsTopUpOpen(false)} />
    </div>
  );
}
