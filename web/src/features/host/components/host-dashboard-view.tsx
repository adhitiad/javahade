"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, DollarSign, Activity, Eye, TrendingUp } from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { api } from "@/lib/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
);

export default function HostDashboardView() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalEarningsIdr: 0,
    totalEarningsUsd: 0,
    bountyCompleted: 0,
    bountyTotal: 0,
    bountyEarnings: 0,
  });

  const [chartData, setChartData] = useState({
    revenue: { labels: [] as string[], data: [] as number[] },
    gifts: { labels: [] as string[], data: [] as number[] }
  });

  const revenueData = {
    labels: chartData.revenue.labels,
    datasets: [
      {
        fill: true,
        label: "Pendapatan (IDR)",
        data: chartData.revenue.data,
        borderColor: "rgb(244, 63, 94)",
        backgroundColor: "rgba(244, 63, 94, 0.2)",
        tension: 0.4,
      },
    ],
  };

  const giftData = {
    labels: chartData.gifts.labels,
    datasets: [
      {
        label: "Pendapatan Hadiah (IDR)",
        data: chartData.gifts.data,
        backgroundColor: [
          "rgb(244, 63, 94)",
          "rgb(16, 185, 129)",
          "rgb(59, 130, 246)",
          "rgb(168, 85, 247)",
          "rgb(245, 158, 11)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: { color: "rgba(255, 255, 255, 0.7)" },
      },
    },
    scales: {
      y: {
        grid: { color: "rgba(255, 255, 255, 0.1)" },
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
      },
      x: {
        grid: { display: false },
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
      },
    },
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = (await api.get('/api/v1/payments/analytics/dashboard/')) as any;
        if (res) {
          setStats({
            totalEarningsIdr: res.overview?.balance_idr || 0,
            totalEarningsUsd: res.overview?.balance_usd || 0,
            bountyCompleted: res.bounty_stats?.completed || 0,
            bountyTotal: res.bounty_stats?.total || 0,
            bountyEarnings: res.bounty_stats?.earnings_idr || 0,
          });
          
          // Parse earnings chart
          const revLabels = res.earnings_chart?.map((e: any) => e.date) || [];
          const revData = res.earnings_chart?.map((e: any) => e.total) || [];
          
          // Parse gifts breakdown
          const giftLabels = res.gift_breakdown?.map((g: any) => `${g.icon} ${g.name}`) || [];
          const giftAmounts = res.gift_breakdown?.map((g: any) => g.total_idr) || [];

          setChartData({
            revenue: { labels: revLabels, data: revData },
            gifts: { labels: giftLabels, data: giftAmounts }
          });
        }
      } catch (error) {
        console.error("Gagal memuat data analitik", error);
      }
    };
    fetchDashboardData();
  }, []);

  if (!user || user.role !== "host") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Akses ditolak. Anda bukan Host.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
          Dashboard Analitik
        </h1>
        <p className="text-muted-foreground">
          Pantau performa, pendapatan, dan pertumbuhan pelanggan Anda.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Pendapatan
            </CardTitle>
            <DollarSign className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              Rp {stats.totalEarningsIdr.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              Saldo USD: ${stats.totalEarningsUsd.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Bounty Selesai
            </CardTitle>
            <Activity className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.bountyCompleted} / {stats.bountyTotal}
            </div>
            <p className="text-xs text-rose-500 flex items-center mt-1">
              Total Pendapatan Bounty: Rp {stats.bountyEarnings.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Tren Pendapatan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Line data={revenueData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader>
            <CardTitle className="text-white text-lg">
              Distribusi Hadiah (Virtual Gifts)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="h-[300px] w-full max-w-[300px]">
              <Doughnut data={giftData} options={{ maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "rgba(255,255,255,0.7)" } } } }} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
