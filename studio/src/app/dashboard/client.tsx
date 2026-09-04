

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, startOfDay, endOfDay, differenceInCalendarDays, subDays } from "date-fns";
import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp, updateDoc, doc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { describeIngredients } from '@/lib/ingredients';
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
import { Calendar as CalendarIcon, Bot, Sparkles, Send, Trophy, BrainCircuit, Star, Plus, CheckCircle, Trash2, Loader2, Bookmark, MessageCircle, Share2, Heart, BarChart2, Shield, Flame, Activity, CalendarDays, ClipboardList, Lightbulb, User as UserIcon, Clock, Repeat, Droplets, Bed, Check, Dumbbell, ShieldCheck, Zap, Edit, Target, Upload, Video, Waves, PlusCircle, HeartPulse, ArrowRight, Dribbble, UtensilsCrossed, RefreshCw, ShoppingCart, ChevronLeft, ChevronRight, XCircle, PieChart as PieChartIcon, Lock, ScanLine, LifeBuoy, Flag, Inbox, Users, Swords } from "lucide-react";
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
import { useAthleteSessions } from '@/hooks/use-athlete-sessions';
import { useFavorites } from '@/hooks/use-favorites';
import { FavoriteStar } from '@/components/favorite-star';
import { tierForStreak, nextTier, daysToNextTier } from '@/lib/streak-tiers';
import { StreakFlame } from '@/components/streak-flame';
import { pick } from '@/lib/bilingual';
import { UpgradeProModal } from '@/components/upgrade-pro-modal';
import { useTranslation } from "@/hooks/use-translation";
import { TranslationKey } from "@/lib/i18n";

const sports = [
    { name: "Gym", icon: Dumbbell, path: "/dashboard/gym" },
    { name: "Football", icon: Trophy, path: "/dashboard/football" },
    { name: "Tennis", icon: TennisBallIcon, path: "/dashboard/tennis" },
    // Not shipped yet: shown as inert "coming soon" cards, never navigable.
    { name: "Basketball", icon: Dribbble, path: "/dashboard/basketball", comingSoon: true },
    { name: "Boxing", icon: Shield, path: "/dashboard/boxing", comingSoon: true },
    { name: "Swimming", icon: Waves, path: "/dashboard/swimming", comingSoon: true },
];




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
    const { current: streak } = useStreakStore();
    const { t, language } = useTranslation();
    const router = useRouter();
    const reduceMotion = useReducedMotion();
    const [message, setMessage] = useState(t('streakMessage1'));

    useEffect(() => {
        const randomKey = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
        setMessage(t(randomKey));
    }, [streak, t]);

    // Everything here follows the tier rather than the brand colour: the card
    // used to show the same blue flame at day 1 and at day 300, so it said
    // nothing about how far the athlete had come. It also opens the streak
    // page — it was a big number with no way through to the tiers, perks or
    // recovery behind it.
    const tier = tierForStreak(streak);
    const next = nextTier(streak);
    const toGo = daysToNextTier(streak);
    const hasStreak = streak > 0;

    return (
        <motion.div
            variants={itemVariants}
            className="md:col-span-1"
            role="link"
            tabIndex={0}
            onClick={() => router.push('/dashboard/streak')}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push('/dashboard/streak');
                }
            }}
        >
            <Card
                className="h-full flex flex-col items-center justify-center text-center cursor-pointer transition-shadow hover:shadow-float"
                style={hasStreak ? { background: `linear-gradient(to bottom right, ${tier.gradient[1]}22, transparent)` } : undefined}
            >
                <CardContent className="p-6">
                    <motion.div
                        className="flex justify-center"
                        animate={
                            reduceMotion || !hasStreak
                                ? {}
                                : {
                                    scale: [1, 1.08, 1],
                                    filter: [
                                        `drop-shadow(0 0 0px ${tier.hex}00)`,
                                        `drop-shadow(0 0 12px ${tier.hex}cc)`,
                                        `drop-shadow(0 0 0px ${tier.hex}00)`,
                                    ],
                                }
                        }
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <StreakFlame tier={tier} locked={!hasStreak} className="h-16 w-16" />
                    </motion.div>

                    <p className={cn("text-5xl font-bold mt-2 tabular-nums", hasStreak ? tier.text : "text-muted-foreground")}>
                        {streak}
                    </p>
                    <p className="text-muted-foreground mt-1 font-semibold">{t('dayStreak')}</p>

                    {hasStreak && (
                        <span className={cn('mt-3 inline-block rounded-md px-2.5 py-1 text-xs font-bold ring-1', tier.bg, tier.text, tier.ring)}>
                            {pick(tier.name, language)}
                        </span>
                    )}

                    <p className="text-xs text-muted-foreground mt-3">
                        {hasStreak
                            ? (next
                                ? `${t('streakNextTier')}: ${pick(next.name, language)} — ${t('streakDaysToGo', { days: toGo ?? 0 })}`
                                : message)
                            : t('startStreakPrompt')}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
