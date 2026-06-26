
"use client";

import { TennisBallIcon } from "@/components/icons/tennis-ball";
import { Suspense } from 'react';
import TennisModuleClient from './client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from "@/hooks/use-translation";

export default function TennisPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <TennisBallIcon className="h-8 w-8 text-primary" />
          {t('tennisModuleTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('tennisModuleSubtitle')}
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <TennisModuleClient />
      </Suspense>
    </div>
  );
}
