'use client';

import React from 'react';
import { Users, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { FamilyGroup } from '@/types';

const GRADIENTS = [
  'from-rose-500 via-pink-500 to-fuchsia-500',
  'from-emerald-500 via-teal-500 to-cyan-500',
  'from-violet-500 via-purple-500 to-indigo-500',
];

export function FamilyCard({ family, onEnter, index }: { family: FamilyGroup; onEnter: () => void; index: number }) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer bg-zinc-900/40 border-white/5" onClick={onEnter}>
      <div className={`h-24 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} relative`}>
        <div className="absolute inset-0 bg-black/10" />
        {family.is_private && (
          <Badge className="absolute top-2 right-2 bg-black/50 text-white hover:bg-black/50 text-[10px] border-none">
            <Lock className="mr-1 h-3 w-3" />
            Privat
          </Badge>
        )}
      </div>
      <CardContent className="p-4 -mt-8 relative">
        <Avatar className="h-14 w-14 border-4 border-zinc-950 shadow-md">
          <AvatarFallback className="bg-zinc-800 text-white text-lg font-bold">
            {family.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-bold text-sm mt-2 text-white">{family.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{family.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{family.member_count}/{family.max_members}</span>
          </div>
          <Button size="sm" className="h-7 text-xs bg-rose-500 hover:bg-rose-600 text-white rounded-lg">
            Masuk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
