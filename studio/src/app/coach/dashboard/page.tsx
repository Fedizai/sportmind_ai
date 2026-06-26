
"use client";

import { useMemo } from "react";
import type { ReactNode, ComponentType } from "react";
import Link from "next/link";
import { format, parseISO, subDays, formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Home,
  Users,
  Calendar,
  Trophy,
  BarChart as BarChartIcon,
  Plus,
  Activity,
  MapPin,
  Clock,
  ShieldAlert,
  FileText,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKey } from "@/lib/i18n";
import { useTeam } from "@/hooks/use-team";
import { useTrainingSessions, type SessionType } from "@/hooks/use-training-sessions";
import { useCoachMatches } from "@/hooks/use-coach-matches";
import { useResources } from "@/hooks/use-resources";
import { useReports } from "@/hooks/use-reports";
import { cn } from "@/lib/utils";

type TFn = (key: TranslationKey, options?: Record<string, string | number>) => string;

const initials = (name?: string | null) => {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
};

function sessionTypeLabel(type: SessionType, t: TFn) {
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
}

function getStatusBadge(status: string | undefined, t: TFn) {
  switch (status) {
    case "injured":
      return <Badge variant="destructive" className="capitalize">{t("injured")}</Badge>;
    case "suspended":
      return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 capitalize">{t("suspended")}</Badge>;
    default:
      return <Badge variant="secondary" className="capitalize">{status || t("unknown")}</Badge>;
  }
}

