"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertCircle className="h-6 w-6" />
              <CardTitle>Terjadi Kesalahan Sistem</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="bg-background">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error Detail</AlertTitle>
              <AlertDescription className="break-all font-mono text-xs mt-2 opacity-80">
                {error.message || "Unknown error occurred"}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground mt-4">
              Sistem mendeteksi adanya anomali. Silakan coba muat ulang halaman ini. Jika masalah berlanjut, hubungi dukungan teknis.
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => reset()} 
              variant="default" 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Coba Lagi
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
