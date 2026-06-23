"use client";

import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBookingStore } from '@/stores/booking-store';
import { formatDate, getStatusBadge } from './booking-helpers';

export function BookingHistoryTab() {
  const { myBookings, fetchMyBookings, confirmBooking, cancelBooking } = useBookingStore();

  useEffect(() => {
    fetchMyBookings();
  }, [fetchMyBookings]);

  if (myBookings.length === 0) {
    return <p className="text-muted-foreground">Anda belum memiliki booking.</p>;
  }

  return (
    <div className="space-y-4">
      {myBookings.map(b => {
        const badge = getStatusBadge(b.status);
        return (
          <Card key={b.id}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Booking #{b.id.substring(0, 8)}</p>
                <p className="text-sm text-muted-foreground">Dibuat: {formatDate(b.created_at)}</p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className={badge.className}>{badge.label}</Badge>
                {b.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => confirmBooking(b.id)}>Konfirmasi</Button>
                    <Button size="sm" variant="destructive" onClick={() => cancelBooking(b.id)}>Batal</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
