
"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { tennisMatchSchema } from "@/lib/schemas";
import { getTacticalAdvice } from "@/ai/flows/sports-flows";
import type { TacticalAdviceOutput, TennisDrillOutput, TennisMatch } from "@/ai/schemas";
import { deleteTennisMatch, saveTennisMatch } from "./actions";
import { useTranslation } from "@/hooks/use-translation";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, AreaChart, Area } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Calendar as CalendarIcon, Bot, Sparkles, Send, BrainCircuit, Star, Plus, CheckCircle, Trash2, Loader2, Bookmark, MessageSquare, Share2, Heart, BarChart2, Shield, Flame, Activity, CalendarDays, ClipboardList, Lightbulb, User as UserIcon, Clock, Repeat, Droplets, Bed, Check, Dumbbell, ShieldCheck, Zap, Edit, Target, Upload, Video, Lock, Play, Square, TimerReset, Film } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getDrillSuggestions } from "@/ai/flows/tennis-drill-flow";
import { UpgradeProModal } from "@/components/upgrade-pro-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { generateVideo } from "@/ai/flows/generate-video-flow";


type TennisMatchFormValues = z.infer<typeof tennisMatchSchema>;

type Drill = { 
    name: string; 
    description: string; 
    videoUrl?: string; 
    isGeneratingVideo?: boolean;
};

type CompletedDrill = {
    name: string;
    description: string;
    completedAt: Date;
};

const sessionSchema = z.object({
    title: z.string().min(1, "Session title is required."),
    type: z.enum(["technical", "tactical", "physical", "other"]),
    date: z.date({ required_error: "A date is required." }),
    duration: z.coerce.number().min(5, "Duration must be at least 5 minutes."),
    notes: z.string().optional(),
});
type SessionInput = z.infer<typeof sessionSchema>;
type ScheduleItem = SessionInput & { id: number; completed: boolean; date: Date | null };

const Stopwatch = () => {
    const [time, setTime] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isActive) {
            timerRef.current = setInterval(() => {
                setTime((prev) => prev + 10);
            }, 10);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive]);

    const formatTime = (timeInMs: number) => {
        const minutes = Math.floor(timeInMs / 60000).toString().padStart(2, '0');
        const seconds = Math.floor((timeInMs % 60000) / 1000).toString().padStart(2, '0');
        const milliseconds = (timeInMs % 1000).toString().padStart(3, '0').slice(0, 2);
        return `${minutes}:${seconds}.${milliseconds}`;
    };

    return (
        <div className="text-center bg-muted p-4 rounded-lg">
            <p className="font-mono text-5xl font-bold tracking-tighter mb-4">{formatTime(time)}</p>
            <div className="flex justify-center gap-4">
                <Button size="lg" onClick={() => setIsActive(!isActive)}>
                    {isActive ? <Square className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                    {isActive ? 'Stop' : 'Start'}
                </Button>
                <Button size="lg" variant="outline" onClick={() => { setIsActive(false); setTime(0); }}>
                    <TimerReset className="mr-2 h-5 w-5" />
                    Reset
                </Button>
            </div>
        </div>
    );
};


