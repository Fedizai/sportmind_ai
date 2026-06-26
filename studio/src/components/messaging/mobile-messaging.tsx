
"use client";

import { useState } from "react";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { Card } from "../ui/card";
import { useUser, type AppUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { useAllUsers } from "@/hooks/use-all-users";

export function MobileMessaging() {
  const { user, isLoading: isUserLoading } = useUser();
  const { users: allUsers, isLoading: areUsersLoading } = useAllUsers();
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

  if (selectedUser && user) {
    return (
       <Card className="h-full overflow-hidden">
            <ChatWindow
                currentUser={user}
                otherUser={selectedUser}
                onBack={() => setSelectedUser(null)}
            />
       </Card>
    );
  }

  return (
    <Card className="h-full overflow-hidden">
        <ConversationList
            users={usersToShow}
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
        />
    </Card>
  );
}
