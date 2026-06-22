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
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
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
);

export default function HostDashboardView() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalEarnings: 0,
    activeSubscribers: 0,
    totalViews: 0,
    engagementRate: 0,
  });

  const [chartData, setChartData] = useState({
    revenue: { labels: [], data: [] },
    subscribers: { labels: [], data: [] }
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

  const subscriberData = {
    labels: chartData.subscribers.labels,
    datasets: [
      {
        label: "Pelanggan Baru",
        data: chartData.subscribers.data,
        backgroundColor: "rgb(16, 185, 129)",
        borderRadius: 4,
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
        const res = (await api.get('/api/v1/creators/me/stats/')) as any;
        if (res) {
          setStats({
            totalEarnings: res.totalEarnings || 0,
            activeSubscribers: res.activeSubscribers || 0,
            totalViews: res.totalViews || 0,
            engagementRate: res.engagementRate || 0,
          });
          setChartData({
            revenue: res.chartData?.revenue || { labels: [], data: [] },
            subscribers: res.chartData?.subscribers || { labels: [], data: [] }
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
              Rp {stats.totalEarnings.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="size-3 mr-1" /> +20.1% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Pelanggan Aktif
            </CardTitle>
            <Users className="size-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.activeSubscribers}
            </div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="size-3 mr-1" /> +12 user baru
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Views
            </CardTitle>
            <Eye className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.totalViews.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-emerald-500 flex items-center mt-1">
              <TrendingUp className="size-3 mr-1" /> +5.4% dari bulan lalu
            </p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/50 border-white/10 glass">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Engagement Rate
            </CardTitle>
            <Activity className="size-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {stats.engagementRate}%
            </div>
            <p className="text-xs text-rose-500 flex items-center mt-1">
              <TrendingUp className="size-3 mr-1 rotate-180" /> -1.2% dari bulan
              lalu
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
              Pertumbuhan Pelanggan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <Bar data={subscriberData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
