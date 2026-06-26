
"use client";

import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

const NutritionClient = React.lazy(() => import('../nutrition/client').then(module => ({ default: module.NutritionClient })));

export default function NutritionTab() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <NutritionClient />
    </Suspense>
  );
}
