import { Footer } from "@/components/layout/footer";
import { NSFWGate } from "@/components/layout";
import { useUIStore } from "@/stores/ui-store";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { nsfwAccepted } = useUIStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-background">
      {!nsfwAccepted && <NSFWGate />}
      <div className="flex-1 w-full flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      <Footer />
    </div>
  );
}
