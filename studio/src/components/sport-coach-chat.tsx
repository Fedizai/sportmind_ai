"use client";

import { useState } from 'react';
import { Bot, Loader2, Send, User as UserIcon } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { getTacticalAdvice } from '@/ai/flows/sports-flows';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

/**
 * Ask the AI coach a tactical question about one sport.
 *
 * Tennis's Coach tab was a "coming soon" placeholder while football had a
 * working chat built into its page. The underlying flow already took a sport,
 * so the only thing missing was a surface — this one, which any sport can
 * mount.
 *
 * This is distinct from video review, which goes to a human coach: a model is
 * useful for "how do I play against a serve-and-volleyer", not for watching
 * footage of you specifically.
 */

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

interface SportCoachChatProps {
  sport: string;
  title: string;
  description: string;
  placeholder: string;
  /** Opening line, so the panel is not an empty box. */
  greeting: string;
}

export function SportCoachChat({
  sport, title, description, placeholder, greeting,
}: SportCoachChatProps) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'ai', content: greeting }]);
  const [input, setInput] = useState('');
  const [isResponding, setIsResponding] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isResponding || !user) return;

    const question = input;
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setIsResponding(true);

    try {
      const result = await getTacticalAdvice({ userId: user.uid, sport, question });
      setMessages((prev) => [...prev, { role: 'ai', content: result.advice }]);
    } catch (error: any) {
      console.error('Coach chat error:', error);
      // The failure belongs in the thread as well as in a toast — otherwise
      // the question just sits there with no reply and no explanation.
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: error?.message || t('tacticalCoachError') },
      ]);
      toast({
        variant: 'destructive',
        title: t('aiError'),
        description: error?.message || t('tacticalCoachError'),
      });
    } finally {
      setIsResponding(false);
    }
  };

  return (
    <Card className="flex h-[70vh] flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot /> {title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn('flex items-start gap-3', message.role === 'user' && 'justify-end')}
              >
                {message.role === 'ai' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    'max-w-md whitespace-pre-wrap rounded-lg p-3 text-sm',
                    message.role === 'ai' ? 'bg-muted' : 'bg-primary text-primary-foreground'
                  )}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isResponding && (
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-muted-foreground">{t('aiThinking')}</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="border-t pt-4">
        <form className="flex w-full items-center space-x-2" onSubmit={handleSubmit}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            disabled={isResponding}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isResponding || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
