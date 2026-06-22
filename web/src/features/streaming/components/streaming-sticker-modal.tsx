'use client';

import React, { useState } from 'react';

export interface Sticker {
  name: string;
  url: string;
  price: number;
}

export interface StickerPack {
  key: string;
  title: string;
  rangeText: string;
  stickers: Sticker[];
}

export const STICKER_PACKS: StickerPack[] = [
  {
    key: 'kiss',
    title: '💋 Kiss Me',
    rangeText: '$0.50 - $0.95',
    stickers: Array.from({ length: 10 }, (_, i) => ({
      name: `sticker_${i + 1}`,
      url: `https://s3.getstickerpack.com/storage/uploads/sticker-pack/kiss-me-3deluxe/sticker_${i + 1}.webp?d=200x200`,
      price: 0.50 + i * 0.05
    }))
  },
  {
    key: 'emoji',
    title: '😈 Emoji RMX',
    rangeText: '$1.00 - $2.49',
    stickers: [
      { name: 'sticker_1', price: 1.00 },
      { name: 'sticker_2', price: 1.15 },
      { name: 'sticker_3', price: 1.30 },
      { name: 'sticker_4', price: 1.45 },
      { name: 'sticker_5', price: 1.60 },
      { name: 'sticker_6', price: 1.75 },
      { name: 'sticker_7', price: 1.90 },
      { name: 'sticker_8', price: 2.05 },
      { name: 'sticker_9', price: 2.25 },
      { name: 'sticker_10', price: 2.49 }
    ].map(s => ({
      ...s,
      url: `https://s3.getstickerpack.com/storage/uploads/sticker-pack/mk-rmx-emoji-sex-part-1-1/${s.name}.webp?d=200x200`
    }))
  },
  {
    key: 'blondenun',
    title: '👼 BlondeNun',
    rangeText: '$2.50 - $4.99',
    stickers: [
      { name: 'sticker_1', price: 2.50 },
      { name: 'sticker_2', price: 2.75 },
      { name: 'sticker_3', price: 3.00 },
      { name: 'sticker_4', price: 3.25 },
      { name: 'sticker_5', price: 3.50 },
      { name: 'sticker_6', price: 3.75 },
      { name: 'sticker_7', price: 4.00 },
      { name: 'sticker_8', price: 4.25 },
      { name: 'sticker_9', price: 4.50 },
      { name: 'sticker_10', price: 4.99 }
    ].map(s => ({
      ...s,
      url: `https://s3.getstickerpack.com/storage/uploads/sticker-pack/blondenun-part-1/${s.name}.webp?d=200x200`
    }))
  },
  {
    key: 'morgana',
    title: '🧙‍♀️ Morgana',
    rangeText: '$5.00 - $9.99',
    stickers: [
      { name: 'sticker_1', price: 5.00 },
      { name: 'sticker_2', price: 5.50 },
      { name: 'sticker_3', price: 6.00 },
      { name: 'sticker_4', price: 6.50 },
      { name: 'sticker_5', price: 7.00 },
      { name: 'sticker_6', price: 7.50 },
      { name: 'sticker_7', price: 8.00 },
      { name: 'sticker_8', price: 8.50 },
      { name: 'sticker_9', price: 9.00 },
      { name: 'sticker_10', price: 9.99 }
    ].map(s => ({
      ...s,
      url: `https://s3.getstickerpack.com/storage/uploads/sticker-pack/morgana-the-witch-1/${s.name}.webp?d=200x200`
    }))
  }
];

export function StickerModal({
  open,
  onClose,
  onSendSticker,
}: {
  open: boolean;
  onClose: () => void;
  onSendSticker: (url: string, price: number) => void;
}) {
  const [activePackKey, setActivePackKey] = useState('kiss');

  if (!open) return null;

  const activePack = STICKER_PACKS.find(p => p.key === activePackKey) || STICKER_PACKS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl bg-gray-950/90 border border-white/10 rounded-3xl overflow-hidden transform transition-all max-h-[80vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-white/10 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🎁</span> Pilih Stiker Gift
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">
            &times;
          </button>
        </div>

        <div className="flex border-b border-white/5 flex-shrink-0 overflow-x-auto bg-gray-900/50">
          {STICKER_PACKS.map((pack) => (
            <button
              key={pack.key}
              onClick={() => setActivePackKey(pack.key)}
              className={`px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activePackKey === pack.key
                  ? 'text-white border-indigo-500 bg-white/5'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              {pack.title}
              <span className="text-emerald-400 text-xs font-normal">({pack.rangeText})</span>
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto flex-1 bg-gray-950/40">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
            {activePack.stickers.map((sticker) => (
              <button
                key={sticker.name}
                onClick={() => {
                  onSendSticker(sticker.url, sticker.price);
                  onClose();
                }}
                className="relative group p-1 bg-white/[0.02] border border-white/5 hover:border-white/20 rounded-2xl flex flex-col items-center justify-center transition-all hover:scale-105"
              >
                <img
                  src={sticker.url}
                  alt={sticker.name}
                  className="w-16 h-16 object-contain rounded-xl hover:scale-110 transition-transform cursor-pointer"
                  loading="lazy"
                />
                <span className="absolute -bottom-1 right-1 bg-black/80 text-emerald-400 text-[10px] px-1 rounded font-bold">
                  ${sticker.price.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-white/10 flex justify-between items-center bg-gray-900/50">
          <p className="text-xs text-gray-500">Saldo dari stiker gift akan dikirimkan langsung ke Host.</p>
        </div>
      </div>
    </div>
  );
}
