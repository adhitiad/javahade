'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  ChevronLeft,
  Crown,
  Shield,
  User,
  Share2,
  Globe,
  Lock,
  Image as ImageIcon,
  Loader2,
  Play,
  Music,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFamilyStore } from '@/stores/family-store';
import { useUIStore } from '@/stores/ui-store';
import type { FamilyRole } from '@/types';
import { ShareContentDialog } from './family-share-dialog';

const PHOTO_GRADIENTS = [
  'from-rose-300 via-pink-400 to-fuchsia-500',
  'from-amber-300 via-orange-400 to-red-400',
  'from-emerald-300 via-teal-400 to-cyan-500',
];

function RoleBadge({ role }: { role: FamilyRole }) {
  if (role === 'owner') {
    return (
      <Badge className="h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-0.5 border-none">
        <Crown className="h-2.5 w-2.5" />
        Pemilik
      </Badge>
    );
  }
  if (role === 'admin') {
    return (
      <Badge className="h-5 px-1.5 text-[10px] bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 gap-0.5 border-none">
        <Shield className="h-2.5 w-2.5" />
        Admin
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5 border-none">
      <User className="h-2.5 w-2.5" />
      Anggota
    </Badge>
  );
}

export function FamilyDetailView({
  familyId,
  onBack,
}: {
  familyId: string;
  onBack: () => void;
}) {
  const { currentFamily, members, feed, isLoading, fetchFamilyDetail, fetchFamilyMembers, fetchFamilyFeed, generateInviteCode } = useFamilyStore();
  const { addToast } = useUIStore();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'feed'>('members');
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  useEffect(() => {
    fetchFamilyDetail(familyId);
    fetchFamilyMembers(familyId);
    fetchFamilyFeed(familyId);
  }, [familyId, fetchFamilyDetail, fetchFamilyMembers, fetchFamilyFeed]);

  if (isLoading && !currentFamily) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="size-10 animate-spin text-rose-500" />
        <span className="text-sm text-muted-foreground">Memuat detail grup...</span>
      </div>
    );
  }

  if (!currentFamily) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-xl font-bold text-white">Grup tidak ditemukan</h2>
        <Button onClick={onBack} variant="outline" className="rounded-xl">Kembali</Button>
      </div>
    );
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentFamily.invite_code);
    setCopied(true);
    addToast('Kode undangan berhasil disalin!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshCode = async () => {
    try {
      await generateInviteCode(currentFamily.id);
      addToast('Kode undangan berhasil diperbarui!', 'success');
    } catch {
      addToast('Gagal memperbarui kode undangan.', 'error');
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatRelativeTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins} menit lalu`;
    if (hrs < 24) return `${hrs} jam lalu`;
    return `${days} hari lalu`;
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-4 text-white">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={onBack} className="w-fit text-gray-400 hover:text-white hover:bg-white/5 rounded-xl">
        <ChevronLeft className="mr-1 h-4 w-4" />
        Kembali
      </Button>

      {/* Header Card */}
      <Card className="overflow-hidden bg-zinc-900/40 border-white/5">
        <div className="h-28 sm:h-36 bg-gradient-to-br from-purple-600 via-indigo-600 to-zinc-900 relative">
          <div className="absolute inset-0 bg-black/15" />
        </div>
        <CardContent className="p-4 sm:p-6 -mt-10 relative">
          <Avatar className="h-16 sm:h-20 sm:w-20 border-4 border-zinc-950 shadow-lg">
            <AvatarFallback className="bg-zinc-800 text-white text-xl font-bold">
              {getInitials(currentFamily.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-white">{currentFamily.name}</h2>
                {currentFamily.is_private ? (
                  <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10 text-gray-300">
                    <Lock className="mr-1 h-3 w-3 text-rose-400" />
                    Privat
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-white/5 border-white/10 text-gray-300">
                    <Globe className="mr-1 h-3 w-3 text-emerald-400" />
                    Publik
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">{currentFamily.description}</p>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {currentFamily.member_count} anggota &bull; Dibuat {formatDate(currentFamily.created_at)}
              </p>
            </div>
          </div>

          {/* Invite Code */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 p-3 bg-zinc-950/80 border border-white/5 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Kode Undangan</p>
              <p className="font-mono font-bold text-sm text-rose-400">{currentFamily.invite_code}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" className="h-9 text-xs border-zinc-800 rounded-xl hover:bg-white/5 text-gray-300 flex-1 sm:flex-initial" onClick={handleCopyCode}>
                {copied ? <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                {copied ? 'Tersalin' : 'Salin Kode'}
              </Button>
              <Button size="sm" className="h-9 text-xs bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-xl flex-1 sm:flex-initial" onClick={handleRefreshCode}>
                Perbarui Kode
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-zinc-950/80 p-1 border border-white/5 rounded-2xl mt-4">
            <Button
              variant={activeTab === 'members' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl"
              onClick={() => setActiveTab('members')}
            >
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Anggota ({members.length})
            </Button>
            <Button
              variant={activeTab === 'feed' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-9 text-xs rounded-xl"
              onClick={() => setActiveTab('feed')}
            >
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
              Shared Post ({feed.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'members' ? (
        <Card className="bg-zinc-900/40 border-white/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-white">Daftar Anggota</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {members.map((member, i) => {
                const displayName = member.user?.display_name ?? member.user?.username ?? 'Unknown Member';
                return (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-zinc-800 text-white text-xs font-bold">
                        {displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">@{member.user?.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Bergabung {formatDate(member.joined_at)}
                      </p>
                    </div>
                    <RoleBadge role={member.role} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button
              size="sm"
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl gap-1.5 h-9"
              onClick={() => setShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              Bagikan Konten
            </Button>
          </div>

          {feed.length > 0 ? (
            feed.map((fp, i) => (
              <Card key={fp.id} className="bg-zinc-900/40 border-white/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-zinc-800 text-white text-[10px] font-bold">
                        {fp.shared_by?.username?.slice(0, 2).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white">@{fp.shared_by?.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        membagikan konten &bull; {formatRelativeTime(fp.shared_at)}
                      </p>
                    </div>
                  </div>

                  {fp.message && (
                    <p className="text-sm mb-3 text-gray-200">{fp.message}</p>
                  )}

                  {fp.post && (
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-zinc-950/40">
                      {fp.post.content_type === 'image' && (
                        <div className={`aspect-video bg-gradient-to-br ${PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length]} opacity-30 flex items-center justify-center`}>
                          <ImageIcon className="h-8 w-8 text-white/50" />
                        </div>
                      )}
                      {fp.post.content_type === 'video' && (
                        <div className={`aspect-video bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center`}>
                          <div className="rounded-full bg-white/10 p-3">
                            <Play className="h-6 w-6 text-white/70 fill-white" />
                          </div>
                        </div>
                      )}
                      {fp.post.content_type === 'audio' && (
                        <div className="h-20 bg-zinc-900 flex items-center justify-center gap-3 px-4">
                          <div className="rounded-full bg-rose-500/20 p-2">
                            <Music className="h-5 w-5 text-rose-500" />
                          </div>
                          <div className="flex-1 max-w-xs">
                            <div className="h-1 bg-white/10 rounded-full">
                              <div className="h-full bg-rose-500 rounded-full w-1/3" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="p-3">
                        {fp.post.title && (
                          <h4 className="font-semibold text-sm text-white">{fp.post.title}</h4>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fp.post.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                          <span>❤️ {fp.post.like_count}</span>
                          <span>💬 {fp.post.comment_count}</span>
                          <span>👁️ {fp.post.view_count}</span>
                          {fp.post.is_premium && (
                            <Badge className="h-4 px-1 text-[9px] bg-amber-500 hover:bg-amber-500 text-black border-none font-bold">
                              Premium
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Share2 className="h-10 w-10 mb-2 opacity-30 animate-pulse" />
              <p className="text-sm">Belum ada konten dibagikan</p>
            </div>
          )}
        </div>
      )}

      {/* Share dialog modal */}
      <ShareContentDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        familyId={familyId}
        onShareSuccess={() => fetchFamilyFeed(familyId)}
      />
    </div>
  );
}
