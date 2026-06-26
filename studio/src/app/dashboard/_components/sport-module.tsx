"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { useTranslation } from "@/hooks/use-translation";
import { saveSportEntry, deleteSportEntry } from "./sport-actions";
import { type SportConfig, type Bi, type RecapKind, type Exercise, type ExerciseLevel, pick } from "@/lib/sport-configs";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarIcon, Bot, Sparkles, BrainCircuit, Plus, CheckCircle, Trash2, Activity, CalendarDays, ClipboardList, Check, Dumbbell, Edit, Video, Lock, Play, Square, TimerReset, Target, ListChecks } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UpgradeProModal } from "@/components/upgrade-pro-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

type CompletedExercise = { name: string; completedAt: Date };

type SportEntry = {
    id: string;
    primary: string;
    summary?: string;
    result?: string | null;
    stats: Record<string, number>;
    notes?: string;
    date: Date;
};

type ScheduleItem = {
    id: number;
    title: string;
    type: "technical" | "tactical" | "physical" | "other";
    duration: number;
    notes?: string;
    date: Date | null;
    completed: boolean;
};

// --- Local bilingual strings (keeps the module fully EN/FR without bloating i18n.ts) ---
const S = {
    overview: { en: "Overview", fr: "Aperçu" },
    training: { en: "Training", fr: "Entraînement" },
    logbook: { en: "Logbook", fr: "Journal" },
    exercises: { en: "Exercises", fr: "Exercices" },
    video: { en: "Video", fr: "Vidéo" },
    aiCoach: { en: "AI Coach", fr: "Coach IA" },
    coachFocus: { en: "Coach's Focus", fr: "Point du Coach" },
    currentGoal: { en: "Current Goal", fr: "Objectif Actuel" },
    setGoal: { en: "Set a Goal", fr: "Définir un Objectif" },
    setNewGoal: { en: "Set a New Goal", fr: "Définir un Nouvel Objectif" },
    editGoal: { en: "Edit Goal", fr: "Modifier l'Objectif" },
    goalPrompt: { en: "What do you want to focus on next?", fr: "Sur quoi veux-tu te concentrer ?" },
    goalPlaceholder: { en: "e.g. Improve my consistency", fr: "ex. Améliorer ma régularité" },
    saveGoal: { en: "Save Goal", fr: "Enregistrer" },
    weeklyRecap: { en: "Weekly Recap", fr: "Récap de la Semaine" },
    weeklyRecapDescription: { en: "A snapshot of your recent activity.", fr: "Un aperçu de ton activité récente." },
    progressRadar: { en: "Progress Radar", fr: "Radar de Progression" },
    progressRadarDescription: { en: "Your current skill profile across key areas.", fr: "Ton profil de compétences actuel par domaine clé." },
    drillHistory: { en: "Exercise History", fr: "Historique des Exercices" },
    drillHistoryDescription: { en: "Your last 5 completed exercises.", fr: "Tes 5 derniers exercices terminés." },
    noDrills: { en: "No exercises completed yet — start one from the Exercises tab.", fr: "Aucun exercice terminé — démarres-en un depuis l'onglet Exercices." },
    trainingSchedule: { en: "Training Schedule", fr: "Programme d'Entraînement" },
    trainingScheduleDescription: { en: "Plan and track your training sessions.", fr: "Planifie et suis tes séances d'entraînement." },
    addSession: { en: "Add Session", fr: "Ajouter une Séance" },
    addSessionDescription: { en: "Schedule a new training session.", fr: "Planifie une nouvelle séance." },
    sessionName: { en: "Session Name", fr: "Nom de la Séance" },
    sessionNamePlaceholder: { en: "e.g. Speed & agility", fr: "ex. Vitesse & agilité" },
    sessionType: { en: "Type", fr: "Type" },
    technical: { en: "Technical", fr: "Technique" },
    tactical: { en: "Tactical", fr: "Tactique" },
    physical: { en: "Physical", fr: "Physique" },
    other: { en: "Other", fr: "Autre" },
    duration: { en: "Duration (mins)", fr: "Durée (min)" },
    date: { en: "Date", fr: "Date" },
    pickADate: { en: "Pick a date", fr: "Choisir une date" },
    notes: { en: "Notes", fr: "Notes" },
    notesPlaceholder: { en: "Optional notes...", fr: "Notes optionnelles..." },
    saveSession: { en: "Save Session", fr: "Enregistrer la Séance" },
    upcomingSessions: { en: "Sessions", fr: "Séances" },
    noSessions: { en: "No sessions scheduled for this day.", fr: "Aucune séance prévue ce jour." },
    mins: { en: "mins", fr: "min" },
    deleteSessionTitle: { en: "Delete this session?", fr: "Supprimer cette séance ?" },
    deleteSessionDesc: { en: "This will permanently remove the session.", fr: "Cela supprimera définitivement la séance." },
    finalResult: { en: "Result", fr: "Résultat" },
    selectResult: { en: "Select result", fr: "Choisir le résultat" },
    dateOf: { en: "Date", fr: "Date" },
    save: { en: "Save", fr: "Enregistrer" },
    saving: { en: "Saving...", fr: "Enregistrement..." },
    cancel: { en: "Cancel", fr: "Annuler" },
    delete: { en: "Delete", fr: "Supprimer" },
    areYouSure: { en: "Are you sure?", fr: "Es-tu sûr ?" },
    deleteEntryConfirm: { en: "This entry will be permanently deleted.", fr: "Cette entrée sera définitivement supprimée." },
    exerciseLibrary: { en: "Exercise Library", fr: "Bibliothèque d'Exercices" },
    exerciseLibraryDesc: { en: "Curated drills, organised by focus area. Pick one and run the timer.", fr: "Exercices sélectionnés, classés par domaine. Choisis-en un et lance le chrono." },
    prescription: { en: "Prescription", fr: "Prescription" },
    coachingCues: { en: "Coaching cues", fr: "Points clés" },
    howTo: { en: "How to perform", fr: "Comment l'exécuter" },
    startExercise: { en: "Start", fr: "Démarrer" },
    beginner: { en: "Beginner", fr: "Débutant" },
    intermediate: { en: "Intermediate", fr: "Intermédiaire" },
    advanced: { en: "Advanced", fr: "Avancé" },
    stopwatch: { en: "Timer", fr: "Chrono" },
    close: { en: "Close", fr: "Fermer" },
    markComplete: { en: "Mark as Complete", fr: "Marquer comme Terminé" },
    comingSoon: { en: "Coming Soon", fr: "Bientôt Disponible" },
    comingSoonDesc: { en: "This feature is under development. Check back soon.", fr: "Cette fonctionnalité est en développement. Reviens bientôt." },
    videoAnalysis: { en: "Video Analysis", fr: "Analyse Vidéo" },
    videoAnalysisDesc: { en: "Upload footage and get form feedback.", fr: "Téléverse une vidéo et obtiens une analyse de ta technique." },
    aiCoachTitle: { en: "AI Coach", fr: "Coach IA" },
    aiCoachDesc: { en: "Ask tactical questions and get expert guidance.", fr: "Pose tes questions tactiques et obtiens des conseils d'expert." },
    start: { en: "Start", fr: "Démarrer" },
    stop: { en: "Stop", fr: "Arrêter" },
    reset: { en: "Reset", fr: "Réinitialiser" },
    drillDone: { en: "Exercise complete — nice work!", fr: "Exercice terminé — beau travail !" },
    goalSet: { en: "Goal updated", fr: "Objectif mis à jour" },
    goalDone: { en: "Goal completed!", fr: "Objectif atteint !" },
    entrySaved: { en: "Entry saved", fr: "Entrée enregistrée" },
    entryDeleted: { en: "Entry deleted", fr: "Entrée supprimée" },
    sessionAdded: { en: "Session added", fr: "Séance ajoutée" },
    sessionRemoved: { en: "Session removed", fr: "Séance supprimée" },
    error: { en: "Something went wrong", fr: "Une erreur est survenue" },
    loginRequired: { en: "You must be logged in.", fr: "Tu dois être connecté." },
    athlete: { en: "Athlete", fr: "Athlète" },
    logFirst: { en: "Log your first entry to start tracking your performance.", fr: "Enregistre ta première entrée pour suivre ta performance." },
} satisfies Record<string, Bi>;

