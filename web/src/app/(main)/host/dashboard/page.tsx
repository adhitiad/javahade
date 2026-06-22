import HostDashboardView from '@/features/host/components/host-dashboard-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Host Dashboard | Javahade',
  description: 'Dashboard analitik dan performa untuk Host.',
};

export default function HostDashboardPage() {
  return <HostDashboardView />;
}
