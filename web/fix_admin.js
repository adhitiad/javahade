const fs = require('fs');
const file = 'src/components/admin/admin-view.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove mock definitions
content = content.replace(/const MOCK_WITHDRAWALS: MockWithdrawal\[\] = \[[\s\S]*?\];/g, '');
content = content.replace(/const MOCK_KYC: MockKYC\[\] = \[[\s\S]*?\];/g, '');
content = content.replace(/const MOCK_REPORTS: MockReport\[\] = \[[\s\S]*?\];/g, '');
content = content.replace(/const INITIAL_BADGES: MockBadge\[\] = \[[\s\S]*?\];/g, '');

// Import api if not present
if (!content.includes("import { api }")) {
  content = content.replace(/import { useState } from 'react';/, "import { useState, useEffect } from 'react';\nimport { api } from '@/lib/api';");
}

// Add state hooks
content = content.replace(/export default function AdminDashboard\(\) {/, 
  match => `${match}
  const [withdrawals, setWithdrawals] = useState<MockWithdrawal[]>([]);
  const [kycRequests, setKycRequests] = useState<MockKYC[]>([]);
  const [reports, setReports] = useState<MockReport[]>([]);
  const [badges, setBadges] = useState<MockBadge[]>([]);

  useEffect(() => {
    api.get('/admin/withdrawals/').then((res: any) => setWithdrawals(res.results || [])).catch(() => {});
    api.get('/admin/kyc/').then((res: any) => setKycRequests(res.results || [])).catch(() => {});
    api.get('/admin/reports/').then((res: any) => setReports(res.results || [])).catch(() => {});
    api.get('/admin/badges/').then((res: any) => setBadges(res.results || [])).catch(() => {});
  }, []);
`);

// Replace variable usages
content = content.replace(/MOCK_WITHDRAWALS/g, 'withdrawals');
content = content.replace(/MOCK_KYC/g, 'kycRequests');
content = content.replace(/MOCK_REPORTS/g, 'reports');
content = content.replace(/INITIAL_BADGES/g, 'badges');

fs.writeFileSync(file, content, 'utf8');
