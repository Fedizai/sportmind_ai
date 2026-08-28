
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
      // Admins can reach everyone.
      usersToShow = allUsers.filter(u => u.uid !== user.uid);
    } else {
      // Coaches and players can both message anyone else on the platform —
      // players talk to each other as well as to their coaches.
      usersToShow = allUsers.filter(u => u.uid !== user.uid && u.role !== 'admin');
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
