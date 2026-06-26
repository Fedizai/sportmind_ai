"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
import { ArrowLeft, Target, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/hooks/use-translation";
import type { TranslationKey } from "@/lib/i18n";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { useGoals, type Goal, type GoalSport } from "@/hooks/use-goals";
import { useTrainingSessions } from "@/hooks/use-training-sessions";
import { useStreakStore } from "@/stores/streak-store";
import { computeAchievements } from "@/lib/achievements";
import { cn } from "@/lib/utils";

const SPORT_OPTIONS: { value: GoalSport; labelKey: TranslationKey }[] = [
  { value: "general", labelKey: "general" },
  { value: "football", labelKey: "football" },
  { value: "tennis", labelKey: "tennis" },
  { value: "gym", labelKey: "gym" },
  { value: "nutrition", labelKey: "nutrition" },
];

export default function GoalsPage() {
  const { t, language } = useTranslation();
  const locale = language === "fr" ? fr : enUS;
  const { user } = useUser();
  const { toast } = useToast();
  const { goals, addGoal, updateGoalProgress, deleteGoal } = useGoals(user?.uid);
  const { sessions } = useTrainingSessions();
  const { streak } = useStreakStore();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [sport, setSport] = useState<GoalSport>("general");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("0");
  const [unit, setUnit] = useState("");
  const [deadline, setDeadline] = useState("");

  const activeGoals = useMemo(() => goals.filter((g) => g.currentValue < g.targetValue), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => g.currentValue >= g.targetValue), [goals]);

  const sessionsAttended = useMemo(() => {
    if (!user) return 0;
    return sessions.filter((s) => s.attendance[user.uid] === "present").length;
  }, [sessions, user]);

  const achievements = useMemo(
    () =>
      computeAchievements({
        streak,
        sessionsAttended,
        goalsCreated: goals.length,
        goalsCompleted: completedGoals.length,
      }),
    [streak, sessionsAttended, goals.length, completedGoals.length]
  );

  const sportLabel = (s: GoalSport) => t(SPORT_OPTIONS.find((o) => o.value === s)?.labelKey ?? "general");

  const resetForm = () => {
    setTitle("");
    setSport("general");
    setTargetValue("");
    setCurrentValue("0");
    setUnit("");
    setDeadline("");
  };

  const handleAddGoal = async () => {
    const target = parseFloat(targetValue);
    const current = parseFloat(currentValue) || 0;
    if (!title.trim() || !unit.trim() || isNaN(target) || target <= 0) return;
    await addGoal({
      title: title.trim(),
      sport,
      targetValue: target,
      currentValue: current,
      unit: unit.trim(),
      deadline: deadline || undefined,
    });
    resetForm();
    setDialogOpen(false);
  };

  const handleUpdateProgress = async (goal: Goal, newValue: number) => {
    await updateGoalProgress(goal.id, newValue);
    if (newValue >= goal.targetValue && goal.currentValue < goal.targetValue) {
      toast({ title: t("goalCompletedToast") });
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToDashboard")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            {t("myGoalsTitle")}
          </h1>
          <p className="text-muted-foreground">{t("myGoalsSubtitle")}</p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("addGoal")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newGoal")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>{t("goalTitleLabel")}</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("goalTitlePlaceholder")} />
              </div>
              <div className="space-y-2">
                <Label>{t("sport")}</Label>
                <Select value={sport} onValueChange={(v) => setSport(v as GoalSport)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {t(o.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("targetValue")}</Label>
                  <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t("unit")}</Label>
                  <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={t("unitPlaceholder")} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("currentValue")}</Label>
                <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("deadlineOptional")}</Label>
                <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button onClick={handleAddGoal}>{t("save")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals">{t("goalsTab")}</TabsTrigger>
          <TabsTrigger value="achievements">{t("achievementsTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6 mt-6">
          {goals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">{t("noGoalsYet")}</CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">{t("activeGoals")}</h2>
                {activeGoals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("noGoalsYet")}</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {activeGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        t={t}
                        locale={locale}
                        sportLabel={sportLabel}
                        onUpdateProgress={handleUpdateProgress}
                        onDelete={deleteGoal}
                      />
                    ))}
                  </div>
                )}
              </div>

              {completedGoals.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold">{t("completedGoals")}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {completedGoals.map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        t={t}
                        locale={locale}
                        sportLabel={sportLabel}
                        onUpdateProgress={handleUpdateProgress}
                        onDelete={deleteGoal}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4 mt-6">
          <p className="text-sm text-muted-foreground">{t("achievementsSubtitle")}</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievements.map((a) => (
              <Card key={a.id} className={cn("flex items-center gap-4 p-4", !a.unlocked && "opacity-50")}>
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
                    a.unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <a.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t(a.titleKey, { n: a.n })}</p>
                  <p className="text-sm text-muted-foreground">{t(a.descKey, { n: a.n })}</p>
                </div>
                <Badge variant={a.unlocked ? "default" : "secondary"} className="shrink-0">
                  {a.unlocked ? t("unlocked") : t("locked")}
                </Badge>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GoalCard({
  goal,
  t,
  locale,
  sportLabel,
  onUpdateProgress,
  onDelete,
}: {
  goal: Goal;
  t: (key: TranslationKey, options?: Record<string, string | number>) => string;
  locale: Locale;
  sportLabel: (sport: GoalSport) => string;
  onUpdateProgress: (goal: Goal, value: number) => void;
  onDelete: (id: string) => void;
}) {
  const [value, setValue] = useState(String(goal.currentValue));
  const percent = goal.targetValue > 0 ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100)) : 0;
  const isCompleted = goal.currentValue >= goal.targetValue;

  const handleUpdate = () => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onUpdateProgress(goal, num);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <CardDescription>{sportLabel(goal.sport)}</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(goal.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {goal.currentValue} / {goal.targetValue} {goal.unit}
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <Progress value={percent} />
        {goal.deadline && (
          <p className="text-xs text-muted-foreground">{format(parseISO(goal.deadline), "PP", { locale })}</p>
        )}
        {!isCompleted && (
          <div className="flex items-center gap-2 pt-1">
            <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="h-8 w-24" />
            <Button size="sm" variant="outline" onClick={handleUpdate}>
              {t("updateProgress")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
