"use client";

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Check, Loader2, MessageSquare, Video as VideoIcon } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useAllUsers } from '@/hooks/use-all-users';
import { useVideoReviewQueue, type PlayerVideo } from '@/hooks/use-player-videos';
import { VideoPlayer } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Clips athletes have sent in, with a feedback box on each.
 *
 * Lives on the coach's existing video page rather than in a queue page of its
 * own — the coach asked for feedback on the card, not another destination.
 * Oldest first, so the longest-waiting athlete is answered first.
 */
export function CoachReviewList({ enabled }: { enabled: boolean }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { videos, isLoading, saveFeedback } = useVideoReviewQueue(enabled);
  const { users } = useAllUsers();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const nameOf = useMemo(() => {
    const map = new Map(users.map((u: any) => [u.uid, u.displayName || u.email || '']));
    return (uid: string) => map.get(uid) ?? '';
  }, [users]);

  const pending = videos.filter((v) => v.status === 'awaiting_review').length;

  const handleSave = async (video: PlayerVideo) => {
    const text = (drafts[video.id] ?? video.coachFeedback ?? '').trim();
    if (!text) return;
    setSaving(video.id);
    try {
      await saveFeedback(video.id, text, user?.displayName || '');
      setDrafts((prev) => ({ ...prev, [video.id]: text }));
      toast({ title: t('coachFeedbackSaved') });
    } catch (error) {
      console.error('Could not save feedback:', error);
      toast({ variant: 'destructive', title: t('coachFeedbackFailed') });
    } finally {
      setSaving(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <VideoIcon className="h-5 w-5" />
              {t('coachReviewQueueTitle')}
            </CardTitle>
            <CardDescription>{t('coachReviewQueueSubtitle')}</CardDescription>
          </div>
          {pending > 0 && (
            <span className="shrink-0 rounded-md bg-warning/15 px-2 py-1 text-xs font-semibold text-warning ring-1 ring-warning/30">
              {t('coachPendingCount', { count: pending })}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : videos.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('coachReviewEmpty')}</p>
        ) : (
          videos.map((video) => {
            const draft = drafts[video.id] ?? video.coachFeedback ?? '';
            return (
              <div key={video.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{video.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {nameOf(video.userId)} · {video.sport}
                      {video.createdAt ? ` · ${format(video.createdAt, 'PPp')}` : ''}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1',
                      video.status === 'reviewed'
                        ? 'bg-success/15 text-success ring-success/30'
                        : 'bg-warning/15 text-warning ring-warning/30'
                    )}
                  >
                    {video.status === 'reviewed' ? t('videoReviewed') : t('videoAwaitingReview')}
                  </span>
                </div>

                <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-black">
                  <VideoPlayer url={video.url} />
                </div>

                {video.note && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t('videoNoteLabel')}: </span>
                    {video.note}
                  </p>
                )}

                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-1.5 text-sm font-medium" htmlFor={`fb-${video.id}`}>
                    <MessageSquare className="h-4 w-4" />
                    {t('videoCoachFeedback')}
                  </label>
                  <Textarea
                    id={`fb-${video.id}`}
                    rows={3}
                    value={draft}
                    placeholder={t('coachFeedbackPlaceholder')}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [video.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    disabled={!draft.trim() || saving === video.id}
                    onClick={() => handleSave(video)}
                  >
                    {saving === video.id
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      : <Check className="mr-2 h-4 w-4" />}
                    {t('coachSaveFeedback')}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
