
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ClipboardList,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Search,
  FileText,
  Video as VideoIcon,
  Link as LinkIcon,
  ExternalLink,
  List,
  Medal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKey } from "@/lib/i18n";
import { useUser } from "@/hooks/use-user";
import { useTeam } from "@/hooks/use-team";
import { useTrainingSessions, type AttendanceStatus, type SessionType } from "@/hooks/use-training-sessions";
import { useCoachMatches } from "@/hooks/use-coach-matches";
import { useResources, type Resource, type ResourceCategory } from "@/hooks/use-resources";
import { cn } from "@/lib/utils";

interface FormationSlot {
  id: string;
  label: string;
  x: number;
  y: number;
}

const FORMATIONS: Record<string, FormationSlot[]> = {
  "4-3-3": [
    { id: "433-gk", label: "GK", x: 50, y: 90 },
    { id: "433-lb", label: "LB", x: 14, y: 72 },
    { id: "433-cb1", label: "CB", x: 37, y: 76 },
    { id: "433-cb2", label: "CB", x: 63, y: 76 },
    { id: "433-rb", label: "RB", x: 86, y: 72 },
    { id: "433-cm1", label: "CM", x: 28, y: 50 },
    { id: "433-cm2", label: "CM", x: 50, y: 56 },
    { id: "433-cm3", label: "CM", x: 72, y: 50 },
    { id: "433-lw", label: "LW", x: 18, y: 24 },
    { id: "433-st", label: "ST", x: 50, y: 16 },
    { id: "433-rw", label: "RW", x: 82, y: 24 },
  ],
  "4-4-2": [
    { id: "442-gk", label: "GK", x: 50, y: 90 },
    { id: "442-lb", label: "LB", x: 14, y: 72 },
    { id: "442-cb1", label: "CB", x: 37, y: 76 },
    { id: "442-cb2", label: "CB", x: 63, y: 76 },
    { id: "442-rb", label: "RB", x: 86, y: 72 },
    { id: "442-lm", label: "LM", x: 14, y: 46 },
    { id: "442-cm1", label: "CM", x: 38, y: 50 },
    { id: "442-cm2", label: "CM", x: 62, y: 50 },
    { id: "442-rm", label: "RM", x: 86, y: 46 },
    { id: "442-st1", label: "ST", x: 38, y: 18 },
    { id: "442-st2", label: "ST", x: 62, y: 18 },
  ],
  "3-5-2": [
    { id: "352-gk", label: "GK", x: 50, y: 90 },
    { id: "352-cb1", label: "CB", x: 28, y: 76 },
    { id: "352-cb2", label: "CB", x: 50, y: 80 },
    { id: "352-cb3", label: "CB", x: 72, y: 76 },
    { id: "352-lm", label: "LM", x: 10, y: 48 },
    { id: "352-cm1", label: "CM", x: 32, y: 52 },
    { id: "352-cm2", label: "CM", x: 50, y: 58 },
    { id: "352-cm3", label: "CM", x: 68, y: 52 },
    { id: "352-rm", label: "RM", x: 90, y: 48 },
    { id: "352-st1", label: "ST", x: 38, y: 18 },
    { id: "352-st2", label: "ST", x: 62, y: 18 },
  ],
};

const GENERIC_SLOTS: FormationSlot[] = Array.from({ length: 6 }, (_, i) => ({
  id: `slot-${i + 1}`,
  label: String(i + 1),
  x: 0,
  y: 0,
}));

const CATEGORY_ICON: Record<ResourceCategory, LucideIcon> = {
  video: VideoIcon,
  document: FileText,
  link: LinkIcon,
};

const CATEGORY_FILTERS: (ResourceCategory | "all")[] = ["all", "video", "document", "link"];

