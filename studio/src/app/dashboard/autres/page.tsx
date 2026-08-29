"use client";

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { TOOLS } from '@/lib/tools';
import { useTranslation } from '@/hooks/use-translation';
import { FavoriteStar } from '@/components/favorite-star';
import { Card, CardContent } from '@/components/ui/card';

/**
 * The five secondary tools.
 *
 * Each card opens the tool's existing route — this page adds a way in, not a
 * second implementation. The star pins that same route to the dashboard.
 */
export default function AutresPage() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    // The section is titled once, by the shared dashboard header, so this
    // page is the grid and nothing else.
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Card
            key={tool.id}
            role="link"
            tabIndex={0}
            onClick={() => router.push(tool.path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(tool.path);
              }
            }}
            className="group cursor-pointer transition-all duration-300 hover:border-primary/40 hover:shadow-float"
          >
            <CardContent className="flex h-full flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <tool.icon className="h-5 w-5" />
                </span>
                <FavoriteStar toolId={tool.id} className="-mr-1 -mt-1" />
              </div>

              <div className="flex-grow space-y-1">
                <h2 className="font-semibold leading-snug tracking-tight">{t(tool.titleKey)}</h2>
                <p className="text-sm leading-snug text-muted-foreground">{t(tool.subtitleKey)}</p>
              </div>

              <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                {t('open')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
