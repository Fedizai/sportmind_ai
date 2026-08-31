"use client";

import { useMemo, useState } from 'react';
import { Check, Globe, Lock, Search, Users } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useAllUsers } from '@/hooks/use-all-users';
import { useFriends } from '@/hooks/use-friends';
import { useTranslation } from '@/hooks/use-translation';
import type { SharedSport, Visibility } from '@/lib/sharing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Pick the sport a piece of material belongs to, and who can see it.
 *
 * The audience is a fixed list rather than a live rule, so a share does not
 * widen on its own when the coach accepts a friend request later. "All my
 * player friends" fills the list in one click, which keeps the convenience
 * without the surprise.
 */

const SPORTS: SharedSport[] = ['all', 'football', 'tennis', 'gym', 'basketball', 'boxing', 'swimming'];

export interface AudienceValue {
  sport: SharedSport;
  visibility: Visibility;
  audience: string[];
}

export function AudiencePicker({
  value,
  onChange,
}: {
  value: AudienceValue;
  onChange: (next: AudienceValue) => void;
}) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { users } = useAllUsers();
  const { friendUids } = useFriends(user?.uid);
  const [search, setSearch] = useState('');

  // Anyone but the coach themselves; they always keep access.
  const people = useMemo(
    () => users.filter((u: any) => u.uid !== user?.uid),
    [users, user?.uid]
  );

  const playerFriends = useMemo(
    () => people.filter((p: any) => friendUids.has(p.uid) && p.role !== 'coach'),
    [people, friendUids]
  );

  const shown = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people.slice(0, 60);
    return people
      .filter((p: any) =>
        (p.displayName || '').toLowerCase().includes(needle) ||
        (p.username || '').toLowerCase().includes(needle) ||
        (p.email || '').toLowerCase().includes(needle)
      )
      .slice(0, 60);
  }, [people, search]);

  const toggle = (uid: string) =>
    onChange({
      ...value,
      audience: value.audience.includes(uid)
        ? value.audience.filter((x) => x !== uid)
        : [...value.audience, uid],
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t('sharingSport')}</Label>
          <Select
            value={value.sport}
            onValueChange={(v) => onChange({ ...value, sport: v as SharedSport })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s === 'all' ? t('sharingAllSports') : t(s as any)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('sharingWhoCanSee')}</Label>
          <Select
            value={value.visibility}
            onValueChange={(v) => onChange({ ...value, visibility: v as Visibility })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="private">
                <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" />{t('sharingPrivate')}</span>
              </SelectItem>
              <SelectItem value="audience">
                <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />{t('sharingChosen')}</span>
              </SelectItem>
              <SelectItem value="public">
                <span className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" />{t('sharingEveryone')}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {value.visibility === 'private' ? t('sharingPrivateHint')
          : value.visibility === 'public' ? t('sharingEveryoneHint')
          : t('sharingChosenHint')}
      </p>

      {value.visibility === 'audience' && (
        <div className="space-y-2 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              {t('sharingSelectedCount', { count: value.audience.length })}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    ...value,
                    // A snapshot of who they are today, not a live rule.
                    audience: Array.from(
                      new Set([...value.audience, ...playerFriends.map((p: any) => p.uid)])
                    ),
                  })
                }
              >
                {t('sharingAllPlayerFriends', { count: playerFriends.length })}
              </Button>
              {value.audience.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ ...value, audience: [] })}
                >
                  {t('sharingClear')}
                </Button>
              )}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('sharingSearchPeople')}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-48 rounded-md border">
            <ul className="p-1">
              {shown.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('regionNoMatches')}
                </li>
              ) : (
                shown.map((person: any) => {
                  const selected = value.audience.includes(person.uid);
                  return (
                    <li key={person.uid}>
                      <button
                        type="button"
                        onClick={() => toggle(person.uid)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                          selected && 'bg-primary/10'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{person.displayName}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {person.username ? `@${person.username}` : person.email}
                            {person.role === 'coach' ? ` · ${t('coach')}` : ''}
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
