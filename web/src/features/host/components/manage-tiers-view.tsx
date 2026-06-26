'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save, ArrowLeft, ShieldAlert } from 'lucide-react';

interface TierData {
  id: string;
  name: string;
  price: string;
  description: string;
}

export default function ManageTiersView() {
  const { addToast } = useUIStore();
  const router = useRouter();
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [subscriptionRules, setSubscriptionRules] = useState('');
  const [tiers, setTiers] = useState<TierData[]>([]);

  // Guard: User must be host
  useEffect(() => {
    if (!user || user.role !== 'host') return;

    const fetchTiers = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const apiBase = process.env.NEXT_PUBLIC_DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "";
        const domainUrl = apiBase.replace("/api/v1", "");
        
        const res = await fetch(`${domainUrl}/host/tiers/`, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });
        
        if (!res.ok) throw new Error("Gagal mengambil data langganan.");
        
        const data = await res.json();
        if (data.tiers) {
          setTiers(data.tiers);
        }
        if (data.subscription_rules !== undefined) {
          setSubscriptionRules(data.subscription_rules || "");
        }
      } catch (err) {
        console.error(err);
        addToast("Gagal memuat paket langganan.", "error");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTiers();
  }, [user, addToast]);

  if (!user || user.role !== 'host') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <ShieldAlert className="size-16 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-2xl font-bold">Akses Ditolak</h2>
        <p className="text-muted-foreground">Halaman ini hanya dapat diakses oleh kreator terverifikasi.</p>
        <Button onClick={() => router.push('/')} className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl">
          Kembali ke Feed
        </Button>
      </div>
    );
  }

  const handleTierChange = (index: number, field: keyof TierData, value: string) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const token = localStorage.getItem("access_token");
      const apiBase = process.env.NEXT_PUBLIC_DJANGO_API_URL || process.env.NEXT_PUBLIC_API_URL || "";
      const domainUrl = apiBase.replace("/api/v1", "");
      
      // Build payload for Django view
      const payload: Record<string, any> = {
        subscription_rules: subscriptionRules
      };
      
      tiers.forEach((t) => {
        payload[`name_${t.id}`] = t.name;
        payload[`price_${t.id}`] = t.price;
        payload[`desc_${t.id}`] = t.description;
      });

      const res = await fetch(`${domainUrl}/host/tiers/`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Gagal menyimpan paket langganan.");
      
      const result = await res.json();
      addToast(result.message || 'Paket Langganan & Peraturan Anda berhasil diperbarui.', 'success');
    } catch (err) {
      console.error(err);
      addToast("Terjadi kesalahan saat menyimpan data.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex justify-center items-center min-h-[50vh]">
        <Loader2 className="size-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
            💎 Kelola Paket Langganan (Subs)
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur nama paket, harga langganan bulanan, dan keuntungan yang Anda tawarkan ke Fans Anda.
          </p>
        </div>
        <Button
          onClick={() => router.push('/u/' + (user?.username ?? ''))}
          variant="outline"
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl gap-2 h-12 px-5 self-start sm:self-center"
        >
          <ArrowLeft className="size-4" />
          <span>Kembali ke Profil</span>
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* General Rules */}
        <div className="bg-card/40 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            📜 Peraturan Berlangganan (General Rules)
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Tuliskan aturan ketat, syarat, atau larangan yang harus dipatuhi Klien sebelum berlangganan profil Anda.
          </p>
          <Textarea
            value={subscriptionRules}
            onChange={(e) => setSubscriptionRules(e.target.value)}
            rows={4}
            className="w-full bg-zinc-950 border-white/10 text-white rounded-xl focus-visible:ring-rose-500 p-4 text-sm leading-relaxed"
            placeholder="Cth: Dilarang keras merekam layar, membagikan konten ke luar platform..."
          />
        </div>

        {/* 4 Tiers Slots Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, index) => (
            <Card
              key={tier.id}
              className="bg-card/30 backdrop-blur-md border border-white/5 hover:border-pink-500/30 transition-all duration-300 relative overflow-hidden group rounded-3xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardContent className="p-6 space-y-4 relative z-10">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Slot Paket {index + 1}
                  </span>
                  <div className="size-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-semibold text-gray-400">
                    #{index + 1}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Nama Paket</Label>
                    <Input
                      value={tier.name}
                      onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                      required
                      placeholder="Cth: VIP Access"
                      className="bg-zinc-950 border-white/10 text-white h-10 rounded-xl focus-visible:ring-rose-500 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Harga Bulanan (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.price}
                        onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                        required
                        className="bg-zinc-950 border-white/10 text-white h-10 pl-7 rounded-xl focus-visible:ring-rose-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-gray-400">Deskripsi / Keuntungan</Label>
                    <Textarea
                      value={tier.description}
                      onChange={(e) => handleTierChange(index, 'description', e.target.value)}
                      rows={3}
                      placeholder="Cth: Akses foto privat & prioritas chat."
                      className="bg-zinc-950 border-white/10 text-white rounded-xl focus-visible:ring-rose-500 text-xs resize-none"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="pt-6 flex justify-end border-t border-white/10">
          <Button
            type="submit"
            disabled={isSaving}
            className="h-14 px-8 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-2xl shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="size-5" />
                <span>Simpan Perubahan</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