/**
 * Calorie ring geometry.
 *
 * One arc, showing calories eaten against the day's target — the same figure
 * printed in the centre.
 *
 * It used to be split into one arc per macro, sized by the calories each macro
 * contributes at 4/4/9 kcal per gram. That silently contradicted the number in
 * the middle: logged foods often carry a calorie figure with incomplete macro
 * data, so a day reading 1856 kcal drew arcs worth 550 and the ring looked
 * barely touched. The macro breakdown still lives in the bars beside the ring,
 * where a gap in the data is obvious rather than misleading.
 */
const RING_RADIUS = 45;

const NutritionChart = () => {
    const { dailyTotals, isLoading, dailyLogs } = useNutritionStore();
    const { user } = useUser();
    const router = useRouter();
    const { t } = useTranslation();
    const reduceMotion = useReducedMotion();

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
        { name: t('carbs'), value: carbs, target: targetCarbs, color: "bg-macro-carbs" },
        { name: t('protein'), value: protein, target: targetProtein, color: "bg-macro-protein" },
        { name: t('fat'), value: fat, target: targetFat, color: "bg-macro-fat" },
    ];

    // Calories eaten against the target. A zero or missing target would divide
    // to Infinity and blank the ring.
    const safeTarget = targetCalories > 0 ? targetCalories : 2500;
    const rawProgress = Math.max(0, calories) / safeTarget;
    const isOverTarget = rawProgress > 1;
    // Past the target the ring is simply full rather than drawing over itself.
    const progress = Math.min(rawProgress, 1);

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
                            <circle cx="50" cy="50" r={RING_RADIUS} stroke="hsl(var(--muted))" strokeWidth="10" fill="none" />
                            {progress > 0 && (
                                <motion.circle
                                    cx="50"
                                    cy="50"
                                    r={RING_RADIUS}
                                    stroke={isOverTarget ? "hsl(var(--warning))" : "hsl(var(--primary))"}
                                    strokeWidth="10"
                                    strokeLinecap="round"
                                    fill="none"
                                    transform="rotate(-90 50 50)"
                                    initial={reduceMotion ? false : { pathLength: 0 }}
                                    animate={{ pathLength: progress }}
                                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                />
                            )}
                            <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className={cn("text-2xl font-bold", isOverTarget ? "fill-warning" : "fill-current")}>
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
                                // The whole row ticks the meal off, and the click
                                // stops here. The card behind it navigates to the
                                // nutrition page, so every attempt to cross a meal
                                // off from insights used to leave the page instead.
                                <div
                                    key={index}
                                    role="button"
                                    tabIndex={0}
                                    onClick={(event) => { event.stopPropagation(); toggleMealCompleted(index); }}
                                    onKeyDown={(event) => {
                                        if (event.key !== 'Enter' && event.key !== ' ') return;
                                        event.preventDefault();
                                        event.stopPropagation();
                                        toggleMealCompleted(index);
                                    }}
                                    className="flex items-start space-x-3 p-2 bg-muted/50 rounded-md cursor-pointer transition-colors hover:bg-muted"
                                >
                                    <Checkbox
                                        checked={meal.completed}
                                        tabIndex={-1}
                                        aria-hidden
                                        className="mt-1 pointer-events-none"
                                    />
                                    <div className="grid gap-0.5 text-left">
                                        <span className={cn("text-sm font-medium", meal.completed && "line-through text-muted-foreground")}>
                                            {t(meal.name.toLowerCase() as TranslationKey)} <span className="text-xs text-muted-foreground">(~{meal.calories} {t('kcal')})</span>
                                        </span>
                                        <p className={cn("text-sm text-muted-foreground", meal.completed && "line-through")}>
                                            {describeIngredients(meal.items as any)}
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
                                    // Tapping the line crosses it off and goes no
                                    // further: the card is a link to the shopping
                                    // page, and the click used to reach it.
                                    <div
                                        key={item.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => { event.stopPropagation(); toggleItemChecked(item.id); }}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return;
                                            event.preventDefault();
                                            event.stopPropagation();
                                            toggleItemChecked(item.id);
                                        }}
                                        className="flex items-start space-x-3 rounded-md p-1 -mx-1 cursor-pointer transition-colors hover:bg-muted/60"
                                    >
                                        <Checkbox
                                            checked={item.checked}
                                            tabIndex={-1}
                                            aria-hidden
                                            className="mt-1 pointer-events-none"
                                        />
                                        <span className={cn("text-sm font-medium", item.checked && "line-through text-muted-foreground")}>
                                            {item.name}
                                        </span>
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
                                    // Same as the meal and shopping rows: tick the
                                    // set off without being thrown onto the gym page.
                                    <div
                                        key={index}
                                        role="button"
                                        tabIndex={0}
                                        onClick={(event) => { event.stopPropagation(); toggleExerciseCompleted(currentDayIndex, index); }}
                                        onKeyDown={(event) => {
                                            if (event.key !== 'Enter' && event.key !== ' ') return;
                                            event.preventDefault();
                                            event.stopPropagation();
                                            toggleExerciseCompleted(currentDayIndex, index);
                                        }}
                                        className="flex items-center space-x-2 text-left p-2 rounded-md bg-muted/50 cursor-pointer transition-colors hover:bg-muted"
                                    >
                                        <Checkbox checked={ex.completed} tabIndex={-1} aria-hidden className="pointer-events-none" />
                                        <span className={cn("text-sm font-medium leading-none", ex.completed && "line-through text-muted-foreground")}>
                                            {ex.name} <span className="text-xs text-muted-foreground">({ex.sets}x{ex.reps})</span>
                                        </span>
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
                            "px-2.5 py-1 rounded-md text-xs font-bold tracking-wide",
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
    const { sessions } = useAthleteSessions(user?.uid, 'all');

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

    /**
     * Only matches actually played.
     *
     * A fixture carries no goals, no stamina and no minutes; averaging it in
     * drags every axis toward zero and puts an empty bar on the chart.
     */
    const playedFootball = useMemo(
        () => footballMatches.filter((m: any) => m.status !== 'upcoming'),
        [footballMatches]
    );
    const playedTennis = useMemo(
        () => tennisMatches.filter((m: any) => m.status !== 'upcoming'),
        [tennisMatches]
    );

    const footballRadarData = useMemo(() => {
        if (playedFootball.length === 0) {
            return [
                { subject: "Endurance", A: 0 },
                { subject: "Passing", A: 0 },
                { subject: "Shooting", A: 0 },
            ];
        }
        const totalStamina = playedFootball.reduce((sum, m) => sum + (m.stamina ?? 0), 0);
        const totalGoals = playedFootball.reduce((sum, m) => sum + (m.goals ?? 0), 0);
        const totalAssists = playedFootball.reduce((sum, m) => sum + (m.assists ?? 0), 0);

        const avgStamina = (totalStamina / playedFootball.length) * 10;
        const shootingSkill = Math.min(100, (totalGoals / playedFootball.length) * 40);
        const passingSkill = Math.min(100, (totalAssists / playedFootball.length) * 50);

        // Only axes that come from logged matches. "Speed" and "Defense"
        // used to be the constants 75 and 65 — numbers nobody measured,
        // rendered beside three that were real, which made the whole chart
        // look like data.
        return [
            { subject: "Endurance", A: avgStamina },
            { subject: "Passing", A: passingSkill },
            { subject: "Shooting", A: shootingSkill },
        ].map(item => ({ ...item, fullMark: 100 }));
    }, [playedFootball]);

    const footballStaminaData = useMemo(() => {
        if (playedFootball.length === 0) return [];
        return playedFootball.slice(0, 5).map(m => ({
            match: `vs ${m.opponent.substring(0, 10)}`,
            stamina: m.stamina ?? 0
        })).reverse();
    }, [playedFootball]);

    const nextTennisMatch = useMemo(() => {
        return tennisMatches.filter(m => m.status === 'upcoming' && m.date >= new Date()).sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    }, [tennisMatches]);

    /**
     * Football's fixture, chosen the same way tennis's is.
     *
     * `.find(m => m.date >= new Date())` over a list sorted newest-first
     * returned the *furthest* future match, and did not check that it was a
     * fixture at all — so a match played this morning could show as the next
     * one up.
     */
    const nextFootballMatch = useMemo(() => {
        return footballMatches.filter(m => (m as any).status === 'upcoming' && m.date >= new Date()).sort((a, b) => a.date.getTime() - b.date.getTime())[0];
    }, [footballMatches]);

    /**
     * The next session the athlete has planned, per sport.
     *
     * These cards were passed a hardcoded `null`, so they told every athlete
     * they had nothing scheduled no matter how much training they had entered.
     * The sessions were in `athlete_sessions` the whole time.
     */
    const nextSessionFor = useCallback((sport: string) => {
        const now = new Date();
        return sessions
            .filter(s => s.sport === sport && !s.completed && s.date && s.date >= now)
            .sort((a, b) => (a.date!.getTime()) - (b.date!.getTime()))[0] ?? null;
    }, [sessions]);

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
                            {/* Insights is where an athlete notices they have
                                nothing scheduled, so it is where the way to fix
                                that belongs. */}
                            <Button variant="outline" asChild>
                                <Link href="/dashboard/fixtures">
                                    <Swords className="mr-2 h-4 w-4" />
                                    {t('scheduleMatch')}
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
                                <NextEventCard sportName={t('gym')} eventType="training" link="/dashboard/gym?tab=schedule" event={nextSessionFor('gym')} />
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
                                    <TennisLastMatchCard match={playedTennis[0] ?? null} />
                                    <ShotAccuracyCard matches={playedTennis} />
                                </div>
                                <div className="grid grid-cols-1 gap-6 auto-rows-fr">
                                    <ServeConsistencyCard matches={playedTennis} />
                                    <NextEventCard sportName={t('tennis')} eventType="training" link="/dashboard/tennis?tab=training" event={nextSessionFor('tennis')} />
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
                                <NextEventCard sportName={t('football')} eventType="match" link="/dashboard/football" event={nextFootballMatch} />
                                <NextEventCard sportName={t('football')} eventType="training" link="/dashboard/football?tab=training" event={nextSessionFor('football')} />
                                <FootballInsightCard match={playedFootball[0] ?? null} />
                                <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={() => router.push('/dashboard/football')}>
                                    <Card className="md:aspect-square flex flex-col group cursor-pointer">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5" />{t('progressRadar')}</CardTitle>
                                            <CardDescription>{t('progressRadarDescription')}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex items-center justify-center p-0">
                                            {playedFootball.length > 0 ? (
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
    const { user, isAdmin } = useUser();
    const { favorites } = useFavorites();
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
                            "lg:hidden fixed bottom-20 right-4 h-14 w-14 rounded-xl shadow-lg z-40 transition-transform duration-300",
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
            {/* ── Favourites ── */}
            <motion.div key="favorites" initial="hidden" animate="visible" variants={sectionVariants}>
                <div className="mb-4 flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('favoritesSection')}</h2>
                </div>

                {favorites.length === 0 ? (
                    // Compact on purpose: an empty shortcut row must not take
                    // more room than the shortcuts it is standing in for.
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-dashed border-border/70 px-4 py-3">
                        <Star className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">{t('favoritesEmpty')}</p>
                        <Link
                            href="/dashboard/autres"
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                        >
                            {t('favoritesDiscover')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        {favorites.map((tool) => (
                            <motion.div key={tool.id} variants={itemVariants}>
                                <Card
                                    role="link"
                                    tabIndex={0}
                                    onClick={() => handleCardClick(tool.path)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleCardClick(tool.path);
                                        }
                                    }}
                                    className="group cursor-pointer transition-colors hover:border-primary/40"
                                >
                                    <CardContent className="flex items-center gap-2 p-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <tool.icon className="h-4 w-4" />
                                        </span>
                                        {/* Two lines rather than truncating: at
                                            two columns on a phone "Coach Mental"
                                            was cut to "Coach Me...". */}
                                        <span className="min-w-0 flex-grow text-sm font-semibold leading-tight line-clamp-2">
                                            {t(tool.titleKey)}
                                        </span>
                                        <FavoriteStar toolId={tool.id} className="-mr-1 h-7 w-7" />
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
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
                            whileHover={prefersReducedMotion || sport.comingSoon ? undefined : { y: -5, scale: 1.01 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            <Card
                                aria-disabled={sport.comingSoon || undefined}
                                className={cn(
                                    "flex h-full min-h-[88px] lg:min-h-[104px] group transition-all duration-300",
                                    sport.comingSoon
                                        ? "cursor-not-allowed opacity-60 select-none"
                                        : "cursor-pointer hover:border-primary/40 hover:shadow-float"
                                )}
                                onClick={sport.comingSoon ? undefined : () => handleCardClick(sport.path)}
                            >
                                <CardContent className="flex flex-grow items-center justify-between px-6 py-5 lg:px-7 lg:py-6 w-full">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight">
                                            {sport.name}
                                        </CardTitle>
                                        {sport.comingSoon ? (
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {t('comingSoon')}
                                            </p>
                                        ) : (
                                            <p className="text-sm font-medium text-muted-foreground group-hover:text-primary flex items-center gap-1.5 transition-colors duration-200">
                                                <span>{t('startTraining')}</span>
                                                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                                            </p>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "flex h-12 w-12 lg:h-14 lg:w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                                        sport.comingSoon
                                            ? "bg-muted text-muted-foreground"
                                            : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:glow-primary-sm"
                                    )}>
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





