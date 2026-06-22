export function formatCount(n: number | undefined): string {
  if (n === undefined) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function getInitials(name: string | undefined): string {
  if (!name) return "??";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const PHOTO_GRADIENTS = [
  "from-rose-300 via-pink-400 to-fuchsia-500",
  "from-amber-300 via-orange-400 to-red-400",
  "from-emerald-300 via-teal-400 to-cyan-500",
  "from-violet-300 via-purple-400 to-indigo-500",
  "from-lime-300 via-green-400 to-emerald-500",
  "from-sky-300 via-blue-400 to-indigo-400",
  "from-fuchsia-300 via-pink-400 to-rose-500",
  "from-teal-300 via-cyan-400 to-sky-500",
  "from-orange-300 via-amber-400 to-yellow-400",
];

export const MEDIA_GRADIENTS = [
  "from-rose-400 via-fuchsia-500 to-purple-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-amber-400 via-orange-500 to-red-500",
  "from-sky-400 via-blue-500 to-indigo-600",
];
