"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, MessageSquare, Search, UserPlus, Users, X } from 'lucide-react';

import { useUser, type AppUser } from '@/hooks/use-user';
import { useAllUsers } from '@/hooks/use-all-users';
import { useFriends } from '@/hooks/use-friends';
import { useTranslation } from '@/hooks/use-translation';
import { useToast } from '@/hooks/use-toast';
import { otherUid } from '@/lib/friendship';
import { isOnline } from '@/lib/presence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * The three friend panels, split apart so the Social page can put them beside
 * Messages in one row of tabs. They were a single page with its own tab bar,
 * which would have meant tabs nested inside tabs.
 */

const avatarFor = (u?: AppUser) =>
  u?.photoUrl || `https://placehold.co/100x100.png?text=${u?.displayName?.charAt(0) ?? '?'}`;
const initials = (name?: string | null) =>
  (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);

function PersonRow({ person, action }: { person: AppUser; action: React.ReactNode }) {
  const { t } = useTranslation();
  const online = isOnline(person.lastSeenAt);

  return (
    <li className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-accent/50">
      <div className="relative shrink-0">
        <Avatar className="h-11 w-11">
          <AvatarImage src={avatarFor(person)} alt={person.displayName || ''} />
          <AvatarFallback>{initials(person.displayName)}</AvatarFallback>
        </Avatar>
        <span
          aria-label={online ? t('presenceOnline') : t('presenceOffline')}
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
      </div>
      <div className="min-w-0 flex-grow">
        <p className="truncate font-semibold">{person.displayName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {person.username ? `@${person.username}` : person.email}
        </p>
      </div>
      <div className="shrink-0">{action}</div>
    </li>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

/** Map of uid -> profile, shared by all three panels. */
function useDirectory() {
  const { users } = useAllUsers();
  return useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of users) map.set(u.uid, u as AppUser);
    return map;
  }, [users]);
}

function useSafeAction() {
  const { toast } = useToast();
  return async (fn: () => Promise<void>, failure: string) => {
    try {
      await fn();
    } catch (err) {
      console.error(failure, err);
      toast({
        variant: 'destructive',
        title: failure,
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };
}

export function FriendsListPanel({ onOpenMessages }: { onOpenMessages?: () => void }) {
  const { user } = useUser();
  const { friendUids } = useFriends(user?.uid);
  const byUid = useDirectory();
  const { t } = useTranslation();
  const router = useRouter();

  const friends = useMemo(
    () =>
      [...friendUids]
        .map((uid) => byUid.get(uid))
        .filter((u): u is AppUser => !!u)
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
    [friendUids, byUid]
  );

  return (
    <Card>
      <CardContent className="p-2">
        {friends.length === 0 ? (
          <EmptyState icon={Users} title={t('friendsNoneTitle')} body={t('friendsNoneBody')} />
        ) : (
          <ul>
            {friends.map((f) => (
              <PersonRow
                key={f.uid}
                person={f}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => (onOpenMessages ? onOpenMessages() : router.push('/dashboard/social'))}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    {t('messages')}
                  </Button>
                }
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function FriendRequestsPanel() {
  const { user } = useUser();
  const { incoming, outgoing, accept, remove } = useFriends(user?.uid);
  const byUid = useDirectory();
  const { t } = useTranslation();
  const act = useSafeAction();

  const rows = (list: typeof incoming, action: (id: string) => React.ReactNode) => (
    <ul>
      {list.map((f) => {
        const uid = otherUid(f.users, user?.uid ?? '');
        const person = uid ? byUid.get(uid) : undefined;
        if (!person) return null;
        return <PersonRow key={f.id} person={person} action={action(f.id)} />;
      })}
    </ul>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-2">
          {incoming.length === 0 ? (
            <EmptyState icon={UserPlus} title={t('friendsNoRequestsTitle')} body={t('friendsNoRequestsBody')} />
          ) : (
            <>
              <p className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('friendsIncoming')}
              </p>
              {rows(incoming, (id) => (
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => act(() => accept(id), t('friendsAcceptFailed'))}>
                    <Check className="mr-1.5 h-4 w-4" />
                    {t('friendsAccept')}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('friendsDecline')}
                    onClick={() => act(() => remove(id), t('friendsDeclineFailed'))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {outgoing.length > 0 && (
        <Card>
          <CardContent className="p-2">
            <p className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t('friendsOutgoing')}
            </p>
            {rows(outgoing, (id) => (
              <Button size="sm" variant="ghost" onClick={() => act(() => remove(id), t('friendsCancelFailed'))}>
                {t('friendsCancel')}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function FriendSearchPanel() {
  const { user } = useUser();
  const { users: allUsers } = useAllUsers();
  const { statusWith, sendRequest } = useFriends(user?.uid);
  const { t } = useTranslation();
  const act = useSafeAction();
  const [search, setSearch] = useState('');

  /**
   * Nothing is listed until something is typed. Showing every account by
   * default is precisely what a friend system exists to avoid.
   */
  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length < 2 || !user) return [];
    return allUsers
      .filter((u) => u.uid !== user.uid)
      .filter(
        (u) =>
          u.username?.toLowerCase().includes(needle) ||
          u.displayName?.toLowerCase().includes(needle) ||
          u.email?.toLowerCase().includes(needle)
      )
      .slice(0, 20) as AppUser[];
  }, [search, allUsers, user]);

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('friendsSearchPlaceholder')}
            className="h-10 pl-9"
          />
        </div>

        {search.trim().length < 2 ? (
          <EmptyState icon={Search} title={t('friendsSearchPromptTitle')} body={t('friendsSearchPromptBody')} />
        ) : results.length === 0 ? (
          <EmptyState icon={Search} title={t('searchNoResults')} body={t('searchNoResultsHint')} />
        ) : (
          <ul>
            {results.map((person) => {
              const status = statusWith(person.uid);
              return (
                <PersonRow
                  key={person.uid}
                  person={person}
                  action={
                    status === 'friends' ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-success" />
                        {t('friendsAlready')}
                      </span>
                    ) : status === 'pending-sent' ? (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {t('friendsPending')}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={status === 'pending-received' ? 'default' : 'outline'}
                        onClick={() =>
                          act(() => sendRequest(person.uid), t('friendsRequestFailed'))
                        }
                      >
                        {status === 'pending-received' ? (
                          <>
                            <Check className="mr-1.5 h-4 w-4" />
                            {t('friendsAccept')}
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-1.5 h-4 w-4" />
                            {t('friendsAdd')}
                          </>
                        )}
                      </Button>
                    )
                  }
                />
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
