"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
    ArrowRight, CalendarClock, CalendarIcon, Dumbbell, Loader2, MapPin, Plus,
    Trash2, Trophy,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { TennisBallIcon } from '@/components/icons/tennis-ball';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/lib/i18n';
import {
    createSession, deleteSession, listSessions,
} from '@/app/dashboard/_components/session-actions';
import {
    createFixture, deleteFixture, listFixtures,
    type FixtureRow, type FixtureSport,
} from './actions';

/**
 * One page for everything an athlete has coming.
 *
 * A match used to be scheduled by opening the "log a match" dialog and
 * changing a dropdown — a form built to record what happened, asked to
 * describe something that had not — and a session by a separate dialog on each
 * sport's training tab. Planning was spread across five dialogs in three
 * pages, none of which is where anyone looks to plan. It is one act, so it is
 * one page, and those dialogs no longer offer it.
 */

/** Proof of who is calling. The server ignores any uid sent alongside it. */
async function idToken(): Promise<string | null> {
    const current = auth?.currentUser;
    return current ? current.getIdToken() : null;
}

type Kind = 'match' | 'training';

/** Sessions are stored per sport, using the same keys the sport pages use. */
const TRAINING_SPORTS = ['football', 'tennis', 'gym'] as const;
type TrainingSport = typeof TRAINING_SPORTS[number];

const SPORT_ROUTE: Record<string, string> = {
    football: '/dashboard/football',
    tennis: '/dashboard/tennis',
    gym: '/dashboard/gym',
};

const SESSION_TYPES: { value: string; labelKey: TranslationKey }[] = [
    { value: 'technical', labelKey: 'technical' },
    { value: 'tactical', labelKey: 'tactical' },
    { value: 'physical', labelKey: 'physical' },
    { value: 'strength', labelKey: 'strength' },
    { value: 'cardio', labelKey: 'cardio' },
    { value: 'flexibility', labelKey: 'flexibility' },
    { value: 'other', labelKey: 'other' },
];

/** A match and a session shown in one list, ordered by when they happen. */
interface Entry {
    key: string;
    kind: Kind;
    sport: string;
    /** Opponent for a match, session name for training. */
    title: string;
    date: Date;
    id: string;
    venue?: string;
    competition?: string;
    duration?: number;
    notes?: string;
}

function SportIcon({ sport, className }: { sport: string; className?: string }) {
    if (sport === 'tennis') return <TennisBallIcon className={className} />;
    if (sport === 'gym') return <Dumbbell className={className} />;
    return <Trophy className={className} />;
}

