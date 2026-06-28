

"use client";

import React, { useState, useEffect, useMemo, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, differenceInCalendarDays, subDays } from "date-fns";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { footballMatchSchema, type NutritionLog } from "@/lib/schemas";
import { getTacticalAdvice } from "@/ai/flows/sports-flows";
import type { TacticalAdviceOutput, TennisDrillOutput, TennisMatch } from "@/ai/schemas";
import { deleteMatch } from "./football/actions";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, Legend, Line, LineChart, ResponsiveContainer, Pie, PieChart, Cell } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
import { Calendar as CalendarIcon, Bot, Sparkles, Send, Trophy, BrainCircuit, Star, Plus, CheckCircle, Trash2, Loader2, Bookmark, MessageCircle, Share2, Heart, BarChart2, Shield, Flame, Activity, CalendarDays, ClipboardList, Lightbulb, User as UserIcon, Clock, Repeat, Droplets, Bed, Check, Dumbbell, ShieldCheck, Zap, Edit, Target, Upload, Video, Waves, PlusCircle, HeartPulse, ArrowRight, Dribbble, UtensilsCrossed, RefreshCw, ShoppingCart, ChevronLeft, ChevronRight, XCircle, PieChart as PieChartIcon, Lock, ScanLine } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getDrillSuggestions } from "@/ai/flows/tennis-drill-flow";
import { analyzeFootballVideo } from "@/ai/flows/video-analysis-flow";
import { useNutritionStore } from "@/stores/nutrition-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlanStore } from "@/stores/plan-store";
import { Separator } from "@/components/ui/separator";
import { TennisBallIcon } from "@/components/icons/tennis-ball";
import { useNutritionPlanStore } from "@/stores/nutrition-plan-store";
import { useShoppingListStore } from "@/stores/shopping-list-store";
import FitnessAssistantChat from "../dashboard/fitness-assistant/page";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FootballInsightCard } from '@/components/insights/football-insight-card';
import { useStreakStore } from '@/stores/streak-store';
import { UpgradeProModal } from '@/components/upgrade-pro-modal';
import { useTranslation } from "@/hooks/use-translation";
import { TranslationKey } from "@/lib/i18n";

const sports = [
    { name: "Gym", icon: Dumbbell, path: "/dashboard/gym" },
    { name: "Football", icon: Trophy, path: "/dashboard/football" },
    { name: "Tennis", icon: TennisBallIcon, path: "/dashboard/tennis" },
    { name: "Basketball", icon: Dribbble, path: "/dashboard/basketball" },
    { name: "Boxing", icon: Shield, path: "/dashboard/boxing" },
    { name: "Swimming", icon: Waves, path: "/dashboard/swimming" },
];

const moreLinks = [
    { titleKey: 'teamHubCardTitle', subtitleKey: 'teamHubCardSubtitle', icon: ClipboardList, path: '/dashboard/sports-assistant' },
    { titleKey: 'myReportsCardTitle', subtitleKey: 'myReportsCardSubtitle', icon: BarChart2, path: '/dashboard/progress' },
    { titleKey: 'mentalCoachCardTitle', subtitleKey: 'mentalCoachCardSubtitle', icon: BrainCircuit, path: '/dashboard/mental-coach' },
    { titleKey: 'myGoalsCardTitle', subtitleKey: 'myGoalsCardSubtitle', icon: Target, path: '/dashboard/goals' },
    { titleKey: 'bodyScanCardTitle', subtitleKey: 'bodyScanCardSubtitle', icon: ScanLine, path: '/dashboard/body-scan' },
] as const;


const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    hover: {
        y: -5,
        scale: 1.02,
        boxShadow: "0 10px 15px -3px rgba(var(--primary-values), 0.1), 0 4px 6px -2px rgba(var(--primary-values), 0.05)",
        transition: {
            duration: 0.2
        }
    }
}

const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};


type FootballMatch = {
    id: string;
    opponent: string;
    result: 'win' | 'draw' | 'loss';
    date: Date;
    motm: boolean;
    goals: number;
    assists: number;
    minutesPlayed: number;
    stamina: number;
};

const SectionHeader = ({ icon, title, subtitle, children }: { icon: React.ReactNode, title: string, subtitle: string, children?: React.ReactNode }) => (
    <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    {icon}
                </div>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight font-headline">{title}</h2>
                    <p className="text-muted-foreground">{subtitle}</p>
                </div>
            </div>
            {children}
        </div>
        <Separator className="mt-4" />
    </div>
);

