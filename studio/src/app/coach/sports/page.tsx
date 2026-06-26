
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, Dumbbell, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { TennisBallIcon } from "@/components/icons/tennis-ball";
import { useTranslation } from "@/hooks/use-translation";

const sports = [
  { name: "Football", icon: Trophy, path: "/coach/sports/football" },
  { name: "Tennis", icon: TennisBallIcon, path: "/coach/sports/tennis" },
  { name: "Musculation", icon: Dumbbell, path: "/coach/sports/gym" },
];

export default function SportsSelectionPage() {
  const router = useRouter();
  const { t } = useTranslation();
  
  const handleSportSelect = (path: string) => {
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {t('selectSportToManage')}
        </h1>
        <p className="text-muted-foreground">
          {t('selectSportToManageDescription')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sports.map((sport, index) => (
          <motion.div
            key={sport.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="flex flex-col h-full hover:border-primary transition-all cursor-pointer group"
              onClick={() => handleSportSelect(sport.path)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <sport.icon className="h-6 w-6 text-primary" />
                  <span>{sport.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow flex items-end">
                <div className="flex justify-between items-center w-full">
                    <span className="text-sm text-muted-foreground">{t('manage')} {sport.name}</span>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