export default function TennisModuleClient() {
    const { user, isLoading: isUserLoading } = useUser();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [matches, setMatches] = useState<TennisMatch[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLogMatchOpen, setIsLogMatchOpen] = useState(false);
    const [drillFocus, setDrillFocus] = useState("");
    const [drillSuggestions, setDrillSuggestions] = useState<Drill[] | null>(null);
    const [isGettingDrills, setIsGettingDrills] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("overview");
    const searchParams = useSearchParams();

    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);

    const [goal, setGoal] = useState<string | null>("Improve my first serve percentage");
    const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
    
    const [activeDrill, setActiveDrill] = useState<Drill | null>(null);
    const [isDrillModalOpen, setIsDrillModalOpen] = useState(false);
    const [completedDrills, setCompletedDrills] = useState<CompletedDrill[]>([]);

    const goalForm = useForm<{ goal: string }>({
        defaultValues: { goal: goal || "" }
    });

    const matchForm = useForm<TennisMatchFormValues>({
        resolver: zodResolver(tennisMatchSchema),
        defaultValues: {
            opponent: "",
            score: "",
            result: "W",
            surface: "Hard",
            date: new Date(),
            status: "completed",
            aces: 0,
            doubleFaults: 0,
            firstServePercent: 60,
            breakPointsSaved: 50,
        },
    });

    const addSessionForm = useForm<SessionInput>({
        resolver: zodResolver(sessionSchema),
        defaultValues: {
            title: "",
            type: "technical",
            date: new Date(),
            duration: 60,
            notes: "",
        }
      });
      
    const handleAddSession = (values: SessionInput) => {
        const newSession: ScheduleItem = {
            id: Date.now(),
            ...values,
            date: values.date,
            completed: false,
        };
        setSchedule(prev => [...prev, newSession].sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)));
        setIsAddSessionOpen(false);
        addSessionForm.reset();
        toast({
            title: t('sessionAdded'),
            description: t('sessionAddedDescription', { title: newSession.title }),
        });
    }

    const handleDeleteSession = (sessionId: number) => {
        setSchedule(prev => prev.filter(session => session.id !== sessionId));
        toast({
            title: t('sessionRemoved'),
            description: t('sessionRemovedDescription'),
        });
    }
    
    const handleToggleSession = (sessionId: number) => {
        setSchedule(prev => prev.map(session => 
            session.id === sessionId ? { ...session, completed: !session.completed } : session
        ));
        toast({ title: t('sessionStatusUpdated') });
    };

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "tennis_matches"), where("userId", "==", user.uid), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const userMatches: TennisMatch[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                userMatches.push({ ...data, id: doc.id, date: (data.date as Timestamp).toDate() } as TennisMatch);
            });
            setMatches(userMatches);
        });
        return () => unsubscribe();
    }, [user]);

    const handleLogMatchSubmit = async (values: TennisMatchFormValues) => {
        if (!user) {
            toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        try {
            await saveTennisMatch(user.uid, values);
            matchForm.reset();
            setIsLogMatchOpen(false);
            toast({ title: t('matchLogged'), description: t('matchLoggedDescription', { opponent: values.opponent }) });
        } catch (error) {
            console.error("Error logging match: ", error);
            toast({ title: "Error", description: "Could not log match.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteMatch = async (matchId: string) => {
        if (!matchId) return;
        try {
            await deleteTennisMatch(matchId);
            toast({ title: t('matchDeleted') });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Deletion Failed' });
        }
    };

    const handleGetDrills = async (focus: string) => {
        if (!focus.trim()) return;
        setDrillFocus(focus);
        setIsGettingDrills(true);
        setDrillSuggestions(null);
        try {
            const result = await getDrillSuggestions({ focus });
            setDrillSuggestions(result.drills);
        } catch (error) {
            toast({ variant: 'destructive', title: t('drillSuggestionError') });
        } finally {
            setIsGettingDrills(false);
        }
    };
    
     const handleStartDrill = (drill: Drill) => {
        setActiveDrill(drill);
        setIsDrillModalOpen(true);
    };

    const handleCompleteDrill = () => {
        if (!activeDrill) return;
        const newCompletedDrill: CompletedDrill = {
            ...activeDrill,
            completedAt: new Date(),
        };
        setCompletedDrills(prev => [newCompletedDrill, ...prev].slice(0, 5)); // Keep last 5
        setIsDrillModalOpen(false);
        setActiveDrill(null);
        toast({
            title: "Drill Completed!",
            description: `Great work on the "${newCompletedDrill.name}" drill.`
        });
    };

    const handleGenerateVideo = async (drillIndex: number) => {
        if (!drillSuggestions) return;

        const drill = drillSuggestions[drillIndex];
        setDrillSuggestions(prev => prev!.map((d, i) => i === drillIndex ? { ...d, isGeneratingVideo: true } : d));

        try {
            const videoPrompt = `Create a short, clear video demonstrating a tennis drill called '${drill.name}'. The video should be from a coach's perspective, simple and easy to follow. Drill description: ${drill.description}`;
            const result = await generateVideo({ prompt: videoPrompt });

            setDrillSuggestions(prev => prev!.map((d, i) => i === drillIndex ? { ...d, videoUrl: result.videoUrl, isGeneratingVideo: false } : d));
            
            toast({
                title: 'Video Generated!',
                description: `An explanatory video for "${drill.name}" is ready.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Video Generation Failed',
                description: error.message || 'The AI could not create the video.',
            });
            setDrillSuggestions(prev => prev!.map((d, i) => i === drillIndex ? { ...d, isGeneratingVideo: false } : d));
        }
    };

    const tabsConfig = [
        { value: "overview", labelKey: "overview", icon: Activity, pro: false },
        { value: "training", labelKey: "training", icon: CalendarDays, pro: false },
        { value: "logbook", labelKey: "logbook", icon: ClipboardList, pro: false },
        { value: "skills", labelKey: "skills", icon: Shield, pro: false },
        { value: "video", labelKey: "video", icon: Video, pro: true },
        { value: "coach", labelKey: "aiCoach", icon: BrainCircuit, pro: true },
    ];
    
    const handleTabChange = (value: string) => {
        const selectedTab = tabsConfig.find(t => t.value === value);
        if (selectedTab?.pro && user?.plan !== 'pro') {
          setIsUpgradeModalOpen(true);
        } else {
          setActiveTab(value);
        }
    };

    useEffect(() => {
        const tab = searchParams.get('tab');
        const selectedTab = tabsConfig.find(t => t.value === tab);
        if (selectedTab) {
            if (selectedTab.pro && user?.plan !== 'pro') {
                setIsUpgradeModalOpen(true);
            } else {
                setActiveTab(tab!);
            }
        }
    }, [searchParams, user]);

    const handleSetGoal = (values: { goal: string }) => {
        setGoal(values.goal);
        setIsGoalDialogOpen(false);
        toast({ title: t('goalSet'), description: t('goalUpdated') });
    }

    const handleCompleteGoal = () => {
        toast({
            title: t('goalCompleted'),
            description: `${t('goalCompletedDescription')}: "${goal}"`,
        });
        setGoal(null);
    }
    
    const tennisRadarData = [
        { subject: 'Serve', A: 80, fullMark: 100 },
        { subject: 'Forehand', A: 90, fullMark: 100 },
        { subject: 'Backhand', A: 75, fullMark: 100 },
        { subject: 'Volley', A: 70, fullMark: 100 },
        { subject: 'Endurance', A: 85, fullMark: 100 },
    ];
    
    const radarChartConfig = {
        value: {
            label: "Current",
            color: "hsl(var(--primary))",
        },
    } satisfies ChartConfig

    const analytics = useMemo(() => {
        const completedMatches = matches.filter(m => m.status === 'completed');
        const firstServeData = completedMatches.slice(0, 5).map(m => ({
            match: `vs ${m.opponent}`,
            firstServePercent: m.firstServePercent || 0,
        })).reverse();
        
        const acesByMonth: {[key: string]: number} = {};
        completedMatches.forEach(m => {
            const month = format(m.date, 'MMM');
            if (!acesByMonth[month]) acesByMonth[month] = 0;
            acesByMonth[month] += (m.aces || 0);
        });
        const acesData = Object.keys(acesByMonth).map(month => ({ month, aces: acesByMonth[month] }));

        return {
            totalSessions: schedule.length,
            hoursPlayed: matches.length * 1.5,
            wins: matches.filter(m => m.result === 'W').length,
            aces: matches.reduce((sum, m) => sum + (m.aces || 0), 0),
            firstServeData,
            acesData,
        }
    }, [matches, schedule]);

    const drillFocusOptions = ["Serve Consistency", "Forehand Power", "Backhand Slice", "Net Play & Volleys", "Footwork & Agility"];

    const getResultClasses = (result: 'W' | 'L') => {
      switch (result) {
          case 'W': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' };
          case 'L': return { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/30' };
      }
    }

    return (
        <>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
                 {tabsConfig.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value}>
                        <tab.icon className="w-4 h-4 mr-2" />
                        {t(tab.labelKey as any)}
                        {tab.pro && user?.plan !== 'pro' && <Lock className="h-3 w-3 ml-2 text-yellow-500" />}
                    </TabsTrigger>
                ))}
            </TabsList>
            <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                          <CardHeader className="flex flex-row items-center gap-4">
                              <Avatar className="h-20 w-20">
                                  <AvatarImage src={`https://placehold.co/128x128.png`} alt={user?.displayName || "Player"} data-ai-hint="player portrait" />
                                  <AvatarFallback>{user?.displayName?.charAt(0) || "P"}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <CardTitle className="text-2xl">{user?.displayName || 'Player Name'}</CardTitle>
                                  <CardDescription>{t('tennis')} - {user?.tennisProfile?.level || "Intermediate"}</CardDescription>
                              </div>
                          </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>{t('aiCoachInsight')}</CardTitle></CardHeader>
                            <CardContent>
                                <div className="p-4 bg-primary/10 rounded-lg">
                                    <p className="text-sm font-semibold">"Votre pourcentage de premier service était bas lors du dernier match. Concentrons-nous sur des exercices pour améliorer la régularité. Essayez l'exercice '2ème service dans les coins'."</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
                            <Card className="p-4 flex flex-col items-center justify-center text-primary bg-primary/10 hover:border-primary/50 transition-colors">
                                {goal ? (
                                    <>
                                        <div className="flex-grow text-center">
                                            <p className="text-lg font-bold">🎯 {t('currentGoal')}</p>
                                            <p className="text-xs mt-1">{goal}</p>
                                        </div>
                                        <div className="flex gap-1 mt-2">
                                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCompleteGoal}><Check className="h-4 w-4 text-success" /></Button>
                                            <DialogTrigger asChild><Button size="icon" variant="ghost" className="h-7 w-7"><Edit className="h-4 w-4" /></Button></DialogTrigger>
                                        </div>
                                    </>
                                ) : (
                                    <DialogTrigger asChild>
                                        <div className="text-center cursor-pointer">
                                            <Plus className="mx-auto h-8 w-8" /><p className="text-xs font-semibold">{t('setGoal')}</p>
                                        </div>
                                    </DialogTrigger>
                                )}
                            </Card>
                            <DialogContent>
                                <DialogHeader><DialogTitle>{goal ? t('editGoal') : t('setNewGoal')}</DialogTitle><DialogDescription>{t('goalPrompt')}</DialogDescription></DialogHeader>
                                <form onSubmit={goalForm.handleSubmit(handleSetGoal)} className="space-y-4">
                                    <Textarea {...goalForm.register("goal")} placeholder={t('goalPlaceholder')} />
                                    {goalForm.formState.errors.goal && <p className="text-destructive text-xs">{goalForm.formState.errors.goal.message}</p>}
                                    <DialogFooter><Button type="submit">{t('saveGoal')}</Button></DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>{t('weeklyRecap')}</CardTitle><CardDescription>{t('weeklyRecapDescription')}</CardDescription></CardHeader>
                            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-3xl font-bold">{analytics.totalSessions}</p>
                                    <p className="text-xs text-muted-foreground">{t('sessions')}</p>
                                </div>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-3xl font-bold">{analytics.hoursPlayed.toFixed(1)}</p>
                                    <p className="text-xs text-muted-foreground">Hours Played</p>
                                </div>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-3xl font-bold">{analytics.wins}</p>
                                    <p className="text-xs text-muted-foreground">Wins</p>
                                </div>
                                <div className="bg-muted p-4 rounded-lg">
                                    <p className="text-3xl font-bold">{analytics.aces}</p>
                                    <p className="text-xs text-muted-foreground">Aces</p>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="grid md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t('progressRadar')}</CardTitle>
                                    <CardDescription>{t('progressRadarDescription')}</CardDescription>
                                </CardHeader>
                                <CardContent className="h-80 w-full p-0">
                                    <ChartContainer config={radarChartConfig} className="mx-auto aspect-square h-full w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={tennisRadarData} gridType="circle">
                                                <PolarGrid gridType="circle" />
                                                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                                <Radar name="Player" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                                <ChartTooltip content={<ChartTooltipContent />} />
                                            </RadarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique des Exercices</CardTitle>
                                    <CardDescription>Vos 5 derniers exercices terminés.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-80">
                                        {completedDrills.length > 0 ? (
                                            <div className="space-y-3 pr-4">
                                                {completedDrills.map((drill, index) => (
                                                    <div key={index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                                                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                                                        <div className="flex-grow">
                                                            <p className="font-semibold">{drill.name}</p>
                                                            <p className="text-xs text-muted-foreground">{format(drill.completedAt, 'PPpp')}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                                                <p>Aucun exercice terminé pour le moment.</p>
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="training" className="mt-6 space-y-6">
              <Card>
                  <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                          <CardTitle>{t('trainingSchedule')}</CardTitle>
                          <CardDescription>{t('trainingScheduleDescription')}</CardDescription>
                      </div>
                      <Dialog open={isAddSessionOpen} onOpenChange={setIsAddSessionOpen}>
                          <DialogTrigger asChild>
                              <Button><Plus className="mr-2 h-4 w-4" /> {t('addSession')}</Button>
                          </DialogTrigger>
                          <DialogContent>
                              <DialogHeader>
                                  <DialogTitle>{t('addSession')}</DialogTitle>
                                  <DialogDescription>{t('addSessionDescription')}</DialogDescription>
                              </DialogHeader>
                              <form onSubmit={addSessionForm.handleSubmit(handleAddSession)} className="space-y-4">
                                  <div>
                                      <Label htmlFor="title">{t('sessionName')}</Label>
                                      <Input id="title" {...addSessionForm.register("title")} placeholder={t('sessionNamePlaceholder')} />
                                      {addSessionForm.formState.errors.title && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.title.message}</p>}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div>
                                          <Label>{t('sessionType')}</Label>
                                          <Select onValueChange={(value) => addSessionForm.setValue("type", value as any)} defaultValue={addSessionForm.getValues("type")}>
                                              <SelectTrigger><SelectValue placeholder={t('sessionTypePlaceholder')} /></SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="technical">{t('technical')}</SelectItem>
                                                  <SelectItem value="tactical">{t('tactical')}</SelectItem>
                                                  <SelectItem value="physical">{t('physical')}</SelectItem>
                                                  <SelectItem value="other">{t('other')}</SelectItem>
                                              </SelectContent>
                                          </Select>
                                      </div>
                                      <div>
                                          <Label htmlFor="duration">{t('duration')} (mins)</Label>
                                          <Input id="duration" type="number" {...addSessionForm.register("duration")} />
                                          {addSessionForm.formState.errors.duration && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.duration.message}</p>}
                                      </div>
                                  </div>
                                  <div>
                                      <Label>{t('date')}</Label>
                                      <Popover>
                                          <PopoverTrigger asChild>
                                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !addSessionForm.watch("date") && "text-muted-foreground")}>
                                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                                  {addSessionForm.watch("date") ? format(addSessionForm.watch("date"), "PPP") : <span>{t('pickADate')}</span>}
                                              </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0">
                                              <Calendar
                                                  mode="single"
                                                  selected={addSessionForm.watch("date")}
                                                  onSelect={(date) => addSessionForm.setValue("date", date as Date)}
                                                  initialFocus
                                              />
                                          </PopoverContent>
                                      </Popover>
                                      {addSessionForm.formState.errors.date && <p className="text-destructive text-xs mt-1">{addSessionForm.formState.errors.date.message}</p>}
                                  </div>
                                  <div>
                                      <Label htmlFor="notes">{t('notes')}</Label>
                                      <Textarea id="notes" {...addSessionForm.register("notes")} placeholder={t('notesPlaceholder')} />
                                  </div>
                                  <DialogFooter>
                                      <Button type="button" variant="ghost" onClick={() => setIsAddSessionOpen(false)}>{t('cancel')}</Button>
                                      <Button type="submit">{t('saveSession')}</Button>
                                  </DialogFooter>
                              </form>
                          </DialogContent>
                      </Dialog>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-1">
                          <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={setSelectedDate}
                              className="rounded-md border"
                          />
                      </div>
                      <div className="md:col-span-2 space-y-4">
                          <h3 className="font-semibold text-lg">{t('upcomingSessions')}</h3>
                          <ScrollArea className="h-72">
                              <div className="space-y-4 pr-4">
                                  {schedule.length > 0 && schedule.filter(s => {
                                      if (!selectedDate) return true;
                                      if (!s.date) return false;
                                      return s.date.toDateString() === selectedDate.toDateString();
                                  }).length > 0 ? (
                                      schedule.filter(s => {
                                          if (!selectedDate) return true;
                                          if (!s.date) return false;
                                          return s.date.toDateString() === selectedDate.toDateString();
                                      }).map(session => (
                                          <Card key={session.id} className="flex items-center p-4 gap-4">
                                              <div className="flex-shrink-0">
                                                  {session.type === 'technical' && <Sparkles className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'tactical' && <BrainCircuit className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'physical' && <Dumbbell className="h-8 w-8 text-muted-foreground" />}
                                                  {session.type === 'other' && <Activity className="h-8 w-8 text-muted-foreground" />}
                                              </div>
                                              <div className="flex-grow">
                                                  <p className="font-semibold">{session.title}</p>
                                                  <p className="text-sm text-muted-foreground">{session.duration} {t('mins')}</p>
                                              </div>
                                              <div className="flex items-center gap-1">
                                                  <Checkbox
                                                      checked={session.completed}
                                                      onCheckedChange={() => handleToggleSession(session.id)}
                                                      id={`session-${session.id}`}
                                                  />
                                                  <AlertDialog>
                                                      <AlertDialogTrigger asChild>
                                                          <Button variant="ghost" size="icon" className="h-8 w-8">
                                                              <Trash2 className="h-4 w-4 text-destructive" />
                                                          </Button>
                                                      </AlertDialogTrigger>
                                                      <AlertDialogContent>
                                                          <AlertDialogHeader>
                                                              <AlertDialogTitle>{t('deleteSessionTitle')}</AlertDialogTitle>
                                                              <AlertDialogDescription>
                                                                  {t('deleteSessionDescription', { title: session.title })}
                                                              </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteSession(session.id)}>{t('delete')}</AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                              </div>
                                          </Card>
                                      ))
                                  ) : (
                                      <p className="text-muted-foreground text-center py-10">{t('noSessionsScheduled')}</p>
                                  )}
                              </div>
                          </ScrollArea>
                      </div>
                  </CardContent>
              </Card>
          </TabsContent>
            <TabsContent value="logbook" className="mt-6 space-y-6">
                <Card>
                    <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <CardTitle>{t('matchLogbook')}</CardTitle>
                        <CardDescription>{t('matchLogbookDescription')}</CardDescription>
                      </div>
                      <Dialog open={isLogMatchOpen} onOpenChange={setIsLogMatchOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4"/> {t('logNewMatch')}</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>{t('logNewMatch')}</DialogTitle></DialogHeader>
                            <Form {...matchForm}>
                                <form onSubmit={matchForm.handleSubmit(handleLogMatchSubmit)} className="space-y-4">
                                     <FormField control={matchForm.control} name="opponent" render={({ field }) => (<FormItem><FormLabel>{t('opponent')}</FormLabel><FormControl><Input placeholder={t('tennisOpponentPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={matchForm.control} name="score" render={({ field }) => (<FormItem><FormLabel>{t('finalScore')}</FormLabel><FormControl><Input placeholder={t('tennisScorePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                     <div className="grid grid-cols-2 gap-4">
                                        <FormField control={matchForm.control} name="result" render={({ field }) => (<FormItem><FormLabel>{t('finalResult')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectResult')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="W">{t('win')}</SelectItem><SelectItem value="L">{t('loss')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={matchForm.control} name="surface" render={({ field }) => (<FormItem><FormLabel>{t('favoriteSurface')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('selectSurface')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="Hard">{t('hard')}</SelectItem><SelectItem value="Clay">{t('clay')}</SelectItem><SelectItem value="Grass">{t('grass')}</SelectItem><SelectItem value="Other">{t('other')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                         <FormField control={matchForm.control} name="aces" render={({ field }) => (<FormItem><FormLabel>Aces</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={matchForm.control} name="doubleFaults" render={({ field }) => (<FormItem><FormLabel>Double Faults</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={matchForm.control} name="firstServePercent" render={({ field }) => (<FormItem><FormLabel>1st Serve %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                         <FormField control={matchForm.control} name="breakPointsSaved" render={({ field }) => (<FormItem><FormLabel>Break Points Saved %</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    </div>
                                    <FormField control={matchForm.control} name="date" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>{t('dateOfMatch')}</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? (format(field.value, "PPP")) : (<span>{t('pickADate')}</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('saveMatch')}</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                      </Dialog>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {matches.length > 0 ? matches.map(match => {
                            const resultClasses = getResultClasses(match.result as 'W' | 'L');
                            return (
                                <Card key={match.id} className={cn("overflow-hidden hover:border-primary/50 transition-colors group", resultClasses.bg)}>
                                    <div className={cn("h-1.5 w-full", resultClasses.text.replace('text-', 'bg-'))}></div>
                                    <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-lg text-foreground">vs {match.opponent}</p>
                                            <p className={cn("text-sm font-semibold uppercase", resultClasses.text)}>{t(match.result === 'W' ? 'win' : 'loss')} - {match.score}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm text-muted-foreground">{format(match.date, "dd MMM yyyy")}</p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle>
                                                        <AlertDialogDescription>{t('deleteMatchConfirmationTennis', { opponent: match.opponent })}</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteMatch(match.id!)}>{t('delete')}</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center border-t border-border/20 pt-3">
                                        <div className="text-foreground"><p className="font-bold text-xl">{match.aces || 0}</p><p className="text-xs text-muted-foreground">Aces</p></div>
                                        <div className="text-foreground"><p className="font-bold text-xl">{match.doubleFaults || 0}</p><p className="text-xs text-muted-foreground">Double Faults</p></div>
                                        <div className="text-foreground"><p className="font-bold text-xl">{match.firstServePercent || 0}%</p><p className="text-xs text-muted-foreground">1st Serve</p></div>
                                        <div className="text-foreground"><p className="font-bold text-xl">{match.breakPointsSaved || 0}%</p><p className="text-xs text-muted-foreground">BPs Saved</p></div>
                                    </div>
                                    </CardContent>
                                </Card>
                            )
                        }) : (<p className="text-center text-muted-foreground py-8">{t('noMatchesLogged')}</p>)}
                    </CardContent>
                 </Card>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>First Serve % Over Last 5 Matches</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{ firstServePercent: { label: "1st Serve %", color: "hsl(var(--primary))" } }} className="h-64">
                                <BarChart data={analytics.firstServeData} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="match" tickLine={false} tickMargin={10} axisLine={false} fontSize={12} />
                                    <YAxis domain={[0, 100]} />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="firstServePercent" fill="var(--color-firstServePercent)" radius={4} />
                                </BarChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Aces per Month</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ChartContainer config={{ aces: { label: "Aces", color: "hsl(var(--chart-2))" } }} className="h-64">
                                <AreaChart data={analytics.acesData} accessibilityLayer>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                                    <YAxis />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Area dataKey="aces" type="natural" fill="var(--color-aces)" fillOpacity={0.4} stroke="var(--color-aces)" />
                                </AreaChart>
                            </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
             <TabsContent value="skills" className="mt-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('aiDrillSuggestions')}</CardTitle>
                        <CardDescription>{t('tellAIFocus')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                            {drillFocusOptions.map((option) => (
                                <Button
                                    key={option}
                                    variant={drillFocus === option ? 'default' : 'outline'}
                                    onClick={() => handleGetDrills(option)}
                                    disabled={isGettingDrills}
                                >
                                    {isGettingDrills && drillFocus === option ? <Loader2 className="h-4 w-4 animate-spin" /> : option}
                                </Button>
                            ))}
                        </div>
                        
                        <AnimatePresence>
                        {isGettingDrills && drillFocus && (
                           <motion.div
                                key="loading"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-6 flex items-center justify-center p-8 space-x-2 text-muted-foreground"
                           >
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <p>Generating drills for {drillFocus}...</p>
                            </motion.div>
                        )}
                        </AnimatePresence>

                        <AnimatePresence>
                        {drillSuggestions && (
                            <motion.div
                                key="suggestions"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 space-y-4"
                            >
                                <h3 className="font-semibold text-lg">Suggested Drills for {drillFocus}</h3>
                                {drillSuggestions.map((drill, index) => (
                                    <Card key={index} className="bg-muted/50">
                                        <CardHeader>
                                            <CardTitle className="text-base">{drill.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-muted-foreground">{drill.description}</p>
                                             {drill.videoUrl && (
                                                <div className="mt-4 rounded-lg overflow-hidden aspect-video">
                                                    <video src={drill.videoUrl} controls className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </CardContent>
                                        <CardFooter className="flex gap-2">
                                            <Button onClick={() => handleStartDrill(drill)}>
                                                <Play className="mr-2 h-4 w-4" /> Start Drill
                                            </Button>
                                             {!drill.videoUrl && (
                                                <Button variant="secondary" onClick={() => handleGenerateVideo(index)} disabled={drill.isGeneratingVideo}>
                                                    {drill.isGeneratingVideo ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Film className="mr-2 h-4 w-4"/>}
                                                    {drill.isGeneratingVideo ? "Generating..." : "Generate Video"}
                                                </Button>
                                            )}
                                        </CardFooter>
                                    </Card>
                                ))}
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </CardContent>
                </Card>
            </TabsContent>
          <TabsContent value="video" className="mt-6 space-y-6">
              <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-96 flex items-center justify-center">
                <div>
                    <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-1">{t('featureComingSoon')}</h3>
                    <p className="text-muted-foreground">{t('featureComingSoonDescription')}</p>
                </div>
              </div>
          </TabsContent>
            <TabsContent value="coach" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('aiTennisCoach')}</CardTitle>
                        <CardDescription>{t('aiTennisCoachDescription')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="border-2 border-dashed border-muted rounded-lg p-12 text-center h-96 flex items-center justify-center">
                            <div>
                                <Bot className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold mb-1">{t('featureComingSoon')}</h3>
                                <p className="text-muted-foreground">{t('featureComingSoonDescription')}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
        <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />

        <Dialog open={isDrillModalOpen} onOpenChange={setIsDrillModalOpen}>
            <DialogContent className="max-w-3xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">{activeDrill?.name}</DialogTitle>
                    <DialogDescription>{activeDrill?.description}</DialogDescription>
                </DialogHeader>
                <Tabs defaultValue="stopwatch" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="stopwatch">
                            <TimerReset className="mr-2 h-4 w-4" />
                            Stopwatch
                        </TabsTrigger>
                        <TabsTrigger value="video" disabled={!activeDrill?.videoUrl}>
                            <Film className="mr-2 h-4 w-4" />
                            Demonstration
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="stopwatch" className="py-6">
                         <Stopwatch />
                    </TabsContent>
                    <TabsContent value="video" className="py-6">
                        {activeDrill?.videoUrl && (
                            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                                <video src={activeDrill.videoUrl} controls autoPlay className="w-full h-full object-contain" />
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setIsDrillModalOpen(false)}>Fermer</Button>
                    <Button onClick={handleCompleteDrill} className="bg-success text-success-foreground hover:bg-success/90">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marquer comme Terminé
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
