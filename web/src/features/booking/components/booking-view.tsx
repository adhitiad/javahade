'use client';

import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  UserCheck
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { BookingHostTab } from './booking-host-tab';
import { BookingHistoryTab } from './booking-history-tab';
import { BookingSlotsTab } from './booking-slots-tab';

interface BookingViewProps {
  userRole?: 'user' | 'host';
}

export default function BookingView({ userRole = 'user' }: BookingViewProps) {
  const [activeTab, setActiveTab] = useState('pesan-host');

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="size-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking</h1>
          <p className="text-muted-foreground text-sm">Pesan host dan kelola booking Anda</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="pesan-host" className="flex-1 min-w-[120px]">
            <UserCheck className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Pesan Host</span>
            <span className="sm:hidden">Host</span>
          </TabsTrigger>
          <TabsTrigger value="booking-saya" className="flex-1 min-w-[120px]">
            <CalendarDays className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Booking Saya</span>
            <span className="sm:hidden">Saya</span>
          </TabsTrigger>
          {userRole === 'host' && (
            <TabsTrigger value="kelola-slot" className="flex-1 min-w-[120px]">
              <Plus className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Kelola Slot</span>
              <span className="sm:hidden">Slot</span>
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="pesan-host" className="mt-0">
            <BookingHostTab />
          </TabsContent>

          <TabsContent value="booking-saya" className="mt-0">
            <BookingHistoryTab />
          </TabsContent>

          {userRole === 'host' && (
            <TabsContent value="kelola-slot" className="mt-0">
              <BookingSlotsTab />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
