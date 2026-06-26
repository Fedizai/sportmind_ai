
"use client";

import { Dumbbell, ArrowLeft } from "lucide-react";
import GymModuleClient from "./client";
import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

export default function GymPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-primary" />
          {t('gymModuleTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('gymModuleSubtitle')}
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <GymModuleClient />
      </Suspense>
    </div>
  );
}
