"use client";

import { useState } from 'react';
import { Send, Paperclip, X, Shield } from 'lucide-react';
import { format } from 'date-fns';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useTicketReplies } from '@/hooks/use-ticket-replies';
import { uploadTicketImages } from '@/hooks/use-support-tickets';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Back-and-forth thread on a support ticket.
 *
 * The same component serves the athlete and the admin — only the styling of
 * "mine" flips — so a report can be discussed instead of getting one canned reply.
 */
export function TicketThread({
  ticketId,
  addReply,
}: {
  ticketId: string;
  addReply: (
    ticketId: string,
    text: string,
    author: { uid: string; displayName: string | null; isAdmin: boolean },
    attachments?: string[]
  ) => Promise<void>;
}) {
  const { user, isAdmin } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { replies } = useTicketReplies(ticketId);

  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!user || (!text.trim() && files.length === 0)) return;
    setBusy(true);
    try {
      const urls = files.length ? await uploadTicketImages(user.uid, files) : [];
      await addReply(
        ticketId,
        text.trim(),
        { uid: user.uid, displayName: user.displayName, isAdmin: !!isAdmin },
        urls
      );
      setText('');
      setFiles([]);
    } catch (err) {
      console.error('Reply failed:', err);
      toast({ variant: 'destructive', title: t('supportSendFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t('ticketThread')}
      </p>

      {replies.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('ticketNoReplies')}</p>
      ) : (
        <div className="space-y-2">
          {replies.map((r) => {
            const mine = r.authorId === user?.uid;
            return (
              <div key={r.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold opacity-80">
                    {r.isAdmin && <Shield className="h-3 w-3" />}
                    {r.isAdmin ? t('ticketTeam') : r.authorName || ''}
                    {r.createdAt && ` · ${format(r.createdAt.toDate(), 'PPp')}`}
                  </p>
                  {r.text && <p className="whitespace-pre-wrap">{r.text}</p>}
                  {r.attachments && r.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.attachments.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" className="h-20 w-20 rounded-md object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Composer */}
      <div className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('ticketWriteReply')}
          rows={2}
        />

        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <span key={i} className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs">
                {f.name.slice(0, 22)}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={t('ticketRemoveImage')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <Paperclip className="mr-2 h-4 w-4" />
              {t('ticketAttach')}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])])}
              />
            </label>
          </Button>
          <Button size="sm" onClick={send} disabled={busy || (!text.trim() && files.length === 0)}>
            <Send className="mr-2 h-4 w-4" />
            {busy ? t('ticketUploading') : t('ticketSendReply')}
          </Button>
        </div>
      </div>
    </div>
  );
}
