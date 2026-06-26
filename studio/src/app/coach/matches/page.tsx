
"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Trophy, Plus, MapPin, Clock, Trash2, X, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTranslation } from "@/hooks/use-translation";
import { useTeam, type Player } from "@/hooks/use-team";
import { useCoachMatches, type CoachMatch } from "@/hooks/use-coach-matches";
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

const matchFormSchema = z.object({
  opponent: z.string().min(1, "Required"),
  date: z.date(),
  time: z.string().optional(),
  venue: z.string().min(1, "Required"),
  homeAway: z.enum(["home", "away"]),
  sport: z.enum(["football", "tennis", "gym"]),
});

type MatchFormValues = z.infer<typeof matchFormSchema>;

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

type MatchResult = "win" | "draw" | "loss";

const getMatchResult = (match: CoachMatch): MatchResult | null => {
  if (!match.score) return null;
  const teamScore = match.homeAway === "home" ? match.score.home : match.score.away;
  const oppScore = match.homeAway === "home" ? match.score.away : match.score.home;
  if (teamScore > oppScore) return "win";
  if (teamScore < oppScore) return "loss";
  return "draw";
};

const resultBadgeClass = (result: MatchResult) => {
  switch (result) {
    case "win":
      return "bg-green-600/15 text-green-500 border-green-600/30 hover:bg-green-600/15";
    case "loss":
      return "bg-red-600/15 text-red-500 border-red-600/30 hover:bg-red-600/15";
    case "draw":
      return "bg-yellow-600/15 text-yellow-500 border-yellow-600/30 hover:bg-yellow-600/15";
  }
};

