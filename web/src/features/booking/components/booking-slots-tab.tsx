import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function BookingSlotsTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buat Slot Baru</CardTitle>
        <CardDescription>Tambahkan jadwal ketersediaan Anda untuk dipesan.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">Fungsi tambah slot terhubung ke useBookingStore().createSlot.</p>
      </CardContent>
    </Card>
  );
}
