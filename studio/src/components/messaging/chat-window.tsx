"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, MessageCircle, MoreVertical, Phone, Send, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import React, { useEffect, useMemo, useRef } from "react";
import { useMessages, type Message } from "@/hooks/use-messages";
import type { AppUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";
import { format, isSameDay } from "date-fns";

interface ChatWindowProps {
  currentUser: AppUser;
  otherUser: AppUser;
  onBack?: () => void;
}

interface RenderItem {
  msg: Message;
  mine: boolean;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  daySeparator: string | null;
}

const avatarSrc = (u: AppUser) =>
  u.photoUrl || `https://placehold.co/100x100.png?text=${u.displayName?.charAt(0) ?? "?"}`;
const initials = (name?: string | null) =>
  (name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2);

export function ChatWindow({ currentUser, otherUser, onBack }: ChatWindowProps) {
  const [inputMessage, setInputMessage] = React.useState("");
  const { messages, isLoading, sendMessage } = useMessages(currentUser.uid, otherUser.uid);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: "smooth" });
      }, 100);
    }
  }, [messages]);

  // Group consecutive messages by the same sender + insert day separators.
  const items = useMemo<RenderItem[]>(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const mine = msg.senderId === currentUser.uid;
      const date = msg.timestamp?.toDate?.();
      const prevDate = prev?.timestamp?.toDate?.();
      const isFirstOfGroup = !prev || prev.senderId !== msg.senderId;
      const isLastOfGroup = !next || next.senderId !== msg.senderId;
      const daySeparator =
        date && (!prevDate || !isSameDay(date, prevDate)) ? format(date, "PP") : null;
      return { msg, mine, isFirstOfGroup, isLastOfGroup, daySeparator };
    });
  }, [messages, currentUser.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    const messageToSend = inputMessage;
    setInputMessage("");
    await sendMessage(messageToSend);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-border/60 bg-background/60 p-3 backdrop-blur-xl dark:border-white/[0.07]">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarSrc(otherUser)} alt={otherUser.displayName || ""} data-ai-hint="player portrait" />
            <AvatarFallback>{initials(otherUser.displayName)}</AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
        </div>
        <div className="flex-grow">
          <p className="font-semibold leading-tight">{otherUser.displayName}</p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("onlineStatus")}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Phone className="h-[1.1rem] w-[1.1rem]" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Video className="h-[1.1rem] w-[1.1rem]" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><MoreVertical className="h-[1.1rem] w-[1.1rem]" /></Button>
        </div>
      </header>

      {/* Messages */}
      <ScrollArea
        className="flex-grow bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.04),transparent_60%)] px-4 py-5"
        ref={scrollAreaRef}
      >
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MessageCircle className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-balance font-semibold">{t("startConversationTitle")}</h3>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              {t("startConversationDescription", { name: otherUser.displayName || "" })}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <AnimatePresence initial={false}>
              {items.map(({ msg, mine, isFirstOfGroup, isLastOfGroup, daySeparator }) => (
                <React.Fragment key={msg.id}>
                  {daySeparator && (
                    <div className="flex justify-center py-3">
                      <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                        {daySeparator}
                      </span>
                    </div>
                  )}
                  <motion.div
                    className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start", isLastOfGroup ? "mb-3" : "mb-0.5")}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {!mine && (
                      <div className="w-8 shrink-0">
                        {isLastOfGroup && (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={avatarSrc(otherUser)} data-ai-hint="player portrait" />
                            <AvatarFallback className="text-xs">{initials(otherUser.displayName)}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[78%] px-3.5 py-2 text-sm leading-relaxed shadow-card sm:max-w-md",
                        mine
                          ? "rounded-2xl bg-primary text-primary-foreground"
                          : "rounded-2xl border border-border/60 bg-card text-card-foreground dark:border-white/[0.07]",
                        mine && isFirstOfGroup ? "rounded-tr-md" : "",
                        mine && isLastOfGroup ? "rounded-br-md" : "",
                        !mine && isFirstOfGroup ? "rounded-tl-md" : "",
                        !mine && isLastOfGroup ? "rounded-bl-md" : ""
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      {isLastOfGroup && msg.timestamp?.toDate && (
                        <span
                          className={cn(
                            "mt-1 block text-[10px]",
                            mine ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}
                        >
                          {format(msg.timestamp.toDate(), "HH:mm")}
                        </span>
                      )}
                    </div>
                  </motion.div>
                </React.Fragment>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Composer */}
      <footer className="flex-shrink-0 border-t border-border/60 bg-background/60 p-3 backdrop-blur-xl dark:border-white/[0.07]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t("messageInputPlaceholder", { name: otherUser.displayName || "" })}
            className="h-11 flex-grow rounded-full bg-muted/50 px-4 dark:bg-white/[0.04]"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!inputMessage.trim()}
            className="h-11 w-11 shrink-0 rounded-full transition-transform active:scale-95 disabled:opacity-40"
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </footer>
    </div>
  );
}
