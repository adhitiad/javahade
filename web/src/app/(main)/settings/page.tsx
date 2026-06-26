'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import {
  UserCircle,
  ShieldCheck,
  Wallet,
  Users,
  Palette,
  Bell,
  Camera,
  CheckCircle2,
  Key
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const categories = [
  { id: 'profile', label: 'Profil', icon: UserCircle, description: 'Kelola informasi publik Anda' },
  { id: 'security', label: 'Keamanan', icon: ShieldCheck, description: 'Password dan autentikasi' },
  { id: 'payment', label: 'Pembayaran', icon: Wallet, description: 'Metode dan riwayat transaksi' },
  { id: 'privacy', label: 'Privasi', icon: Users, description: 'Kontrol data dan visibilitas' },
  { id: 'appearance', label: 'Tampilan', icon: Palette, description: 'Tema dan preferensi UI' },
  { id: 'notifications', label: 'Notifikasi', icon: Bell, description: 'Atur pemberitahuan Anda' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl min-h-[80vh]">
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
        >
          Pengaturan
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-muted-foreground mt-2 text-lg"
        >
          Sesuaikan pengalaman dan kelola akun Anda di satu tempat.
        </motion.p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {categories.map((category) => {
              const Icon = category.icon;
              const isActive = activeTab === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300
                    whitespace-nowrap md:whitespace-normal text-left
                    ${isActive 
                      ? 'text-primary bg-primary/10 shadow-sm' 
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'}
                  `}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-medium">{category.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 rounded-xl border-2 border-primary/20 pointer-events-none"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="space-y-6"
            >
              {activeTab === 'profile' && <ProfileSettings />}
              {activeTab === 'security' && <SecuritySettings />}
              {activeTab === 'payment' && <PaymentSettings />}
              {activeTab === 'privacy' && <PrivacySettings />}
              {activeTab === 'appearance' && <AppearanceSettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    gender: user?.gender || 'U',
    date_of_birth: user?.date_of_birth || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real scenario, you'd call django.patch('/users/me/', formData) here
      // For now, we'll update the store optimistically
      updateUser(formData);
      toast.success('Profil berhasil diperbarui!');
    } catch (error) {
      toast.error('Gagal memperbarui profil.');
    } finally {
      setIsSaving(false);
    }
  };

  // Extract initials for fallback
  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'U';

  return (
    <Card className="border-border/50 shadow-lg overflow-hidden bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Profil Publik</CardTitle>
        <CardDescription>Informasi ini akan ditampilkan ke pengguna lain.</CardDescription>
      </CardHeader>
      <Separator className="bg-primary/10" />
      <CardContent className="space-y-8 pt-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="relative group cursor-pointer">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl transition-transform duration-300 group-hover:scale-105">
              <AvatarImage src={user?.avatar || "https://i.pravatar.cc/150"} alt="Profile" />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1/4 translate-y-1/4 hover:scale-110">
              <Camera className="h-4 w-4" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-lg">Foto Profil</h3>
            <p className="text-sm text-muted-foreground">JPG, GIF atau PNG. Maks 2MB.</p>
            <div className="flex gap-3 mt-2">
              <Button size="sm" variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors">Ubah Foto</Button>
              {user?.avatar && (
                <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10">Hapus</Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-muted-foreground font-medium">@</span>
              <Input id="username" value={formData.username} onChange={handleChange} className="pl-8 bg-background/50 focus-visible:ring-primary/50" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Username unik Anda di platform.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={formData.email} onChange={handleChange} className="bg-background/50 focus-visible:ring-primary/50" />
            {user?.is_verified && <p className="text-xs text-green-500 mt-1">✓ Email terverifikasi</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Jenis Kelamin</Label>
            <select
              id="gender"
              value={formData.gender}
              onChange={handleChange}
              className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="M">Laki-laki (M)</option>
              <option value="F">Perempuan (F)</option>
              <option value="U">Rahasia / Lainnya (U)</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Tanggal Lahir</Label>
            <Input id="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} className="bg-background/50 focus-visible:ring-primary/50" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea 
              id="bio" 
              value={formData.bio}
              onChange={handleChange}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              placeholder="Tulis sedikit tentang diri Anda..."
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 py-5 px-6 flex justify-end gap-3 border-t border-primary/10">
        <Button variant="outline" className="hover:bg-background">Batal</Button>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2 shadow-md hover:shadow-lg transition-all">
          <CheckCircle2 className="h-4 w-4" />
          {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Key className="h-5 w-5" />
            </div>
            Keamanan Akun
          </CardTitle>
          <CardDescription>Kelola password dan cara Anda login.</CardDescription>
        </CardHeader>
        <Separator className="bg-primary/10" />
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-4 max-w-md">
            {/* Hidden field to capture password manager's username autofill and prevent it from filling the Navbar Search box */}
            <input type="text" name="username" autoComplete="username" className="hidden" aria-hidden="true" />
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Password Saat Ini</Label>
              <Input id="currentPassword" type="password" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password Baru</Label>
              <Input id="newPassword" type="password" className="bg-background/50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
              <Input id="confirmPassword" type="password" className="bg-background/50" />
            </div>
            <Button className="mt-4 w-full sm:w-auto">Update Password</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
              <ShieldCheck className="h-5 w-5" />
            </div>
            Autentikasi Dua Faktor (2FA)
          </CardTitle>
          <CardDescription>Tambahkan lapis keamanan ekstra ke akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 border border-primary/10 rounded-xl bg-background/50 gap-4">
            <div className="space-y-1">
              <p className="font-semibold">Gunakan Aplikasi Authenticator</p>
              <p className="text-sm text-muted-foreground">Google Authenticator, Authy, dll.</p>
            </div>
            <Button variant="outline" className="shrink-0 hover:bg-primary hover:text-primary-foreground">Aktifkan 2FA</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20 shadow-lg bg-destructive/5">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-destructive">Hapus Akun</h3>
              <p className="text-sm text-muted-foreground">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
            </div>
            <Button variant="destructive" className="shrink-0 shadow-md">Hapus Akun Permanen</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentSettings() {
  return (
    <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl min-h-[400px] flex flex-col">
      <CardHeader>
        <CardTitle className="text-2xl">Metode Pembayaran</CardTitle>
        <CardDescription>Kelola kartu dan dompet digital Anda.</CardDescription>
      </CardHeader>
      <Separator className="bg-primary/10" />
      <CardContent className="flex-1 flex flex-col items-center justify-center p-10 space-y-6">
        <div className="p-6 bg-primary/5 rounded-full ring-8 ring-primary/5">
          <Wallet className="h-16 w-16 text-primary/40" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Belum ada metode pembayaran</h3>
          <p className="text-muted-foreground max-w-md mx-auto">Tambahkan kartu kredit/debit atau dompet digital untuk mempermudah transaksi Anda di masa depan.</p>
        </div>
        <Button 
          size="lg" 
          className="shadow-lg hover:shadow-xl transition-all"
          onClick={() => {
            toast.info("Sistem saat ini menggunakan Dompet Finansial (Wallet). Silakan akses menu Dompet untuk top-up saldo.");
          }}
        >
          Tambah Metode Pembayaran
        </Button>
      </CardContent>
    </Card>
  );
}

function PrivacySettings() {
  return (
    <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Privasi & Data</CardTitle>
        <CardDescription>Kendalikan bagaimana data Anda digunakan dan dibagikan.</CardDescription>
      </CardHeader>
      <Separator className="bg-primary/10" />
      <CardContent className="space-y-6 pt-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="space-y-1 pr-6">
              <Label className="text-base font-semibold">Profil Publik</Label>
              <p className="text-sm text-muted-foreground">Izinkan orang lain menemukan profil Anda di pencarian.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-primary/5" />
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="space-y-1 pr-6">
              <Label className="text-base font-semibold">Status Online</Label>
              <p className="text-sm text-muted-foreground">Tampilkan indikator hijau saat Anda sedang aktif.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator className="bg-primary/5" />
          <div className="flex items-center justify-between p-4 rounded-xl hover:bg-muted/50 transition-colors">
            <div className="space-y-1 pr-6">
              <Label className="text-base font-semibold">Bagikan Data Analitik</Label>
              <p className="text-sm text-muted-foreground">Bantu kami meningkatkan layanan secara anonim.</p>
            </div>
            <Switch />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings() {
  return (
    <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Tampilan</CardTitle>
        <CardDescription>Sesuaikan tema aplikasi agar nyaman di mata Anda.</CardDescription>
      </CardHeader>
      <Separator className="bg-primary/10" />
      <CardContent className="space-y-8 pt-6">
        <div className="space-y-4">
          <Label className="text-lg font-semibold">Tema Warna</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['Light', 'Dark', 'System'].map((theme) => (
              <button key={theme} className="group relative rounded-xl border-2 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent">
                <div className={`h-32 w-full rounded-xl border border-border/50 shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:border-primary/50 ${
                  theme === 'Light' ? 'bg-slate-50' : 
                  theme === 'Dark' ? 'bg-slate-950' : 
                  'bg-gradient-to-tr from-slate-100 to-slate-900'
                }`}>
                  {/* Mock UI inside theme selector */}
                  <div className="p-3 space-y-2">
                    <div className={`h-4 w-1/3 rounded ${theme === 'Light' ? 'bg-slate-200' : theme === 'Dark' ? 'bg-slate-800' : 'bg-slate-500/50'}`} />
                    <div className={`h-12 w-full rounded-md ${theme === 'Light' ? 'bg-white shadow-sm' : theme === 'Dark' ? 'bg-slate-900 shadow-sm' : 'bg-white/10 backdrop-blur-sm'}`} />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between px-1">
                  <span className="text-sm font-medium">{theme}</span>
                  {theme === 'System' && <div className="h-4 w-4 rounded-full bg-primary" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationSettings() {
  return (
    <Card className="border-border/50 shadow-lg bg-card/60 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Notifikasi</CardTitle>
        <CardDescription>Pilih pemberitahuan mana yang penting bagi Anda.</CardDescription>
      </CardHeader>
      <Separator className="bg-primary/10" />
      <CardContent className="space-y-8 pt-6">
        <div className="space-y-5">
          <h3 className="font-semibold text-lg text-primary">Email</h3>
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="space-y-1">
                <Label className="font-medium">Promosi & Penawaran</Label>
                <p className="text-sm text-muted-foreground">Info diskon eksklusif dan rilis fitur baru.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="space-y-1">
                <Label className="font-medium">Pembaruan Akun</Label>
                <p className="text-sm text-muted-foreground">Aktivitas login, reset password, dan info keamanan.</p>
              </div>
              <Switch defaultChecked disabled />
            </div>
          </div>
        </div>
        
        <div className="space-y-5 pt-2">
          <h3 className="font-semibold text-lg text-primary">Push Notification</h3>
          <div className="space-y-4 pl-4 border-l-2 border-primary/20">
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="space-y-1">
                <Label className="font-medium">Pesan Langsung</Label>
                <p className="text-sm text-muted-foreground">Saat seseorang mengirim Anda Direct Message.</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="space-y-1">
                <Label className="font-medium">Aktivitas Jaringan</Label>
                <p className="text-sm text-muted-foreground">Pemberitahuan like, komentar, dan mention.</p>
              </div>
              <Switch />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
