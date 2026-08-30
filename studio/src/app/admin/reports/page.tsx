"use client";

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { Inbox, MessageSquare, Loader2, Trash2 } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useSupportTickets, type SupportTicket, type TicketStatus, type TicketKind } from '@/hooks/use-support-tickets';
import { TicketThread } from '@/components/support/ticket-thread';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: 'bg-warning/15 text-warning ring-warning/30',
  in_progress: 'bg-primary/15 text-primary ring-primary/30',
  resolved: 'bg-success/15 text-success ring-success/30',
};

/** Admin triage queue for every problem report, help request and restore appeal. */
function AdminReportsContent() {
  const { user, isAdmin } = useUser();
  const { t } = useTranslation();
  const { tickets, isLoading, updateTicket, deleteTicket, addReply } = useSupportTickets(user?.uid, { allForAdmin: isAdmin });
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');

  /**
   * Which ticket kind to show, taken from ?kind= so the admin menu can offer
   * "problem reports" and "help requests" as separate destinations without
   * this becoming two pages that triage the same collection.
   */
  const searchParams = useSearchParams();
  const kindParam = searchParams.get('kind');
  const kind: 'all' | TicketKind =
    kindParam === 'problem' || kindParam === 'help' || kindParam === 'streak_restore'
      ? kindParam
      : 'all';

  if (!isAdmin) {
    return <p className="py-16 text-center text-muted-foreground">403</p>;
  }

  const byKind = kind === 'all' ? tickets : tickets.filter((x) => x.kind === kind);
  const shown = filter === 'all' ? byKind : byKind.filter((x) => x.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-3 font-headline text-3xl font-bold tracking-tight">
          <Inbox className="h-7 w-7 text-primary" />
          {kind === 'problem' ? t('supportReportTitle')
            : kind === 'help' ? t('supportHelpTitle')
            : t('adminReportsTitle')}
        </h1>
        {/* The subtitle has to follow the filter too: on a page showing only
            problem reports, "problems, help requests and streak restores"
            describes a list the reader is not looking at. */}
        <p className="text-muted-foreground">
          {kind === 'problem' ? t('adminReportsProblemSubtitle')
            : kind === 'help' ? t('adminReportsHelpSubtitle')
            : t('adminReportsSubtitle')}
        </p>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
          <TabsTrigger value="all">All ({byKind.length})</TabsTrigger>
          <TabsTrigger value="open">{t('supportStatusOpen')}</TabsTrigger>
          <TabsTrigger value="in_progress">{t('supportStatusProgress')}</TabsTrigger>
          <TabsTrigger value="resolved">{t('supportStatusResolved')}</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : shown.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">{t('adminNoReports')}</p>
          ) : (
            shown.map((ticket) => (
              <TicketRow key={ticket.id} ticket={ticket} onUpdate={updateTicket} onDelete={deleteTicket} addReply={addReply} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TicketRow({
  ticket,
  onUpdate,
  onDelete,
  addReply,
}: {
  ticket: SupportTicket;
  onUpdate: (id: string, patch: { status?: TicketStatus; adminReply?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  addReply: (
    ticketId: string,
    text: string,
    author: { uid: string; displayName: string | null; isAdmin: boolean },
    attachments?: string[]
  ) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [reply, setReply] = useState(ticket.adminReply ?? '');
  const [saving, setSaving] = useState(false);

  const kindLabel =
    ticket.kind === 'problem' ? t('kindProblem')
    : ticket.kind === 'help' ? t('kindHelp')
    : t('kindStreakRestore');

  const statusLabel = (s: TicketStatus) =>
    s === 'open' ? t('supportStatusOpen') : s === 'in_progress' ? t('supportStatusProgress') : t('supportStatusResolved');

  const save = async (patch: { status?: TicketStatus; adminReply?: string }) => {
    setSaving(true);
    try {
      await onUpdate(ticket.id, patch);
      toast({ title: t('adminStreakSaved') });
    } catch {
      toast({ variant: 'destructive', title: t('supportSendFailed') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
            <CardDescription>
              {ticket.userName || ticket.userEmail || ticket.userId}
              {ticket.createdAt && ` · ${format(ticket.createdAt.toDate(), 'PPp')}`}
            </CardDescription>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {kindLabel}
            </span>
            <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1', STATUS_STYLE[ticket.status])}>
              {statusLabel(ticket.status)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{ticket.message}</p>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('ticketAttachments')}
            </p>
            <div className="flex flex-wrap gap-2">
              {ticket.attachments.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-24 w-24 rounded-md object-cover ring-1 ring-border" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-3">
          <TicketThread ticketId={ticket.id} addReply={addReply} />
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> {t('adminReply')}
          </p>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t('adminReplyPlaceholder')}
            rows={3}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={saving || !reply.trim()} onClick={() => save({ adminReply: reply.trim() })}>
            {t('adminSaveReply')}
          </Button>
          {ticket.status !== 'in_progress' && (
            <Button size="sm" variant="outline" disabled={saving} onClick={() => save({ status: 'in_progress' })}>
              {t('adminMarkProgress')}
            </Button>
          )}
          {ticket.status !== 'resolved' && (
            <Button size="sm" variant="secondary" disabled={saving} onClick={() => save({ status: 'resolved' })}>
              {t('adminMarkResolved')}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive hover:text-destructive"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await onDelete(ticket.id); } finally { setSaving(false); }
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('delete')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * useSearchParams opts the tree into client-side rendering, so the page needs
 * a Suspense boundary or the build refuses to prerender it.
 */
export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <AdminReportsContent />
    </Suspense>
  );
}
