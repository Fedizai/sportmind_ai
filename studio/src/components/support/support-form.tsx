"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSupportTickets, type TicketKind, type TicketStatus } from '@/hooks/use-support-tickets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-warning/15 text-warning ring-warning/30',
  in_progress: 'bg-primary/15 text-primary ring-primary/30',
  resolved: 'bg-success/15 text-success ring-success/30',
};

/**
 * Shared body for "Report a problem" and "Get help" — same mechanics, different
 * framing, so the two pages stay in sync automatically.
 */
export function SupportForm({ kind }: { kind: Extract<TicketKind, 'problem' | 'help'> }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { tickets, submitTicket } = useSupportTickets(user?.uid);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const statusLabel = (s: TicketStatus) =>
    s === 'open' ? t('supportStatusOpen') : s === 'in_progress' ? t('supportStatusProgress') : t('supportStatusResolved');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      await submitTicket(
        { kind, subject: subject.trim(), message: message.trim(), context: kind },
        { uid: user.uid, email: user.email, displayName: user.displayName }
      );
      setSubject('');
      setMessage('');
      toast({ title: t('supportSent') });
    } catch (err) {
      console.error('Support ticket failed:', err);
      toast({ variant: 'destructive', title: t('supportSendFailed') });
    } finally {
      setSending(false);
    }
  };

  const mine = tickets.filter((x) => x.kind === kind || kind === 'help');

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground hover:text-foreground">
        <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />{t('backToDashboard')}</Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{t(kind === 'problem' ? 'supportReportTitle' : 'supportHelpTitle')}</CardTitle>
          <CardDescription>{t(kind === 'problem' ? 'supportReportSubtitle' : 'supportHelpSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">{t('supportSubject')}</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('supportSubjectPlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('supportMessage')}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('supportMessagePlaceholder')}
                rows={6}
                required
              />
            </div>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? t('supportSending') : t('supportSend')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('supportMyTickets')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mine.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t('supportNoTickets')}</p>
          ) : (
            mine.map((ticket) => (
              <div key={ticket.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{ticket.subject}</p>
                  <span className={cn('shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1', STATUS_STYLE[ticket.status])}>
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.message}</p>
                {ticket.createdAt && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(ticket.createdAt.toDate(), 'PPp')}
                  </p>
                )}
                {ticket.adminReply && (
                  <div className="mt-3 rounded-md bg-primary/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <MessageSquare className="h-3.5 w-3.5" /> {t('supportAdminReply')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.adminReply}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
