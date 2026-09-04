"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays, format, startOfDay } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import {
    ArrowRight, CalendarIcon, Loader2, MapPin, Plus, Swords, Trash2, Trophy,
} from 'lucide-react';

import { auth } from '@/lib/firebase';
import { useUser } from '@/hooks/use-user';
import { useTranslation } from '@/hooks/use-translation';
import { TennisBallIcon } from '@/components/icons/tennis-ball';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    createFixture, deleteFixture, listFixtures,
    type FixtureRow, type FixtureSport,
} from './actions';

/** Proof of who is calling. The server ignores any uid sent alongside it. */
async function idToken(): Promise<string | null> {
    const current = auth?.currentUser;
    return current ? current.getIdToken() : null;
}

const SPORT_ROUTE: Record<FixtureSport, string> = {
    football: '/dashboard/football',
    tennis: '/dashboard/tennis',
};

export function FixturesClient() {
    const { user } = useUser();
    const { t, language } = useTranslation();
    const locale = language === 'fr' ? fr : enUS;

    const [fixtures, setFixtures] = useState<FixtureRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [sport, setSport] = useState<FixtureSport>('football');
    const [opponent, setOpponent] = useState('');
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [time, setTime] = useState('15:00');
    const [venue, setVenue] = useState('');
    const [competition, setCompetition] = useState('');
    const [notes, setNotes] = useState('');

    /**
     * Always clears the loading flag, including on failure — a fetch that only
     * clears it on the happy path leaves the page spinning with no way to tell
     * that anything went wrong.
     */
    const load = useCallback(async () => {
        try {
            const token = await idToken();
            if (!token) {
                setFixtures([]);
                return;
            }
            setFixtures(await listFixtures(token));
        } catch (error) {
            console.error('Could not read your fixtures:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!user) {
            setFixtures([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        void load();
    }, [user, load]);

    /** The date and the time of day are one moment; the form collects them apart. */
    const kickOff = useMemo(() => {
        if (!date) return null;
        const [hours, minutes] = time.split(':').map(Number);
        const at = new Date(date);
        at.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
        return at;
    }, [date, time]);

    const canSave = opponent.trim().length > 0 && !!kickOff && !isSaving;

    const handleSave = async () => {
        if (!kickOff || !opponent.trim()) return;
        setIsSaving(true);
        try {
            const token = await idToken();
            if (!token) throw new Error(t('notSignedIn'));

            const result = await createFixture(token, sport, {
                opponent: opponent.trim(),
                date: kickOff.toISOString(),
                venue,
                competition,
                notes,
            });
            if (!result.success) throw new Error(result.error ?? t('fixtureSaveFailed'));

            setOpponent('');
            setVenue('');
            setCompetition('');
            setNotes('');
            await load();
            toast({ title: t('fixtureSaved') });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: t('fixtureSaveFailed'),
                description: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (fixture: FixtureRow) => {
        try {
            const token = await idToken();
            if (!token) throw new Error(t('notSignedIn'));
            const result = await deleteFixture(token, fixture.sport, fixture.id);
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
    const countdown = (iso: string) => {
        const days = differenceInCalendarDays(startOfDay(new Date(iso)), startOfDay(new Date()));
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
                        {t('scheduleMatch')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>{t('fixtureSport')}</Label>
                        <Select value={sport} onValueChange={(value) => setSport(value as FixtureSport)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="football">{t('football')}</SelectItem>
                                <SelectItem value="tennis">{t('tennis')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="fixture-opponent">{t('fixtureOpponent')}</Label>
                        <Input
                            id="fixture-opponent"
                            value={opponent}
                            onChange={(event) => setOpponent(event.target.value)}
                            placeholder={t('opponent')}
                        />
                    </div>

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
                                    {/* A match still to be played cannot be in the past. */}
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
                            <Label htmlFor="fixture-time">{t('fixtureTime')}</Label>
                            <Input id="fixture-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="fixture-venue">{t('fixtureVenue')}</Label>
                        <Input
                            id="fixture-venue"
                            value={venue}
                            onChange={(event) => setVenue(event.target.value)}
                            placeholder={t('fixtureVenuePlaceholder')}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="fixture-competition">{t('fixtureCompetition')}</Label>
                        <Input
                            id="fixture-competition"
                            value={competition}
                            onChange={(event) => setCompetition(event.target.value)}
                            placeholder={t('fixtureCompetitionPlaceholder')}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="fixture-notes">{t('fixtureNotes')}</Label>
                        <Textarea
                            id="fixture-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder={t('notesPlaceholder')}
                        />
                    </div>

                    <Button className="w-full" onClick={handleSave} disabled={!canSave}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {isSaving ? t('saving') : t('scheduleMatch')}
                    </Button>
                </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-4">
                <div className="flex items-center gap-2">
                    <Swords className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-bold tracking-tight">{t('fixturesTitle')}</h2>
                </div>

                {isLoading ? (
                    <div className="flex h-48 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : fixtures.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                            <Swords className="h-9 w-9 text-muted-foreground/40" />
                            <p className="font-semibold">{t('noFixtures')}</p>
                            <p className="max-w-[42ch] text-sm text-muted-foreground">{t('noFixturesHint')}</p>
                        </CardContent>
                    </Card>
                ) : (
                    fixtures.map((fixture) => {
                        const when = new Date(fixture.date);
                        const soon = countdown(fixture.date);
                        return (
                            <Card key={`${fixture.sport}-${fixture.id}`} className="overflow-hidden transition-colors hover:border-primary/50">
                                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            {fixture.sport === 'football'
                                                ? <Trophy className="h-4 w-4" />
                                                : <TennisBallIcon className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{t('vsOpponent', { opponent: fixture.opponent })}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {format(when, 'PPP', { locale })} · {format(when, 'p', { locale })}
                                                {soon ? ` · ${soon}` : ''}
                                            </p>
                                            {(fixture.venue || fixture.competition) && (
                                                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <MapPin className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">
                                                        {[fixture.venue, fixture.competition].filter(Boolean).join(' · ')}
                                                    </span>
                                                </p>
                                            )}
                                            {fixture.notes && (
                                                <p className="mt-1 text-xs text-muted-foreground">{fixture.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                                        <Button asChild variant="ghost" size="sm">
                                            <Link href={SPORT_ROUTE[fixture.sport]}>
                                                {t('open')}
                                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            aria-label={t('removeFixture')}
                                            onClick={() => handleDelete(fixture)}
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
