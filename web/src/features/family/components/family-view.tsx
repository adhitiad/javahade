'use client';

import React, { useState, useEffect } from 'react';
import { Home, LogIn, Plus, Users, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFamilyStore } from '@/stores/family-store';
import { useUIStore } from '@/stores/ui-store';
import { FamilyCard } from './family-card';
import { FamilyDetailView } from './family-detail-view';

export default function FamilyView() {
  const { families, isLoading, fetchFamilies, createFamily, joinFamily } = useFamilyStore();
  const { addToast } = useUIStore();
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Form states for Create Group
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxMembers, setMaxMembers] = useState([50]);
  const [isSubmittingGroup, setIsSubmittingGroup] = useState(false);

  useEffect(() => {
    fetchFamilies();
  }, [fetchFamilies]);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      addToast('Masukkan kode undangan', 'error');
      return;
    }
    try {
      const family = await joinFamily(inviteCode.trim());
      setSelectedFamilyId(family.id);
      setInviteCode('');
      addToast(`Berhasil bergabung ke ${family.name}!`, 'success');
      fetchFamilies();
    } catch (err) {
      addToast('Gagal bergabung: Kode undangan tidak valid.', 'error');
    }
  };

  const handleCreateFamily = async () => {
    if (!name.trim()) {
      addToast('Harap masukkan nama grup', 'error');
      return;
    }
    setIsSubmittingGroup(true);
    try {
      const family = await createFamily({
        name: name.trim(),
        description: description.trim() || undefined,
        is_private: isPrivate,
        max_members: maxMembers[0],
      });
      setName('');
      setDescription('');
      setIsPrivate(false);
      setCreateDialogOpen(false);
      setSelectedFamilyId(family.id);
      addToast('Grup agensi baru berhasil dibuat!', 'success');
      fetchFamilies();
    } catch (err) {
      addToast('Gagal membuat grup agensi.', 'error');
    } finally {
      setIsSubmittingGroup(false);
    }
  };

  if (selectedFamilyId) {
    return (
      <div className="container mx-auto px-4 py-4 max-w-3xl">
        <FamilyDetailView
          familyId={selectedFamilyId}
          onBack={() => setSelectedFamilyId(null)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-white">
            <Home className="h-6 w-6 text-rose-500" />
            Grup Keluarga / Agensi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bergabung dengan komunitas dan bagikan momen bersama
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Join Family Input */}
          <div className="flex gap-1.5">
            <Input
              placeholder="Kode undangan..."
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
              className="h-9 w-36 sm:w-44 text-xs bg-zinc-900 border-zinc-800 text-white rounded-xl"
            />
            <Button variant="outline" size="sm" className="h-9 border-zinc-800 rounded-xl hover:bg-white/5 text-gray-200" onClick={handleJoin}>
              <LogIn className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
              Gabung
            </Button>
          </div>
          {/* Create Family Button */}
          <Button
            size="sm"
            className="h-9 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-xl"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Buat Grup
          </Button>
        </div>
      </div>

      {/* Families Grid */}
      {isLoading && families.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-10 animate-spin text-rose-500" />
        </div>
      ) : families.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {families.map((family, i) => (
            <FamilyCard
              key={family.id}
              family={family}
              index={i}
              onEnter={() => setSelectedFamilyId(family.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-40 animate-pulse" />
          <p className="text-sm font-semibold text-white">Belum ada grup keluarga</p>
          <p className="text-xs mt-1">Buat grup baru atau gabung dengan kode undangan</p>
        </div>
      )}

      {/* Create Family Dialog Modal */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle>Buat Grup Keluarga</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Buat komunitas baru untuk berbagi konten dan berinteraksi dengan penggemar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="family-name">Nama Grup</Label>
              <Input
                id="family-name"
                placeholder="Contoh: Rose Squad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="family-desc">Deskripsi</Label>
              <Textarea
                id="family-desc"
                placeholder="Ceritakan tentang grupmu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-white rounded-xl resize-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 p-3 bg-zinc-900/20">
              <div>
                <Label className="text-zinc-200">Grup Privat</Label>
                <p className="text-[10px] text-muted-foreground">Hanya bisa diakses dengan kode undangan</p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
            </div>
            <div className="space-y-3">
              <Label className="text-zinc-200">Maks. Anggota: {maxMembers[0]}</Label>
              <Slider
                value={maxMembers}
                onValueChange={setMaxMembers}
                min={10}
                max={500}
                step={10}
                className="py-1"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>10</span>
                <span>500</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              className="border-zinc-800 rounded-xl"
            >
              Batal
            </Button>
            <Button
              onClick={handleCreateFamily}
              disabled={isSubmittingGroup || !name.trim()}
              className="bg-rose-500 hover:bg-rose-600 rounded-xl"
            >
              {isSubmittingGroup && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Buat Grup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}