const LEVEL_LABEL: Record<ExerciseLevel, Bi> = {
    beginner: S.beginner,
    intermediate: S.intermediate,
    advanced: S.advanced,
};

function LevelBars({ level }: { level: ExerciseLevel }) {
    const filled = level === "beginner" ? 1 : level === "intermediate" ? 2 : 3;
    return (
        <span className="inline-flex items-end gap-[3px]" aria-hidden>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className={cn("w-[3px] rounded-full", i < filled ? "bg-foreground/70" : "bg-muted-foreground/25")}
                    style={{ height: `${5 + i * 3}px` }}
                />
            ))}
        </span>
    );
}

const Stopwatch = ({ startLabel, stopLabel, resetLabel }: { startLabel: string; stopLabel: string; resetLabel: string }) => {
    const [time, setTime] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => setTime((prev) => prev + 10), 10);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [isActive]);

    const formatTime = (ms: number) => {
        const minutes = Math.floor(ms / 60000).toString().padStart(2, "0");
        const seconds = Math.floor((ms % 60000) / 1000).toString().padStart(2, "0");
        const millis = (ms % 1000).toString().padStart(3, "0").slice(0, 2);
        return `${minutes}:${seconds}.${millis}`;
    };

    return (
        <div className={cn("text-center rounded-xl p-5 bg-muted/60 border border-white/[0.05]", isActive && "glow-primary-sm border-primary/30")}>
            <p className="font-mono text-5xl font-bold tracking-tighter mb-4 tabular-nums">{formatTime(time)}</p>
            <div className="flex justify-center gap-3">
                <Button size="lg" onClick={() => setIsActive(!isActive)} className={cn(!isActive && "btn-primary-3d")}>
                    {isActive ? <Square className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                    {isActive ? stopLabel : startLabel}
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setIsActive(false); setTime(0); }}>
                    <TimerReset className="mr-2 h-5 w-5" /> {resetLabel}
                </Button>
            </div>
        </div>
    );
};

