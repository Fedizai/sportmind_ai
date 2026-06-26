

import { Flame } from "lucide-react";
import { NutritionClient } from "./client";
import { Suspense } from "react";

export default function NutritionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-3">
            <Flame className="h-8 w-8 text-primary" />
            Smart Nutrition Calculator
          </h1>
          <p className="text-muted-foreground">
            Log your meals by scanning with your camera or entering text.
          </p>
        </div>
        <NutritionClient />
      </div>
    </Suspense>
  );
}
