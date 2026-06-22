'use client';

import {
  UserCircle,
  ShieldCheck,
  Wallet,
  Users,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan</h1>
          <p className="text-muted-foreground mt-1">Kelola akun dan preferensi Anda</p>
        </div>
        <div className="space-y-4">
          {[
            { icon: UserCircle, label: 'Profil', desc: 'Edit informasi profil' },
            { icon: ShieldCheck, label: 'Keamanan', desc: 'Password, PIN, 2FA' },
            { icon: Wallet, label: 'Pembayaran', desc: 'Metode pembayaran' },
            { icon: Users, label: 'Privasi', desc: 'Pengaturan privasi' },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-accent transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-left flex-1">
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
