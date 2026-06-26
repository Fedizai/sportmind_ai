
"use client";

import React, { useState, useEffect } from "react";
import { format, subDays, addDays, parseISO, startOfDay, endOfDay, isSameDay } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { doc, onSnapshot, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarIcon, Loader2, Clock, ChevronLeft, ChevronRight, XCircle, ArrowLeft, Trophy, BarChart2, CheckCircle, Dumbbell, Flame, HeartPulse, Activity, Target, ClipboardList, ShoppingCart, CalendarDays, PlusCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import Link from 'next/link';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Pie, PieChart, Cell } from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useTranslation } from "@/hooks/use-translation";
import { TennisBallIcon } from "@/components/icons/tennis-ball";
import { motion } from "framer-motion";

// --- Data Types for Historical Data ---
interface HistoricalNutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals?: { name: string; items: string[]; completed?: boolean; calories: number }[];
  shoppingList?: { id: string; name: string; checked: boolean }[];
}

interface HistoricalGymData {
  plan?: {
    days: { day: number; focus: string; exercises: { name: string; sets: number; reps: string; completed?: boolean }[] }[];
  };
  consistency?: { completed: number; total: number };
  volume?: number;
}

interface HistoricalFootballData {
  lastMatch?: {
    opponent: string;
    result: 'win' | 'draw' | 'loss';
    goals: number;
    assists: number;
    minutesPlayed: number;
    stamina: number;
    motm?: boolean;
  };
  radar?: { subject: string; A: number; fullMark: number }[];
  staminaOverTime?: { match: string; stamina: number }[];
}

interface HistoricalData {
  nutrition?: HistoricalNutritionData;
  gym?: HistoricalGymData;
  football?: HistoricalFootballData;
  tennis?: any;
}


// --- Generic Components ---

const SectionHeader = ({ icon, title, subtitle, subtitleText }: { icon: React.ReactNode, title: string, subtitle?: string, subtitleText?: string }) => {
    const { t } = useTranslation();
    return (
        <div className="mb-6">
            <div className="flex items-center gap-3">
                {icon}
                <div>
                    <h2 className="text-2xl font-bold tracking-tight font-headline">{t(title as any)}</h2>
                    <p className="text-muted-foreground">{subtitleText ?? t((subtitle ?? '') as any)}</p>
                </div>
            </div>
            <Separator className="mt-4" />
        </div>
    );
}

