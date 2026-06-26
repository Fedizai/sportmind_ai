
"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import { type Player, useTeam } from "@/hooks/use-team";
import { DesktopMessaging } from "@/components/messaging/desktop-messaging";
import { MobileMessaging } from "@/components/messaging/mobile-messaging";
import { MessageSquare } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function CommunicationPage() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { players, isLoading } = useTeam();
  const { t } = useTranslation();

  if (isLoading) {
    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    )
  }

  return (
     <div className="space-y-6 flex flex-col h-full">
        <div className="space-y-2 flex-shrink-0">
            <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            {t('communication')}
            </h1>
            <p className="text-muted-foreground">
            {t('communicationDescription')}
            </p>
        </div>
        <div className="flex-grow min-h-0">
            {isDesktop ? (
                <DesktopMessaging />
            ) : (
                <MobileMessaging />
            )}
        </div>
    </div>
  );
}
