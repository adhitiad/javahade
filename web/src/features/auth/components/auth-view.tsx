'use client';

import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthLoginTab } from './auth-login-tab';
import { AuthRegisterTab } from './auth-register-tab';

// ---- Main Auth View ----
export default function AuthView({ initialTab = 'login' }: { initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 shadow-lg">
            <span className="text-2xl font-bold text-white">J</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Javahade</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform creator terbaik Indonesia</p>
        </div>

        {/* Auth Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg">
              {activeTab === 'login' ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}
            </CardTitle>
            <CardDescription className="text-center">
              {activeTab === 'login'
                ? 'Masukkan email dan password untuk melanjutkan'
                : 'Isi data berikut untuk membuat akun Javahade'}
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6 pt-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted h-10">
                <TabsTrigger value="login" className="text-xs">
                  Masuk
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs">
                  Daftar
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0 outline-none">
                <AuthLoginTab onSwitchTab={setActiveTab} />
              </TabsContent>

              <TabsContent value="register" className="mt-0 outline-none">
                <AuthRegisterTab onSwitchTab={setActiveTab} />
              </TabsContent>
            </Tabs>
          </div>
        </Card>

        {/* Footer info */}
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>© 2026 Javahade. Hak cipta dilindungi.</p>
        </div>
      </div>
    </div>
  );
}