export function FixturesClient() {
    const { user } = useUser();
    const { t, language } = useTranslation();
    const locale = language === 'fr' ? fr : enUS;

    const [entries, setEntries] = useState<Entry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [kind, setKind] = useState<Kind>('match');
    const [sport, setSport] = useState<TrainingSport>('football');
    const [title, setTitle] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('15:00');
    const [venue, setVenue] = useState('');
    const [competition, setCompetition] = useState('');
    const [sessionType, setSessionType] = useState('technical');
    const [duration, setDuration] = useState('60');
    const [notes, setNotes] = useState('');

    // A match needs an opponent, so the gym — which has no opponent — is only
    // offered when scheduling training.
    const sportOptions = kind === 'match' ? (['football', 'tennis'] as const) : TRAINING_SPORTS;
    useEffect(() => {
        if (kind === 'match' && sport === 'gym') setSport('football');
    }, [kind, sport]);

    /**
     * Always clears the loading flag, including on failure — a fetch that only
     * clears it on the happy path leaves the page spinning with no way to tell
     * that anything went wrong.
     */
    const load = useCallback(async () => {
        try {
            const token = await idToken();
            if (!token) {
                setEntries([]);
                return;
            }

            const [fixtures, sessions] = await Promise.all([
                listFixtures(token),
                listSessions(token),
            ]);

            const now = new Date();
            const rows: Entry[] = fixtures.map((fixture: FixtureRow) => ({
                key: `match-${fixture.id}`,
                kind: 'match' as const,
                sport: fixture.sport,
                title: fixture.opponent,
                date: new Date(fixture.date),
                id: fixture.id,
                venue: fixture.venue,
                competition: fixture.competition,
                notes: fixture.notes,
            }));

            sessions.forEach((session) => {
                if (session.completed || !session.date) return;
                const when = new Date(session.date);
                // Only what is still ahead: a session from last week belongs in
                // the sport page's history, not on a page about what is coming.
                if (when < startOfDay(now)) return;
                rows.push({
                    key: `training-${session.id}`,
                    kind: 'training',
                    sport: session.sport,
                    title: session.title,
                    date: when,
                    id: session.id,
                    duration: session.duration,
                    notes: session.notes,
                });
            });

            rows.sort((a, b) => a.date.getTime() - b.date.getTime());
            setEntries(rows);
        } catch (error) {
            console.error('Could not read your schedule:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setEntries([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        void load();
    }, [user, load]);

    /** The date and the time of day are one moment; the form collects them apart. */
    const startsAt = useMemo(() => {
        if (!date) return null;
        const [hours, minutes] = time.split(':').map(Number);
        const at = new Date(date);
        at.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
        return at;
    }, [date, time]);

    const canSave = title.trim().length > 0 && !!startsAt && !isSaving;

    const resetForm = () => {
        setTitle('');
        setVenue('');
        setCompetition('');
        setNotes('');
    };

    const handleSave = async () => {
        if (!startsAt || !title.trim()) return;
        setIsSaving(true);
        const isMatch = kind === 'match';
        try {
            const token = await idToken();
            if (!token) throw new Error(t('notSignedIn'));

            const result = isMatch
                ? await createFixture(token, sport as FixtureSport, {
                    opponent: title.trim(),
                    date: startsAt.toISOString(),
                    venue,
                    competition,
                    notes,
                })
                : await createSession(token, sport, {
                    title: title.trim(),
                    type: sessionType,
                    date: startsAt.toISOString(),
                    duration: Number(duration) || 60,
                    notes,
                });

            if (!result.success) {
                throw new Error(result.error ?? t(isMatch ? 'fixtureSaveFailed' : 'sessionScheduleFailed'));
            }

            resetForm();
            await load();
            toast({ title: t(isMatch ? 'fixtureSaved' : 'sessionScheduled') });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t(isMatch ? 'fixtureSaveFailed' : 'sessionScheduleFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (entry: Entry) => {
        try {
            const token = await idToken();
            if (!token) throw new Error(t('notSignedIn'));
            const result = entry.kind === 'match'
                ? await deleteFixture(token, entry.sport, entry.id)
                : await deleteSession(token, entry.id);
            if (!result.success) throw new Error(result.error ?? t('fixtureRemoveFailed'));
            await load();
            toast({ title: t('fixtureRemoved') });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('fixtureRemoveFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        }
    };

    /** "Today" reads better than a date the reader has to compare against today. */
    const countdown = (when: Date) => {
        const days = differenceInCalendarDays(startOfDay(when), startOfDay(new Date()));
        if (days === 0) return t('fixtureToday');
        if (days === 1) return t('fixtureTomorrow');
        if (days > 1) return t('fixtureInDays', { count: days });
        return null;
    };

    return (
        <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-2 h-fit">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Plus className="h-4 w-4 text-primary" />
                        {t('schedule')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t('entryKind')}</Label>
                        <Select value={kind} onValueChange={(value) => setKind(value as Kind)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="match">{t('kindMatch')}</SelectItem>
                                <SelectItem value="training">{t('kindTraining')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label>{t('fixtureSport')}</Label>
                        <Select value={sport} onValueChange={(value) => setSport(value as TrainingSport)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {sportOptions.map((option) => (
                                    <SelectItem key={option} value={option}>{t(option as TranslationKey)}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="schedule-title">
                            {kind === 'match' ? t('fixtureOpponent') : t('sessionTitleLabel')}
                        </Label>
                        <Input
                            id="schedule-title"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder={kind === 'match' ? t('opponent') : t('sessionTitlePlaceholder')}
                        />
                    </div>

                    {kind === 'training' && (
                        <div className="grid gap-3 min-[420px]:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>{t('sessionType')}</Label>
                                <Select value={sessionType} onValueChange={setSessionType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SESSION_TYPES.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>{t(option.labelKey)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-duration">{t('sessionDurationLabel')}</Label>
                                <Input
                                    id="schedule-duration"
                                    type="number"
                                    min={5}
                                    value={duration}
                                    onChange={(event) => setDuration(event.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="grid gap-3 min-[420px]:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label>{t('fixtureDate')}</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}>
                                        <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                        <span className="truncate">{date ? format(date, 'PPP', { locale }) : t('pickADate')}</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    {/* Something still to come cannot be in the past. */}
                                    <Calendar
                                        mode="single"
                                        selected={date}
                                        onSelect={setDate}
                                        disabled={(day) => day < startOfDay(new Date())}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="schedule-time">{kind === 'match' ? t('fixtureTime') : t('sessionTimeLabel')}</Label>
                            <Input id="schedule-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                        </div>
                    </div>

                    {kind === 'match' && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-venue">{t('fixtureVenue')}</Label>
                                <Input
                                    id="schedule-venue"
                                    value={venue}
                                    onChange={(event) => setVenue(event.target.value)}
                                    placeholder={t('fixtureVenuePlaceholder')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="schedule-competition">{t('fixtureCompetition')}</Label>
                                <Input
                                    id="schedule-competition"
                                    value={competition}
                                    onChange={(event) => setCompetition(event.target.value)}
                                    placeholder={t('fixtureCompetitionPlaceholder')}
                                />
                            </div>
                        </>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="schedule-notes">{t('fixtureNotes')}</Label>
                        <Textarea
                            id="schedule-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder={t('notesPlaceholder')}
                        />
                    </div>

                    <Button className="w-full" onClick={handleSave} disabled={!canSave}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {isSaving ? t('saving') : t('schedule')}
                    </Button>
                </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight">{t('fixturesTitle')}</h2>
                </div>

                {isLoading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : entries.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <CalendarClock className="h-9 w-9 text-muted-foreground/40" />
                            <p className="font-semibold">{t('nothingScheduled')}</p>
                            <p className="max-w-[42ch] text-sm text-muted-foreground">{t('nothingScheduledHint')}</p>
                        </CardContent>
                    </Card>
                ) : (
                    entries.map((entry) => {
                        const soon = countdown(entry.date);
                        const detail = entry.kind === 'match'
                            ? [entry.venue, entry.competition].filter(Boolean).join(' · ')
                            : entry.duration ? `${entry.duration} ${t('mins')}` : '';
                        return (
                            <Card key={entry.key} className="overflow-hidden transition-colors hover:border-primary/50">
                                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className={cn(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                            entry.kind === 'match' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                                        )}>
                                            {entry.kind === 'match'
                                                ? <SportIcon sport={entry.sport} className="h-4 w-4" />
                                                : <CalendarClock className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">
                                                {entry.kind === 'match' ? t('vsOpponent', { opponent: entry.title }) : entry.title}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {t(entry.kind === 'match' ? 'kindMatch' : 'kindTraining')}
                                                {' · '}{format(entry.date, 'PPP', { locale })} · {format(entry.date, 'p', { locale })}
                                                {soon ? ` · ${soon}` : ''}
                                            </p>
                                            {detail && (
                                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    {entry.kind === 'match' && <MapPin className="h-3 w-3 shrink-0" />}
                                                    <span className="truncate">{detail}</span>
                                                </p>
                                            )}
                                            {entry.notes && (
                                                <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                                        {SPORT_ROUTE[entry.sport] && (
                                            <Button asChild variant="ghost" size="sm">
                                                <Link href={SPORT_ROUTE[entry.sport]}>
                                                    {t('open')}
                                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            aria-label={t('removeFixture')}
                                            onClick={() => handleDelete(entry)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
