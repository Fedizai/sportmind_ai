
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamPage from "../../team/page";
import TrainingPage from "../../training/page";
import VideoReviewPage from "../../video/page";
import ResourcesPage from "../../resources/page";
import { Users, Calendar, Video, Book, Dumbbell } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function GymCoachPage() {
    const { t } = useTranslation();
    const tabs = [
        { value: "team", labelKey: "team", icon: Users, component: <TeamPage /> },
        { value: "training", labelKey: "training", icon: Calendar, component: <TrainingPage /> },
        { value: "video", labelKey: "video", icon: Video, component: <VideoReviewPage /> },
        { value: "resources", labelKey: "resources", icon: Book, component: <ResourcesPage /> },
    ];

    return (
        <div className="w-full space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
                    <Dumbbell className="h-8 w-8 text-primary" />
                    {t('gymManagement')}
                </h1>
                <p className="text-muted-foreground">
                  {t('gymManagementDescription')}
                </p>
            </div>
            <Tabs defaultValue="team" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto flex-wrap">
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
