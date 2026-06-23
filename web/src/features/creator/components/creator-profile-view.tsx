"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  MessageSquare,
  ImageIcon as PhotoIcon,
  Lock,
  Star,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useWalletStore } from "@/stores/wallet-store";
import { useUIStore } from "@/stores/ui-store";
import type { Post, CreatorProfile, SubscriptionTier } from "@/types";

import { CreatorHeader } from "./creator-header";
import { CreatorPostsTab } from "./creator-posts-tab";
import { CreatorPhotosTab } from "./creator-photos-tab";
import { StarRating } from "./creator-post-card";

export default function CreatorProfileView() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showBuyChatModal, setShowBuyChatModal] = useState(false);
  const [hasChatAccess, setHasChatAccess] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Creator Profile State
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfile | null>(
    null,
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Subscription dynamic states
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [isLoadingTiers, setIsLoadingTiers] = useState(true);
  const [activeSubId, setActiveSubId] = useState<string | null>(null);

  // Moderation Report States
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("spam");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);

  const { addToast } = useUIStore();
  const router = useRouter();
  const params = useParams();
  const currentCreatorUsername = params?.username as string;
  const { fetchTransactions } = useWalletStore();

  useEffect(() => {
    if (!currentCreatorUsername) {
      router.push("/");
      return;
    }

    const loadProfileData = async () => {
      setIsLoadingProfile(true);
      setIsLoadingTiers(true);
      try {
        const { api } = await import("@/lib/api");

        // Fetch Creator Profile
        const profile = await api.get<CreatorProfile>(
          `/creators/${currentCreatorUsername}/`,
        );
        setCreatorProfile(profile);

        // Fetch posts
        try {
          const fetchedPosts = await api.get<any>(
            `/posts/creator/${currentCreatorUsername}/`,
          );
          setPosts(
            fetchedPosts.results
              ? fetchedPosts.results
              : Array.isArray(fetchedPosts)
                ? fetchedPosts
                : [],
          );
        } catch (e) {
          console.error("Gagal memuat post:", e);
        }

        // Fetch tiers
        const fetchedTiers = await api.get<SubscriptionTier[]>(
          `/subscriptions/tiers/?creator=${currentCreatorUsername}`,
        );
        setTiers(fetchedTiers);

        // Fetch my active subscriptions
        try {
          const mySubs = await api.get<any[]>("/subscriptions/my/");
          const activeSub = mySubs.find(
            (sub: any) =>
              sub.status === "active" &&
              sub.tier?.creator?.username === currentCreatorUsername,
          );
          if (activeSub) {
            setIsSubscribed(true);
            setActiveSubId(activeSub.id);
          }
        } catch (e) {
          console.error("Gagal memuat langganan aktif:", e);
        }
      } catch (err) {
        console.error("Gagal memuat data profile:", err);
        addToast("Gagal memuat profil creator", "error");
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingTiers(false);
      }
    };

    loadProfileData();
  }, [currentCreatorUsername, router, addToast]);

  if (isLoadingProfile || !creatorProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Memuat Profil...
      </div>
    );
  }

  const handleSubscribe = async (tierId: string, tierName: string) => {
    try {
      const { api } = await import("@/lib/api");
      const res = await api.post<any>("/subscriptions/subscribe/", {
        tier_id: tierId,
        auto_renew: true,
      });
      addToast(`Berhasil berlangganan ke tier ${tierName}!`, "success");
      setIsSubscribed(true);
      setActiveSubId(res.id);

      // Update wallet balance di store
      await fetchTransactions();
    } catch (err) {
      addToast((err as Error).message || "Gagal melakukan langganan.", "error");
    }
  };

  const handleCancelSubscription = async () => {
    if (!activeSubId) return;
    if (!confirm("Apakah Anda yakin ingin membatalkan langganan ini?")) return;

    try {
      const { api } = await import("@/lib/api");
      await api.delete(`/subscriptions/${activeSubId}/cancel/`);
      addToast("Langganan berhasil dibatalkan.", "success");
      setIsSubscribed(false);
      setActiveSubId(null);
    } catch (err) {
      addToast(
        (err as Error).message || "Gagal membatalkan langganan.",
        "error",
      );
    }
  };

  const handleChatClick = () => {
    if (isSubscribed || hasChatAccess) {
      addToast("Membuka chat pribadi...", "info");
      router.push("/chat");
    } else {
      setShowBuyChatModal(true);
    }
  };

  const handleBuyChatAccess = async () => {
    setIsPaying(true);
    try {
      const token = localStorage.getItem("access_token");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const domainUrl = apiBase.replace("/api/v1", "");
      const res = await fetch(
        `${domainUrl}/chat/${creatorProfile.user}/buy-access/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message || "Saldo tidak mencukupi atau terjadi kesalahan",
        );
      }

      await fetchTransactions();
      addToast(
        data.message || `Akses chat dengan @${creatorProfile.user} terbuka!`,
        "success",
      );
      setHasChatAccess(true);
      setShowBuyChatModal(false);
    } catch (err) {
      addToast(
        (err as Error).message || "Gagal memproses pembayaran chat.",
        "error",
      );
    } finally {
      setIsPaying(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportingPostId) return;
    setIsSubmittingReport(true);
    try {
      const { api } = await import("@/lib/api");
      await api.post("/moderation/reports/create/", {
        content_type: "post",
        object_id: reportingPostId,
        reason: selectedReportReason,
        description: reportDescription,
      });
      addToast(
        "Laporan Anda berhasil dikirim dan akan segera ditinjau.",
        "success",
      );
      setShowReportDialog(false);
      setReportDescription("");
      setReportingPostId(null);
    } catch (err) {
      addToast((err as Error).message || "Gagal mengirim laporan.", "error");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CreatorHeader
        creatorProfile={creatorProfile}
        isSubscribed={isSubscribed}
        isLoadingTiers={isLoadingTiers}
        tiers={tiers}
        handleSubscribe={handleSubscribe}
        handleCancelSubscription={handleCancelSubscription}
        handleChatClick={handleChatClick}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Tabs Section */}
        <Tabs defaultValue="posts" className="w-full pb-12">
          <TabsList className="w-full sm:w-auto mt-4">
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="size-4" />
              Postingan
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5">
              <PhotoIcon className="size-4" />
              Foto
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-1.5">
              <MessageSquare className="size-4" />
              Ulasan
            </TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <CreatorPostsTab
              isSubscribed={isSubscribed}
              creatorProfile={creatorProfile}
              posts={posts}
              setReportingPostId={setReportingPostId}
              setShowReportDialog={setShowReportDialog}
            />
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <CreatorPhotosTab
              isSubscribed={isSubscribed}
              creatorProfile={creatorProfile}
              photos={photos}
            />
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="flex flex-col gap-3 mt-4">
              {/* Rating Summary */}
              <Card className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold">
                      {creatorProfile?.rating?.toFixed(1) ?? "0.0"}
                    </div>
                    <StarRating rating={creatorProfile?.rating ?? 0} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {creatorProfile?.review_count ?? 0} ulasan
                    </p>
                  </div>
                  <Separator orientation="vertical" className="h-16" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    {[5, 4, 3, 2, 1].map((stars) => {
                      const percentages: Record<number, number> = {
                        5: 72,
                        4: 18,
                        3: 6,
                        2: 3,
                        1: 1,
                      };
                      return (
                        <div key={stars} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-3">
                            {stars}
                          </span>
                          <Star className="size-3 text-amber-500 fill-amber-500" />
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all"
                              style={{ width: `${percentages[stars]}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">
                            {percentages[stars]}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              {/* Review List */}
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="size-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Belum ada ulasan</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Buy Chat Modal */}
      <Dialog open={showBuyChatModal} onOpenChange={setShowBuyChatModal}>
        <DialogContent className="glass border border-white/10 max-w-sm rounded-3xl bg-zinc-950/90 text-white">
          <DialogHeader className="items-center text-center">
            <div className="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mb-4 text-pink-400">
              <Lock className="size-8" />
            </div>
            <DialogTitle className="text-xl font-bold">
              Buka Kunci Obrolan Pribadi
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm mt-2">
              {creatorProfile.display_name} memungut biaya satu kali untuk
              membuka akses chat pribadi.
              <br />
              <span className="text-xs text-gray-500">
                (Bebas biaya jika Anda berlangganan)
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="bg-black/50 rounded-2xl p-4 my-4 text-center">
            <div className="text-sm text-gray-400 mb-1">Harga Tiket Chat</div>
            <div className="text-3xl font-black text-white">Rp 50.000</div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              className="w-full py-6 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-pink-500/25 transition-all"
              onClick={handleBuyChatAccess}
              disabled={isPaying}
            >
              {isPaying ? "Memproses..." : "Bayar & Mulai Chat"}
            </Button>
            <Button
              variant="ghost"
              className="w-full py-4 text-gray-300 hover:text-white"
              onClick={() => setShowBuyChatModal(false)}
            >
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Post Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="glass border border-white/10 max-w-md rounded-3xl bg-zinc-950/90 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Laporkan Postingan
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Mengapa Anda melaporkan postingan ini? Laporan Anda bersifat
              anonim.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Alasan Pelaporan
              </label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "spam", label: "Spam / Iklan tidak diinginkan" },
                  { value: "harassment", label: "Pelecehan / Perundungan" },
                  {
                    value: "inappropriate",
                    label: "Konten Tidak Pantas / Seksual",
                  },
                  { value: "copyright", label: "Pelanggaran Hak Cipta" },
                  { value: "impersonation", label: "Peniruan Identitas" },
                  { value: "other", label: "Lainnya" },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center justify-between ${
                      selectedReportReason === r.value
                        ? "border-red-500 bg-red-500/10 text-white"
                        : "border-white/5 bg-white/5 text-gray-300 hover:bg-white/10"
                    }`}
                    onClick={() => setSelectedReportReason(r.value)}
                  >
                    <span>{r.label}</span>
                    {selectedReportReason === r.value && (
                      <span className="size-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Keterangan Tambahan (Opsional)
              </label>
              <textarea
                className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-white/5 bg-white/5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-white/20 transition-all resize-none"
                placeholder="Berikan detail tambahan tentang laporan Anda..."
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button
              variant="ghost"
              className="flex-1 py-4 text-gray-300 hover:text-white"
              onClick={() => {
                setShowReportDialog(false);
                setReportingPostId(null);
              }}
            >
              Batal
            </Button>
            <Button
              className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all"
              onClick={handleReportSubmit}
              disabled={isSubmittingReport}
            >
              {isSubmittingReport ? "Mengirim..." : "Kirim Laporan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