const EmptyInsightCard = ({ title, description, icon: Icon, className, isRectangle }: { title: string, description: string, icon: React.ComponentType<{ className?: string }>, className?: string, isRectangle?: boolean }) => {
    const { t } = useTranslation();
    return (
        <div className={className}>
            <Card className={cn("h-full group flex flex-col", !isRectangle && "aspect-square")}>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Icon className="text-primary h-5 w-5" /> {t(title as any)}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                        <XCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                        <p className="text-sm font-semibold">{t(description as any)}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// --- Read-Only Card Components ---

const HistoricalNutritionChart = ({ data }: { data: HistoricalNutritionData | undefined }) => {
    const { t } = useTranslation();
    if (!data || data.calories === 0) return <EmptyInsightCard title="nutrition" description="noNutritionDataForDay" icon={Flame} className="md:col-span-2" isRectangle={true} />;

    const macros = [
        { name: "Carbs", value: data.carbs },
        { name: "Protein", value: data.protein },
        { name: "Fat", value: data.fat },
    ];
    const totalGrams = macros.reduce((sum, macro) => sum + macro.value, 0);
    const macroColors: {[key: string]: string} = {
        Carbs: 'hsl(var(--chart-2))',
        Protein: 'hsl(var(--chart-1))',
        Fat: 'hsl(var(--chart-4))'
    }

    let currentRotation = -90;
    const circumference = 2 * Math.PI * 70;

    return (
        <div className="md:col-span-2">
            <Card className="h-full group flex flex-col">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Flame className="text-primary" />{t('nutrition')}</CardTitle>
                            <CardDescription>{t('todaysIntake')}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-full w-full flex-grow">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="relative w-36 h-36 md:w-48 md:h-48 mx-auto">
                            <svg className="w-full h-full" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="80" cy="80" r="70" stroke="hsl(var(--muted))" strokeWidth="20"></circle>
                                {macros.map((macro, index) => {
                                    const percentage = totalGrams > 0 ? macro.value / totalGrams : 0;
                                    const rotation = currentRotation;
                                    const strokeDashoffset = circumference;
                                    const animateTo = circumference * (1 - percentage);
                                    currentRotation += percentage * 360;
                                    return (
                                        <motion.circle
                                            key={macro.name}
                                            cx="80"
                                            cy="80"
                                            r="70"
                                            stroke={macroColors[macro.name]}
                                            strokeWidth="20"
                                            strokeDasharray={circumference}
                                            strokeLinecap="round"
                                            transform={`rotate(${rotation} 80 80)`}
                                            initial={{ strokeDashoffset }}
                                            animate={{ strokeDashoffset: animateTo }}
                                            transition={{ duration: 0.5, delay: index * 0.2, ease: "easeOut" }}
                                        />
                                    )
                                })}
                                <text dominantBaseline="middle" fill="hsl(var(--foreground))" fontFamily="Inter, sans-serif" className="text-2xl md:text-3xl font-bold" textAnchor="middle" x="80" y="80">
                                    {totalGrams.toFixed(0)}
                                </text>
                                <text dominantBaseline="middle" fill="hsl(var(--foreground))" fontFamily="Inter, sans-serif" className="text-base md:text-lg font-semibold" textAnchor="middle" x="80" y="105">
                                    g
                                </text>
                                <text dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontFamily="Inter, sans-serif" className="text-xs md:text-sm" textAnchor="middle" x="80" y="125">
                                    {data.calories.toFixed(0)} kcal
                                </text>
                                <line stroke="hsl(var(--border))" strokeLinecap="round" strokeWidth="2" x1="60" x2="100" y1="115" y2="115"></line>
                            </svg>
                        </div>
                        <div className="flex flex-col gap-2 md:gap-4">
                            {macros.map(macro => (
                                <div key={macro.name} className="flex items-baseline gap-2 text-sm md:text-base">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: macroColors[macro.name] }} />
                                    <span className="font-semibold">{macro.name}:</span>
                                    <span className="text-muted-foreground">{macro.value.toFixed(0)}g</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

const HistoricalMealPlanCard = ({ data }: { data: HistoricalNutritionData | undefined }) => {
    const { t } = useTranslation();
    return (
        <div>
           <Card className="h-full group flex flex-col">
               <CardHeader>
                   <CardTitle className="flex items-center gap-2"><ClipboardList className="text-primary" /> {t('todaysMealPlan')}</CardTitle>
               </CardHeader>
               <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    {!data?.meals?.length ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4 border-2 border-dashed border-muted rounded-lg group-hover:border-primary/50 transition-colors">
                           <XCircle className="h-8 w-8 mb-2 text-muted-foreground/50" />
                           <p className="text-sm font-semibold">{t('noMealPlan')}</p>
                       </div>
                    ) : (
                        <ScrollArea className="h-48 w-full">
                            <div className="w-full space-y-4 pr-4">
                                {data.meals.map((meal, index) => (
                                    <div key={index} className="flex items-start space-x-3 p-2 bg-muted/50 rounded-md">
                                        <Checkbox id={`meal-${index}`} checked={meal.completed} disabled className="mt-1" />
                                        <div className="grid gap-0.5 text-left">
                                            <label htmlFor={`meal-${index}`} className="text-sm font-medium">{meal.name} <span className="text-xs text-muted-foreground">(~{meal.calories} kcal)</span></label>
                                            <p className="text-sm text-muted-foreground">{meal.items.join(', ')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
               </CardContent>
           </Card>
       </div>
   );
}

const HistoricalShoppingListCard = ({ data }: { data: HistoricalNutritionData | undefined }) => {
    const { t } = useTranslation();
    const allItemsComplete = data?.shoppingList && data.shoppingList.every(item => item.checked);
    return (
        <div>
            <Card className="h-full group flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ShoppingCart className="text-primary" /> {t('shoppingList')}</CardTitle>
                    <CardDescription>{!data?.shoppingList ? t('noListForDay') : allItemsComplete ? t('allItemsBought') : t('itemsToBuy', { count: data.shoppingList.filter(i => !i.checked).length })}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                     {allItemsComplete ? (
                         <div className="flex flex-col items-center justify-center h-full text-center text-success p-4 border-2 border-dashed border-success/50 rounded-lg">
                            <CheckCircle className="h-12 w-12 mb-2" />
                            <p className="text-sm font-semibold">{t('shoppingComplete')}</p>
                        </div>
                     ) : data?.shoppingList?.length ? (
                        <ScrollArea className="h-48">
                            <div className="space-y-3 pr-4">
                                {data.shoppingList.map(item => (
                                     <div key={item.id} className="flex items-start space-x-3">
                                        <Checkbox id={`shopping-item-${item.id}`} checked={item.checked} disabled className="mt-1"/>
                                        <label htmlFor={`shopping-item-${item.id}`} className={cn("text-sm font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70", item.checked && "line-through text-muted-foreground")}>
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

const HistoricalGymPlanCard = ({ data }: { data: HistoricalGymData | undefined }) => {
    const { t } = useTranslation();
    if (!data?.plan?.days?.length) return <EmptyInsightCard title="gymPlan" description="noPlanActiveForDay" icon={Dumbbell} />;

    const todayWorkout = data.plan.days[0];
    const allExercisesCompleted = todayWorkout.exercises.every(ex => ex.completed);
    
    return (
        <div>
            <Card className="h-full group aspect-square flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5"/>{t('gymPlan')}</CardTitle>
                    <CardDescription>{t('day')} {todayWorkout.day} - {todayWorkout.focus}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center space-y-4">
                    {allExercisesCompleted ? (
                        <div className="flex flex-col items-center gap-2 text-success">
                            <CheckCircle className="h-16 w-16" />
                            <p className="font-bold text-xl">{t('workoutCompleted')}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full w-full">
                            <div className="space-y-3 pr-4">
                            {todayWorkout.exercises.map((ex, index) => (
                                <div key={index} className="flex items-center space-x-2 text-left p-2 rounded-md bg-muted/50">
                                    <Checkbox id={`ex-${index}`} checked={ex.completed} disabled/>
                                    <label htmlFor={`ex-${index}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        {ex.name} <span className="text-xs text-muted-foreground">({ex.sets}x{ex.reps})</span>
                                    </label>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const HistoricalWorkoutConsistencyCard = ({ data }: { data: HistoricalGymData | undefined }) => {
    const { t } = useTranslation();
    if (!data?.consistency) return <EmptyInsightCard title="weeklyConsistency" description="noDataLoggedForDay" icon={CheckCircle} />;
    
    const percentage = data.consistency.total > 0 ? ((data.consistency.completed / data.consistency.total) * 100).toFixed(0) : 0;
    const consistencyData = [
        { name: 'Completed', sessions: data.consistency.completed, fill: "hsl(var(--primary))" },
        { name: 'Missed', sessions: data.consistency.total - data.consistency.completed, fill: "hsl(var(--muted))" }
    ];

    return (
        <div>
            <Card className="aspect-square flex flex-col group">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5"/>{t('weeklyConsistency')}</CardTitle>
                    <CardDescription>{t('sessionsCompleted', { completed: data.consistency.completed, total: data.consistency.total })}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                     <ChartContainer config={{}} className="mx-auto aspect-square h-full">
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
                                    {percentage}%
                                </text>
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
}

const HistoricalVolumeLiftedCard = ({ data }: { data: HistoricalGymData | undefined }) => {
    const { t } = useTranslation();
    if (!data?.volume) return <EmptyInsightCard title="totalVolumeLifted" description="noDataLoggedForDay" icon={BarChart2} />;
     const volumeData = [{ week: '1', volume: data.volume }];
    return (
        <div>
            <Card className="aspect-square flex flex-col group">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/>{t('totalVolumeLifted')}</CardTitle>
                    <CardDescription>{t('volumeForWeekOfDay')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="w-full h-full -mb-4">
                        <ChartContainer config={{ volume: { label: "Volume (kg)", color: "hsl(var(--primary))" } }} className="w-full h-full">
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
        </div>
    );
}


const HistoricalFootballCard = ({ data }: { data: HistoricalFootballData | undefined }) => {
    const { t } = useTranslation();
     if (!data?.lastMatch) return <EmptyInsightCard title="lastMatch" description="noMatchLoggedForDay" icon={Trophy} />;

    const match = data.lastMatch;
    const getResultClasses = (result: 'win' | 'draw' | 'loss') => {
      switch (result) {
          case 'win': return { bg: 'bg-success/10', text: 'text-success', border: 'border-success/30' };
          case 'draw': return { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/30' };
          case 'loss': return { bg: 'bg-danger/10', text: 'text-danger', border: 'border-danger/30' };
      }
    }
    const resultClasses = getResultClasses(match.result);

    return (
        <div>
            <Card className={cn("h-full group aspect-square flex flex-col", resultClasses.bg)}>
                <CardHeader>
                    <CardTitle className={cn("flex items-center gap-2", resultClasses.text)}><Trophy className="h-5 w-5"/>{t('lastMatch')}</CardTitle>
                    <CardDescription className={resultClasses.text}>{t('vsOpponent', { opponent: match.opponent })}</CardDescription>
                </CardHeader>
                <CardContent className={cn("flex-grow flex flex-col justify-center items-center text-center", resultClasses.text)}>
                    <p className="font-bold text-4xl uppercase">{t(match.result)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                        <div><p className="text-2xl font-bold">{match.goals}</p><p className="text-xs uppercase">{t('goals')}</p></div>
                        <div><p className="text-2xl font-bold">{match.assists}</p><p className="text-xs uppercase">{t('assists')}</p></div>
                        <div><p className="text-2xl font-bold">{match.minutesPlayed}'</p><p className="text-xs uppercase">{t('mins')}</p></div>
                        <div><p className="text-2xl font-bold">{match.stamina}/10</p><p className="text-xs uppercase">{t('stamina')}</p></div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const HistoricalRadarCard = ({ data }: { data: HistoricalFootballData | undefined }) => {
    const { t } = useTranslation();
    if (!data?.radar) return <EmptyInsightCard title="progressRadar" description="noDataLoggedForDay" icon={BarChart2} />;

    return (
        <div>
            <Card className="aspect-square flex flex-col group cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart2 className="h-5 w-5"/>{t('progressRadar')}</CardTitle>
                    <CardDescription>{t('basedOnMatchesUpToDay')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center p-0">
                    <ChartContainer config={{value: { label: "Value", color: "hsl(var(--primary))"}}} className="mx-auto aspect-square h-full max-h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radar}>
                                <PolarGrid />
                                <PolarAngleAxis dataKey="subject" tick={{fontSize: 12}}/>
                                <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.6} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                </CardContent>
            </Card>
        </div>
    );
};

const HistoricalStaminaCard = ({ data }: { data: HistoricalFootballData | undefined }) => {
    const { t } = useTranslation();
    if (!data?.staminaOverTime?.length) return <EmptyInsightCard title="staminaOverTime" description="noDataLoggedForDay" icon={HeartPulse} />;

    return (
        <div>
            <Card className="aspect-square flex flex-col group cursor-pointer">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><HeartPulse className="h-5 w-5"/>{t('staminaOverTime')}</CardTitle>
                    <CardDescription>{t('staminaRatingRecentMatches')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="w-full h-full -mb-4">
                        <ChartContainer config={{stamina: {label: "Stamina", color: "hsl(var(--primary))"}}} className="w-full h-full">
                            <BarChart data={data.staminaOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                <XAxis dataKey="match" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis domain={[0, 10]} />
                                <ChartTooltip content={<ChartTooltipContent />} cursor={false}/>
                                <Bar dataKey="stamina" fill="var(--color-stamina)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};


export default function InsightsHistoryPage() {
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const { t, language } = useTranslation();
  const dateLocale = language === 'fr' ? fr : enUS;

  useEffect(() => {
    if (!user) return;

    setIsHistoryLoading(true);

    const fetchHistoricalData = async () => {
        try {
            const dayStart = startOfDay(selectedDate);
            const dayEnd = endOfDay(selectedDate);

            // --- Nutrition ---
            let nutrition: HistoricalNutritionData | undefined;
            const nutritionQuery = query(
                collection(db, "nutritionLogs"),
                where("userId", "==", user.uid),
                where("createdAt", ">=", Timestamp.fromDate(dayStart)),
                where("createdAt", "<=", Timestamp.fromDate(dayEnd))
            );
            const nutritionSnap = await getDocs(nutritionQuery);
            if (!nutritionSnap.empty) {
                let calories = 0, protein = 0, carbs = 0, fat = 0;
                const mealsMap: Record<string, { items: string[]; calories: number }> = {};
                nutritionSnap.forEach((docSnap) => {
                    const data = docSnap.data();
                    const mealType = data.mealType || 'snack';
                    if (!mealsMap[mealType]) mealsMap[mealType] = { items: [], calories: 0 };
                    (data.items || []).forEach((item: any) => {
                        calories += item.calories || 0;
                        protein += item.protein || 0;
                        carbs += item.carbs || 0;
                        fat += item.fat || 0;
                        mealsMap[mealType].items.push(item.name);
                        mealsMap[mealType].calories += item.calories || 0;
                    });
                });
                nutrition = {
                    calories, protein, carbs, fat,
                    meals: Object.entries(mealsMap).map(([name, meal]) => ({
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        items: meal.items,
                        completed: true,
                        calories: meal.calories,
                    })),
                };
            }

            // --- Gym ---
            let gym: HistoricalGymData | undefined;
            const gymPlan = user.gymPlan;
            if (gymPlan?.days?.length) {
                const dayForDate = gymPlan.days.find(d => d.completed_at && isSameDay(new Date(d.completed_at), selectedDate));
                if (dayForDate) {
                    const volume = dayForDate.exercises.reduce((sum, ex) => {
                        const weightKg = ex.weight?.unit === 'lbs' ? ex.weight.value * 0.453592 : (ex.weight?.unit === 'kg' ? ex.weight.value : 0);
                        return sum + ex.sets * weightKg;
                    }, 0);
                    const completedDays = gymPlan.days.filter(d => d.completed).length;
                    gym = {
                        plan: { days: [dayForDate] },
                        consistency: { completed: completedDays, total: gymPlan.days.length },
                        volume: Math.round(volume),
                    };
                }
            }

            // --- Football ---
            let football: HistoricalFootballData | undefined;
            const footballQuery = query(
                collection(db, "football_matches"),
                where("userId", "==", user.uid),
                where("date", ">=", Timestamp.fromDate(dayStart)),
                where("date", "<=", Timestamp.fromDate(dayEnd))
            );
            const footballSnap = await getDocs(footballQuery);
            if (!footballSnap.empty) {
                const matchData = footballSnap.docs[0].data();
                football = {
                    lastMatch: {
                        opponent: matchData.opponent,
                        result: matchData.result,
                        goals: matchData.goals || 0,
                        assists: matchData.assists || 0,
                        minutesPlayed: matchData.minutesPlayed || 0,
                        stamina: matchData.stamina || 0,
                        motm: matchData.motm || false,
                    },
                };

                const recentQuery = query(
                    collection(db, "football_matches"),
                    where("userId", "==", user.uid),
                    where("date", "<=", Timestamp.fromDate(dayEnd)),
                    orderBy("date", "desc"),
                    limit(5)
                );
                const recentSnap = await getDocs(recentQuery);
                football.staminaOverTime = recentSnap.docs
                    .map(d => ({ match: `vs ${d.data().opponent}`, stamina: d.data().stamina || 0 }))
                    .reverse();
            }

            setHistoricalData({ nutrition, gym, football });
        } catch (error) {
            console.error("Error fetching historical data:", error);
            setHistoricalData(null);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    fetchHistoricalData();
  }, [selectedDate, user?.uid, user?.gymPlan]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <motion.div 
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            {t('insightsHistory')}
            </h1>
            <p className="text-muted-foreground">{t('insightsHistorySubtitle')}</p>
        </div>
         <Button variant="secondary" asChild>
            <Link href="/dashboard/insights">
                {t('insights')}
            </Link>
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => handleDateChange(subDays(selectedDate, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-48">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, 'PPP', { locale: dateLocale })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={selectedDate} onSelect={handleDateChange} disabled={(date) => date > new Date()} />
          </PopoverContent>
        </Popover>
        <Button variant="outline" size="icon" onClick={() => handleDateChange(addDays(selectedDate, 1))} disabled={isSameDay(selectedDate, new Date())}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      {isHistoryLoading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : (
        <div className="space-y-12">
            <div className="space-y-6">
                <SectionHeader icon={<Activity className="h-8 w-8 text-primary" />} title="generalInsightsTitle" subtitleText={t('showingDataFor', { date: format(selectedDate, 'PPP', { locale: dateLocale }) })} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HistoricalNutritionChart data={historicalData?.nutrition} />
                    <HistoricalMealPlanCard data={historicalData?.nutrition} />
                    <HistoricalShoppingListCard data={historicalData?.nutrition} />
                </div>
            </div>

            <div className="space-y-6">
                <SectionHeader icon={<Dumbbell className="h-8 w-8 text-primary" />} title="gymInsightsTitle" subtitle="gymInsightsSubtitle" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <HistoricalGymPlanCard data={historicalData?.gym} />
                    <HistoricalWorkoutConsistencyCard data={historicalData?.gym} />
                    <HistoricalVolumeLiftedCard data={historicalData?.gym} />
                    <EmptyInsightCard title="nextTraining" description="noTrainingScheduledForDay" icon={CalendarDays} />
                </div>
            </div>

             <div className="space-y-6">
                <SectionHeader icon={<TennisBallIcon className="h-8 w-8 text-primary" />} title="tennisInsightsTitle" subtitle="tennisInsightsSubtitle" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EmptyInsightCard title="nextMatch" description="noMatchScheduledForDay" icon={CalendarDays} className="md:col-span-2" isRectangle/>
                    <EmptyInsightCard title="lastMatch" description="noMatchLoggedForDay" icon={Trophy} />
                    <EmptyInsightCard title="serveConsistency" description="noDataLoggedForDay" icon={Activity}/>
                    <EmptyInsightCard title="shotAccuracy" description="noDataLoggedForDay" icon={Target}/>
                    <EmptyInsightCard title="nextTraining" description="noTrainingScheduledForDay" icon={CalendarDays}/>
                </div>
            </div>

             <div className="space-y-6">
                <SectionHeader icon={<Trophy className="h-8 w-8 text-primary" />} title="footballInsightsTitle" subtitle="footballInsightsSubtitle" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EmptyInsightCard title="nextMatch" description="noMatchScheduledForDay" icon={CalendarDays} className="md:col-span-2" isRectangle/>
                    <HistoricalFootballCard data={historicalData?.football} />
                    <HistoricalRadarCard data={historicalData?.football} />
                    <HistoricalStaminaCard data={historicalData?.football} />
                    <EmptyInsightCard title="nextTraining" description="noTrainingScheduledForDay" icon={CalendarDays}/>
                </div>
            </div>
        </div>
        )}
    </motion.div>
  );
}