const RADAR_PROFILE = [82, 76, 88, 79, 85];

export default function SportModuleClient({ config }: { config: SportConfig }) {
    const { user } = useUser();
    const { toast } = useToast();
    const { language } = useTranslation();
    const reduce = useReducedMotion();
    const tr = (b: Bi) => pick(b, language);

    const [entries, setEntries] = useState<SportEntry[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const searchParams = useSearchParams();

    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);

    const [goal, setGoal] = useState<string | null>(null);
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

    const [exerciseCategory, setExerciseCategory] = useState(config.exerciseCategories[0]?.key ?? "");
    const [activeExercise, setActiveExercise] = useState<Exercise | null>(null);
    const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
    const [completedExercises, setCompletedExercises] = useState<CompletedExercise[]>([]);

    // --- Dynamic entry form schema, built from the sport config ---
    const entrySchema = useMemo(() => {
        const shape: Record<string, z.ZodTypeAny> = {
            primary: z.string().min(1, "Required."),
            date: z.date(),
            notes: z.string().optional(),
        };
        if (config.summaryField) shape[config.summaryField.key] = z.string().optional();
        if (config.results) shape.result = z.string();
        config.statFields.forEach((f) => {
            shape[f.key] = z.coerce.number().min(0);
        });
        return z.object(shape);
    }, [config]);

    const entryDefaults = useMemo(() => {
        const d: Record<string, any> = { primary: "", date: new Date(), notes: "" };
        if (config.summaryField) d[config.summaryField.key] = "";
        if (config.results) d.result = config.results[0].value;
        config.statFields.forEach((f) => { d[f.key] = f.default ?? 0; });
        return d;
    }, [config]);

    const entryForm = useForm<Record<string, any>>({
        resolver: zodResolver(entrySchema),
        defaultValues: entryDefaults,
    });

    const goalForm = useForm<{ goal: string }>({ defaultValues: { goal: "" } });

    const sessionSchema = z.object({
        title: z.string().min(1, "Required."),
        type: z.enum(["technical", "tactical", "physical", "other"]),
        date: z.date(),
        duration: z.coerce.number().min(5),
        notes: z.string().optional(),
    });
    const addSessionForm = useForm<z.infer<typeof sessionSchema>>({
        resolver: zodResolver(sessionSchema),
        defaultValues: { title: "", type: "technical", date: new Date(), duration: 60, notes: "" },
    });

    // --- Firestore subscription ---
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, config.collection), where("userId", "==", user.uid), orderBy("date", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const rows: SportEntry[] = [];
            snap.forEach((doc) => {
                const data = doc.data();
                rows.push({
                    id: doc.id,
                    primary: data.primary ?? "",
                    summary: data.summary ?? "",
                    result: data.result ?? null,
                    stats: data.stats ?? {},
                    notes: data.notes ?? "",
                    date: data.date instanceof Timestamp ? data.date.toDate() : new Date(data.date),
                });
            });
            setEntries(rows);
        });
        return () => unsub();
    }, [user, config.collection]);

    // --- Tabs ---
    const tabsConfig = [
        { value: "overview", label: S.overview, icon: Activity, pro: false },
        { value: "training", label: S.training, icon: CalendarDays, pro: false },
        { value: "logbook", label: S.logbook, icon: ClipboardList, pro: false },
        { value: "exercises", label: S.exercises, icon: Dumbbell, pro: false },
        { value: "video", label: S.video, icon: Video, pro: true },
        { value: "coach", label: S.aiCoach, icon: BrainCircuit, pro: true },
    ];

    const handleTabChange = (value: string) => {
        const tab = tabsConfig.find((t) => t.value === value);
        if (tab?.pro && user?.plan !== "pro") setIsUpgradeModalOpen(true);
        else setActiveTab(value);
    };

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        const tab = tabsConfig.find((t) => t.value === tabParam);
        if (tab) {
            if (tab.pro && user?.plan !== "pro") setIsUpgradeModalOpen(true);
            else setActiveTab(tabParam!);
        }
    }, [searchParams, user]);

    // --- Entry handlers ---
    const handleLogSubmit = async (values: Record<string, any>) => {
        if (!user) { toast({ title: tr(S.error), description: tr(S.loginRequired), variant: "destructive" }); return; }
        setIsSubmitting(true);
        try {
            const stats: Record<string, number> = {};
            config.statFields.forEach((f) => { stats[f.key] = Number(values[f.key] ?? 0); });
            await saveSportEntry(config.collection, user.uid, {
                primary: values.primary,
                summary: config.summaryField ? values[config.summaryField.key] ?? "" : "",
                result: config.results ? values.result : null,
                stats,
                notes: values.notes ?? "",
                date: values.date,
            });
            entryForm.reset(entryDefaults);
            setIsLogOpen(false);
            toast({ title: tr(S.entrySaved) });
        } catch (e) {
            console.error(e);
            toast({ title: tr(S.error), variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteEntry = async (id: string) => {
        try {
            await deleteSportEntry(config.collection, id);
            toast({ title: tr(S.entryDeleted) });
        } catch {
            toast({ title: tr(S.error), variant: "destructive" });
        }
    };

    // --- Session handlers ---
    const handleAddSession = (values: z.infer<typeof sessionSchema>) => {
        setSchedule((prev) => [...prev, { id: Date.now(), ...values, date: values.date, completed: false }]
            .sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)));
        setIsAddSessionOpen(false);
        addSessionForm.reset({ title: "", type: "technical", date: new Date(), duration: 60, notes: "" });
        toast({ title: tr(S.sessionAdded) });
    };
    const handleDeleteSession = (id: number) => {
        setSchedule((prev) => prev.filter((s) => s.id !== id));
        toast({ title: tr(S.sessionRemoved) });
    };
    const handleToggleSession = (id: number) => {
        setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s)));
    };

    // --- Goal handlers ---
    const handleSetGoal = (values: { goal: string }) => {
        setGoal(values.goal);
        setIsGoalDialogOpen(false);
        toast({ title: tr(S.goalSet) });
    };
    const handleCompleteGoal = () => {
        toast({ title: tr(S.goalDone), description: goal ?? undefined });
        setGoal(null);
    };

    // --- Exercise handlers (curated, no AI) ---
    const handleStartExercise = (exercise: Exercise) => { setActiveExercise(exercise); setIsExerciseModalOpen(true); };
    const handleCompleteExercise = () => {
        if (!activeExercise) return;
        setCompletedExercises((prev) => [{ name: tr(activeExercise.name), completedAt: new Date() }, ...prev].slice(0, 5));
        setIsExerciseModalOpen(false);
        setActiveExercise(null);
        toast({ title: tr(S.drillDone) });
    };

    const visibleExercises = useMemo(
        () => config.exercises.filter((e) => e.category === exerciseCategory),
        [config.exercises, exerciseCategory],
    );

    // --- Analytics ---
    const computeRecap = (kind: RecapKind): number => {
        if (kind === "sessions") return schedule.length;
        if (kind === "count") return entries.length;
        if (kind === "wins") return entries.filter((e) => e.result === "W").length;
        if ("sum" in kind) return entries.reduce((s, e) => s + (e.stats[kind.sum] || 0), 0);
        if ("avg" in kind) {
            if (entries.length === 0) return 0;
            return Math.round(entries.reduce((s, e) => s + (e.stats[kind.avg] || 0), 0) / entries.length);
        }
        return 0;
    };

    const analytics = useMemo(() => {
        const last5 = entries.slice(0, 5).map((e) => ({
            label: e.primary.length > 10 ? e.primary.slice(0, 10) + "…" : e.primary,
            value: e.stats[config.charts.last5.key] || 0,
        })).reverse();

        const byMonth: Record<string, number> = {};
        entries.forEach((e) => {
            const m = format(e.date, "MMM");
            byMonth[m] = (byMonth[m] || 0) + (e.stats[config.charts.monthly.key] || 0);
        });
        const monthly = Object.keys(byMonth).map((m) => ({ month: m, value: byMonth[m] }));

        return { last5, monthly };
    }, [entries, config]);

    const radarData = config.radarSubjects.map((s, i) => ({ subject: tr(s), A: RADAR_PROFILE[i % RADAR_PROFILE.length], fullMark: 100 }));
    const radarChartConfig = { value: { label: "Current", color: "hsl(var(--primary))" } } satisfies ChartConfig;

    const cardStats = config.statFields.filter((f) => f.showOnCard).slice(0, 4);

    const resultMeta = (value?: string | null) => {
        const opt = config.results?.find((r) => r.value === value);
        const tone = opt?.tone ?? "muted";
        const map = {
            success: { bg: "bg-success/10", text: "text-success", bar: "bg-success" },
            danger: { bg: "bg-danger/10", text: "text-danger", bar: "bg-danger" },
            muted: { bg: "bg-card", text: "text-muted-foreground", bar: "bg-primary" },
        } as const;
        return { ...map[tone], label: opt ? tr(opt.label) : "" };
    };

    const triggerCls = "data-[state=active]:text-primary";

    const listContainer = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.05 } } };
    const listItem = {
        hidden: { opacity: 0, y: reduce ? 0 : 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
    };

    return (
        <>
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
                    {tabsConfig.map((tab) => (
                        <TabsTrigger key={tab.value} value={tab.value} className={triggerCls}>
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tr(tab.label)}
                            {tab.pro && user?.plan !== "pro" && <Lock className="h-3 w-3 ml-2 text-primary/80" />}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {/* OVERVIEW */}
                <TabsContent value="overview" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center gap-4">
                                    <Avatar className="h-20 w-20">
                                        <AvatarImage src="https://placehold.co/128x128.png" alt={user?.displayName || tr(S.athlete)} data-ai-hint="athlete portrait" />
                                        <AvatarFallback>{user?.displayName?.charAt(0) || "A"}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-2xl">{user?.displayName || tr(S.athlete)}</CardTitle>
                                        <CardDescription>{tr(config.sportName)}</CardDescription>
                                    </div>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4 text-primary" /> {tr(S.coachFocus)}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="rounded-xl bg-primary/[0.07] border border-primary/15 p-4">
                                        <p className="text-sm font-medium leading-relaxed text-foreground/90">{tr(config.aiInsight)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                                <Card className={cn("p-5 flex flex-col items-center justify-center text-primary transition-colors", goal ? "bg-primary/[0.07] border-primary/20" : "hover:border-primary/40")}>
                                    {goal ? (
                                        <>
                                            <div className="flex-grow text-center">
                                                <p className="text-sm font-bold flex items-center justify-center gap-1.5"><Target className="h-4 w-4" /> {tr(S.currentGoal)}</p>
                                                <p className="text-xs mt-1.5 text-foreground/80">{goal}</p>
                                            </div>
                                            <div className="flex gap-1 mt-3">
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCompleteGoal} aria-label={tr(S.markComplete)}><Check className="h-4 w-4 text-success" /></Button>
                                                <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7" aria-label={tr(S.editGoal)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                                            </div>
                                        </>
                                    ) : (
                                        <DialogTrigger asChild>
                                            <button className="text-center cursor-pointer w-full py-2">
                                                <Plus className="mx-auto h-8 w-8" /><p className="text-xs font-semibold mt-1">{tr(S.setGoal)}</p>
                                            </button>
                                        </DialogTrigger>
                                    )}
                                </Card>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>{goal ? tr(S.editGoal) : tr(S.setNewGoal)}</DialogTitle><DialogDescription>{tr(S.goalPrompt)}</DialogDescription></DialogHeader>
                                    <form onSubmit={goalForm.handleSubmit(handleSetGoal)} className="space-y-4">
                                        <Textarea {...goalForm.register("goal")} placeholder={tr(S.goalPlaceholder)} />
                                        <DialogFooter><Button type="submit">{tr(S.saveGoal)}</Button></DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>{tr(S.weeklyRecap)}</CardTitle><CardDescription>{tr(S.weeklyRecapDescription)}</CardDescription></CardHeader>
                                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {config.recap.map((tile, i) => (
                                        <div key={i} className="rounded-xl bg-muted/60 border border-white/[0.04] p-4">
                                            <p className="text-3xl font-bold tabular-nums tracking-tight">{computeRecap(tile.kind)}<span className="text-lg text-muted-foreground">{tile.suffix || ""}</span></p>
                                            <p className="text-xs text-muted-foreground mt-1">{tr(tile.label)}</p>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                            <div className="grid md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader><CardTitle>{tr(S.progressRadar)}</CardTitle><CardDescription>{tr(S.progressRadarDescription)}</CardDescription></CardHeader>
                                    <CardContent className="h-80 w-full p-0">
                                        <ChartContainer config={radarChartConfig} className="mx-auto aspect-square h-full w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                                    <PolarGrid gridType="circle" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                                    <Radar name="Athlete" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                                    <ChartTooltip content={<ChartTooltipContent />} />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle>{tr(S.drillHistory)}</CardTitle><CardDescription>{tr(S.drillHistoryDescription)}</CardDescription></CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-80">
                                            {completedExercises.length > 0 ? (
                                                <div className="space-y-3 pr-4">
                                                    {completedExercises.map((ex, i) => (
                                                        <div key={i} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                                                            <div className="flex-grow">
                                                                <p className="font-semibold">{ex.name}</p>
                                                                <p className="text-xs text-muted-foreground">{format(ex.completedAt, "PPp")}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3 px-6">
                                                    <Dumbbell className="h-8 w-8 opacity-40" />
                                                    <p className="text-sm max-w-[34ch]">{tr(S.noDrills)}</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* TRAINING */}
                <TabsContent value="training" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>{tr(S.trainingSchedule)}</CardTitle>
                                <CardDescription>{tr(S.trainingScheduleDescription)}</CardDescription>
                            </div>
                            <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> {tr(S.addSession)}</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>{tr(S.addSession)}</DialogTitle><DialogDescription>{tr(S.addSessionDescription)}</DialogDescription></DialogHeader>
                                    <form onSubmit={addSessionForm.handleSubmit(handleAddSession)} className="space-y-4">
                                        <div>
                                            <Label htmlFor="title">{tr(S.sessionName)}</Label>
                                            <Input id="title" {...addSessionForm.register("title")} placeholder={tr(S.sessionNamePlaceholder)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>{tr(S.sessionType)}</Label>
                                                <Select onValueChange={(v) => addSessionForm.setValue("type", v as any)} defaultValue={addSessionForm.getValues("type")}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="technical">{tr(S.technical)}</SelectItem>
                                                        <SelectItem value="tactical">{tr(S.tactical)}</SelectItem>
                                                        <SelectItem value="physical">{tr(S.physical)}</SelectItem>
                                                        <SelectItem value="other">{tr(S.other)}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label htmlFor="duration">{tr(S.duration)}</Label>
                                                <Input id="duration" type="number" {...addSessionForm.register("duration")} />
                                            </div>
                                        </div>
                                        <div>
                                            <Label>{tr(S.date)}</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !addSessionForm.watch("date") && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {addSessionForm.watch("date") ? format(addSessionForm.watch("date"), "PPP") : <span>{tr(S.pickADate)}</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                    <Calendar mode="single" selected={addSessionForm.watch("date")} onSelect={(d) => addSessionForm.setValue("date", d as Date)} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div>
                                            <Label htmlFor="notes">{tr(S.notes)}</Label>
                                            <Textarea id="notes" {...addSessionForm.register("notes")} placeholder={tr(S.notesPlaceholder)} />
                                        </div>
                                        <DialogFooter>
                                            <Button type="button" variant="ghost" onClick={() => setIsAddSessionOpen(false)}>{tr(S.cancel)}</Button>
                                            <Button type="submit">{tr(S.saveSession)}</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1">
                                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} className="rounded-md border" />
                            </div>
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="font-semibold text-lg">{tr(S.upcomingSessions)}</h3>
                                <ScrollArea className="h-72">
                                    <div className="space-y-4 pr-4">
                                        {schedule.filter((s) => !selectedDate || (s.date && s.date.toDateString() === selectedDate.toDateString())).length > 0 ? (
                                            schedule.filter((s) => !selectedDate || (s.date && s.date.toDateString() === selectedDate.toDateString())).map((session) => (
                                                <Card key={session.id} className="flex items-center p-4 gap-4">
                                                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                                        {session.type === "technical" && <Sparkles className="h-5 w-5 text-muted-foreground" />}
                                                        {session.type === "tactical" && <BrainCircuit className="h-5 w-5 text-muted-foreground" />}
                                                        {session.type === "physical" && <Dumbbell className="h-5 w-5 text-muted-foreground" />}
                                                        {session.type === "other" && <Activity className="h-5 w-5 text-muted-foreground" />}
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className={cn("font-semibold", session.completed && "line-through text-muted-foreground")}>{session.title}</p>
                                                        <p className="text-sm text-muted-foreground">{session.duration} {tr(S.mins)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Checkbox checked={session.completed} onCheckedChange={() => handleToggleSession(session.id)} id={`session-${session.id}`} />
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader><AlertDialogTitle>{tr(S.deleteSessionTitle)}</AlertDialogTitle><AlertDialogDescription>{tr(S.deleteSessionDesc)}</AlertDialogDescription></AlertDialogHeader>
                                                                <AlertDialogFooter><AlertDialogCancel>{tr(S.cancel)}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteSession(session.id)}>{tr(S.delete)}</AlertDialogAction></AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </Card>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-12">
                                                <CalendarDays className="h-8 w-8 opacity-40" />
                                                <p className="text-sm">{tr(S.noSessions)}</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* LOGBOOK */}
                <TabsContent value="logbook" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <CardTitle>{tr(config.logTitle)}</CardTitle>
                                <CardDescription>{tr(config.logDesc)}</CardDescription>
                            </div>
                            <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
                                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> {tr(config.logAddLabel)}</Button></DialogTrigger>
                                <DialogContent className="max-h-[90vh] overflow-y-auto">
                                    <DialogHeader><DialogTitle>{tr(config.logAddLabel)}</DialogTitle></DialogHeader>
                                    <form onSubmit={entryForm.handleSubmit(handleLogSubmit)} className="space-y-4">
                                        <div>
                                            <Label htmlFor="primary">{tr(config.primaryField.label)}</Label>
                                            <Input id="primary" {...entryForm.register("primary")} placeholder={tr(config.primaryField.placeholder)} />
                                            {entryForm.formState.errors.primary && <p className="text-destructive text-xs mt-1">{String(entryForm.formState.errors.primary.message)}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {config.summaryField && (
                                                <div>
                                                    <Label htmlFor="summary">{tr(config.summaryField.label)}</Label>
                                                    <Input id="summary" {...entryForm.register(config.summaryField.key)} placeholder={tr(config.summaryField.placeholder)} />
                                                </div>
                                            )}
                                            {config.results && (
                                                <div>
                                                    <Label>{tr(S.finalResult)}</Label>
                                                    <Select onValueChange={(v) => entryForm.setValue("result", v)} defaultValue={entryForm.getValues("result")}>
                                                        <SelectTrigger><SelectValue placeholder={tr(S.selectResult)} /></SelectTrigger>
                                                        <SelectContent>
                                                            {config.results.map((r) => <SelectItem key={r.value} value={r.value}>{tr(r.label)}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {config.statFields.map((f) => (
                                                <div key={f.key}>
                                                    <Label htmlFor={f.key}>{tr(f.label)}{f.suffix ? ` (${f.suffix})` : ""}</Label>
                                                    <Input id={f.key} type="number" step="any" {...entryForm.register(f.key)} />
                                                </div>
                                            ))}
                                        </div>
                                        <div>
                                            <Label>{tr(S.dateOf)}</Label>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !entryForm.watch("date") && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {entryForm.watch("date") ? format(entryForm.watch("date"), "PPP") : <span>{tr(S.pickADate)}</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={entryForm.watch("date")} onSelect={(d) => entryForm.setValue("date", d as Date)} disabled={(date) => date > new Date()} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <div>
                                            <Label htmlFor="entry-notes">{tr(S.notes)}</Label>
                                            <Textarea id="entry-notes" {...entryForm.register("notes")} placeholder={tr(S.notesPlaceholder)} />
                                        </div>
                                        <DialogFooter><Button type="submit" disabled={isSubmitting}>{isSubmitting ? tr(S.saving) : tr(S.save)}</Button></DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {entries.length > 0 ? entries.map((entry) => {
                                const meta = resultMeta(entry.result);
                                return (
                                    <Card key={entry.id} className={cn("overflow-hidden hover:border-primary/50 transition-colors group", meta.bg)}>
                                        <div className={cn("h-1.5 w-full", meta.bar)} />
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg text-foreground">{entry.primary}</p>
                                                    <p className={cn("text-sm font-semibold uppercase tracking-wide", meta.text)}>
                                                        {meta.label}{meta.label && entry.summary ? " — " : ""}{entry.summary}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm text-muted-foreground">{format(entry.date, "dd MMM yyyy")}</p>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader><AlertDialogTitle>{tr(S.areYouSure)}</AlertDialogTitle><AlertDialogDescription>{tr(S.deleteEntryConfirm)}</AlertDialogDescription></AlertDialogHeader>
                                                            <AlertDialogFooter><AlertDialogCancel>{tr(S.cancel)}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>{tr(S.delete)}</AlertDialogAction></AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </div>
                                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-border/20 pt-3">
                                                {cardStats.map((f) => (
                                                    <div key={f.key} className="text-foreground">
                                                        <p className="font-bold text-xl tabular-nums">{entry.stats[f.key] ?? 0}{f.suffix || ""}</p>
                                                        <p className="text-xs text-muted-foreground">{tr(f.label)}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-12">
                                    <ClipboardList className="h-9 w-9 opacity-40" />
                                    <p className="text-sm max-w-[40ch]">{tr(S.logFirst)}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    {entries.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle className="text-base">{tr(config.charts.last5.label)}</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{ value: { label: tr(config.charts.last5.label), color: "hsl(var(--primary))" } }} className="h-64">
                                        <BarChart data={analytics.last5} accessibilityLayer>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="label" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="value" fill="var(--color-value)" radius={4} />
                                        </BarChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle className="text-base">{tr(config.charts.monthly.label)}</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{ value: { label: tr(config.charts.monthly.label), color: "hsl(var(--chart-2))" } }} className="h-64">
                                        <AreaChart data={analytics.monthly} accessibilityLayer>
                                            <CartesianGrid vertical={false} />
                                            <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                            <YAxis />
                                            <ChartTooltip content={<ChartTooltipContent />} />
                                            <Area dataKey="value" type="natural" fill="var(--color-value)" fillOpacity={0.4} stroke="var(--color-value)" />
                                        </AreaChart>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* EXERCISES (curated, no AI) */}
                <TabsContent value="exercises" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{tr(S.exerciseLibrary)}</CardTitle>
                            <CardDescription>{tr(S.exerciseLibraryDesc)}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-2">
                                {config.exerciseCategories.map((cat) => {
                                    const active = exerciseCategory === cat.key;
                                    return (
                                        <button
                                            key={cat.key}
                                            onClick={() => setExerciseCategory(cat.key)}
                                            className={cn(
                                                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors border",
                                                active
                                                    ? "bg-primary text-primary-foreground border-primary glow-primary-sm"
                                                    : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground",
                                            )}
                                            aria-pressed={active}
                                        >
                                            {tr(cat.label)}
                                        </button>
                                    );
                                })}
                            </div>

                            <motion.div
                                key={exerciseCategory}
                                variants={listContainer}
                                initial="hidden"
                                animate="show"
                                className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                            >
                                {visibleExercises.map((ex) => (
                                    <motion.div key={tr(ex.name)} variants={listItem}>
                                        <Card className="flex h-full flex-col bg-card/60">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <CardTitle className="text-base leading-snug text-balance">{tr(ex.name)}</CardTitle>
                                                    <span className="flex flex-shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground" title={tr(LEVEL_LABEL[ex.level])}>
                                                        <LevelBars level={ex.level} />
                                                        <span className="hidden sm:inline">{tr(LEVEL_LABEL[ex.level])}</span>
                                                    </span>
                                                </div>
                                                <div className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary tabular-nums">
                                                    <Dumbbell className="h-3.5 w-3.5" /> {tr(ex.prescription)}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="flex-grow space-y-3">
                                                <p className="text-sm text-muted-foreground leading-relaxed">{tr(ex.description)}</p>
                                                <ul className="space-y-1.5">
                                                    {ex.cues.map((cue, ci) => (
                                                        <li key={ci} className="flex items-start gap-2 text-xs text-foreground/80">
                                                            <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                                                            <span>{tr(cue)}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </CardContent>
                                            <CardFooter>
                                                <Button onClick={() => handleStartExercise(ex)} className="w-full">
                                                    <Play className="mr-2 h-4 w-4" /> {tr(S.startExercise)}
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    </motion.div>
                                ))}
                            </motion.div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* VIDEO (pro) */}
                <TabsContent value="video" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>{tr(S.videoAnalysis)}</CardTitle><CardDescription>{tr(S.videoAnalysisDesc)}</CardDescription></CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-dashed border-white/10 bg-muted/30 p-12 text-center h-80 flex items-center justify-center">
                                <div><Bot className="h-8 w-8 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-1">{tr(S.comingSoon)}</h3><p className="text-muted-foreground text-sm">{tr(S.comingSoonDesc)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* COACH (pro) */}
                <TabsContent value="coach" className="mt-6">
                    <Card>
                        <CardHeader><CardTitle>{tr(S.aiCoachTitle)}</CardTitle><CardDescription>{tr(S.aiCoachDesc)}</CardDescription></CardHeader>
                        <CardContent>
                            <div className="rounded-xl border border-dashed border-white/10 bg-muted/30 p-12 text-center h-80 flex items-center justify-center">
                                <div><Bot className="h-8 w-8 mx-auto text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-1">{tr(S.comingSoon)}</h3><p className="text-muted-foreground text-sm">{tr(S.comingSoonDesc)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />

            <Dialog open={isExerciseModalOpen} onOpenChange={setIsExerciseModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            {activeExercise && <LevelBars level={activeExercise.level} />}
                            <DialogTitle className="text-2xl">{activeExercise ? tr(activeExercise.name) : ""}</DialogTitle>
                        </div>
                        <DialogDescription>{activeExercise ? tr(activeExercise.description) : ""}</DialogDescription>
                    </DialogHeader>

                    {activeExercise && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary tabular-nums w-fit">
                                <Dumbbell className="h-4 w-4" /> {tr(S.prescription)}: {tr(activeExercise.prescription)}
                            </div>
                            <div>
                                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><ListChecks className="h-4 w-4 text-primary" /> {tr(S.coachingCues)}</p>
                                <ul className="space-y-1.5">
                                    {activeExercise.cues.map((cue, i) => (
                                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/85">
                                            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" /> <span>{tr(cue)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <Stopwatch startLabel={tr(S.start)} stopLabel={tr(S.stop)} resetLabel={tr(S.reset)} />
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsExerciseModalOpen(false)}>{tr(S.close)}</Button>
                        <Button onClick={handleCompleteExercise} className="bg-success text-success-foreground hover:bg-success/90"><CheckCircle className="mr-2 h-4 w-4" /> {tr(S.markComplete)}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
