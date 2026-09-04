"use client";

import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/use-translation';
import { FixturesClient } from './client';

export default function FixturesPage() {
    const { t } = useTranslation();

    return (
        <div className="space-y-6">
            <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4 text-muted-foreground hover:text-foreground">
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
            </Button>

            <div className="space-y-2">
                <h1 className="flex items-center gap-3 font-headline text-3xl font-bold tracking-tight">
                    <CalendarClock className="h-8 w-8 text-primary" />
                    {t('fixturesTitle')}
                </h1>
                <p className="text-muted-foreground">{t('scheduleSubtitle')}</p>
            </div>

            <FixturesClient />
        </div>
    );
}