function KpiCard({ icon, label, value, accent }: { icon: ReactNode; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
            accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

type ActivityType = "session" | "match" | "resource" | "report";

const ACTIVITY_ICONS: Record<ActivityType, ComponentType<{ className?: string }>> = {
  session: Calendar,
  match: Trophy,
  resource: BookOpen,
  report: FileText,
};

export default function CoachDashboardPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;

  const { players, isLoading: playersLoading } = useTeam();
  const { sessions, isLoading: sessionsLoading } = useTrainingSessions();
  const { matches, isLoading: matchesLoading } = useCoachMatches();
  const { resources, isLoading: resourcesLoading } = useResources();
  const { reports, isLoading: reportsLoading } = useReports();

  const isLoading = playersLoading || sessionsLoading || matchesLoading || resourcesLoading || reportsLoading;

  const today = format(new Date(), "yyyy-MM-dd");

  const flaggedPlayers = useMemo(
    () => players.filter((p) => p.status === "injured" || p.status === "suspended"),
    [players]
  );

  const nextSession = useMemo(() => sessions.find((s) => s.date >= today), [sessions, today]);

  const nextMatch = useMemo(
    () => matches.find((m) => m.status === "upcoming" && m.date >= today),
    [matches, today]
  );

  const upcomingSessionsCount = useMemo(() => sessions.filter((s) => s.date >= today).length, [sessions, today]);

  const weeklyAttendanceData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const day = subDays(new Date(), 6 - i);
      const dayStr = format(day, "yyyy-MM-dd");
      const daySessions = sessions.filter((s) => s.date === dayStr);
      let present = 0;
      let total = 0;
      daySessions.forEach((s) => {
        s.assignedPlayers.forEach((uid) => {
          total += 1;
          if (s.attendance[uid] === "present") present += 1;
        });
      });
      return {
        name: format(day, "EEE", { locale }),
        attendance: total > 0 ? Math.round((present / total) * 100) : 0,
        hasData: total > 0,
      };
    });
  }, [sessions, locale]);

  const hasAnyAttendanceData = weeklyAttendanceData.some((d) => d.hasData);

  const overallAttendanceRate = useMemo(() => {
    const daysWithData = weeklyAttendanceData.filter((d) => d.hasData);
    if (daysWithData.length === 0) return null;
    return Math.round(daysWithData.reduce((sum, d) => sum + d.attendance, 0) / daysWithData.length);
  }, [weeklyAttendanceData]);

  const chartConfig: ChartConfig = {
    attendance: { label: t("attendanceRate"), color: "hsl(var(--primary))" },
  };

  const recentActivity = useMemo(() => {
    const items: Array<{
      key: string;
      type: ActivityType;
      title: string;
      subtitle: string;
      href: string;
      createdAt: number;
    }> = [];

    sessions.forEach((s) => {
      items.push({
        key: `session-${s.id}`,
        type: "session",
        title: t("sessionCreated"),
        subtitle: `${sessionTypeLabel(s.type, t)} · ${s.location}`,
        href: "/coach/training",
        createdAt: s.createdAt?.toMillis() ?? 0,
      });
    });

    matches.forEach((m) => {
      items.push({
        key: `match-${m.id}`,
        type: "match",
        title: t("matchScheduled"),
        subtitle: `${t("vs")} ${m.opponent}`,
        href: "/coach/matches",
        createdAt: m.createdAt?.toMillis() ?? 0,
      });
    });

    resources.forEach((r) => {
      items.push({
        key: `resource-${r.id}`,
        type: "resource",
        title: t("resourceAdded"),
        subtitle: r.title,
        href: r.category === "video" ? "/coach/video" : "/coach/resources",
        createdAt: r.createdAt?.toMillis() ?? 0,
      });
    });

    reports.forEach((r) => {
      items.push({
        key: `report-${r.id}`,
        type: "report",
        title: t("reportCreated"),
        subtitle: r.title,
        href: "/coach/reports",
        createdAt: r.createdAt?.toMillis() ?? 0,
      });
    });

    return items
      .filter((i) => i.createdAt > 0)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);
  }, [sessions, matches, resources, reports, t]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Home className="h-8 w-8 text-primary" />
          {t("coachDashboard")}
        </h1>
        <p className="text-muted-foreground">{t("coachDashboardDescription")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<Users className="h-5 w-5" />} label={t("totalPlayers")} value={players.length} />
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label={t("playersNeedingAttention")}
          value={flaggedPlayers.length}
          accent={flaggedPlayers.length > 0}
        />
        <KpiCard icon={<Calendar className="h-5 w-5" />} label={t("upcomingSessionsCount")} value={upcomingSessionsCount} />
        <KpiCard
          icon={<Activity className="h-5 w-5" />}
          label={t("attendanceRate")}
          value={overallAttendanceRate !== null ? `${overallAttendanceRate}%` : "—"}
        />
      </div>

      <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-primary" />
              {t("nextSession")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-28">
            {nextSession ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{format(parseISO(nextSession.date), "PPP", { locale })}</span>
                  <Badge variant="outline" className="shrink-0">{sessionTypeLabel(nextSession.type, t)}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{nextSession.startTime}{nextSession.endTime ? ` - ${nextSession.endTime}` : ""}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{nextSession.location}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t("playersSelected", { count: nextSession.assignedPlayers.length })}</p>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{t("noUpcomingSession")}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/coach/training">
                <Plus className="mr-2 h-4 w-4" />
                {t("createNewSession")}
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-primary" />
              {t("upcomingMatch")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-28">
            {nextMatch ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{t("vs")} {nextMatch.opponent}</span>
                  <Badge variant="outline" className="capitalize shrink-0">{t(nextMatch.homeAway)}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {format(parseISO(nextMatch.date), "PPP", { locale })}
                    {nextMatch.time ? ` · ${nextMatch.time}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{nextMatch.venue}</span>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{t("noUpcomingMatches")}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild size="sm" className="w-full">
              <Link href="/coach/matches">
                <Plus className="mr-2 h-4 w-4" />
                {t("planMatchTactics")}
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              {t("playersNeedingAttention")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-28">
            {flaggedPlayers.length > 0 ? (
              <ul className="space-y-2 overflow-y-auto h-full pr-1">
                {flaggedPlayers.map((player) => (
                  <li key={player.uid} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs">{initials(player.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate flex-1">{player.displayName}</span>
                    {getStatusBadge(player.status, t)}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{t("noFlaggedPlayers")}</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/coach/team">{t("goToTeamList")}</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChartIcon className="h-5 w-5 text-primary" />
              {t("weeklyAttendance")}
            </CardTitle>
            <CardDescription>{t("weeklyAttendanceDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {hasAnyAttendanceData ? (
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart data={weeklyAttendanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Bar dataKey="attendance" fill="var(--color-attendance)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">{t("noAttendanceData")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-primary" />
              {t("recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px]">
            {recentActivity.length > 0 ? (
              <ul className="space-y-3 overflow-y-auto h-full pr-1">
                {recentActivity.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.type];
                  return (
                    <li key={item.key}>
                      <Link href={item.href} className="flex items-start gap-3 group">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium group-hover:text-primary transition-colors">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground text-center">{t("noNewNotifications")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
