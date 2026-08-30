import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';

import { storage } from '@/lib/firebase';

/**
 * Putting a file in Storage, and telling a usable link from a broken one.
 *
 * Both halves of the app needed the opposite of what they had: coaches could
 * only paste a URL, athletes could only pick a file. Rather than each growing
 * its own half-implementation, both now use this.
 */

/** Video containers a browser can actually play back inline. */
const PLAYABLE_EXTENSIONS = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;

/** Hosts whose watch pages the player embeds rather than plays directly. */
const EMBED_HOSTS = /(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)/i;

export interface UploadResult {
  url: string;
  storagePath: string;
}

/**
 * A link the video player can do something with.
 *
 * Accepts an embeddable host or a direct file, and rejects anything else —
 * a page that merely mentions a video would otherwise be saved and then
 * render as a black rectangle with no explanation.
 */
export function isPlayableVideoUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
  return EMBED_HOSTS.test(parsed.hostname) || PLAYABLE_EXTENSIONS.test(parsed.pathname);
}

/** Bytes above which the browser upload is not worth attempting. */
export const MAX_VIDEO_BYTES = 300 * 1024 * 1024; // 300 MB

export function isAcceptableVideoFile(file: File): { ok: true } | { ok: false; reason: 'type' | 'size' } {
  if (!file.type.startsWith('video/')) return { ok: false, reason: 'type' };
  if (file.size > MAX_VIDEO_BYTES) return { ok: false, reason: 'size' };
  return { ok: true };
}

/**
 * Upload with progress, resolving to the public download URL.
 *
 * `onProgress` receives 0-100. The caller owns the UI; this only reports.
 */
export function uploadVideoFile(
  file: File,
  folder: string,
  uid: string,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  // The timestamp keeps two uploads of the same filename apart, and the
  // sanitised name keeps Storage paths predictable.
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const storagePath = `${folder}/${uid}/${Date.now()}_${safeName}`;
  const task = uploadBytesResumable(ref(storage, storagePath), file);

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        }
      },
      reject,
      async () => {
        try {
          resolve({ url: await getDownloadURL(task.snapshot.ref), storagePath });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/** Best-effort cleanup. A leftover file is untidy, not broken, so failure is swallowed. */
export async function deleteStoredFile(storagePath: string | null | undefined) {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch (err) {
    console.debug('Could not delete stored file:', err);
  }
}
