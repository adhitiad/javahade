import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <h1 className="text-7xl md:text-9xl font-extrabold bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent mb-4">
        404
      </h1>
      <h2 className="text-2xl md:text-3xl font-semibold mb-4">
        Halaman Tidak Ditemukan
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto text-sm md:text-base">
        Maaf, halaman yang Anda tuju sepertinya tidak ada, sudah dihapus, atau Anda salah mengetikkan URL.
      </p>
      <Link href="/">
        <Button size="lg" className="bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white border-0 shadow-lg hover:shadow-xl transition-all">
          Kembali ke Beranda
        </Button>
      </Link>
    </div>
  );
}
