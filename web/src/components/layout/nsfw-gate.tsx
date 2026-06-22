'use client';

import { ShieldAlert, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { useUIStore } from '@/stores/ui-store';

export function NSFWGate() {
  const { nsfwAccepted, acceptNSFW } = useUIStore();

  const handleAccept = () => {
    acceptNSFW();
  };

  const handleLeave = () => {
    // Redirect to a safe external page
    window.location.href = 'https://www.google.com';
  };

  return (
    <Dialog open={!nsfwAccepted} onOpenChange={() => { /* Prevent closing */ }}>
      <DialogContent
        className="sm:max-w-md backdrop-blur-xl bg-background/95 border border-destructive/20"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center flex flex-col items-center gap-3">
          {/* Warning Icon */}
          <div className="flex size-16 items-center justify-center rounded-full bg-rose-500/10 dark:bg-rose-500/20 ring-2 ring-rose-500/20">
            <ShieldAlert className="size-8 text-rose-600 dark:text-rose-400" />
          </div>

          <DialogTitle className="text-xl font-bold text-foreground">
            18+ Content Warning
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground leading-relaxed text-center max-w-sm">
            This platform contains adult content including explicit material,
            private booking services, and live streams intended only for adults aged 18 and above.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/10 bg-muted/50 p-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-rose-500 mt-0.5 shrink-0">•</span>
              <span>
                All content on Javahade is intended for mature audiences only.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 mt-0.5 shrink-0">•</span>
              <span>
                By proceeding, you confirm you are at least 18 years old and that
                viewing such content is legal in your jurisdiction.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-500 mt-0.5 shrink-0">•</span>
              <span>
                You agree to abide by our community guidelines and terms of service.
              </span>
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:gap-2">
          <Button
            onClick={handleAccept}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold h-11"
          >
            I am 18+ and agree
          </Button>
          <Button
            variant="ghost"
            onClick={handleLeave}
            className="w-full text-muted-foreground hover:text-foreground h-10"
          >
            <ExternalLink className="size-4" />
            Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
