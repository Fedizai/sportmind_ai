"use client";

import { Waves, ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/use-translation";

/**
 * Placeholder route. The swimming module is built but not released yet, so this
 * page intentionally renders nothing interactive — the dashboard card is inert
 * too, and this exists only so a hand-typed URL doesn't 404.
 */
export default function SwimmingPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Waves className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{t('swimmingModuleTitle')}</h1>
          <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Lock className="h-4 w-4" />
            {t('comingSoon')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
