
"use client";

import { useStreakStore } from '@/stores/streak-store';
import { Loader2, Flame } from 'lucide-react';

export function StreakCounter() {
    const { streak, isLoading } = useStreakStore();

    if (isLoading) {
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
    }

    if (streak === 0) return null;

    return (
        <div className="flex items-center gap-1.5 bg-muted text-foreground px-3 py-1.5 rounded-full">
            <Flame className="h-5 w-5 text-primary" />
            <span className="font-bold text-sm">{streak}</span>
        </div>
    )
}
