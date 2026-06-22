export const AVATAR_COLORS = [
  'bg-rose-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500',
  'bg-violet-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500',
];

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-[11px] text-muted-foreground">Sedang mengetik...</span>
    </div>
  );
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (isToday) return time;
  if (isYesterday) return `Kemarin, ${time}`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + `, ${time}`;
}

export function formatConversationTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHr < 24) return `${diffHr} jam lalu`;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
