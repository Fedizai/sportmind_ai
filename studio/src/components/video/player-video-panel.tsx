"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { AlertTriangle, Clock, Loader2, MessageSquare, Send, Trash2, Video as VideoIcon } from 'lucide-react';

import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { usePlayerVideos, type PlayerVideo } from '@/hooks/use-player-videos';
import { uploadVideoFile } from '@/lib/media-upload';
import { MediaSourceField, type MediaSource } from '@/components/media-source-field';
import { VideoPlayer } from '@/components/video/video-player';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * An athlete's video review tab, shared by football and tennis.
 *
 * The clip goes to a coach, not to a model. Football previously sent every
 * upload to a vision model and stored the reply as feedback; the athlete asked
 * for a coach to watch it instead, and a coach's read of their own player is
 * worth more than a generic one anyway.
 *
 * Either a file or a link is accepted — the two sports had opposite halves of
 * that before.
 */
export function PlayerVideoPanel({ sport }: { sport: 'football' | 'tennis' }) {
  const { user } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    videos, isLoading, error, submitVideo, removeVideo, markFeedbackSeen,
  } = usePlayerVideos(user?.uid, sport);

  /**
   * Looking at the reply is what marks it read, which clears the header
   * badge. Runs whenever the list changes, so a reply that arrives while the
   * tab is open is cleared too.
   */
  useEffect(() => {
    for (const video of videos) {
      if (video.status === 'reviewed' && !video.feedbackSeen) markFeedbackSeen(video.id);
    }
  }, [videos, markFeedbackSeen]);

  const [source, setSource] = useState<MediaSource>({ kind: 'none' });
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = !!title.trim() && source.kind !== 'none' && !busy;

  const handleSubmit = async () => {
    if (!user || source.kind === 'none') return;
    setBusy(true);
    try {
      let url: string;
      let storagePath: string | null = null;

      if (source.kind === 'file') {
        setProgress(0);
        const result = await uploadVideoFile(source.file, 'player-videos', user.uid, setProgress);
        url = result.url;
        storagePath = result.storagePath;
        setProgress(null);
      } else {
        url = source.url;
      }

      await submitVideo({ title: title.trim(), url, storagePath, note: note.trim() });
      setTitle('');
      setNote('');
      setSource({ kind: 'none' });
      toast({ title: t('videoSubmitted'), description: t('videoSubmittedBody') });
    } catch (error) {
      console.error('Video submission failed:', error);
      toast({ variant: 'destructive', title: t('mediaUploadFailed') });
    } finally {
      setProgress(null);
      setBusy(false);
    }
  };

  const handleDelete = async (video: PlayerVideo) => {
    try {
      await removeVideo(video);
      toast({ title: t('videoDeleted') });
    } catch (error) {
      console.error('Could not delete video:', error);
      toast({ variant: 'destructive', title: t('videoDeleteFailed') });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <VideoIcon className="h-5 w-5" />
            {t('videoSubmitTitle')}
          </CardTitle>
          <CardDescription>{t('videoSubmitSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-title">{t('title')}</Label>
            <Input
              id="video-title"
              value={title}
              disabled={busy}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('videoTitlePlaceholder')}
            />
          </div>

          <MediaSourceField
            value={source}
            onChange={setSource}
            uploadProgress={progress}
            disabled={busy}
          />

          <div className="space-y-2">
            <Label htmlFor="video-note">{t('videoNoteLabel')}</Label>
            <Textarea
              id="video-note"
              value={note}
              disabled={busy}
              rows={3}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('videoNotePlaceholder')}
            />
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full sm:w-auto">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {t('videoSendToCoach')}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          /* Previously this failed into the empty state, so a broken listener
             was indistinguishable from having sent nothing. */
          <Card>
            <CardContent className="py-10 text-center">
              <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-destructive" />
              <p className="font-semibold">{t('videoListFailed')}</p>
            </CardContent>
          </Card>
        ) : videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <VideoIcon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">{t('videoNoneTitle')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('videoNoneBody')}</p>
            </CardContent>
          </Card>
        ) : (
          videos.map((video) => (
            <Card key={video.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{video.title}</CardTitle>
                  {video.createdAt && (
                    <CardDescription>{format(video.createdAt, 'PPp')}</CardDescription>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={cn(
                      'rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1',
                      video.status === 'reviewed'
                        ? 'bg-success/15 text-success ring-success/30'
                        : 'bg-warning/15 text-warning ring-warning/30'
                    )}
                  >
                    {video.status === 'reviewed' ? t('videoReviewed') : t('videoAwaitingReview')}
                  </span>
                  {video.status === 'reviewed' && !video.feedbackSeen && (
                    <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      {t('videoFeedbackNew')}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('delete')}
                    onClick={() => handleDelete(video)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="aspect-video overflow-hidden rounded-lg bg-black">
                  <VideoPlayer url={video.url} />
                </div>

                {video.note && (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{t('videoNoteLabel')}: </span>
                    {video.note}
                  </p>
                )}

                {video.coachFeedback ? (
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {video.coachName
                        ? t('videoCoachFeedbackFrom', { name: video.coachName })
                        : t('videoCoachFeedback')}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{video.coachFeedback}</p>
                  </div>
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {t('videoAwaitingReviewBody')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
