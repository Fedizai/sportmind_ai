
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamPage from "../../team/page";
import TrainingPage from "../../training/page";
import MatchesPage from "../../matches/page";
import VideoReviewPage from "../../video/page";
import ResourcesPage from "../../resources/page";
import { Users, Calendar, Trophy, Video, Book } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function FootballCoachPage() {
    const { t } = useTranslation();
    const tabs = [
        { value: "team", labelKey: "team", icon: Users, component: <TeamPage /> },
        { value: "training", labelKey: "training", icon: Calendar, component: <TrainingPage /> },
        { value: "matches", labelKey: "matches", icon: Trophy, component: <MatchesPage /> },
        { value: "video", labelKey: "video", icon: Video, component: <VideoReviewPage /> },
        { value: "resources", labelKey: "resources", icon: Book, component: <ResourcesPage /> },
    ];
    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-primary" />
                    {t('footballManagement')}
                </h1>
                <p className="text-muted-foreground">
                  {t('footballManagementDescription')}
                </p>
            </div>
            <Tabs defaultValue="team" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto flex-wrap">
                    {tabs.map(tab => (
                        <TabsTrigger key={tab.value} value={tab.value}>
                            <tab.icon className="w-4 h-4 mr-2" />
                            {t(tab.labelKey as any)}
                        </TabsTrigger>
                    ))}
                </TabsList>
                {tabs.map(tab => (
                    <TabsContent key={tab.value} value={tab.value} className="mt-6">
                        {tab.component}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
