
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { ArrowLeft, BarChart2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/hooks/use-translation";
import { useUser } from "@/hooks/use-user";
import { useReports, type Report, type ReportType } from "@/hooks/use-reports";

export default function MyReportsPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { user } = useUser();
  const { reports } = useReports();

  const [search, setSearch] = useState("");
  const [viewTarget, setViewTarget] = useState<Report | null>(null);

  const reportTypeLabel = (type: ReportType) => {
    switch (type) {
      case "weekly-summary":
        return t("reportTypeWeeklySummary");
      case "match-review":
        return t("reportTypeMatchReview");
      case "progress-note":
        return t("reportTypeProgressNote");
    }
  };

  const myReports = useMemo(() => {
    if (!user) return [];
    return reports.filter((r) => r.targetPlayerUid === user.uid || r.targetPlayerUid === null);
  }, [reports, user]);

  const filtered = useMemo(() => {
    if (!search) return myReports;
    const q = search.toLowerCase();
    return myReports.filter((r) => r.title.toLowerCase().includes(q));
  }, [myReports, search]);

  const targetLabel = (report: Report) =>
    report.targetPlayerUid === null ? t("wholeTeam") : report.targetPlayerName || user?.displayName || "-";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-primary" />
          {t("myReportsTitle")}
        </h1>
        <p className="text-muted-foreground">{t("myReportsSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchReports")}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-64 flex items-center justify-center">
              <div className="text-muted-foreground">
                <p className="font-semibold">{myReports.length === 0 ? t("noReportsYet") : t("noReportsFound")}</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("title")}</TableHead>
                  <TableHead>{t("reportType")}</TableHead>
                  <TableHead>{t("playerTeam")}</TableHead>
                  <TableHead>{t("dateCreated")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow key={report.id} className="cursor-pointer" onClick={() => setViewTarget(report)}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{reportTypeLabel(report.type)}</Badge>
                    </TableCell>
                    <TableCell>{targetLabel(report)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.createdAt ? format(report.createdAt.toDate(), "PP", { locale }) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewTarget && (
            <>
              <DialogHeader>
                <DialogTitle>{viewTarget.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap pt-1">
                  <Badge variant="outline">{reportTypeLabel(viewTarget.type)}</Badge>
                  <span>{targetLabel(viewTarget)}</span>
                  <span>·</span>
                  <span>{viewTarget.createdAt ? format(viewTarget.createdAt.toDate(), "PPP", { locale }) : ""}</span>
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[50vh]">
                <p className="whitespace-pre-wrap text-sm leading-relaxed pr-4">{viewTarget.body}</p>
              </ScrollArea>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setViewTarget(null)}>
                  {t("close")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
