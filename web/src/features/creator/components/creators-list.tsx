'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Sparkles,
  Users,
  CheckCircle,
  SlidersHorizontal,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useUIStore } from '@/stores/ui-store';
import type { CreatorProfile } from '@/types';
import { api } from '@/lib/api';


const CATEGORIES = [
  'Semua',
  'Entertainment',
  'Music',
  'Art',
  'Gaming',
  'Lifestyle',
  'Education',
  'Comedy',
  'Food',
  'Sports',
  'Technology',
];

// ---- Helpers ----
function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

const COVER_GRADIENTS = [
  'from-violet-500 via-purple-500 to-fuchsia-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-rose-500 via-pink-500 to-red-500',
  'from-amber-500 via-orange-500 to-yellow-500',
  'from-sky-500 via-blue-500 to-indigo-500',
  'from-lime-500 via-green-500 to-emerald-500',
  'from-fuchsia-500 via-pink-500 to-rose-500',
  'from-teal-500 via-cyan-500 to-sky-500',
  'from-orange-500 via-red-500 to-pink-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-pink-500 via-rose-500 to-red-500',
  'from-indigo-500 via-violet-500 to-purple-500',
];

// ---- Creator Card ----
function CreatorCard({ creator, index, onClick }: { creator: CreatorProfile; index: number; onClick: () => void }) {
  return (
    <Card onClick={onClick} className="overflow-hidden gap-0 py-0 hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer group">
      {/* Cover */}
      <div className={`relative h-24 sm:h-28 bg-gradient-to-br ${COVER_GRADIENTS[index % COVER_GRADIENTS.length]}`}>
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
        {creator.is_exclusive_host && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-amber-500 text-white border-amber-500 text-[10px] gap-0.5">
              <Sparkles className="size-3" />
              Eksklusif
            </Badge>
          </div>
        )}
        {/* Avatar overlapping cover */}
        <div className="absolute -bottom-8 left-4">
          <div className="ring-3 ring-background rounded-full">
            <Avatar className="size-16 border-2 border-background">
              <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                {getInitials(creator.display_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

      <CardContent className="pt-10 pb-4 px-4 gap-2">
        {/* Name & Verified */}
        <div className="flex items-center gap-1.5">
          <h3 className="font-semibold text-sm truncate">{creator.display_name}</h3>
          {creator.is_approved && (
            <CheckCircle className="size-4 text-emerald-500 shrink-0" />
          )}
        </div>

        {/* Category */}
        <Badge variant="secondary" className="text-[10px]">
          {creator.category}
        </Badge>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {formatCount(creator.subscriber_count)}
          </span>
          <span className="font-semibold text-foreground">
            Rp {creator.subscription_price.toLocaleString('id-ID')}
            <span className="font-normal text-muted-foreground">/bln</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Loading Skeleton ----
function CreatorCardSkeleton() {
  return (
    <Card className="overflow-hidden gap-0 py-0">
      <Skeleton className="h-24 sm:h-28 w-full" />
      <div className="px-4 pt-10 pb-4 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="size-4 rounded-full" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
        <div className="flex gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      </div>
    </Card>
  );
}

// ---- Main Creators List ----
export default function CreatorsList() {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isHost] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCreators = async () => {
      try {
        // fetch dari API dengan pagination standar results
        const res = await api.get<any>('/creators/');
        const data = res.results ? res.results : (Array.isArray(res) ? res : []);
        setCreators(data);
      } catch (err) {
        console.error('Failed to fetch creators:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCreators();
  }, []);

  const filteredCreators = useMemo(() => {
    let result = creators;

    // Filter by category
    if (activeCategory !== 'Semua') {
      result = result.filter((c) => c.category === activeCategory);
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)
      );
    }

    // Sort by subscriber count descending
    return result.sort((a, b) => b.subscriber_count - a.subscriber_count);
  }, [search, activeCategory]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold mb-3">Temukan Creator</h1>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari creator berdasarkan nama atau kategori..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Apply to be Host CTA */}
        {!isHost && (
          <div className="mb-6 rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 p-5 sm:p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
            <div className="relative">
              <h2 className="text-lg font-bold mb-1">Ingin Jadi Host?</h2>
              <p className="text-sm text-white/80 mb-4 max-w-md">
                Jadilah creator di Javahade dan mulai hasilkan uang dari konten Anda.
                Daftar sekarang dan dapatkan keuntungan eksklusif!
              </p>
              <Button variant="secondary" className="gap-2">
                <Sparkles className="size-4" />
                Daftar Sebagai Host
              </Button>
            </div>
          </div>
        )}

        {/* Category Filter Chips */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? 'default' : 'outline'}
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan {filteredCreators.length} creator
          </p>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
            <SlidersHorizontal className="size-3.5" />
            Filter
          </Button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CreatorCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredCreators.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="bg-muted rounded-full p-6">
              <Search className="size-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Creator tidak ditemukan</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Coba ubah kata kunci pencarian atau pilih kategori lain untuk menemukan creator yang Anda cari.
            </p>
            <Button
              variant="outline"
              onClick={() => { setSearch(''); setActiveCategory('Semua'); }}
            >
              Reset Filter
            </Button>
          </div>
        ) : (
          /* Creator Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredCreators.map((creator, i) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                index={i}
                onClick={() => router.push(`/u/${creator.user}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}