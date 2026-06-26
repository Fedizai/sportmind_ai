
"use client";

import { useMemo, useState } from "react";
import { format, parseISO, formatDistanceToNow, type Locale } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import {
  Users,
  Search,
  SlidersHorizontal,
  UserPlus,
  User as UserIcon,
  Loader2,
  Mail,
  Cake,
  Dumbbell,
  Trophy,
  Trash2,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeam } from "@/hooks/use-team";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useTrainingSessions, type SessionType, type AttendanceStatus } from "@/hooks/use-training-sessions";
import { useCoachNotes } from "@/hooks/use-coach-notes";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKey } from "@/lib/i18n";
import { TennisBallIcon } from "@/components/icons";

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

export default function TeamPage() {
  const { players, isLoading, error } = useTeam();
  const [search, setSearch] = useState("");
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(null);
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;

  const filteredPlayers = players.filter(player =>
    player.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case "available":
        return <Badge variant="default" className="bg-green-500/20 text-green-500 border-green-500/20 capitalize">{t('available')}</Badge>;
      case "injured":
        return <Badge variant="destructive" className="capitalize">{t('injured')}</Badge>;
      case "suspended":
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/20 capitalize">{t('suspended')}</Badge>;
      default:
        return <Badge variant="secondary" className="capitalize">{status || t('unknown')}</Badge>;
    }
  };

  const renderLoadingState = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
            <Card key={index}>
                <CardContent className="p-4 flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-5 w-1/4" />
                    </div>
                </CardContent>
                <CardFooter className="p-2 border-t flex justify-around">
                   <Skeleton className="h-8 w-8 rounded-md" />
                   <Skeleton className="h-8 w-8 rounded-md" />
                   <Skeleton className="h-8 w-8 rounded-md" />
                </CardFooter>
            </Card>
        ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              {t('teamManagement')}
            </h1>
            <p className="text-muted-foreground">
              {t('teamManagementDescription')}
            </p>
        </div>
        <Button><UserPlus className="mr-2 h-4 w-4" /> {t('addPlayer')}</Button>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>{t('playerRoster')}</CardTitle>
              <CardDescription>{t('playerRosterDescription')}</CardDescription>
               <div className="flex items-center gap-4 pt-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        placeholder={t('searchPlayers')}
                        className="pl-10"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline"><SlidersHorizontal className="mr-2 h-4 w-4" /> {t('filters')}</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>Filtrer par Poste</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Attaquant</DropdownMenuItem>
                    <DropdownMenuItem>Milieu</DropdownMenuItem>
                    <DropdownMenuItem>Défenseur</DropdownMenuItem>
                    <DropdownMenuItem>Gardien de but</DropdownMenuItem>
                     <DropdownMenuSeparator />
                     <DropdownMenuLabel>Filtrer par Statut</DropdownMenuLabel>
                     <DropdownMenuItem>Disponible</DropdownMenuItem>
                     <DropdownMenuItem>Blessé</DropdownMenuItem>
                     <DropdownMenuItem>Suspendu</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? renderLoadingState() :
             error ? <p className="text-destructive">Erreur lors du chargement des joueurs: {error.message}</p> :
             filteredPlayers.length === 0 ? (
                <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-64 flex items-center justify-center">
                    <div className="text-muted-foreground">
                        <UserPlus className="h-10 w-10 mx-auto mb-2" />
                        <p className="font-semibold">{t('noPlayersFound')}</p>
                        <p className="text-sm">{t('noPlayersFoundDescription')}</p>
                    </div>
                </div>
             ) :
             (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlayers.map(player => (
                    <Card
                      key={player.uid}
                      className="hover:border-primary transition-colors group cursor-pointer"
                      onClick={() => setSelectedPlayerUid(player.uid)}
                    >
                        <CardContent className="p-4 flex items-center gap-4">
                            <Avatar className="h-16 w-16">
                                <AvatarImage src={`https://placehold.co/128x128.png?text=${player.displayName?.charAt(0)}`} alt={player.displayName || 'Player'} data-ai-hint="player portrait" />
                                <AvatarFallback>{player.displayName?.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow space-y-1">
                                <h3 className="font-semibold">{player.displayName}</h3>
                                <p className="text-sm text-muted-foreground">{player.position}</p>
                                {getStatusBadge(player.status)}
                            </div>
                        </CardContent>
                        <CardFooter className="p-2 border-t">
                            <Button variant="ghost" size="sm" className="w-full">
                                <UserIcon className="h-4 w-4 mr-2" /> {t('playerProfile')}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
             </div>)}
          </CardContent>
      </Card>

      <PlayerProfileSheet
        uid={selectedPlayerUid}
        onClose={() => setSelectedPlayerUid(null)}
        t={t}
        locale={locale}
      />
    </div>
  );
}

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

function attendanceLabel(status: AttendanceStatus | undefined, t: TFn) {
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
}

function attendanceBadgeClass(status: AttendanceStatus | undefined) {
  switch (status) {
    case "present":
      return "bg-green-600/15 text-green-500 border-green-600/30";
    case "absent":
      return "bg-red-600/15 text-red-500 border-red-600/30";
    case "excused":
      return "bg-yellow-600/15 text-yellow-500 border-yellow-600/30";
    default:
      return "";
  }
}

