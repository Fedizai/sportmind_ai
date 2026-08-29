"use client";

import { useState } from 'react';
import { useUser } from '@/hooks/use-user';
import { useFriends } from '@/hooks/use-friends';
import { useConversations } from '@/hooks/use-conversations';
import { useTranslation } from '@/hooks/use-translation';
import { useMediaQuery } from '@/hooks/use-media-query';
import { FriendsListPanel, FriendRequestsPanel, FriendSearchPanel } from '@/components/social/friend-panels';
import { DesktopMessaging } from '@/components/messaging/desktop-messaging';
import { MobileMessaging } from '@/components/messaging/mobile-messaging';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

/**
 * Everything social, in one place: friends, search, requests and messages.
 *
 * Each tab mounts the component that already implements it — the messaging
 * screens and the friend panels are the same ones used everywhere else, not
 * copies. /dashboard/friends and /dashboard/messages redirect here so there is
 * a single destination rather than three that overlap.
 */
export default function SocialPage() {
  const { user } = useUser();
  const { incoming } = useFriends(user?.uid);
  const { unreadCount } = useConversations(user?.uid);
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [tab, setTab] = useState(incoming.length > 0 ? 'requests' : 'friends');

  return (
    // The section is titled once, by the shared dashboard header.
    <div className="mx-auto flex w-full max-w-4xl flex-col space-y-5">
      <Tabs value={tab} onValueChange={setTab} className="flex flex-grow flex-col">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="friends">{t('friendsTabFriends')}</TabsTrigger>
          <TabsTrigger value="search">{t('friendsTabFind')}</TabsTrigger>
          <TabsTrigger value="requests">
            {t('friendsTabRequests')}
            {incoming.length > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1.5">{incoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">
            {t('messages')}
            {unreadCount > 0 && (
              <Badge className="ml-1.5 h-5 min-w-5 justify-center px-1.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-4">
          <FriendsListPanel onOpenMessages={() => setTab('messages')} />
        </TabsContent>
        <TabsContent value="search" className="mt-4">
          <FriendSearchPanel />
        </TabsContent>
        <TabsContent value="requests" className="mt-4">
          <FriendRequestsPanel />
        </TabsContent>
        {/* Messaging needs a definite height to scroll inside. */}
        <TabsContent value="messages" className="mt-4 h-[70vh] min-h-[420px]">
          {isDesktop ? <DesktopMessaging /> : <MobileMessaging />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
