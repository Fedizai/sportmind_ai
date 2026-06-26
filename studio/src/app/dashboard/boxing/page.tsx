"use client";

import { Shield, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";
import BoxingModuleClient from "./client";

export default function BoxingPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          {t('boxingModuleTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('boxingModuleSubtitle')}
        </p>
      </div>
      <Suspense fallback={<div>Loading...</div>}>
        <BoxingModuleClient />
      </Suspense>
    </div>
  );
}