function PlayerProfileSheet({
  uid,
  onClose,
  t,
  locale,
}: {
  uid: string | null;
  onClose: () => void;
  t: TFn;
  locale: Locale;
}) {
  const { profile, updateStatus } = useUserProfile(uid);
  const { sessions } = useTrainingSessions();
  const { notes, addNote, deleteNote } = useCoachNotes(uid);
  const [noteText, setNoteText] = useState("");

  const recentSessions = useMemo(() => {
    if (!uid) return [];
    return sessions
      .filter((s) => s.assignedPlayers.includes(uid))
      .slice()
      .reverse()
      .slice(0, 10);
  }, [sessions, uid]);

  const attendancePercent = useMemo(() => {
    if (recentSessions.length === 0 || !uid) return 0;
    const present = recentSessions.filter((s) => s.attendance[uid] === "present").length;
    return Math.round((present / recentSessions.length) * 100);
  }, [recentSessions, uid]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addNote(noteText);
    setNoteText("");
  };

  return (
    <Sheet open={!!uid} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        {!profile ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={`https://placehold.co/128x128.png?text=${profile.displayName?.charAt(0)}`} alt={profile.displayName || "Player"} />
                  <AvatarFallback>{initials(profile.displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <SheetTitle>{profile.displayName}</SheetTitle>
                  <SheetDescription>{t("playerProfile")}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="profile" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">{t("profile")}</TabsTrigger>
                <TabsTrigger value="attendance">{t("attendance")}</TabsTrigger>
                <TabsTrigger value="notes">{t("notes")}</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{t("status")}</p>
                  <Select
                    value={profile.status || "available"}
                    onValueChange={(value) => updateStatus(value as "available" | "injured" | "suspended")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{t("available")}</SelectItem>
                      <SelectItem value="injured">{t("injured")}</SelectItem>
                      <SelectItem value="suspended">{t("suspended")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {profile.email}
                  </div>
                  {profile.age && (
                    <div className="flex items-center gap-2">
                      <Cake className="h-4 w-4 text-muted-foreground" /> <strong>{t("age")}:</strong> {profile.age}
                    </div>
                  )}
                  {profile.mainGoal && (
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" /> <strong>{t("mainGoal")}:</strong>{" "}
                      <span className="capitalize">{profile.mainGoal.replace("_", " ")}</span>
                    </div>
                  )}
                </div>

                {profile.sports && profile.sports.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.sports.map((sport) => (
                      <Badge key={sport} variant="secondary" className="capitalize">
                        {t(sport as TranslationKey)}
                      </Badge>
                    ))}
                  </div>
                )}

                {(profile.footballProfile || profile.gymProfile || profile.tennisProfile) && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {profile.footballProfile && (
                        <div className="text-xs p-2 bg-muted rounded-md">
                          <Trophy className="h-3 w-3 inline mr-1" /> <strong>{t("footballProfile")}:</strong> Position{" "}
                          {profile.footballProfile.position}, {profile.footballProfile.inClub ? t("inAClub") : t("notInAClub")}.
                        </div>
                      )}
                      {profile.gymProfile && (
                        <div className="text-xs p-2 bg-muted rounded-md">
                          <Dumbbell className="h-3 w-3 inline mr-1" /> <strong>{t("gymProfile")}:</strong>{" "}
                          {profile.gymProfile.height}cm, {profile.gymProfile.weight}kg. Goal: {profile.gymProfile.goal?.replace("_", " ")}.
                        </div>
                      )}
                      {profile.tennisProfile && (
                        <div className="text-xs p-2 bg-muted rounded-md">
                          <TennisBallIcon className="h-3 w-3 inline mr-1" /> <strong>{t("tennisProfile")}:</strong>{" "}
                          {profile.tennisProfile.level} level.{" "}
                          {profile.tennisProfile.ranking ? `Ranking: ${profile.tennisProfile.ranking}` : ""}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="attendance" className="space-y-4 mt-4">
                {recentSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("noAttendanceHistory")}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t("attendanceSummary", { percent: attendancePercent, count: recentSessions.length })}
                    </p>
                    <div className="space-y-2">
                      {recentSessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                          <div>
                            <p className="font-medium">{format(parseISO(session.date), "PP", { locale })}</p>
                            <p className="text-xs text-muted-foreground">
                              {sessionTypeLabel(session.type, t)} · {session.location}
                            </p>
                          </div>
                          <Badge variant="outline" className={attendanceBadgeClass(session.attendance[uid || ""])}>
                            {attendanceLabel(session.attendance[uid || ""], t)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Textarea
                    placeholder={t("notePlaceholder")}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={handleAddNote} disabled={!noteText.trim()} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> {t("addNote")}
                  </Button>
                </div>
                <Separator />
                {notes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">{t("noNotesYet")}</p>
                ) : (
                  <ScrollArea className="h-64">
                    <div className="space-y-3 pr-3">
                      {notes.map((note) => (
                        <div key={note.id} className="rounded-lg border p-3 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm">{note.text}</p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              title={t("deleteNote")}
                              onClick={() => deleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {note.createdByName}
                            {note.createdAt ? ` · ${formatDistanceToNow(note.createdAt.toDate(), { addSuffix: true, locale })}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
