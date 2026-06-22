'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableCell } from '@/components/ui/table';
import { CheckCircle, XCircle, Eye, BadgeCheck } from 'lucide-react';
import { format } from 'date-fns';
import type { KYCDocument } from '@/types';

interface Props {
  kycList: KYCDocument[];
  handleKYCAction: (id: string, action: 'approved' | 'rejected') => void;
}

export function AdminKYCTab({ kycList, handleKYCAction }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Antrian Verifikasi KYC</h2>
      {kycList.filter((k) => k.status === 'pending').length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kycList.map((kyc) => (
            <Card key={kyc.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`bg-slate-500 text-white text-xs`}>
                      {kyc.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm">{kyc.full_name}</p>
                      {kyc.status !== 'pending' && (
                        <Badge
                          className={`${
                            kyc.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}
                        >
                          {kyc.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                      <p>
                        Dokumen:{' '}
                        <span className="font-medium text-foreground">
                          {kyc.document_type}
                        </span>
                      </p>
                      <p>
                        Nomor:{' '}
                        <span className="font-mono font-medium text-foreground">
                          {kyc.document_number}
                        </span>
                      </p>
                      <p>Diajukan: {format(new Date(kyc.submitted_at), 'dd MMM yyyy')}</p>
                    </div>

                    {/* Document Preview Placeholder */}
                    <div className="mt-3 h-24 bg-muted rounded-lg border flex items-center justify-center">
                      <div className="text-center text-muted-foreground">
                        <Eye className="h-5 w-5 mx-auto mb-1 opacity-40" />
                        <p className="text-[10px]">Pratinjau Dokumen</p>
                      </div>
                    </div>

                    {kyc.status === 'pending' && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleKYCAction(kyc.id, 'approved')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleKYCAction(kyc.id, 'rejected')}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <BadgeCheck className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm font-medium">Semua KYC sudah ditinjau</p>
          <p className="text-xs mt-1">Tidak ada dokumen yang menunggu verifikasi</p>
        </div>
      )}
    </div>
  );
}
