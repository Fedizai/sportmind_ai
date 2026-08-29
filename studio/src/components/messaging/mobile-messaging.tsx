
"use client";

import { useState } from "react";
import { ConversationList } from "./conversation-list";
import { ChatWindow } from "./chat-window";
import { Card } from "../ui/card";
import { useUser, type AppUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { useAllUsers } from "@/hooks/use-all-users";
import { useFriends } from "@/hooks/use-friends";

export function MobileMessaging() {
  const { user, isLoading: isUserLoading } = useUser();
  const { users: allUsers, isLoading: areUsersLoading } = useAllUsers();
  const { friendUids, isLoading: areFriendsLoading } = useFriends(user?.uid);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  
  if (isUserLoading || areUsersLoading || areFriendsLoading) {
      return (
          <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin"/>
          </div>
      )
  }

  // Accepted friends only. The Firestore rules enforce the same thing on every
  // write, so this list is the convenience half of the restriction rather than
  // the restriction itself.
  const usersToShow: AppUser[] = user
    ? allUsers.filter(u => u.uid !== user.uid && friendUids.has(u.uid))
    : [];

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
