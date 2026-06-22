'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Lock, Gem, ShieldCheck, Video, ArrowRight, Star } from 'lucide-react';

export default function LandingView() {
  const router = useRouter();

  return (
    <div className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden bg-background text-foreground">
      {/* Background Decorative Glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-rose-600/10 rounded-full blur-[100px] md:blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-indigo-600/10 rounded-full blur-[100px] md:blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-12 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left: Hero Copy */}
          <div className="text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-[0_0_15px_rgba(244,63,94,0.15)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="text-xs font-bold text-rose-300 tracking-wider uppercase">
                Platform Eksklusif & Privat VIP
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-none text-white">
              Akses{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-fuchsia-500 to-indigo-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                Sangat Privat
              </span>
              <br />
              ke Host Favoritmu.
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
              Daftar sekarang untuk mendapatkan hak istimewa menyewa (<b>Booking</b>) sesi <i>Private Live</i>, menikmati konten rahasia, dan berinteraksi 1-on-1 dengan Kreator impian Anda.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start pt-2">
              <Button
                onClick={() => router.push('/register')}
                size="lg"
                className="w-full sm:w-auto h-14 px-8 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-full hover:from-rose-400 hover:to-pink-500 transition-transform transform hover:-translate-y-0.5 shadow-[0_0_30px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 group"
              >
                <span>Daftar Sekarang (Gratis)</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                onClick={() => router.push('/login')}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-14 px-8 bg-white/5 text-gray-300 font-bold rounded-full border border-white/10 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-md"
              >
                Sudah Punya Akun? Masuk
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-8 pt-4">
              <div className="text-left border-l-4 border-rose-500 pl-4">
                <p className="text-2xl sm:text-3xl font-black text-white">100%</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Privasi Aman</p>
              </div>
              <div className="text-left border-l-4 border-indigo-500 pl-4">
                <p className="text-2xl sm:text-3xl font-black text-white">5K+</p>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Host Terverifikasi</p>
              </div>
            </div>
          </div>

          {/* Right: Hero Visual */}
          <div className="hidden lg:block relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-indigo-500/20 rounded-[3rem] blur-3xl transform rotate-3" />
            <div className="bg-card/40 backdrop-blur-xl border border-white/10 rounded-[3rem] p-4 relative z-10 transform -rotate-1 hover:rotate-0 transition-all duration-500 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <div className="rounded-3xl overflow-hidden bg-zinc-950 aspect-[4/5] relative flex flex-col justify-end p-8">
                {/* Visual Backdrop Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/40 to-transparent z-10" />
                
                {/* Placeholder Image using CSS gradient pattern for high aesthetic */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-zinc-900/60 to-pink-900/40 opacity-80" />
                
                {/* Floating Exclusive Tag */}
                <div className="absolute top-6 right-6 z-20">
                  <span className="px-3.5 py-1.5 bg-rose-500/80 backdrop-blur-md border border-rose-400/30 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-lg shadow-rose-500/20">
                    Eksklusif
                  </span>
                </div>

                {/* Simulated Creator Info */}
                <div className="relative z-20 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full border-2 border-rose-500 bg-gradient-to-tr from-rose-400 to-indigo-500 flex items-center justify-center text-2xl shadow-lg shadow-rose-500/30">
                      💋
                    </div>
                    <div>
                      <div className="text-white font-bold text-lg flex items-center gap-1">
                        Alice Wonderland 
                        <span className="inline-flex items-center justify-center bg-blue-500 text-white rounded-full p-0.5 size-4">
                          <CheckIcon className="size-3 text-white" />
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-medium">@alice_wonder</p>
                    </div>
                  </div>
                  
                  {/* Action buttons inside mockup */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => router.push('/login')}
                      className="w-full py-3 px-5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl flex justify-between items-center transition-colors shadow-lg shadow-emerald-500/20"
                    >
                      <span className="text-sm">Pesan Sesi Private</span>
                      <span className="text-xs bg-black/20 px-2 py-0.5 rounded">$50/jam</span>
                    </button>
                    <button
                      onClick={() => router.push('/login')}
                      className="w-full py-3 px-5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl border border-white/10 flex justify-between items-center transition-colors"
                    >
                      <span className="text-sm">Berlangganan VIP</span>
                      <span className="text-xs bg-white/10 px-2 py-0.5 rounded">$9.99/bln</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Floating Live Badge */}
            <div className="absolute -right-8 top-1/3 bg-zinc-950/80 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl z-30 animate-bounce" style={{ animationDuration: '4s' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500 flex items-center justify-center animate-pulse shadow-lg shadow-rose-500/30">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">LIVE PRIVATE NOW</p>
                  <p className="text-sm font-bold text-white">Ruangan Penuh: 5/5</p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 relative z-10 border-t border-white/10">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Kenapa Anda Harus Bergabung?</h2>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto font-medium">
            Buka pintu eksklusif untuk pengalaman yang belum pernah Anda rasakan sebelumnya bersama Host unggulan kami.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-card/30 backdrop-blur-md p-8 rounded-[2rem] text-center border border-white/5 hover:border-rose-500/30 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/20 text-3xl transform group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Lock className="size-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Ruang Private 1-on-1</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              Lakukan <b className="text-white">Booking</b> sesi tayangan rahasia yang hanya bisa dihadiri oleh Anda dan Host. Privasi 100% dijamin aman.
            </p>
          </div>
          
          {/* Feature 2 */}
          <div className="bg-card/30 backdrop-blur-md p-8 rounded-[2rem] text-center border border-white/5 hover:border-purple-500/30 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20 text-3xl transform group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <Gem className="size-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Akses Konten VIP</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              Dapatkan foto dan video super eksklusif dengan membeli paket langganan atau mengakses konten berbayar dari idola Anda.
            </p>
          </div>
          
          {/* Feature 3 */}
          <div className="bg-card/30 backdrop-blur-md p-8 rounded-[2rem] text-center border border-white/5 hover:border-indigo-500/30 transition-all duration-300 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 text-3xl transform group-hover:scale-110 group-hover:rotate-6 transition-transform">
              <ShieldCheck className="size-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Komunitas Terverifikasi</h3>
            <p className="text-sm text-gray-400 leading-relaxed font-medium">
              Semua Host melewati proses KYC (Verifikasi Identitas) bertenaga AI kelas dunia untuk menjamin keabsahan kreator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
