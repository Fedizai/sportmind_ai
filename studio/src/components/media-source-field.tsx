"use client";

import { useRef, useState } from 'react';
import { Link2, Loader2, Upload, X } from 'lucide-react';

import { useTranslation } from '@/hooks/use-translation';
import {
  isAcceptableVideoFile, isPlayableVideoUrl, MAX_VIDEO_BYTES,
} from '@/lib/media-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

/**
 * Choose a video by uploading one or by pasting a link.
 *
 * Coaches could only paste a link; athletes could only pick a file. Each side
 * was missing the other half, so both now use this one control and get both.
 *
 * It owns the choice, not the saving: the parent decides what to do with the
 * file or URL, which keeps the coach's resource library and the athlete's
 * review submissions from having to share a storage layout.
 */

export type MediaSource =
  | { kind: 'none' }
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string };

interface MediaSourceFieldProps {
  value: MediaSource;
  onChange: (value: MediaSource) => void;
  /** Shown under the control while the parent is uploading. */
  uploadProgress?: number | null;
  disabled?: boolean;
  className?: string;
}

export function MediaSourceField({
  value, onChange, uploadProgress = null, disabled = false, className,
}: MediaSourceFieldProps) {
  const { t } = useTranslation();
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [urlText, setUrlText] = useState(value.kind === 'url' ? value.url : '');

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    const check = isAcceptableVideoFile(file);
    if (!check.ok) {
      setFileError(
        check.reason === 'type'
          ? t('mediaNotAVideo')
          : t('mediaTooLarge', { mb: Math.round(MAX_VIDEO_BYTES / 1024 / 1024) })
      );
      onChange({ kind: 'none' });
      return;
    }
    setFileError(null);
    onChange({ kind: 'file', file });
  };

  const urlLooksWrong = urlText.trim().length > 0 && !isPlayableVideoUrl(urlText);

  return (
    <div className={cn('space-y-2', className)}>
      <Tabs
        defaultValue={value.kind === 'url' ? 'link' : 'upload'}
        onValueChange={() => {
          // Switching tabs abandons whatever the other tab held, so the parent
          // never receives a file and a link at once.
          setFileError(null);
          onChange({ kind: 'none' });
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" disabled={disabled}>
            <Upload className="mr-2 h-4 w-4" />
            {t('mediaUploadTab')}
          </TabsTrigger>
          <TabsTrigger value="link" disabled={disabled}>
            <Link2 className="mr-2 h-4 w-4" />
            {t('mediaLinkTab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <input
            ref={fileInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              // Let the same file be chosen again after a failed attempt.
              e.target.value = '';
            }}
          />

          {value.kind === 'file' ? (
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Upload className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-grow">
                <p className="truncate text-sm font-medium">{value.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(value.file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                aria-label={t('mediaRemoveFile')}
                onClick={() => onChange({ kind: 'none' })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={disabled}
              onClick={() => fileInput.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t('mediaChooseFile')}
            </Button>
          )}

          {fileError && <p className="mt-1.5 text-sm text-destructive">{fileError}</p>}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('mediaUploadHint', { mb: Math.round(MAX_VIDEO_BYTES / 1024 / 1024) })}
          </p>
        </TabsContent>

        <TabsContent value="link" className="mt-3">
          <Input
            value={urlText}
            disabled={disabled}
            placeholder="https://youtube.com/watch?v=… "
            onChange={(e) => {
              const next = e.target.value;
              setUrlText(next);
              onChange(
                isPlayableVideoUrl(next) ? { kind: 'url', url: next.trim() } : { kind: 'none' }
              );
            }}
          />
          {urlLooksWrong && (
            <p className="mt-1.5 text-sm text-destructive">{t('mediaBadLink')}</p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">{t('mediaLinkHint')}</p>
        </TabsContent>
      </Tabs>

      {uploadProgress !== null && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {t('mediaUploading', { percent: Math.round(uploadProgress) })}
          </p>
        </div>
      )}
    </div>
  );
}