export default function MatchesPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { players } = useTeam();
  const { matches, createMatch, deleteMatch, setLineupSlot, saveTacticsNotes, recordResult } = useCoachMatches();

  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CoachMatch | null>(null);
  const [resultTarget, setResultTarget] = useState<CoachMatch | null>(null);
  const [homeScoreInput, setHomeScoreInput] = useState("0");
  const [awayScoreInput, setAwayScoreInput] = useState("0");
  const [tacticsNotes, setTacticsNotes] = useState("");
  const [formation, setFormation] = useState("4-3-3");

  const upcomingMatches = useMemo(() => matches.filter((m) => m.status === "upcoming"), [matches]);
  const pastMatches = useMemo(() => matches.filter((m) => m.status === "completed"), [matches]);

  const selectedMatch =
    matches.find((m) => m.id === selectedMatchId) || upcomingMatches[0] || matches[0] || null;

  useEffect(() => {
    setTacticsNotes(selectedMatch?.tacticsNotes || "");
    setFormation(selectedMatch?.formation || "4-3-3");
  }, [selectedMatch?.id]);

  useEffect(() => {
    if (resultTarget) {
      setHomeScoreInput(String(resultTarget.score?.home ?? 0));
      setAwayScoreInput(String(resultTarget.score?.away ?? 0));
    }
  }, [resultTarget]);

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      opponent: "",
      date: new Date(),
      time: "",
      venue: "",
      homeAway: "home",
      sport: "football",
    },
  });

  const onSubmitMatch = async (values: MatchFormValues) => {
    await createMatch({
      opponent: values.opponent,
      date: format(values.date, "yyyy-MM-dd"),
      time: values.time || undefined,
      venue: values.venue,
      homeAway: values.homeAway,
      sport: values.sport,
    });
    form.reset({ opponent: "", date: new Date(), time: "", venue: "", homeAway: "home", sport: "football" });
    setPlanDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (selectedMatchId === deleteTarget.id) setSelectedMatchId(null);
    await deleteMatch(deleteTarget.id);
    setDeleteTarget(null);
  };

  const submitResult = async () => {
    if (!resultTarget) return;
    await recordResult(resultTarget.id, {
      home: Number(homeScoreInput) || 0,
      away: Number(awayScoreInput) || 0,
    });
    setResultTarget(null);
  };

  const handleSaveTactics = async () => {
    if (!selectedMatch) return;
    await saveTacticsNotes(selectedMatch.id, tacticsNotes, selectedMatch.sport === "football" ? formation : undefined);
  };

  const slots = selectedMatch?.sport === "football" ? FORMATIONS[formation] || FORMATIONS["4-3-3"] : GENERIC_SLOTS;
  const isPitch = selectedMatch?.sport === "football";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Trophy className="h-8 w-8 text-primary" />
            {t("matchCenter")}
          </h1>
          <p className="text-muted-foreground">{t("matchCenterDescription")}</p>
        </div>
        <Button onClick={() => setPlanDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> {t("planNewMatch")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t("lineupAndTactics")}</CardTitle>
                <CardDescription>
                  {selectedMatch
                    ? `${t("vs")} ${selectedMatch.opponent} · ${format(parseISO(selectedMatch.date), "PPP", { locale })}`
                    : t("lineupAndTacticsDescription")}
                </CardDescription>
              </div>
              {isPitch && (
                <Select value={formation} onValueChange={setFormation}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(FORMATIONS).map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardHeader>
            <CardContent>
              {!selectedMatch ? (
                <div className="flex items-center justify-center text-center text-muted-foreground h-64 border-2 border-dashed rounded-lg p-4">
                  <p>{t("addPlayersToLineup")}</p>
                </div>
              ) : isPitch ? (
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
                    const assignedUid = selectedMatch.lineup[slot.id];
                    const assignedPlayer = players.find((p) => p.uid === assignedUid);
                    return (
                      <Popover key={slot.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                            className={cn(
                              "absolute -translate-x-1/2 -translate-y-1/2 h-11 w-11 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-sm transition-colors",
                              assignedPlayer
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/80 border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/60"
                            )}
                          >
                            {assignedPlayer ? initials(assignedPlayer.displayName) : slot.label}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="center">
                          <LineupSlotMenu
                            slotLabel={slot.label}
                            players={players}
                            assignedUid={assignedUid}
                            onSelect={(uid) => setLineupSlot(selectedMatch.id, slot.id, uid)}
                            t={t}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {slots.map((slot) => {
                    const assignedUid = selectedMatch.lineup[slot.id];
                    const assignedPlayer = players.find((p) => p.uid === assignedUid);
                    return (
                      <Popover key={slot.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent/50 transition-colors"
                          >
                            <span className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                              {slot.label}
                            </span>
                            {assignedPlayer ? (
                              <span className="flex items-center gap-2 font-medium">
                                {assignedPlayer.displayName}
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-[10px]">
                                    {initials(assignedPlayer.displayName)}
                                  </AvatarFallback>
                                </Avatar>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{t("emptySlot")}</span>
                            )}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-0" align="end">
                          <LineupSlotMenu
                            slotLabel={slot.label}
                            players={players}
                            assignedUid={assignedUid}
                            onSelect={(uid) => setLineupSlot(selectedMatch.id, slot.id, uid)}
                            t={t}
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("matchSchedule")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">{t("upcoming")}</h4>
                {upcomingMatches.length === 0 ? (
                  <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                    {t("noUpcomingMatches")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingMatches.map((match) => (
                      <div
                        key={match.id}
                        onClick={() => setSelectedMatchId(match.id)}
                        className={cn(
                          "rounded-lg border p-3 space-y-1 cursor-pointer transition-colors",
                          selectedMatch?.id === match.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">{match.opponent}</span>
                          <Badge variant="outline" className="shrink-0">
                            {match.homeAway === "home" ? t("homeFixture") : t("awayFixture")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />
                          {format(parseISO(match.date), "PP", { locale })}
                          {match.time && (
                            <>
                              <Clock className="h-3 w-3 ml-1" />
                              {match.time}
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {match.venue}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              setResultTarget(match);
                            }}
                          >
                            {t("recordResult")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(match);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">{t("pastResults")}</h4>
                {pastMatches.length === 0 ? (
                  <div className="p-3 bg-muted rounded-lg text-center text-muted-foreground text-sm">
                    {t("noPastMatches")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pastMatches.map((match) => {
                      const result = getMatchResult(match);
                      return (
                        <div
                          key={match.id}
                          onClick={() => setSelectedMatchId(match.id)}
                          className={cn(
                            "rounded-lg border p-3 space-y-1 cursor-pointer transition-colors",
                            selectedMatch?.id === match.id ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium truncate">{match.opponent}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              {match.score && (
                                <span className="text-sm font-semibold tabular-nums">
                                  {match.score.home} - {match.score.away}
                                </span>
                              )}
                              {result && (
                                <Badge variant="outline" className={resultBadgeClass(result)}>
                                  {t(result)}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              {format(parseISO(match.date), "PP", { locale })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(match);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("tacticsAndAnalysis")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                placeholder={t("notesForTeam")}
                rows={5}
                value={tacticsNotes}
                onChange={(e) => setTacticsNotes(e.target.value)}
                disabled={!selectedMatch}
              />
              <Button className="w-full" onClick={handleSaveTactics} disabled={!selectedMatch}>
                {t("saveNotes")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("planNewMatch")}</DialogTitle>
            <DialogDescription>{t("matchCenterDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitMatch)} className="space-y-4">
              <FormField
                control={form.control}
                name="opponent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("matchOpponent")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("footballOpponentPlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("matchTime")} <span className="text-muted-foreground">({t("optional")})</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="homeAway"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("matchHomeAway")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="home">{t("home")}</SelectItem>
                          <SelectItem value="away">{t("away")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="venue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("matchVenue")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("matchVenuePlaceholder")} {...field} />
                    </FormControl>
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

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setPlanDialogOpen(false)}>
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

      <Dialog open={!!resultTarget} onOpenChange={(open) => !open && setResultTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("recordResult")}</DialogTitle>
            <DialogDescription>
              {resultTarget && `${t("vs")} ${resultTarget.opponent}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <FormLabel>{t("homeScore")}</FormLabel>
              <Input type="number" min={0} value={homeScoreInput} onChange={(e) => setHomeScoreInput(e.target.value)} />
            </div>
            <div className="space-y-2">
              <FormLabel>{t("awayScore")}</FormLabel>
              <Input type="number" min={0} value={awayScoreInput} onChange={(e) => setAwayScoreInput(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setResultTarget(null)}>
              {t("cancel")}
            </Button>
            <Button onClick={submitResult}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && t("confirmDeleteItem", { title: `${t("vs")} ${deleteTarget.opponent}` })}
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

function LineupSlotMenu({
  slotLabel,
  players,
  assignedUid,
  onSelect,
  t,
}: {
  slotLabel: string;
  players: Player[];
  assignedUid?: string;
  onSelect: (uid: string | null) => void;
  t: (key: any, options?: Record<string, string | number>) => string;
}) {
  return (
    <>
      <div className="p-2 border-b flex items-center justify-between">
        <span className="text-sm font-medium">{slotLabel}</span>
        {assignedUid && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onSelect(null)}>
            <X className="h-3 w-3 mr-1" /> {t("clearSlot")}
          </Button>
        )}
      </div>
      <ScrollArea className="h-48">
        <div className="p-1">
          {players.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">{t("noPlayersFound")}</p>
          ) : (
            players.map((p) => (
              <button
                key={p.uid}
                onClick={() => onSelect(p.uid)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md p-2 text-sm hover:bg-accent text-left",
                  assignedUid === p.uid && "bg-accent"
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{initials(p.displayName)}</AvatarFallback>
                </Avatar>
                <span className="truncate">{p.displayName}</span>
              </button>
            ))
          )}
        </div>
      </ScrollArea>
    </>
  );
}
