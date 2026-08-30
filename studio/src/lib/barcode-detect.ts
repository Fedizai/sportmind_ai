"use client";

/**
 * Reading a retail barcode from a live camera, in the browser.
 *
 * Detection happens entirely on the device. Camera frames are never uploaded:
 * the only thing that leaves the phone is the digits, sent to the barcode
 * lookup route. That is both faster than round-tripping video and the reason
 * this feature costs nothing to run.
 *
 * Two engines, in order of preference:
 *
 *  - The platform's own `BarcodeDetector`. Hardware-accelerated on Android
 *    Chrome, no bundle cost, and by far the most reliable where it exists.
 *  - ZXing, loaded on demand. Safari — so every iPhone — still has no
 *    `BarcodeDetector`, and a nutrition scanner that did not work on iOS would
 *    not be much of a scanner.
 */

/** EAN/UPC plus the two Code 128/39 formats that appear on some store labels. */
const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

export type ScannerEngine = 'native' | 'zxing';

export interface BarcodeScanner {
  engine: ScannerEngine;
  stop: () => void;
}

function hasNativeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * A retail barcode is 8–14 digits. Anything else came from a QR code or a
 * misread and must not be sent to Open Food Facts as if it were a product.
 */
export function isPlausibleBarcode(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 14 && digits === value.trim();
}

/**
 * Start reading from an already-playing video element.
 *
 * `onResult` may fire many times for the same barcode — the camera sees it in
 * every frame. De-duplication is the caller's, because only the caller knows
 * whether the athlete has since asked to scan something else.
 */
export async function startScanning(
  video: HTMLVideoElement,
  stream: MediaStream,
  onResult: (code: string) => void
): Promise<BarcodeScanner> {
  if (hasNativeDetector()) {
    const Detector = (window as any).BarcodeDetector;

    // Ask which formats this build actually supports; requesting an unknown
    // one throws in the constructor on some versions.
    let formats = NATIVE_FORMATS;
    try {
      const supported: string[] = await Detector.getSupportedFormats();
      const usable = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (usable.length > 0) formats = usable;
    } catch {
      // Keep the default list.
    }

    const detector = new Detector({ formats });
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        if (video.readyState >= 2) {
          const found = await detector.detect(video);
          for (const barcode of found ?? []) {
            const value = String(barcode?.rawValue ?? '').trim();
            if (value && isPlausibleBarcode(value)) { onResult(value); break; }
          }
        }
      } catch {
        // A dropped frame is not worth reporting; the next tick tries again.
      }
      if (!stopped) timer = window.setTimeout(tick, 220);
    };

    let timer = window.setTimeout(tick, 220);

    return {
      engine: 'native',
      stop: () => { stopped = true; window.clearTimeout(timer); },
    };
  }

  // ZXing is ~200 KB, so it is only fetched on the devices that need it, and
  // only once the barcode tab is actually opened.
  const { BrowserMultiFormatReader } = await import('@zxing/browser');
  const reader = new BrowserMultiFormatReader();

  const controls = await reader.decodeFromStream(stream, video, (result) => {
    const value = result?.getText?.()?.trim();
    if (value && isPlausibleBarcode(value)) onResult(value);
  });

  return {
    engine: 'zxing',
    stop: () => {
      try { controls.stop(); } catch { /* already torn down */ }
    },
  };
}

export type CameraError = 'denied' | 'not_found' | 'unsupported' | 'failed';

/**
 * The rear camera, which is the one pointed at a package.
 *
 * `facingMode: 'environment'` is a preference rather than a guarantee, so it
 * is requested as `ideal`: on a laptop with only a front camera the request
 * still succeeds instead of failing outright.
 */
export async function openRearCamera(): Promise<
  { ok: true; stream: MediaStream } | { ok: false; error: CameraError }
> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'unsupported' };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
    return { ok: true, stream };
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') return { ok: false, error: 'denied' };
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return { ok: false, error: 'not_found' };
    return { ok: false, error: 'failed' };
  }
}
