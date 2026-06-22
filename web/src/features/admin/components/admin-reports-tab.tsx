'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { Report } from '@/types';

interface Props {
  reports: Report[];
  handleReportAction: (id: string, action: 'actioned' | 'dismissed') => void;
}

export function AdminReportsTab({ reports, handleReportAction }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-base font-semibold">Antrian Laporan</h2>
      <div className="space-y-2">
        {reports.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className={`bg-slate-500 text-white text-[10px]`}>
                    {report.reporter.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{report.reporter}</span>
                        <span className="text-muted-foreground"> melaporkan </span>
                        <span className="font-medium text-rose-500">{report.object_id}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-[10px]">
                          {report.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {report.reason}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(report.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                    </div>
                    {report.status === 'pending' && (
                      <div className="flex gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          onClick={() => handleReportAction(report.id, 'actioned')}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Tindak
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900/20"
                          onClick={() => handleReportAction(report.id, 'dismissed')}
                        >
                          <XCircle className="mr-1 h-3 w-3" />
                          Tolak
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{report.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
