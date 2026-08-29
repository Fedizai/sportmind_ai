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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const avatarFor = (u?: AppUser) =>
  u?.photoUrl || `https://placehold.co/100x100.png?text=${u?.displayName?.charAt(0) ?? '?'}`;
const initials = (name?: string | null) =>
  (name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2);

/** One person, with whatever action their current relationship allows. */
function PersonRow({
  person,
  action,
}: {
  person: AppUser;
  action: React.ReactNode;
}) {
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
        <p className="truncate text-xs text-muted-foreground">{person.email}</p>
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

export default function FriendsPage() {
  const { user } = useUser();
  const { users: allUsers } = useAllUsers();
  const { friendUids, incoming, outgoing, statusWith, sendRequest, accept, remove } = useFriends(user?.uid);
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');

  const byUid = useMemo(() => {
    const map = new Map<string, AppUser>();
    for (const u of allUsers) map.set(u.uid, u as AppUser);
    return map;
  }, [allUsers]);

  const friends = useMemo(
    () =>
      [...friendUids]
        .map((uid) => byUid.get(uid))
        .filter((u): u is AppUser => !!u)
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')),
    [friendUids, byUid]
  );

  /**
   * Search only ever returns people you are not already connected to, and only
   * once something has been typed — listing every account on the platform by
   * default is the thing this feature exists to avoid.
   */
  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length < 2 || !user) return [];
    return allUsers
      .filter((u) => u.uid !== user.uid)
      .filter(
        (u) =>
          u.displayName?.toLowerCase().includes(needle) ||
          u.email?.toLowerCase().includes(needle)
      )
      .slice(0, 20) as AppUser[];
  }, [search, allUsers, user]);

  const act = async (fn: () => Promise<void>, failure: string) => {
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

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-headline text-3xl font-bold tracking-tight">
          <Users className="h-8 w-8 text-primary" />
          {t('friendsTitle')}
        </h1>
        <p className="text-muted-foreground">{t('friendsSubtitle')}</p>
      </div>

      <Tabs defaultValue={incoming.length > 0 ? 'requests' : 'friends'}>
        <TabsList>
          <TabsTrigger value="friends">
            {t('friendsTabFriends')}
            {friends.length > 0 && <span className="ml-1.5 text-muted-foreground">{friends.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="requests">
            {t('friendsTabRequests')}
            {incoming.length > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1.5">{incoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="find">{t('friendsTabFind')}</TabsTrigger>
        </TabsList>

        {/* Friends */}
        <TabsContent value="friends" className="mt-4">
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
                        <Button size="sm" variant="outline" onClick={() => router.push('/dashboard/messages')}>
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
        </TabsContent>

        {/* Requests, incoming then sent */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('friendsIncoming')}</CardTitle>
              <CardDescription>{t('friendsIncomingHint')}</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              {incoming.length === 0 ? (
                <EmptyState icon={UserPlus} title={t('friendsNoRequestsTitle')} body={t('friendsNoRequestsBody')} />
              ) : (
                <ul>
                  {incoming.map((f) => {
                    const uid = otherUid(f.users, user?.uid ?? '');
                    const person = uid ? byUid.get(uid) : undefined;
                    if (!person) return null;
                    return (
                      <PersonRow
                        key={f.id}
                        person={person}
                        action={
                          <div className="flex gap-1">
                            <Button size="sm" onClick={() => act(() => accept(f.id), t('friendsAcceptFailed'))}>
                              <Check className="mr-1.5 h-4 w-4" />
                              {t('friendsAccept')}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={t('friendsDecline')}
                              onClick={() => act(() => remove(f.id), t('friendsDeclineFailed'))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        }
                      />
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          {outgoing.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('friendsOutgoing')}</CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ul>
                  {outgoing.map((f) => {
                    const uid = otherUid(f.users, user?.uid ?? '');
                    const person = uid ? byUid.get(uid) : undefined;
                    if (!person) return null;
                    return (
                      <PersonRow
                        key={f.id}
                        person={person}
                        action={
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => act(() => remove(f.id), t('friendsCancelFailed'))}
                          >
                            {t('friendsCancel')}
                          </Button>
                        }
                      />
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Find people */}
        <TabsContent value="find" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('friendsSearchPlaceholder')}
                  className="h-10 pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="p-2">
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
                          ) : status === 'pending-received' ? (
                            <Button
                              size="sm"
                              onClick={() => act(() => sendRequest(person.uid), t('friendsAcceptFailed'))}
                            >
                              <Check className="mr-1.5 h-4 w-4" />
                              {t('friendsAccept')}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => act(() => sendRequest(person.uid), t('friendsRequestFailed'))}
                            >
                              <UserPlus className="mr-1.5 h-4 w-4" />
                              {t('friendsAdd')}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
