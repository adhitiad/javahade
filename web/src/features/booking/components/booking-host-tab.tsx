import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useBookingStore } from '@/stores/booking-store';
import { api } from '@/lib/api';
import type { CreatorProfile } from '@/types';
import { formatDate, formatCurrency } from './booking-helpers';

export function BookingHostTab() {
  const { slots, fetchSlots, reserveSlot, fetchMyBookings } = useBookingStore();
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [selectedCreator, setSelectedCreator] = useState<CreatorProfile | null>(null);

  useEffect(() => {
    api.get('/creators/').then((res: any) => setCreators(res.results || res)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedCreator) {
      fetchSlots(selectedCreator.id);
    }
  }, [selectedCreator, fetchSlots]);

  const handleBook = async (slotId: string) => {
    try {
      await reserveSlot(slotId);
      alert('Berhasil memesan slot!');
      fetchMyBookings();
    } catch (err: any) {
      alert('Gagal memesan: ' + err.message);
    }
  };

  if (!selectedCreator) {
    return (
      <Carousel opts={{ align: "start" }} className="w-full">
        <CarouselContent className="-ml-2 md:-ml-4">
          {creators.map(c => (
            <CarouselItem key={c.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col" onClick={() => setSelectedCreator(c)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-12 border">
                      <AvatarImage src={c.avatar} />
                      <AvatarFallback>{c.display_name?.charAt(0) || c.user?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{c.display_name}</CardTitle>
                      <CardDescription>{c.category}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button className="w-full" variant="outline">Lihat Jadwal</Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <div className="hidden md:block">
          <CarouselPrevious className="left-0 -ml-12" />
          <CarouselNext className="right-0 -mr-12" />
        </div>
      </Carousel>
    );
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={() => setSelectedCreator(null)}>
        &larr; Kembali ke Daftar Host
      </Button>
      <h3 className="text-xl font-semibold">Jadwal Tersedia - {selectedCreator.display_name}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {slots.length === 0 && <p className="text-muted-foreground">Tidak ada slot tersedia saat ini.</p>}
        {slots.map(slot => (
          <Card key={slot.id}>
            <CardHeader>
              <CardTitle className="text-lg">{slot.title}</CardTitle>
              <CardDescription>{slot.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Mulai:</span>
                <span className="font-medium">{formatDate(slot.start_time)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Selesai:</span>
                <span className="font-medium">{formatDate(slot.end_time)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Harga:</span>
                <span className="font-medium text-primary">{formatCurrency(slot.price, slot.currency)}</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => handleBook(slot.id)} disabled={slot.status === 'cancelled' || slot.status === 'completed'}>
                Pesan Slot
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
