

"use client";

import * as React from "react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const featureComparison = {
    categories: [
        {
            name: 'Core Features',
            features: [
                { name: 'All Sport Modules', athlete: true, pro: true, coach: true },
                { name: 'Activity Logging', athlete: true, pro: true, coach: true },
                { name: 'Basic Performance Analytics', athlete: true, pro: true, coach: true },
            ],
        },
        {
            name: 'AI & Analytics',
            features: [
                { name: 'AI Fitness & Mental Coach', athlete: true, pro: true, coach: true },
                { name: 'Advanced Nutrition Tracking & AI Analysis', athlete: true, pro: true, coach: true },
                { name: 'Basic Tactical Advice', athlete: true, pro: true, coach: true },
                { name: 'Advanced Tactical Advice & Prognostics', athlete: false, pro: true, coach: true },
                { name: 'AI Video Form Analysis', athlete: false, pro: true, coach: true },
            ],
        },
        {
            name: 'Coach Features',
            features: [
                { name: 'Manage Athletes (up to 10)', athlete: false, pro: false, coach: true },
                { name: 'Team-wide Analytics Dashboard', athlete: false, pro: false, coach: true },
                { name: 'Drill & Playbook Planner', athlete: false, pro: false, coach: true },
            ],
        },
        {
            name: 'Support & Access',
            features: [
                { name: 'Standard Email Support', athlete: true, pro: false, coach: false },
                { name: 'Priority Email & Chat Support', athlete: false, pro: true, coach: true },
            ],
        },
    ],
    plans: [
        { name: 'Athlete', featured: false, checkoutUrl: 'https://knct.me/9I6H_gEj-' },
        { name: 'Pro', featured: true, checkoutUrl: 'https://knct.me/eGQSM5PVY' },
        { name: 'Coach', featured: false, checkoutUrl: 'https://knct.me/2nLmVs0pO' },
    ],
};

export default function PricingDetailsPage() {

    return (
        <div className="bg-background text-foreground min-h-screen">
            <div className="container mx-auto px-4 py-12 md:py-24">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <Button variant="ghost" asChild className="mb-8">
                        <Link href="/">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Link>
                    </Button>
                    <div className="text-center mb-12 md:mb-20">
                        <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">Compare Our Plans</h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">Find the perfect plan to unlock your athletic potential. Whether you're an individual athlete, a pro, or a coach, we have a plan for you.</p>
                    </div>
                </motion.div>

                {/* Desktop Table */}
                <motion.div
                    className="hidden lg:block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="p-4 text-left font-semibold text-lg w-1/4">Feature</th>
                                {featureComparison.plans.map(plan => (
                                    <th key={String(plan.name)} className={cn("p-4 border-l", plan.featured && "bg-primary/10")}>
                                        <h3 className="text-2xl font-bold">{plan.name}</h3>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="bg-card">
                                <td className="p-4"></td>
                                {featureComparison.plans.map(plan => (
                                    <td key={String(plan.name)} className={cn("p-4 text-center border-l", plan.featured && "bg-primary/10")}>
                                        <Button asChild className="w-full" variant={plan.featured ? 'default' : 'secondary'}>
                                            <a href={plan.checkoutUrl}>Get Plan</a>
                                        </Button>
                                    </td>
                                ))}
                            </tr>
                            {featureComparison.categories.map(category => (
                                <React.Fragment key={String(category.name)}>
                                    <tr className="bg-muted/50">
                                        <th colSpan={4} className="p-3 text-left font-semibold">
                                            {category.name}
                                        </th>
                                    </tr>
                                    {category.features.map(feature => (
                                        <tr key={String(feature.name)} className="border-b">
                                            <td className="p-4">{feature.name}</td>
                                            <td className="p-4 text-center border-l">
                                                {feature.athlete ? <Check className="mx-auto h-6 w-6 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}
                                            </td>
                                            <td className={cn("p-4 text-center border-l", featureComparison.plans[1].featured && "bg-primary/10")}>
                                                {feature.pro ? <Check className="mx-auto h-6 w-6 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}
                                            </td>
                                            <td className="p-4 text-center border-l">
                                                {feature.coach ? <Check className="mx-auto h-6 w-6 text-green-500" /> : <X className="mx-auto h-5 w-5 text-muted-foreground" />}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </motion.div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-8">
                    {featureComparison.plans.map((plan, index) => (
                         <motion.div
                            key={String(plan.name)}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                        >
                        <Card className={cn(plan.featured && "border-primary ring-2 ring-primary")}>
                            <CardHeader className="text-center">
                                <CardTitle className="text-3xl">{plan.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {featureComparison.categories.map(category => (
                                    <div key={`${String(plan.name)}-${String(category.name)}`}>
                                        <h4 className="font-semibold mb-3">{category.name}</h4>
                                        <ul className="space-y-2">
                                            {category.features.map(feature => {
                                                const hasFeature = (plan.name === 'athlete' && feature.athlete) || (plan.name === 'pro' && feature.pro) || (plan.name === 'coach' && feature.coach);
                                                return (
                                                <li key={String(feature.name)} className="flex items-center gap-3 text-sm">
                                                    {hasFeature ? <Check className="h-5 w-5 text-green-500 flex-shrink-0" /> : <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                                                    <span className={cn(!hasFeature && "text-muted-foreground")}>{feature.name}</span>
                                                </li>
                                                )
                                            })}
                                        </ul>
                                    </div>
                                ))}
                            </CardContent>
                            <CardFooter>
                                <Button asChild className="w-full" variant={plan.featured ? 'default' : 'secondary'}>
                                    <a href={plan.checkoutUrl}>Get Plan</a>
                                </Button>
                            </CardFooter>
                        </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
