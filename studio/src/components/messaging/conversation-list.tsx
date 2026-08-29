"use client";

import { useMemo, useState } from "react";

import { type AppUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Search, Users } from "lucide-react";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { useConversations } from "@/hooks/use-conversations";
import { useUser } from "@/hooks/use-user";
import { useTranslation } from "@/hooks/use-translation";

interface ConversationListProps {
  users: AppUser[];
  selectedUser: AppUser | null;
  onSelectUser: (user: AppUser) => void;
}

export function ConversationList({ users, selectedUser, onSelectUser }: ConversationListProps) {
  const { user } = useUser();
  const { conversations } = useConversations(user?.uid);
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // The empty state is no longer about coaches: every signed-in account can
  // reach every other one, so an empty list means there is genuinely nobody
  // else on the platform yet, whatever role you hold.
  const emptyState = { icon: Users, title: t("noUsersToMessageTitle"), description: t("noUsersToMessageDescription") };

  /** Most recent message with this person, 0 when they have never written. */
  const lastSeconds = (uid: string) =>
    conversations.find((c) => c.participants.includes(uid))?.lastMessageTimestamp?.seconds ?? 0;

  // The search box used to be decorative — it had no value and no handler, so
  // typing in it did nothing at all.
  const visibleUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? users.filter(
          (u) =>
            u.displayName?.toLowerCase().includes(needle) ||
            u.email?.toLowerCase().includes(needle)
        )
      : users;

    // Live conversations first, newest at the top; everyone else alphabetically.
    return [...matches].sort((a, b) => {
      const diff = lastSeconds(b.uid) - lastSeconds(a.uid);
      if (diff !== 0) return diff;
      return (a.displayName || "").localeCompare(b.displayName || "");
    });
  }, [users, search, conversations]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-shrink-0 border-b border-border/60 p-4 dark:border-white/[0.07]">
        <h2 className="mb-4 font-headline text-xl font-bold tracking-tight">{t("conversationsTitle")}</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchConversationsPlaceholder")}
            className="h-10 rounded-md bg-muted/50 pl-9 dark:bg-white/[0.04]"
          />
        </div>
      </div>

      {visibleUsers.length === 0 ? (
        <div className="flex flex-grow flex-col items-center justify-center p-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <emptyState.icon className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-balance font-semibold">
            {search ? t("searchNoResults") : emptyState.title}
          </h3>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            {search ? t("searchNoResultsHint") : emptyState.description}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-grow">
          <div className="space-y-1 p-2">
            {visibleUsers.map((otherUser) => {
              const conversation = conversations.find((c) => c.participants.includes(otherUser.uid));
              const lastMessageText = conversation?.lastMessageText || t("noMessagesYet");
              const lastMessageTime = conversation?.lastMessageTimestamp
                ? new Date(conversation.lastMessageTimestamp.seconds * 1000).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              const isActive = selectedUser?.uid === otherUser.uid;

              return (
                <button
                  key={otherUser.uid}
                  onClick={() => onSelectUser(otherUser)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 ring-1 ring-inset ring-primary/25"
                      : "hover:bg-accent dark:hover:bg-white/[0.04]"
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={otherUser.photoUrl || `https://placehold.co/100x100.png?text=${otherUser.displayName?.charAt(0)}`}
                        alt={otherUser.displayName || "Player"}
                        data-ai-hint="player portrait"
                      />
                      <AvatarFallback>{otherUser.displayName?.split(" ").map((n) => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate font-semibold", isActive && "text-primary")}>{otherUser.displayName}</p>
                      <p className="shrink-0 text-[11px] text-muted-foreground">{lastMessageTime}</p>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{lastMessageText}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
