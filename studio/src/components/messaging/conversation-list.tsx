"use client";

import { useMemo, useState } from "react";

import { type AppUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";
import { Search, Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ScrollArea } from "../ui/scroll-area";
import { useConversations } from "@/hooks/use-conversations";
import { isOnline } from "@/lib/presence";
import { useUser } from "@/hooks/use-user";
import { useTranslation } from "@/hooks/use-translation";

interface ConversationListProps {
  users: AppUser[];
  selectedUser: AppUser | null;
  onSelectUser: (user: AppUser) => void;
}

export function ConversationList({ users, selectedUser, onSelectUser }: ConversationListProps) {
  const { user } = useUser();
  const { conversations, unreadIn, conversationWith } = useConversations(user?.uid);
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  // An empty list now means "no friends yet", not "nobody is here" — so it
  // points at the thing that fixes it rather than leaving a dead end.
  const emptyState = { icon: UserPlus, title: t("friendsOnlyTitle"), description: t("friendsOnlyBody") };

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
          {!search && (
            <Button asChild size="sm" className="mt-4">
              <Link href="/dashboard/social">
                <UserPlus className="mr-2 h-4 w-4" />
                {t("friendsFindCta")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="flex-grow">
          <div className="space-y-1 p-2">
            {visibleUsers.map((otherUser) => {
              const conversation = conversationWith(otherUser.uid);
              const unread = conversation ? unreadIn(conversation) : 0;
              // Whose message is sitting at the top of this thread — without
              // it, your own last message reads as if they wrote it.
              const sentByMe = !!conversation && conversation.lastMessageSenderId === user?.uid;
              const online = isOnline(otherUser.lastSeenAt);
              const lastMessageText = conversation?.lastMessageText
                ? (sentByMe ? `${t("youPrefix")} ${conversation.lastMessageText}` : conversation.lastMessageText)
                : t("noMessagesYet");
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
                    {/* Real presence. This dot used to be hard-coded green,
                        so everyone always looked online, including accounts
                        that had never signed in. */}
                    <span
                      aria-label={online ? t("presenceOnline") : t("presenceOffline")}
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                        online ? "bg-emerald-500" : "bg-muted-foreground/40"
                      )}
                    />
                  </div>
                  <div className="flex-grow overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate font-semibold", isActive && "text-primary")}>{otherUser.displayName}</p>
                      <p className={cn("shrink-0 text-[11px]", unread > 0 ? "font-semibold text-primary" : "text-muted-foreground")}>
                        {lastMessageTime}
                      </p>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      {/* Two lines, not one: the point of a preview is to let
                          you read the last message without opening the thread,
                          and a single truncated line rarely gets there. */}
                      <p
                        title={conversation?.lastMessageText || undefined}
                        className={cn(
                          "line-clamp-2 text-sm",
                          unread > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {lastMessageText}
                      </p>
                      {unread > 0 && (
                        <span
                          aria-label={t("unreadMessages", { count: unread })}
                          className="mt-0.5 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-primary-foreground"
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
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
