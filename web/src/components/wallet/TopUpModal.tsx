'use client';

import React, { useState } from 'react';
import { usePaymentStore } from '@/stores/usePaymentStore';

// Dummy basic UI component simulating a Shadcn Dialog
export default function TopUpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState(1000);
  const [provider, setProvider] = useState('segpay');
  const { createIntent, isLoading, error } = usePaymentStore((state) => ({
    createIntent: state.createIntent,
    isLoading: state.isLoading,
    error: state.error,
  }));

  if (!isOpen) return null;

  const handleTopUp = async () => {
    const checkoutUrl = await createIntent(amount, provider);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Top Up Balance</h2>
        
        {error && (
          <div className="p-3 mb-4 text-sm text-red-400 bg-red-400/10 rounded-md border border-red-400/20">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Nominal (Cents)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              min={500}
            />
            <p className="text-xs text-slate-500 mt-1">Minimal 500 sen ($5.00)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Metode Pembayaran</label>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="segpay">Segpay (Kartu Kredit)</option>
              <option value="verotel">Verotel (Kartu Kredit)</option>
              <option value="elotpay">eLotPay (USDT Kripto)</option>
              <option value="netbilling">NETbilling</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            disabled={isLoading}
          >
            Batal
          </button>
          <button 
            onClick={handleTopUp}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Memproses...' : 'Lanjutkan Bayar'}
          </button>
        </div>
      </div>
    </div>
  );
}
