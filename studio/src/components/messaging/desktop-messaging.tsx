
"use client";

import { useState } from "react";
import { type Player } from "@/hooks/use-team";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { Card } from "@/components/ui/card";
import { Loader2, MessageSquare } from "lucide-react";
import { useUser, type AppUser } from "@/hooks/use-user";
import { useAllUsers } from "@/hooks/use-all-users";
import { useTranslation } from "@/hooks/use-translation";

export function DesktopMessaging() {
  const { user, isLoading: isUserLoading } = useUser();
  const { users: allUsers, isLoading: areUsersLoading } = useAllUsers();
  const { t } = useTranslation();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  if (isUserLoading || areUsersLoading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin"/>
          </div>
      )
  }

  let usersToShow: AppUser[] = [];
  if (user) {
    if (user.role === 'admin') {
      // Admins can see everyone except themselves
      usersToShow = allUsers.filter(u => u.uid !== user.uid);
    } else if (user.role === 'coach') {
      // Coaches can only see players
      usersToShow = allUsers.filter(u => u.role === 'player');
    } else if (user.role === 'player') {
      // Players can only see coaches
      usersToShow = allUsers.filter(u => u.role === 'coach');
    }
  }

  return (
    <Card className="grid grid-cols-3 h-full overflow-hidden">
      <div className="col-span-1 border-r h-full">
        <ConversationList
          users={usersToShow}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUser}
        />
      </div>
      <div className="col-span-2 h-full">
        {selectedUser && user ? (
          <ChatWindow
            currentUser={user}
            otherUser={selectedUser}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_30%,hsl(var(--primary)/0.05),transparent_60%)] p-8">
            <div className="max-w-sm text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{t('selectConversationTitle')}</h3>
              <p className="mt-1 text-muted-foreground">{t('selectConversationDescription')}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
