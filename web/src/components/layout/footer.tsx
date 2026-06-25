import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="w-full py-6 mt-auto border-t border-border/10 text-center text-xs text-muted-foreground flex flex-col items-center gap-3 bg-background/50 backdrop-blur-sm">
      <div className="flex flex-wrap justify-center gap-4">
        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
        <Link href="/2257" className="hover:text-foreground transition-colors">18 U.S.C. 2257 Record-Keeping</Link>
        <Link href="/dmca" className="hover:text-foreground transition-colors">DMCA Policy</Link>
      </div>
      <p>&copy; {new Date().getFullYear()} Javahade Inc. All rights reserved. Strictly 18+ Only.</p>
    </footer>
  );
}
