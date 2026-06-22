'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Trash2 } from 'lucide-react';
import type { HostBadge } from '@/types';

interface AdminBadgesTabProps {
  badges: HostBadge[];
  newBadge: { name: string; description: string; icon: string; bonus_idr: number };
  setNewBadge: React.Dispatch<React.SetStateAction<{ name: string; description: string; icon: string; bonus_idr: number }>>;
  handleCreateBadge: () => void;
  handleDeleteBadge: (id: string) => void;
}

export function AdminBadgesTab({
  badges,
  newBadge,
  setNewBadge,
  handleCreateBadge,
  handleDeleteBadge,
}: AdminBadgesTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Manajemen Lencana</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-rose-500 hover:bg-rose-600 h-8 text-xs">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Buat Lencana
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Buat Lencana Baru</DialogTitle>
              <DialogDescription>Tambahkan lencana pencapaian baru untuk kreator.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="badge-name">Nama Lencana</Label>
                <Input
                  id="badge-name"
                  placeholder="Contoh: Legenda Streaming"
                  value={newBadge.name}
                  onChange={(e) => setNewBadge((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge-desc">Deskripsi</Label>
                <Textarea
                  id="badge-desc"
                  placeholder="Deskripsi pencapaian..."
                  value={newBadge.description}
                  onChange={(e) =>
                    setNewBadge((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="badge-icon">Ikon (Emoji)</Label>
                  <Input
                    id="badge-icon"
                    placeholder="⭐"
                    value={newBadge.icon}
                    onChange={(e) => setNewBadge((prev) => ({ ...prev, icon: e.target.value }))}
                    className="w-20 text-center text-2xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="badge-bonus">Bonus (IDR)</Label>
                  <Input
                    id="badge-bonus"
                    type="number"
                    placeholder="100000"
                    value={newBadge.bonus_idr || ''}
                    onChange={(e) =>
                      setNewBadge((prev) => ({ ...prev, bonus_idr: parseInt(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button className="bg-rose-500 hover:bg-rose-600" onClick={handleCreateBadge}>
                <Plus className="mr-1.5 h-4 w-4" />
                Buat Lencana
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Badge List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {badges.map((badge) => (
          <Card key={badge.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{badge.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{badge.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleDeleteBadge(badge.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Separator className="my-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Bonus:{' '}
                  <span className="font-medium text-foreground">
                    Rp {badge.bonus_idr.toLocaleString('id-ID')}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