const EmptyInsightCard = ({ title, description, link, icon: Icon, className, isRectangle }: { title: string, description: string, link: string, icon: React.ComponentType<{ className?: string }>, className?: string, isRectangle?: boolean }) => {
    const router = useRouter();
    return (
        <motion.div variants={itemVariants} whileHover="hover" className={className} onClick={() => router.push(link)}>
            <Card className={cn("h-full group cursor-pointer flex flex-col", !isRectangle && "md:aspect-square")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Icon className="text-primary h-5 w-5" /> {title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                        <PlusCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-semibold">{description}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const ProInsightCard = ({ title, icon: Icon, onUpgrade, className, isRectangle }: { title: string, icon: React.ComponentType<{ className?: string }>, onUpgrade: () => void, className?: string, isRectangle?: boolean }) => {
    const { t } = useTranslation();
    return (
        <motion.div variants={itemVariants} whileHover="hover" className={className} onClick={onUpgrade}>
            <Card className={cn("h-full group cursor-pointer flex flex-col bg-muted/50", !isRectangle && "md:aspect-square")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-muted-foreground"><Icon className="h-5 w-5" /> {title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                        <Lock className="h-8 w-8 mb-2 text-muted-foreground" />
                        <p className="text-sm font-semibold">{t('upgradeToPro')}</p>
                        <p className="text-xs">{t('unlockInsight')}</p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}

const motivationalMessages: TranslationKey[] = [
    'streakMessage1', 'streakMessage2', 'streakMessage3', 'streakMessage4',
    'streakMessage5', 'streakMessage6', 'streakMessage7'
];

const StreakCard = () => {
    const { streak } = useStreakStore();
    const { t } = useTranslation();
    const [message, setMessage] = useState(t('streakMessage1'));

    useEffect(() => {
        const randomKey = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        setMessage(t(randomKey));
    }, [streak, t]);

    return (
        <motion.div variants={itemVariants} className="md:col-span-1">
            <Card className="h-full flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary/10 to-transparent">
                <CardContent className="p-6">
                    <motion.div
                        animate={{
                            scale: streak > 0 ? [1, 1.2, 1] : 1,
                            filter: streak > 0 ? ['drop-shadow(0 0 0px hsl(var(--primary)))', 'drop-shadow(0 0 10px hsl(var(--primary)))', 'drop-shadow(0 0 0px hsl(var(--primary)))'] : 'none',
                        }}
                        transition={{
                            duration: 1.5,
                            repeat: streak > 0 ? Infinity : 0,
                            ease: "easeInOut"
                        }}
                    >
                        <Flame className="h-16 w-16 text-primary" />
                    </motion.div>
                    <p className="text-5xl font-bold mt-2">{streak}</p>
                    <p className="text-muted-foreground mt-1 font-semibold">{t('dayStreak')}</p>
                    <p className="text-xs text-muted-foreground mt-2">{streak > 0 ? message : t('startStreakPrompt')}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}

const NutritionChart = () => {
    const { dailyTotals, isLoading, dailyLogs } = useNutritionStore();
    const { user } = useUser();
    const router = useRouter();
    const { t } = useTranslation();

    if (isLoading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const { calories, protein, carbs, fat } = dailyTotals;
    const targetCalories = user?.nutritionTarget?.calories || 2500;

    // 40% Carbs, 30% Protein, 30% Fat
    const targetCarbs = (targetCalories * 0.4) / 4;
    const targetProtein = (targetCalories * 0.3) / 4;
    const targetFat = (targetCalories * 0.3) / 9;

    const totalLogs = dailyLogs.breakfast.length + dailyLogs.lunch.length + dailyLogs.dinner.length + dailyLogs.snack.length;

    const macros = [
        { name: t('carbs'), value: carbs, target: targetCarbs, color: "bg-primary" },
        { name: t('protein'), value: protein, target: targetProtein, color: "bg-primary/60" },
        { name: t('fat'), value: fat, target: targetFat, color: "bg-primary/30" },
    ];

    const calorieProgress = (calories / targetCalories) * 100;
    const circumference = 2 * Math.PI * 45; // r=45

    return (
        <Card className="h-full group flex flex-col cursor-pointer" onClick={() => router.push('/dashboard/nutrition')}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-lg"><Flame className="text-primary" />{t('nutrition')}</CardTitle>
                        <CardDescription>{t('todaysIntake')}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="relative w-36 h-36 mx-auto">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="10" fill="transparent" />
                            <motion.circle
                                cx="50"
                                cy="50"
                                r="45"
                                stroke="hsl(var(--primary))"
                                strokeWidth="10"
                                strokeDasharray={circumference}
                                strokeLinecap="round"
                                fill="transparent"
                                transform="rotate(-90 50 50)"
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: circumference * (1 - (calorieProgress / 100)) }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            />
                            <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold fill-current">
                                {calories.toFixed(0)}
                            </text>
                            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="text-xs fill-muted-foreground">
                                / {targetCalories}
                            </text>
                            <text x="50%" y="75%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-current">
                                {t('kcal')}
                            </text>
                        </svg>
                    </div>
                    <div className="space-y-4">
                        {macros.map(macro => (
                            <div key={macro.name}>
                                <div className="flex justify-between items-baseline text-sm mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("h-2.5 w-2.5 rounded-full", macro.color)}></span>
                                        <span className="font-semibold">{macro.name}</span>
                                    </div>
                                    <span className="text-muted-foreground">{macro.value.toFixed(0)}g / {macro.target.toFixed(0)}g</span>
                                </div>
                                <Progress value={(macro.value / macro.target) * 100} indicatorClassName={cn("h-2", totalLogs > 0 ? macro.color : 'bg-muted-foreground')} className="h-2" />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
            {totalLogs > 0 && <Separator />}
            <CardFooter className="p-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1" className="border-b-0">
                        <AccordionTrigger className="px-6 text-sm">
                            {t('viewLoggedMeals', { count: totalLogs })}
                        </AccordionTrigger>
                        <AccordionContent>
                            <ScrollArea className="h-32 px-6">
                                <div className="space-y-3">
                                    {Object.entries(dailyLogs).map(([mealType, logs]) => (
                                        logs.length > 0 && (
                                            <div key={mealType}>
                                                <h4 className="font-semibold text-xs capitalize mb-1">{t(mealType as TranslationKey)}</h4>
                                                {logs.map((log: any) => (
                                                    <div key={log.id} className="text-xs text-muted-foreground">
                                                        {log.items.map((item: any) => item.name)}
                                                    </div>
                                                ))}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardFooter>
        </Card>
    );
};


const MealPlanCard = ({ onUpgrade }: { onUpgrade: () => void }) => {
    const { user } = useUser();
    const router = useRouter();
    const { t } = useTranslation();
    const { generatedPlan, toggleMealCompleted } = useNutritionPlanStore();

    if (user?.plan !== 'pro') {
        return <ProInsightCard title={t('todaysMealPlan')} icon={ClipboardList} onUpgrade={onUpgrade} />;
    }

    return (
        <motion.div variants={itemVariants} whileHover="hover" onClick={() => router.push('/dashboard/nutrition?tab=generator')}>
            <Card className="h-full group cursor-pointer flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ClipboardList className="text-primary" /> {t('todaysMealPlan')}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    {!generatedPlan ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                            <PlusCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                            <p className="text-sm font-semibold">{t('noMealPlan')}</p>
                            <p className="text-xs">{t('generateMealPlanPrompt')}</p>
                        </div>
                    ) : (
                        <div className="w-full space-y-4">
                            {generatedPlan.meals.map((meal, index) => (
                                <div key={index} className="flex items-start space-x-3 p-2 bg-muted/50 rounded-md">
                                    <Checkbox
                                        id={`meal-${index}`}
                                        checked={meal.completed}
                                        onCheckedChange={() => toggleMealCompleted(index)}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-0.5 text-left">
                                        <label
                                            htmlFor={`meal-${index}`}
                                            className="text-sm font-medium"
                                        >
                                            {t(meal.name.toLowerCase() as TranslationKey)} <span className="text-xs text-muted-foreground">(~{meal.calories} {t('kcal')})</span>
                                        </label>
                                        <p className="text-sm text-muted-foreground">
                                            {meal.items.join(', ')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

const ShoppingListCard = () => {
    const router = useRouter();
    const { t } = useTranslation();
    const { items, toggleItemChecked } = useShoppingListStore();
    const uncheckedItems = items.filter(item => !item.checked);
    const allItemsComplete = items.length > 0 && uncheckedItems.length === 0;

    return (
        <motion.div variants={itemVariants} whileHover="hover" onClick={() => router.push('/dashboard/nutrition?tab=list')}>
            <Card className="h-full group flex flex-col cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingCart className="text-primary" /> {t('shoppingList')}</CardTitle>
                    <CardDescription>{allItemsComplete ? t('shoppingComplete') : t('itemsToBuy', { count: uncheckedItems.length })}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    {allItemsComplete ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-primary p-4 border-2 border-dashed border-primary/40 rounded-lg">
                            <CheckCircle className="h-12 w-12 mb-2 glow-primary-sm rounded-full" />
                            <p className="text-sm font-semibold">{t('shoppingComplete')}</p>
                        </div>
                    ) : items.length > 0 ? (
                        <ScrollArea className="h-48">
                            <div className="space-y-3 pr-4">
                                {items.map(item => (
                                    <div key={item.id} className="flex items-start space-x-3">
                                        <Checkbox
                                            id={`shopping-item-${item.id}`}
                                            checked={item.checked}
                                            onCheckedChange={() => toggleItemChecked(item.id)}
                                            className="mt-1"
                                        />
                                        <label
                                            htmlFor={`shopping-item-${item.id}`}
                                            className={cn("text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70", item.checked && "line-through text-muted-foreground")}
                                        >
                                            {item.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                            <ShoppingCart className="h-8 w-8 mb-2 text-muted-foreground/50" />
                            <p className="text-sm font-semibold">{t('shoppingListEmpty')}</p>
                            <p className="text-xs">{t('shoppingListPrompt')}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

const GymPlanInsightCard = ({ onUpgrade }: { onUpgrade: () => void }) => {
    const { user } = useUser();
    const router = useRouter();
    const { plan, isHydrated, currentDayIndex, toggleExerciseCompleted } = usePlanStore();
    const { t } = useTranslation();

    const handleCardClick = () => {
        router.push('/dashboard/gym?tab=plan');
    };

    if (user?.plan !== 'pro') {
        return <ProInsightCard title={t('todaysGymPlan')} icon={Dumbbell} onUpgrade={onUpgrade} className="md:col-span-1" />;
    }

    if (!isHydrated || !plan) {
        return <EmptyInsightCard title={t('gymPlan')} description={t('generatePlanToSeeWorkout')} link="/dashboard/gym?tab=plan" icon={Dumbbell} className="md:col-span-1" />
    }

    const todayWorkout = plan.days[currentDayIndex];
    const allExercisesCompleted = todayWorkout.exercises.every(ex => ex.completed);

    return (
        <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={handleCardClick}>
            <Card className="h-full group md:aspect-square flex flex-col cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5" />{t('todaysGymPlan')}</CardTitle>
                    <CardDescription>{t('day')} {todayWorkout.day} / {plan.days.length} - {todayWorkout.focus}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
                    {allExercisesCompleted ? (
                        <div className="flex flex-col items-center gap-2">
                            <CheckCircle className="h-16 w-16 text-primary glow-primary-sm rounded-full" />
                            <p className="font-bold text-xl">{t('workoutCompleted')}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="space-y-3 pr-4">
                                {todayWorkout.exercises.map((ex, index) => (
                                    <div key={index} className="flex items-center space-x-2 text-left p-2 rounded-md bg-muted/50">
                                        <Checkbox
                                            id={`ex-${index}`}
                                            checked={ex.completed}
                                            onCheckedChange={() => toggleExerciseCompleted(currentDayIndex, index)}
                                        />
                                        <label
                                            htmlFor={`ex-${index}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                        >
                                            {ex.name} <span className="text-xs text-muted-foreground">({ex.sets}x{ex.reps})</span>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
};

const getExerciseVolumeKg = (ex: { sets: number; weight: { value: number; unit: string } }) => {
    const weightKg = ex.weight?.unit === 'lbs' ? ex.weight.value * 0.453592 : (ex.weight?.unit === 'kg' ? ex.weight.value : 0);
    return ex.sets * weightKg;
};

const VolumeLiftedCard = ({ onUpgrade }: { onUpgrade: () => void }) => {
    const { user } = useUser();
    const router = useRouter();
    const { plan, isHydrated } = usePlanStore();
    const { t } = useTranslation();
    const volumeChartConfig = { volume: { label: "Volume (kg)", color: "hsl(var(--primary))" } } satisfies ChartConfig;

    const handleCardClick = () => {
        router.push('/dashboard/gym?tab=plan');
    };

    if (user?.plan !== 'pro') {
        return <ProInsightCard title={t('totalVolumeLifted')} icon={BarChart2} onUpgrade={onUpgrade} className="md:col-span-1" />;
    }

    if (!isHydrated || !plan) {
        return <EmptyInsightCard title={t('totalVolumeLifted')} description={t('generatePlanToTrackVolume')} link="/dashboard/gym?tab=plan" icon={BarChart2} className="md:col-span-1" />
    }

    const volumeData = plan.days.map(day => ({
        week: `${day.day}`,
        volume: Math.round(day.exercises.reduce((sum, ex) => sum + getExerciseVolumeKg(ex), 0)),
    }));
    const totalVolume = volumeData.reduce((sum, d) => sum + d.volume, 0);

    return (
        <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={handleCardClick}>
            <Card className="md:aspect-square flex flex-col group cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />{t('totalVolumeLifted')}</CardTitle>
                    <CardDescription>{t('thisWeek')}: <span className="font-semibold text-foreground">{totalVolume.toLocaleString()} kg</span></CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="w-full h-full -mb-4">
                        <ChartContainer config={volumeChartConfig} className="w-full h-full">
                            <AreaChart data={volumeData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent
                                        indicator="dot"
                                        labelKey="week"
                                        formatter={(value, name, item) => (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-muted-foreground">{t('week')} {item.payload.week}</span>
                                                <span className="font-bold text-foreground">{Number(value).toLocaleString()} kg</span>
                                            </div>
                                        )}
                                    />}
                                />
                                <Area
                                    dataKey="volume"
                                    type="natural"
                                    fill="var(--color-volume)"
                                    fillOpacity={0.4}
                                    stroke="var(--color-volume)"
                                    strokeWidth={2}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

const WorkoutConsistencyCard = ({ onUpgrade }: { onUpgrade: () => void }) => {
    const { user } = useUser();
    const router = useRouter();
    const { plan, isHydrated } = usePlanStore();
    const { t } = useTranslation();
    const consistencyChartConfig = {
        sessions: {
            label: "Sessions",
        },
        Completed: {
            label: "Completed",
        },
        Missed: {
            label: "Missed",
        },
    } satisfies ChartConfig;

    const handleCardClick = () => {
        router.push('/dashboard/gym?tab=schedule');
    };

    if (user?.plan !== 'pro') {
        return <ProInsightCard title={t('weeklyConsistency')} icon={CheckCircle} onUpgrade={onUpgrade} className="md:col-span-1" />;
    }

    if (!isHydrated || !plan) {
        return <EmptyInsightCard title={t('weeklyConsistency')} description={t('generatePlanToTrackConsistency')} link="/dashboard/gym?tab=schedule" icon={CheckCircle} className="md:col-span-1" />
    }

    const completedCount = plan.days.filter(d => d.completed).length;
    const totalCount = plan.days.length;
    const consistencyData = [
        { name: "Completed", sessions: completedCount, fill: "hsl(var(--primary))" },
        { name: "Missed", sessions: totalCount - completedCount, fill: "hsl(var(--muted))" },
    ];

    return (
        <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={handleCardClick}>
            <Card className="md:aspect-square flex flex-col group cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5" />{t('weeklyConsistency')}</CardTitle>
                    <CardDescription>{t('sessionsCompleted', { completed: completedCount, total: totalCount })}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <ChartContainer config={consistencyChartConfig} className="mx-auto aspect-square h-full">
                        <PieChart>
                            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={consistencyData} dataKey="sessions" nameKey="name" innerRadius={60} strokeWidth={5}>
                                <text
                                    x="50%"
                                    y="50%"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    className="fill-foreground text-3xl font-bold"
                                >
                                    {((consistencyData[0].sessions / (consistencyData[0].sessions + consistencyData[1].sessions)) * 100).toFixed(0)}%
                                </text>
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </motion.div>
    )
}

// Tennis Insight Cards

const TennisLastMatchCard = ({ match }: { match: TennisMatch | null }) => {
    const router = useRouter();
    const { t } = useTranslation();
    if (!match) {
        return <EmptyInsightCard title={t('lastMatch')} description={t('logMatchToSeeTennisResult')} link="/dashboard/tennis" icon={Trophy} />;
    }
    return (
        <motion.div variants={itemVariants} whileHover="hover" onClick={() => router.push('/dashboard/tennis')}>
            <Card className="h-full group cursor-pointer flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" />{t('lastMatch')}</CardTitle>
                        <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold tracking-wide",
                            match.result === 'W' ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                        )}>
                            {match.result}
                        </span>
                    </div>
                    <CardDescription>vs. {match.opponent}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <p className="font-bold text-4xl">{match.result}</p>
                    <p className="font-semibold text-xl text-muted-foreground">{match.score}</p>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const ServeConsistencyCard = ({ matches }: { matches: TennisMatch[] }) => {
    const router = useRouter();
    const { t } = useTranslation();
    if (matches.length === 0) {
        return <EmptyInsightCard title={t('serveConsistency')} description={t('logMatchToTrackServe')} link="/dashboard/tennis" icon={Activity} />;
    }

    const data = matches.filter(m => m.status === 'completed').slice(0, 5).map((m, i) => ({
        name: `${t('match')} ${matches.length - i}`,
        '1st Serve %': m.firstServePercent || 0,
    })).reverse();

    return (
        <motion.div variants={itemVariants} whileHover="hover" onClick={() => router.push('/dashboard/tennis')}>
            <Card className="flex flex-col group cursor-pointer h-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />{t('serveConsistency')}</CardTitle>
                    <CardDescription>{t('serveConsistencyDescription', { count: data.length })}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center -mb-4">
                    <ChartContainer config={{ '1st Serve %': { label: '1st Serve %', color: "hsl(var(--primary))" } }} className="w-full h-full">
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} />
                            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                            <Bar dataKey="1st Serve %" fill="var(--color-1st Serve %)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const ShotAccuracyCard = ({ matches }: { matches: TennisMatch[] }) => {
    const router = useRouter();
    const { t } = useTranslation();
    const accuracyChartConfig: ChartConfig = {
        value: { label: "Accuracy" },
        forehand: { label: "Forehand", color: "#468af6" }, // charge blue
        backhand: { label: "Backhand", color: "#6e9ff8" },
        volley: { label: "Volley", color: "#94b3fa" },
        overhead: { label: "Overhead", color: "#a78bfa" }, // glow violet
    };
    const data = [
        { name: "forehand", value: 85, fill: "var(--color-forehand)" },
        { name: "backhand", value: 78, fill: "var(--color-backhand)" },
        { name: "volley", value: 72, fill: "var(--color-volley)" },
        { name: "overhead", value: 90, fill: "var(--color-overhead)" },
    ];

    if (matches.length === 0) {
        return <EmptyInsightCard title={t('shotAccuracy')} description={t('logMatchesForAccuracy')} link="/dashboard/tennis" icon={Target} />;
    }

    return (
        <motion.div variants={itemVariants} whileHover="hover" onClick={() => router.push('/dashboard/tennis')}>
            <Card className="h-full flex flex-col group cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />{t('shotAccuracy')}</CardTitle>
                    <CardDescription>{t('shotAccuracyDescription')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex items-center justify-center">
                    <ChartContainer config={accuracyChartConfig} className="mx-auto aspect-square h-full">
                        <PieChart>
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent
                                    indicator="dot"
                                    nameKey="name"
                                    formatter={(value, name) => (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: `var(--color-${name})` }}></div>
                                            <div className="flex flex-1 justify-between">
                                                <span className="capitalize">{name}</span>
                                                <span className="font-bold ml-4">{value}</span>
                                            </div>
                                        </div>
                                    )}
                                />}
                            />
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={60}
                                strokeWidth={5}
                                label={false}
                                labelLine={false}
                            />
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const NextEventCard = ({ event, sportName, link, eventType = 'match' }: { event: any, sportName: string, link: string, eventType?: 'match' | 'training' }) => {
    const router = useRouter();
    const { t } = useTranslation();
    const isTraining = eventType === 'training';

    if (!event) {
        const descriptionKey = isTraining ? 'scheduleTrainingPrompt' : 'scheduleMatchPrompt';
        const titleKey = isTraining ? 'nextTraining' : 'nextMatch';
        return (
            <EmptyInsightCard
                title={t(titleKey as any)}
                description={t(descriptionKey as any, { sport: t(sportName.toLowerCase() as TranslationKey) })}
                link={link}
                icon={CalendarDays}
                isRectangle={!isTraining}
                className={isTraining ? "" : "md:col-span-2"}
            />
        );
    }

    const isMatch = !!event.opponent;

    return (
        <motion.div variants={itemVariants} whileHover="hover" className={isTraining ? "" : "md:col-span-2"} onClick={() => router.push(link)}>
            <Card className={cn("h-full group cursor-pointer", isTraining && "md:aspect-square")}>
                <CardContent className="flex flex-col md:flex-row items-center justify-between p-6 h-full">
                    <div className="text-center md:text-left">
                        <p className="text-sm text-muted-foreground">{isMatch ? t('upcomingMatch') : t('nextTraining')}</p>
                        <h3 className="text-xl font-bold">{isMatch ? `vs. ${event.opponent}` : event.title}</h3>
                        <p className="text-muted-foreground">{format(event.date, "eeee, MMM d 'at' p")}</p>
                    </div>
                    <Button className="mt-4 md:mt-0">View details</Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}

export function InsightsGrid() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoading } = useUser();
    const { isHydrated, initialize: initializePlanStore } = usePlanStore();
    const [footballMatches, setFootballMatches] = useState<FootballMatch[]>([]);
    const [tennisMatches, setTennisMatches] = useState<TennisMatch[]>([]);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (user && !isHydrated) {
            initializePlanStore(user.uid, user.gymPlan || null);
        }
    }, [user, isHydrated, initializePlanStore]);

    useEffect(() => {
        if (!user) return;

        const footballQuery = query(collection(db, "football_matches"), where("userId", "==", user.uid), orderBy("date", "desc"));
        const tennisQuery = query(collection(db, "tennis_matches"), where("userId", "==", user.uid), orderBy("date", "desc"));

        const unsubFootball = onSnapshot(footballQuery, (snapshot) => {
            const matchesData: FootballMatch[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as FootballMatch));
            setFootballMatches(matchesData);
        });

        const unsubTennis = onSnapshot(tennisQuery, (snapshot) => {
            const matchesData: TennisMatch[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: (doc.data().date as Timestamp).toDate() } as TennisMatch));
            setTennisMatches(matchesData);
        });

        return () => {
            unsubFootball();
            unsubTennis();
        };
    }, [user]);

    const footballRadarData = useMemo(() => {
        if (footballMatches.length === 0) {
            return [
                { subject: "Speed", A: 0 }, { subject: "Endurance", A: 0 },
                { subject: "Passing", A: 0 }, { subject: "Shooting", A: 0 },
                { subject: "Defense", A: 0 },
            ];
        }
        const totalStamina = footballMatches.reduce((sum, m) => sum + m.stamina, 0);
        const totalGoals = footballMatches.reduce((sum, m) => sum + m.goals, 0);
        const totalAssists = footballMatches.reduce((sum, m) => sum + m.assists, 0);

        const avgStamina = (totalStamina / footballMatches.length) * 10;
        const shootingSkill = Math.min(100, (totalGoals / footballMatches.length) * 40);
        const passingSkill = Math.min(100, (totalAssists / footballMatches.length) * 50);

        return [
            { subject: "Speed", A: 75 },
            { subject: "Endurance", A: avgStamina },
            { subject: "Passing", A: passingSkill },
            { subject: "Shooting", A: shootingSkill },
            { subject: "Defense", A: 65 },
        ].map(item => ({ ...item, fullMark: 100 }));
    }, [footballMatches]);

    const footballStaminaData = useMemo(() => {
        if (footballMatches.length === 0) return [];
        return footballMatches.slice(0, 5).map(m => ({
            match: `vs ${m.opponent.substring(0, 10)}`,
            stamina: m.stamina
        })).reverse();
    }, [footballMatches]);

    const nextTennisMatch = useMemo(() => {
        return tennisMatches.filter(m => m.status === 'upcoming' && m.date >= new Date()).sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    }, [tennisMatches]);

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <motion.div
                        variants={sectionVariants}
                        initial="hidden"
                        animate="visible"
                        className="space-y-6"
                    >
                        <SectionHeader
                            icon={<Activity className="h-6 w-6" />}
                            title={t('generalInsightsTitle')}
                            subtitle={t('generalInsightsSubtitle')}
                        >
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/insights/history">
                                    <Clock className="mr-2 h-4 w-4" />
                                    {t('insightsHistory')}
                                </Link>
                            </Button>
                        </SectionHeader>
                        <motion.div
                            variants={sectionVariants}
                            className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                            <StreakCard />
                            <motion.div variants={itemVariants} className="md:col-span-1">
                                <NutritionChart />
                            </motion.div>
                            <div className="grid grid-cols-1 gap-6 md:col-span-2 md:grid-cols-2">
                                <MealPlanCard onUpgrade={() => setIsUpgradeModalOpen(true)} />
                                <ShoppingListCard />
                            </div>
                        </motion.div>
                    </motion.div>

                    <motion.div variants={sectionVariants} initial="hidden" animate="visible" className="space-y-6">
                        <motion.div variants={itemVariants}>
                            <SectionHeader
                                icon={<Dumbbell className="h-6 w-6" />}
                                title={t('gymInsightsTitle')}
                                subtitle={t('gymInsightsSubtitle')}
                            />
                            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <GymPlanInsightCard onUpgrade={() => setIsUpgradeModalOpen(true)} />
                                <WorkoutConsistencyCard onUpgrade={() => setIsUpgradeModalOpen(true)} />
                                <VolumeLiftedCard onUpgrade={() => setIsUpgradeModalOpen(true)} />
                                <NextEventCard sportName={t('gym')} eventType="training" link="/dashboard/gym?tab=schedule" event={null} />
                            </motion.div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <SectionHeader
                                icon={<TennisBallIcon className="h-6 w-6" />}
                                title={t('tennisInsightsTitle')}
                                subtitle={t('tennisInsightsSubtitle')}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <NextEventCard sportName={t('tennis')} eventType="match" link="/dashboard/tennis" event={nextTennisMatch} />
                                <div className="grid grid-cols-1 gap-6 auto-rows-fr">
                                    <TennisLastMatchCard match={tennisMatches.filter(m => m.status === 'completed').length > 0 ? tennisMatches[0] : null} />
                                    <ShotAccuracyCard matches={tennisMatches} />
                                </div>
                                <div className="grid grid-cols-1 gap-6 auto-rows-fr">
                                    <ServeConsistencyCard matches={tennisMatches} />
                                    <NextEventCard sportName={t('tennis')} eventType="training" link="/dashboard/tennis?tab=training" event={null} />
                                </div>
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <SectionHeader
                                icon={<Trophy className="h-6 w-6" />}
                                title={t('footballInsightsTitle')}
                                subtitle={t('footballInsightsSubtitle')}
                            />
                            <motion.div variants={sectionVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <NextEventCard sportName={t('football')} eventType="match" link="/dashboard/football" event={footballMatches.find(m => m.date >= new Date())} />
                                <NextEventCard sportName={t('football')} eventType="training" link="/dashboard/football?tab=training" event={null} />
                                <FootballInsightCard match={footballMatches.length > 0 ? footballMatches[0] : null} />
                                <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={() => router.push('/dashboard/football')}>
                                    <Card className="md:aspect-square flex flex-col group cursor-pointer">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />{t('progressRadar')}</CardTitle>
                                            <CardDescription>{t('progressRadarDescription')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex items-center justify-center p-0">
                                            {footballMatches.length > 0 ? (
                                                <ChartContainer config={{ value: { label: "Value", color: "hsl(var(--primary))" } }} className="mx-auto aspect-square h-full max-h-[250px] w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={footballRadarData}>
                                                            <PolarGrid />
                                                            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                                            <Radar name={user?.displayName || 'Player'} dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                                                        </RadarChart>
                                                    </ResponsiveContainer>
                                                </ChartContainer>
                                            ) : (
                                                <div className="text-center text-muted-foreground p-4">
                                                    <p>{t('logMatchToSeeRadar')}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                                <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={() => router.push('/dashboard/football')}>
                                    <Card className="md:aspect-square flex flex-col group cursor-pointer">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5" />{t('staminaOverTime')}</CardTitle>
                                            <CardDescription>{t('staminaOverTimeDescription')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                                            {footballStaminaData.length > 0 ? (
                                                <div className="w-full h-full -mb-4">
                                                    <ChartContainer config={{ stamina: { label: "Stamina", color: "hsl(var(--primary))" } }} className="w-full h-full">
                                                        <BarChart data={footballStaminaData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                            <XAxis dataKey="match" fontSize={10} tickLine={false} axisLine={false} />
                                                            <YAxis domain={[0, 10]} />
                                                            <ChartTooltip content={<ChartTooltipContent />} cursor={false} />
                                                            <Bar dataKey="stamina" fill="var(--color-stamina)" radius={4} />
                                                        </BarChart>
                                                    </ChartContainer>
                                                </div>
                                            ) : (
                                                <div className="text-center text-muted-foreground p-4">
                                                    <p>{t('logMatchToSeeStamina')}</p>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>

                <div className="hidden lg:block lg:sticky lg:top-20 h-[calc(100vh-6rem)]">
                    <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                        <FitnessAssistantChat />
                    </Suspense>
                </div>
            </div>
            <UpgradeProModal open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen} />
        </>
    )
}

export function DashboardClient({ initialView }: { initialView?: 'sports' | 'insights' }) {
    const router = useRouter();
    const { user } = useUser();
    const { t } = useTranslation();
    const [isNavVisible, setIsNavVisible] = useState(true);
    const lastScrollY = useRef(0);
    const prefersReducedMotion = useReducedMotion();

    const handleCardClick = (path: string) => {
        router.push(path);
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
                setIsNavVisible(false);
            } else {
                setIsNavVisible(true);
            }
            lastScrollY.current = currentScrollY;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (initialView === 'insights') {
        return (
            <div>
                <InsightsGrid />
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className={cn(
                            "lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 transition-transform duration-300",
                            isNavVisible ? "translate-y-0" : "translate-y-24"
                        )}>
                            <MessageCircle className="h-7 w-7" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="h-[90vh] w-[90vw] max-w-none p-0">
                        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                            <FitnessAssistantChat />
                        </Suspense>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* ── Tools & Features ── */}
            <motion.div
                key="more"
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
            >
                <div className="flex items-center gap-2 mb-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('moreSection')}</h2>
                </div>
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {moreLinks.map((link) => (
                        <motion.div
                            key={link.path}
                            variants={itemVariants}
                            whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card
                                className="flex h-full min-h-[148px] lg:min-h-[164px] cursor-pointer group transition-all duration-300 hover:border-primary/40 hover:shadow-float"
                                onClick={() => handleCardClick(link.path)}
                            >
                                <CardContent className="flex flex-col gap-3 p-5 lg:p-6 w-full">
                                    <div className="flex h-11 w-11 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:glow-primary-sm">
                                        <link.icon className="h-5 w-5 lg:h-6 lg:w-6 transition-colors duration-200" />
                                    </div>
                                    <div className="space-y-1">
                                        <CardTitle className="text-sm lg:text-base font-semibold tracking-tight leading-snug">{t(link.titleKey)}</CardTitle>
                                        <p className="text-xs lg:text-sm text-muted-foreground leading-snug">{t(link.subtitleKey)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            <Separator />

            {/* ── Sports Hub ── */}
            <motion.div
                key="sports"
                initial="hidden"
                animate="visible"
                variants={sectionVariants}
            >
                <div className="flex items-center gap-2 mb-5">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('sports')}</h2>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {sports.map((sport) => (
                        <motion.div
                            key={sport.name}
                            variants={itemVariants}
                            whileHover={prefersReducedMotion ? undefined : { y: -5, scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card
                                className="flex h-full min-h-[88px] lg:min-h-[104px] cursor-pointer group transition-all duration-300 hover:border-primary/40 hover:shadow-float"
                                onClick={() => handleCardClick(sport.path)}
                            >
                                <CardContent className="flex flex-grow items-center justify-between px-6 py-5 lg:px-7 lg:py-6 w-full">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight">
                                            {sport.name}
                                        </CardTitle>
                                        <p className="text-sm font-medium text-muted-foreground group-hover:text-primary flex items-center gap-1.5 transition-colors duration-200">
                                            <span>{t('startTraining')}</span>
                                            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:glow-primary-sm">
                                        <sport.icon className="h-6 w-6 lg:h-7 lg:w-7 transition-colors duration-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}





