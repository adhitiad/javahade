'use client';

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { EarningsChartData } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

// ─── Props ──────────────────────────────────────────────────────

interface EarningsChartProps {
  data: EarningsChartData;
  height?: number;
  className?: string;
}

// ─── Currency Formatting ────────────────────────────────────────

function formatCurrencyValue(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

// ─── Component ───────────────────────────────────────────────────

export default function EarningsChart({ data, height = 300, className }: EarningsChartProps) {
  // Create gradient colors for dark theme
  const chartData = useMemo(() => {
    return {
      labels: data.labels,
      datasets: [
        {
          label: 'Langganan',
          data: data.subscriptions,
          borderColor: 'rgb(244, 63, 94)',       // rose-500
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(244, 63, 94)',
          pointBorderColor: 'rgb(244, 63, 94)',
          borderWidth: 2,
        },
        {
          label: 'Tips',
          data: data.tips,
          borderColor: 'rgb(245, 158, 11)',     // amber-500
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(245, 158, 11)',
          pointBorderColor: 'rgb(245, 158, 11)',
          borderWidth: 2,
        },
        {
          label: 'Booking',
          data: data.bookings,
          borderColor: 'rgb(16, 185, 129)',     // emerald-500
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(16, 185, 129)',
          pointBorderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
        },
        {
          label: 'Hadiah',
          data: data.gifts,
          borderColor: 'rgb(139, 92, 246)',      // violet-500
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgb(139, 92, 246)',
          pointBorderColor: 'rgb(139, 92, 246)',
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            color: 'rgb(148, 163, 184)',         // slate-400
            font: {
              family: 'system-ui, -apple-system, sans-serif',
              size: 12,
            },
            usePointStyle: true,
            pointStyle: 'circle' as const,
            padding: 16,
            boxWidth: 8,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',  // slate-900 with opacity
          titleColor: 'rgb(248, 250, 252)',          // slate-50
          bodyColor: 'rgb(203, 213, 225)',           // slate-300
          borderColor: 'rgb(51, 65, 85)',           // slate-700
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          titleFont: {
            family: 'system-ui, -apple-system, sans-serif',
            size: 13,
            weight: 'bold' as const,
          },
          bodyFont: {
            family: 'system-ui, -apple-system, sans-serif',
            size: 12,
          },
          callbacks: {
            label: function (context: { dataset: { label: string }; parsed: { y: number } }) {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${formatCurrencyValue(value)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(51, 65, 85, 0.3)',   // slate-700 with opacity
            drawBorder: false,
          },
          ticks: {
            color: 'rgb(100, 116, 139)',       // slate-500
            font: {
              family: 'system-ui, -apple-system, sans-serif',
              size: 11,
            },
            maxRotation: 0,
            maxTicksLimit: 10,
          },
          border: {
            display: false,
          },
        },
        y: {
          grid: {
            color: 'rgba(51, 65, 85, 0.3)',
            drawBorder: false,
          },
          ticks: {
            color: 'rgb(100, 116, 139)',
            font: {
              family: 'system-ui, -apple-system, sans-serif',
              size: 11,
            },
            callback: function (value: string | number) {
              return formatCurrencyValue(Number(value));
            },
          },
          border: {
            display: false,
          },
        },
      },
    }),
    []
  );

  return (
    <div className={className} style={{ height }}>
      <Line data={chartData} options={chartOptions as any} />
    </div>
  );
}
