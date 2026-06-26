
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/use-translation";
import { EmptyInsightCard } from "./empty-insight-card";

type FootballMatch = {
    id: string;
    opponent: string;
    result: 'win' | 'draw' | 'loss';
    date: Date;
    motm: boolean;
    goals: number;
    assists: number;
    minutesPlayed: number;
    stamina: number;
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

export function FootballInsightCard({ match }: { match: FootballMatch | null }) {
    const router = useRouter();
    const { t } = useTranslation();

    const handleCardClick = () => {
        router.push('/dashboard/football');
    };
    
    const getResultBadgeClasses = (result: 'win' | 'draw' | 'loss') => {
      switch (result) {
          case 'win': return 'bg-primary/15 text-primary';
          case 'draw': return 'bg-secondary text-muted-foreground';
          case 'loss': return 'bg-secondary text-muted-foreground';
      }
    }

    if (!match) {
        return <EmptyInsightCard title={t('lastMatch')} description={t('logMatchToSeeResult')} link="/dashboard/football" icon={Trophy} className="md:col-span-1" />
    }

    return (
        <motion.div variants={itemVariants} whileHover="hover" className="md:col-span-1" onClick={handleCardClick}>
            <Card className="h-full group cursor-pointer aspect-square flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary"/>{t('lastMatch')}</CardTitle>
                        <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold tracking-wide uppercase", getResultBadgeClasses(match.result))}>
                            {t(match.result)}
                        </span>
                    </div>
                    <CardDescription>vs. {match.opponent}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-center items-center text-center">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div>
                            <p className="text-2xl font-bold">{match.goals}</p>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('goals')}</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{match.assists}</p>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('assists')}</p>
                        </div>
                         <div>
                            <p className="text-2xl font-bold">{match.minutesPlayed}'</p>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('mins')}</p>
                        </div>
                         <div>
                            <p className="text-2xl font-bold">{match.stamina}/10</p>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('stamina')}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};
