
"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useLanguageStore } from '@/stores/language-store';
import { t } from '@/lib/i18n';
import { useNutritionStore } from '@/stores/nutrition-store';
import { motion } from 'framer-motion';

interface NutritionData {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}

interface NutritionChartProps {
    nutritionData: NutritionData;
}

export const NutritionChart = ({ nutritionData }: NutritionChartProps) => {
    const router = useRouter();
    const { language } = useLanguageStore();
    const { isLoading } = useNutritionStore();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t('dailyIntake', language)}</CardTitle>
                    <CardDescription>Estimated daily nutrition based on logged meals.</CardDescription>
                </CardHeader>
                <CardContent className="h-64 flex flex-col items-center justify-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
                 <CardFooter>
                    <Button disabled className="w-full"><Flame className="mr-2 h-4 w-4" /> {t('logMeal', language)}</Button>
                </CardFooter>
            </Card>
        );
    }
    
    const macros = [
        { name: "Carbs", value: nutritionData.carbs || 0, color: 'hsl(var(--chart-2))' },
        { name: "Protein", value: nutritionData.protein || 0, color: 'hsl(var(--chart-1))' },
        { name: "Fat", value: nutritionData.fat || 0, color: 'hsl(var(--chart-4))' },
    ];

    const totalGrams = macros.reduce((sum, macro) => sum + macro.value, 0);
    const totalCalories = nutritionData.calories || 0;

    const circumference = 2 * Math.PI * 45; // 2 * pi * radius (r=45)

    let currentRotation = -90;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('dailyIntake', language)}</CardTitle>
                <CardDescription>Estimated daily nutrition based on logged meals.</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-around p-4">
                 <div className="relative w-36 h-36">
                    <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="10"></circle>
                        {macros.map((macro, index) => {
                            const percentage = totalGrams > 0 ? macro.value / totalGrams : 0;
                            const rotation = currentRotation;
                            const strokeDashoffset = circumference;
                            const animateTo = circumference * (1 - percentage);
                            currentRotation += percentage * 360;
                            return (
                                <motion.circle
                                    key={macro.name}
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    stroke={macro.color}
                                    strokeWidth="10"
                                    strokeDasharray={circumference}
                                    strokeLinecap="round"
                                    transform={`rotate(${rotation} 50 50)`}
                                    initial={{ strokeDashoffset }}
                                    animate={{ strokeDashoffset: animateTo }}
                                    transition={{ duration: 0.5, delay: index * 0.2, ease: "easeOut" }}
                                />
                            )
                        })}
                        <text dominantBaseline="middle" fill="hsl(var(--foreground))" fontFamily="Inter, sans-serif" className="text-2xl font-bold" textAnchor="middle" x="50" y="45">
                            {totalGrams.toFixed(0)} g
                        </text>
                        <line stroke="hsl(var(--border))" strokeLinecap="round" strokeWidth="1" x1="35" x2="65" y1="58" y2="58"></line>
                        <text dominantBaseline="middle" fill="hsl(var(--muted-foreground))" fontFamily="Inter, sans-serif" className="text-sm" textAnchor="middle" x="50" y="70">
                            {totalCalories.toFixed(0)} kcal
                        </text>
                    </svg>
                </div>
                 <div className="flex flex-col gap-4">
                    {macros.map(macro => (
                        <div key={macro.name} className="flex items-center gap-3 text-base">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: macro.color }} />
                            <span className="font-semibold">{macro.name}:</span>
                            <span className="text-muted-foreground">{macro.value.toFixed(0)}g</span>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full" onClick={() => router.push('/dashboard/nutrition')}><Flame className="mr-2 h-4 w-4" /> {t('logMeal', language)}</Button>
            </CardFooter>
        </Card>
    );
};
