import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, Users, Star, FileStack, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { CreatorProfile, SubscriptionTier } from '@/types';
import { formatCount, getInitials } from './creator-helpers';

interface CreatorHeaderProps {
  creatorProfile: CreatorProfile;
  isSubscribed: boolean;
  isLoadingTiers: boolean;
  tiers: SubscriptionTier[];
  handleSubscribe: (tierId: string, tierName: string) => void;
  handleCancelSubscription: () => void;
  handleChatClick: () => void;
}

export function CreatorHeader({
  creatorProfile,
  isSubscribed,
  isLoadingTiers,
  tiers,
  handleSubscribe,
  handleCancelSubscription,
  handleChatClick,
}: CreatorHeaderProps) {
  const isHostProfile = typeof creatorProfile.user === 'object' && creatorProfile.user?.role === 'host';

  return (
    <>
      <div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent h-24" />
        <h1 className="absolute bottom-4 left-4 sm:left-6 text-white font-bold text-xl sm:text-2xl drop-shadow-lg">
          {creatorProfile.display_name}
        </h1>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="relative -mt-14 sm:-mt-16 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="relative">
              <div className="ring-4 ring-background rounded-full">
                <Avatar className="size-24 sm:size-28">
                  {(creatorProfile.avatar || (typeof creatorProfile.user === 'object' && creatorProfile.user?.avatar)) && (
                    <AvatarImage
                      src={creatorProfile.avatar || (typeof creatorProfile.user === 'object' ? creatorProfile.user.avatar : undefined) || ''}
                      alt={creatorProfile.display_name}
                    />
                  )}
                  <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {getInitials(creatorProfile.display_name)}
                  </AvatarFallback>
                </Avatar>
              </div>
              {creatorProfile.is_approved && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5">
                  <CheckCircle className="size-5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold">
                  {creatorProfile.display_name}
                </h2>
                <Badge variant="secondary">{creatorProfile.category}</Badge>
                {creatorProfile.is_exclusive_host && (
                  <Badge className="bg-amber-500 text-white border-amber-500 hover:bg-amber-600">
                    ⭐ Eksklusif
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatCount(creatorProfile.subscriber_count)} pelanggan
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-0.5">
          {creatorProfile.bio || "Tidak ada bio yang tersedia."}
        </p>

        {/* Stats Row */}
        {isHostProfile && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50">
              <FileStack className="size-5 text-muted-foreground mb-1.5" />
              <span className="text-xl font-bold">
                {creatorProfile.post_count ?? 0}
              </span>
              <span className="text-xs text-muted-foreground">Postingan</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50">
              <Users className="size-5 text-muted-foreground mb-1.5" />
              <span className="text-xl font-bold">
                {formatCount(creatorProfile.subscriber_count)}
              </span>
              <span className="text-xs text-muted-foreground">Pelanggan</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-xl bg-muted/50">
              <Star className="size-5 text-amber-500 mb-1.5" />
              <span className="text-xl font-bold">
                {creatorProfile.rating?.toFixed(1) ?? "0.0"}
              </span>
              <span className="text-xs text-muted-foreground">Rating</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {isHostProfile && (
          <div className="flex flex-wrap gap-2 mb-8">
            {isSubscribed ? (
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCancelSubscription}
              >
                <CheckCircle className="size-4 mr-2" />
                Langganan Aktif (Batalkan)
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg">
                    <Users className="size-4 mr-2" />
                    Berlangganan
                    <ChevronDown className="size-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {isLoadingTiers ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      Memuat paket...
                    </div>
                  ) : (
                    tiers.map((tier) => (
                      <DropdownMenuItem
                        key={tier.id}
                        className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                        onClick={() => handleSubscribe(tier.id, tier.name)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-semibold">{tier.name}</span>
                          <span className="text-sm font-bold text-primary">
                            Rp {Number(tier.price).toLocaleString("id-ID")}
                            <span className="text-xs text-muted-foreground font-normal">
                              /bln
                            </span>
                          </span>
                        </div>
                        {tier.benefits && tier.benefits.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5 mt-1">
                            {tier.benefits.map((b, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <CheckCircle className="size-3 text-emerald-500 shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              size="lg"
              variant="secondary"
              className="flex-1 sm:flex-none"
              onClick={handleChatClick}
            >
              Chat Pribadi
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
