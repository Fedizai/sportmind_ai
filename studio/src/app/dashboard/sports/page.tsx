

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { ArrowRight, Dumbbell, Trophy, Dribbble, Waves, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useUser } from "@/hooks/use-user";
import { TennisBallIcon } from "@/components/icons/tennis-ball";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/use-translation";

const sports = [
  { name: "Gym", icon: Dumbbell, path: "/dashboard/gym" },
  { name: "Football", icon: Trophy, path: "/dashboard/football" },
  { name: "Basketball", icon: Dribbble, path: "/dashboard/basketball" },
  { name: "Boxing", icon: Shield, path: "/dashboard/boxing" },
  { name: "Swimming", icon: Waves, path: "/dashboard/swimming" },
  { name: "Tennis", icon: TennisBallIcon, path: "/dashboard/tennis" },
];

export default function SportsSelectionPage() {
  const router = useRouter();
  const { user } = useUser();
  const { t } = useTranslation();
  
  const handleSportSelect = (path: string) => {
    const sportName = sports.find(s => s.path === path)?.name;
    if (sportName) {
        localStorage.setItem("selectedSport", sportName);
    }
    router.push(path);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          {t('selectASport')}
        </h1>
        <p className="text-muted-foreground">
          {t('selectSportSubtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sports.map((sport, index) => (
          <motion.div
            key={sport.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <Card 
              className="flex flex-col h-full hover:border-primary/50 transition-all duration-300 cursor-pointer group overflow-hidden rounded-2xl shadow-sm hover:shadow-lg"
              onClick={() => handleSportSelect(sport.path)}
            >
                <CardContent className="flex-grow flex flex-col justify-between p-6">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-2xl font-bold">
                            {sport.name}
                        </CardTitle>
                        <sport.icon className="h-8 w-8 text-muted-foreground transition-transform duration-300 group-hover:text-primary group-hover:scale-110 group-hover:-rotate-12" />
                    </div>

                    <Button variant="secondary" className="w-fit self-end rounded-full h-auto p-0 pl-3">
                        <span className="text-sm font-medium">
                          {user?.role === 'coach' ? t('viewDashboard') : t('startTraining')}
                        </span>
                        <div className="bg-background/50 p-2 rounded-full ml-2">
                           <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </div>
                    </Button>
                </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