const initials = (name: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

export default function TeamHubPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { user } = useUser();
  const { players } = useTeam();
  const { sessions } = useTrainingSessions();
  const { matches } = useCoachMatches();
  const { resources } = useResources();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | "all">("all");
  const [scheduleView, setScheduleView] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const today = format(new Date(), "yyyy-MM-dd");

  const mySessions = useMemo(
    () => (user ? sessions.filter((s) => s.assignedPlayers.includes(user.uid)) : []),
    [sessions, user]
  );
  const upcomingSessions = useMemo(() => mySessions.filter((s) => s.date >= today), [mySessions, today]);
  const recentSessions = useMemo(
    () => mySessions.filter((s) => s.date < today).slice(-5).reverse(),
    [mySessions, today]
  );
  const upcomingMatches = useMemo(
    () => matches.filter((m) => m.status === "upcoming" && m.date >= today),
    [matches, today]
  );

  const sessionDates = useMemo(() => mySessions.map((s) => parseISO(s.date)), [mySessions]);
  const matchDates = useMemo(() => matches.map((m) => parseISO(m.date)), [matches]);

  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
  const dayEvents = useMemo(() => {
    const daySessions = mySessions
      .filter((s) => s.date === selectedDateStr)
      .map((session) => ({ kind: "session" as const, session }));
    const dayMatches = matches
      .filter((m) => m.date === selectedDateStr)
      .map((match) => ({ kind: "match" as const, match }));
    return [...daySessions, ...dayMatches];
  }, [mySessions, matches, selectedDateStr]);

  const leaderboard = useMemo(() => {
    return players
      .map((player) => {
        const assigned = sessions.filter((s) => s.assignedPlayers.includes(player.uid));
        const present = assigned.filter((s) => s.attendance[player.uid] === "present").length;
        const rate = assigned.length > 0 ? Math.round((present / assigned.length) * 100) : 0;
        return { player, present, total: assigned.length, rate };
      })
      .sort((a, b) => b.present - a.present || b.rate - a.rate);
  }, [players, sessions]);

  const nextMatch = upcomingMatches[0] || null;
  const isPitch = nextMatch?.sport === "football";
  const slots = nextMatch
    ? isPitch
      ? FORMATIONS[nextMatch.formation || "4-3-3"] || FORMATIONS["4-3-3"]
      : GENERIC_SLOTS
    : GENERIC_SLOTS;
  const myLineupSlot =
    nextMatch && user ? slots.find((slot) => nextMatch.lineup[slot.id] === user.uid) : undefined;

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

  const attendanceLabel = (status?: AttendanceStatus) => {
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

  const attendanceBadgeClass = (status?: AttendanceStatus) => {
    switch (status) {
      case "present":
        return "bg-green-600/15 text-green-500 border-green-600/30 hover:bg-green-600/15";
      case "absent":
        return "bg-red-600/15 text-red-500 border-red-600/30 hover:bg-red-600/15";
      case "excused":
        return "bg-yellow-600/15 text-yellow-500 border-yellow-600/30 hover:bg-yellow-600/15";
      default:
        return "";
    }
  };

  const categoryLabel = (category: ResourceCategory) => {
    switch (category) {
      case "video":
        return t("video");
      case "document":
        return t("categoryDocument");
      case "link":
        return t("categoryLink");
    }
  };

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [resources, categoryFilter, search]);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-primary" />
          {t("teamHubTitle")}
        </h1>
        <p className="text-muted-foreground">{t("teamHubSubtitle")}</p>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">{t("scheduleTab")}</TabsTrigger>
          <TabsTrigger value="tactics">{t("tacticsTab")}</TabsTrigger>
          <TabsTrigger value="resources">{t("resourcesTab")}</TabsTrigger>
          <TabsTrigger value="leaderboard">{t("leaderboardTab")}</TabsTrigger>
        </TabsList>

        {/* SCHEDULE */}
        <TabsContent value="schedule" className="space-y-6 pt-4">
          <div className="flex justify-end gap-2">
            <Button
              variant={scheduleView === "list" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setScheduleView("list")}
            >
              <List className="mr-2 h-4 w-4" />
              {t("listView")}
            </Button>
            <Button
              variant={scheduleView === "calendar" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setScheduleView("calendar")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {t("calendarView")}
            </Button>
          </div>

          {scheduleView === "list" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("upcomingSessions")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingSessions.length === 0 ? (
                    <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                      {t("noSessionsScheduled")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingSessions.map((session) => (
                        <div key={session.id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{format(parseISO(session.date), "PPP", { locale })}</span>
                            <Badge variant="outline">{sessionTypeLabel(session.type)}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.startTime}
                              {session.endTime ? ` - ${session.endTime}` : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                          </div>
                          {session.notes && <p className="text-sm text-muted-foreground pt-1">{session.notes}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("upcomingMatches")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingMatches.length === 0 ? (
                    <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                      {t("noUpcomingMatches")}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {upcomingMatches.map((match) => (
                        <div key={match.id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">
                              {t("vs")} {match.opponent}
                            </span>
                            <Badge variant="outline">{match.homeAway === "home" ? t("homeFixture") : t("awayFixture")}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(parseISO(match.date), "PP", { locale })}
                            </span>
                            {match.time && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {match.time}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {match.venue}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="grid gap-6 pt-6 md:grid-cols-[auto_1fr]">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={locale}
                  modifiers={{ hasSession: sessionDates, hasMatch: matchDates }}
                  modifiersClassNames={{
                    hasSession:
                      "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary",
                    hasMatch:
                      "after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-orange-500",
                  }}
                  className="self-start rounded-md border"
                />
                <div className="space-y-3">
                  <h3 className="font-semibold">{format(selectedDate, "PPP", { locale })}</h3>
                  {dayEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("noEventsThisDay")}</p>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((event) =>
                        event.kind === "session" ? (
                          <div key={`s-${event.session.id}`} className="rounded-lg border p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{sessionTypeLabel(event.session.type)}</span>
                              {event.session.date <= today && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "shrink-0",
                                    attendanceBadgeClass(user ? event.session.attendance[user.uid] : undefined)
                                  )}
                                >
                                  {attendanceLabel(user ? event.session.attendance[user.uid] : undefined)}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {event.session.startTime}
                                {event.session.endTime ? ` - ${event.session.endTime}` : ""}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.session.location}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div key={`m-${event.match.id}`} className="rounded-lg border p-3 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                {t("vs")} {event.match.opponent}
                              </span>
                              <Badge variant="outline">
                                {event.match.homeAway === "home" ? t("homeFixture") : t("awayFixture")}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {event.match.time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {event.match.time}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.match.venue}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t("recentSessions")}</CardTitle>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                  {t("noSessionsScheduled")}
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="font-medium text-sm">{format(parseISO(session.date), "PP", { locale })}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {sessionTypeLabel(session.type)} · {session.location}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("shrink-0", attendanceBadgeClass(user ? session.attendance[user.uid] : undefined))}>
                        {attendanceLabel(user ? session.attendance[user.uid] : undefined)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TACTICS */}
        <TabsContent value="tactics" className="space-y-6 pt-4">
          {!nextMatch ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">{t("noUpcomingMatches")}</CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>
                    {t("vs")} {nextMatch.opponent}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 flex-wrap pt-1">
                    <span>{format(parseISO(nextMatch.date), "PPP", { locale })}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {nextMatch.venue}
                    </span>
                    <Badge variant="outline">{nextMatch.homeAway === "home" ? t("homeFixture") : t("awayFixture")}</Badge>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {myLineupSlot ? (
                    <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 p-3 text-sm font-semibold text-center">
                      {t("youAreStarting", { position: myLineupSlot.label })}
                    </div>
                  ) : (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground text-center">{t("notInLineup")}</div>
                  )}

                  {isPitch ? (
                    <div
                      className="aspect-[4/3] bg-green-500/10 rounded-lg relative border-2 border-dashed border-green-500/20"
                      style={{
                        backgroundImage: `
                            linear-gradient(to bottom, transparent 49.5%, hsl(var(--border)) 49.5%, hsl(var(--border)) 50.5%, transparent 50.5%),
                            radial-gradient(circle at 50% 50%, hsl(var(--border)) 2px, transparent 3px)
                        `,
                        backgroundSize: "100% 100%, 100% 100%",
                        backgroundPosition: "center, center",
                        backgroundRepeat: "no-repeat, no-repeat",
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 border-2 border-[hsl(var(--border))] rounded-full" />
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-24 w-48 border-2 border-[hsl(var(--border))] rounded-b-xl border-t-0" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-24 w-48 border-2 border-[hsl(var(--border))] rounded-t-xl border-b-0" />

                      {slots.map((slot) => {
                        const assignedUid = nextMatch.lineup[slot.id];
                        const assignedPlayer = players.find((p) => p.uid === assignedUid);
                        const isMine = !!user && assignedUid === user.uid;
                        return (
                          <div
                            key={slot.id}
                            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                            className={cn(
                              "absolute -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm",
                              assignedPlayer
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/80 border-dashed border-muted-foreground/40 text-muted-foreground",
                              isMine && "ring-2 ring-yellow-400 ring-offset-2 ring-offset-background"
                            )}
                          >
                            {assignedPlayer ? initials(assignedPlayer.displayName) : slot.label}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {slots.map((slot) => {
                        const assignedUid = nextMatch.lineup[slot.id];
                        const assignedPlayer = players.find((p) => p.uid === assignedUid);
                        const isMine = !!user && assignedUid === user.uid;
                        return (
                          <div
                            key={slot.id}
                            className={cn(
                              "w-full flex items-center justify-between rounded-lg border p-3 text-sm",
                              isMine && "border-primary bg-primary/5"
                            )}
                          >
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {slot.label}
                            </span>
                            {assignedPlayer ? (
                              <span className="flex items-center gap-2 font-medium">
                                {assignedPlayer.displayName}
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">{initials(assignedPlayer.displayName)}</AvatarFallback>
                                </Avatar>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t("emptySlot")}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("tacticsNotesFromCoach")}</CardTitle>
                </CardHeader>
                <CardContent>
                  {nextMatch.tacticsNotes ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{nextMatch.tacticsNotes}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("noTacticsYet")}</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* RESOURCES */}
        <TabsContent value="resources" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchResources")}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 pt-4 flex-wrap">
                {CATEGORY_FILTERS.map((category) => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? "secondary" : "outline"}
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category === "all" ? t("all") : categoryLabel(category)}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {filteredResources.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-64 flex items-center justify-center">
                  <div className="text-muted-foreground">
                    <p className="font-semibold">{t("libraryEmpty")}</p>
                    <p className="text-sm">{t("libraryEmptyDescription")}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredResources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} categoryLabel={categoryLabel} t={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LEADERBOARD */}
        <TabsContent value="leaderboard" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("attendanceLeaderboardTitle")}</CardTitle>
              <CardDescription>{t("attendanceLeaderboardSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div key={entry.player.uid} className="flex items-center gap-3 rounded-lg border p-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                        index === 0
                          ? "bg-yellow-400/20 text-yellow-500"
                          : index === 1
                          ? "bg-slate-400/20 text-slate-400"
                          : index === 2
                          ? "bg-orange-400/20 text-orange-500"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index < 3 ? <Medal className="h-4 w-4" /> : index + 1}
                    </div>
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback>{initials(entry.player.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {entry.player.displayName}
                        {user && entry.player.uid === user.uid && (
                          <span className="font-normal text-muted-foreground"> · {t("you")}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("sessionsAttended", { count: entry.present })}</p>
                    </div>
                    <div className="w-20 shrink-0">
                      <Progress value={entry.rate} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResourceCard({
  resource,
  categoryLabel,
  t,
}: {
  resource: Resource;
  categoryLabel: (category: ResourceCategory) => string;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
}) {
  const Icon = CATEGORY_ICON[resource.category];
  return (
    <div className="rounded-lg border bg-card/50 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-semibold leading-tight line-clamp-2">{resource.title}</h3>
      </div>
      {resource.description && <p className="text-sm text-muted-foreground line-clamp-2">{resource.description}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline">{categoryLabel(resource.category)}</Badge>
        {resource.sport !== "all" && <Badge variant="secondary">{t(resource.sport)}</Badge>}
      </div>
      <Button variant="outline" size="sm" className="mt-auto" asChild>
        <a href={resource.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" /> {t("open")}
        </a>
      </Button>
    </div>
  );
}
