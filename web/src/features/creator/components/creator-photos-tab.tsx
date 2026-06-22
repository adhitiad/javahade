import React from 'react';
import { ImageIcon as PhotoIcon } from 'lucide-react';
import { PHOTO_GRADIENTS } from './creator-helpers';
import type { CreatorProfile } from '@/types';

interface CreatorPhotosTabProps {
  isSubscribed: boolean;
  creatorProfile: CreatorProfile;
  photos: any[];
}

export function CreatorPhotosTab({
  isSubscribed,
  creatorProfile,
  photos,
}: CreatorPhotosTabProps) {
  if (!isSubscribed) {
    return (
      <div className="py-16 flex flex-col items-center justify-center text-center bg-zinc-950/20 border border-white/5 rounded-3xl mt-4">
        <span className="text-6xl mb-4 opacity-70 animate-bounce">🔒</span>
        <h3 className="text-xl font-bold text-white mb-2">Konten Eksklusif</h3>
        <p className="text-gray-400 text-sm mt-2 max-w-sm">
          Berlangganan untuk melihat semua foto dan video eksklusif dari {creatorProfile.display_name}.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-4">
      {photos.map((photo, i) => (
        <button
          key={photo.id}
          className="aspect-square rounded-lg overflow-hidden relative group cursor-pointer"
        >
          <div
            className={`absolute inset-0 bg-gradient-to-br ${PHOTO_GRADIENTS[i % PHOTO_GRADIENTS.length]} opacity-40`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute bottom-0 left-0 right-0 p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <p className="text-white text-[10px] sm:text-xs truncate font-medium drop-shadow">
              {photo.caption}
            </p>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <PhotoIcon className="size-6 text-white/20" />
          </div>
        </button>
      ))}
    </div>
  );
}
