
"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Plus, MapPin, Clock, Pencil, Trash2, ChevronDown, Users as UsersIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from "@/hooks/use-translation";
import { useTeam } from "@/hooks/use-team";
import {
  useTrainingSessions,
  type TrainingSession,
  type AttendanceStatus,
  type SessionType,
} from "@/hooks/use-training-sessions";
import { cn } from "@/lib/utils";

const SESSION_TYPES: SessionType[] = ["training", "recovery", "tactical", "fitness", "match-prep"];
const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];

const sessionFormSchema = z.object({
  date: z.date(),
  startTime: z.string().min(1, "Required"),
  endTime: z.string().optional(),
  type: z.enum(["training", "recovery", "tactical", "fitness", "match-prep"]),
  sport: z.enum(["football", "tennis", "gym"]),
  location: z.string().min(1, "Required"),
  notes: z.string().optional(),
  assignedPlayers: z.array(z.string()),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

const defaultFormValues = (date: Date): SessionFormValues => ({
  date,
  startTime: "18:00",
  endTime: "",
  type: "training",
  sport: "football",
  location: "",
  notes: "",
  assignedPlayers: [],
});

export default function TrainingPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { players } = useTeam();
  const { sessions, isLoading, createSession, updateSession, deleteSession, setAttendance } = useTrainingSessions();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrainingSession | null>(null);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: defaultFormValues(new Date()),
  });

  const sessionTypeLabel = (type: SessionType) => {
    switch (type) {
      case "training":
        return t("training");
      case "recovery":
        return t("sessionTypeRecovery");
      case "tactical":
        return t("tactical");
      case "fitness":
        return t("sessionTypeFitness");
      case "match-prep":
        return t("sessionTypeMatchPrep");
    }
  };

  const attendanceLabel = (status: AttendanceStatus | undefined) => {
    switch (status) {
      case "present":
        return t("attendancePresent");
      case "absent":
        return t("attendanceAbsent");
      case "excused":
        return t("attendanceExcused");
      default:
        return t("attendanceUnmarked");
    }
  };

  const sessionDaysSet = useMemo(() => new Set(sessions.map((s) => s.date)), [sessions]);

  const sessionsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return sessions.filter((s) => s.date === key);
  }, [sessions, selectedDate]);

  const openCreateDialog = () => {
    setEditingSession(null);
    form.reset(defaultFormValues(selectedDate || new Date()));
    setDialogOpen(true);
  };

  const openEditDialog = (session: TrainingSession) => {
    setEditingSession(session);
    form.reset({
      date: parseISO(session.date),
      startTime: session.startTime,
      endTime: session.endTime || "",
      type: session.type,
      sport: session.sport,
      location: session.location,
      notes: session.notes || "",
      assignedPlayers: session.assignedPlayers,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: SessionFormValues) => {
    const payload = {
      date: format(values.date, "yyyy-MM-dd"),
      startTime: values.startTime,
      endTime: values.endTime || undefined,
      type: values.type,
      sport: values.sport,
      location: values.location,
      notes: values.notes || undefined,
      assignedPlayers: values.assignedPlayers,
    };
    if (editingSession) {
      await updateSession(editingSession.id, payload);
    } else {
      await createSession(payload);
    }
    setDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteSession(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <CalendarIcon className="h-8 w-8 text-primary" />
            {t("trainingPlanner")}
          </h1>
          <p className="text-muted-foreground">{t("trainingPlannerDescription")}</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> {t("createNewSession")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("trainingCalendar")}</CardTitle>
          <CardDescription>{t("trainingCalendarDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={locale}
              modifiers={{
                hasSession: (date) => sessionDaysSet.has(format(date, "yyyy-MM-dd")),
              }}
              modifiersClassNames={{
                hasSession:
                  "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary",
              }}
              className="rounded-md border p-0 w-full"
              classNames={{
                months: "w-full",
                month: "w-full space-y-4",
                table: "w-full",
                head_row: "flex w-full",
                head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem]",
                row: "flex w-full mt-2",
                cell: "flex-1 h-9 text-center text-sm p-0 relative",
                day: "h-9 w-9 mx-auto p-0 font-normal aria-selected:opacity-100 rounded-md hover:bg-accent hover:text-accent-foreground",
              }}
            />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold">
              {t("sessionsFor")} {selectedDate ? format(selectedDate, "PPP", { locale }) : "..."}
            </h3>
            {sessionsForSelectedDate.length === 0 ? (
              <div className="flex items-center justify-center text-center text-muted-foreground h-48 border-2 border-dashed rounded-lg p-4">
                <p>{t("noSessionsScheduled")}</p>
              </div>
            ) : (
              <ScrollArea className="h-[480px] pr-3 -mr-3">
                <div className="space-y-3">
                  {sessionsForSelectedDate.map((session) => (
                    <div key={session.id} className="rounded-lg border bg-card/50 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            {session.startTime}
                            {session.endTime ? ` – ${session.endTime}` : ""}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {session.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{sessionTypeLabel(session.type)}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(session)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget(session)}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {session.notes && <p className="text-sm text-muted-foreground">{session.notes}</p>}

                      {session.assignedPlayers.length === 0 ? (
                        <p className="text-xs text-muted-foreground">{t("noPlayersAssigned")}</p>
                      ) : (
                        <div className="space-y-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <UsersIcon className="h-3 w-3" /> {t("attendance")}
                          </p>
                          {session.assignedPlayers.map((uid) => {
                            const player = players.find((p) => p.uid === uid);
                            return (
                              <div key={uid} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">
                                      {(player?.displayName || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm truncate">{player?.displayName || uid}</span>
                                </div>
                                <Select
                                  value={session.attendance[uid] || "unmarked"}
                                  onValueChange={(value) =>
                                    setAttendance(session.id, uid, value === "unmarked" ? null : (value as AttendanceStatus))
                                  }
                                >
                                  <SelectTrigger className="h-7 w-[110px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="unmarked">{t("attendanceUnmarked")}</SelectItem>
                                    {ATTENDANCE_STATUSES.map((status) => (
                                      <SelectItem key={status} value={status}>
                                        {attendanceLabel(status)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSession ? t("editSession") : t("createSessionDialogTitle")}</DialogTitle>
            <DialogDescription>{t("createSessionDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t("date")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP", { locale }) : <span>{t("pickADate")}</span>}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={locale} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sessionStartTime")}</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("sessionEndTime")} <span className="text-muted-foreground">({t("optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sessionType")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SESSION_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {sessionTypeLabel(type)}
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
                  name="sport"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("sport")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="football">{t("football")}</SelectItem>
                          <SelectItem value="tennis">{t("tennis")}</SelectItem>
                          <SelectItem value="gym">{t("gym")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sessionLocation")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("sessionLocationPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("notes")} <span className="text-muted-foreground">({t("optional")})</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignedPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("assignPlayers")}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-between font-normal">
                            {field.value.length > 0
                              ? t("playersSelected", { count: field.value.length })
                              : t("assignPlayers")}
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <ScrollArea className="h-60">
                          <div className="p-2 space-y-1">
                            {players.map((player) => {
                              const checked = field.value.includes(player.uid);
                              return (
                                <label
                                  key={player.uid}
                                  className="flex items-center gap-2 rounded-md p-2 hover:bg-accent cursor-pointer text-sm"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) => {
                                      if (value) {
                                        field.onChange([...field.value, player.uid]);
                                      } else {
                                        field.onChange(field.value.filter((id) => id !== player.uid));
                                      }
                                    }}
                                  />
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px]">
                                      {(player.displayName || "?").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{player.displayName}</span>
                                </label>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {t("saveSession")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteSessionTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                t("deleteSessionDescription", {
                  title: `${sessionTypeLabel(deleteTarget.type)} – ${deleteTarget.location}`,
                })}
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
