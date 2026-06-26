
"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Eye, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from "@/hooks/use-translation";
import { useTeam } from "@/hooks/use-team";
import { useReports, type Report, type ReportType } from "@/hooks/use-reports";

const reportFormSchema = z.object({
  title: z.string().min(1, "Required"),
  type: z.enum(["weekly-summary", "match-review", "progress-note"]),
  targetPlayerUid: z.string(),
  body: z.string().min(1, "Required"),
});

type ReportFormValues = z.infer<typeof reportFormSchema>;

const REPORT_TYPES: ReportType[] = ["weekly-summary", "match-review", "progress-note"];

export default function ReportsPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { players } = useTeam();
  const { reports, createReport, deleteReport } = useReports();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Report | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { title: "", type: "weekly-summary", targetPlayerUid: "team", body: "" },
  });

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

  const filtered = useMemo(() => {
    if (!search) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.targetPlayerName || t("wholeTeam")).toLowerCase().includes(q)
    );
  }, [reports, search, t]);

  const onSubmit = async (values: ReportFormValues) => {
    const targetPlayerName =
      values.targetPlayerUid === "team"
        ? undefined
        : players.find((p) => p.uid === values.targetPlayerUid)?.displayName || undefined;
    await createReport({
      title: values.title,
      type: values.type,
      targetPlayerUid: values.targetPlayerUid === "team" ? null : values.targetPlayerUid,
      targetPlayerName,
      body: values.body,
    });
    form.reset({ title: "", type: "weekly-summary", targetPlayerUid: "team", body: "" });
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (viewTarget?.id === deleteTarget.id) setViewTarget(null);
    await deleteReport(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            {t("performanceReports")}
          </h1>
          <p className="text-muted-foreground">{t("reportsCenterDescription")}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("createReport")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("reportsCenter")}</CardTitle>
          <div className="relative pt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("searchReports")} className="pl-10" />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-96 flex items-center justify-center">
              <div className="text-muted-foreground">
                <p className="font-semibold">{t("noReportsFound")}</p>
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
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow key={report.id} className="cursor-pointer" onClick={() => setViewTarget(report)}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{reportTypeLabel(report.type)}</Badge>
                    </TableCell>
                    <TableCell>{report.targetPlayerName || t("wholeTeam")}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {report.createdAt ? format(report.createdAt.toDate(), "PP", { locale }) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewTarget(report);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(report);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("createReport")}</DialogTitle>
            <DialogDescription>{t("createReportDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("title")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reportType")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REPORT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {reportTypeLabel(type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetPlayerUid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("reportTargetPlayer")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="team">{t("wholeTeam")}</SelectItem>
                          {players.map((player) => (
                            <SelectItem key={player.uid} value={player.uid}>
                              {player.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("reportBody")}</FormLabel>
                    <FormControl>
                      <Textarea rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {t("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewTarget && (
            <>
              <DialogHeader>
                <DialogTitle>{viewTarget.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap pt-1">
                  <Badge variant="outline">{reportTypeLabel(viewTarget.type)}</Badge>
                  <span>{viewTarget.targetPlayerName || t("wholeTeam")}</span>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t("confirmDeleteItem", { title: deleteTarget.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
