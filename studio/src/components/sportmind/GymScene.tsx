"use client";

import { useEffect, useRef } from "react";

/**
 * The canvas the barbell is drawn into.
 *
 * The renderer is imported after mount, not at the top of the file: it touches
 * `window` and allocates a GL context on the way in, and this page is rendered
 * on the server first.
 */
export function GymScene({ onReady, onError, label }: { onReady: () => void; onError: () => void; label: string }) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let disposed = false;
        let destroy: (() => void) | undefined;
        import("@/lib/gym-renderer").then(({ createGymRenderer }) => {
            if (disposed || !canvas.current) return;
            try {
                destroy = createGymRenderer(canvas.current, onReady, onError);
            } catch (error) {
                if (canvas.current) canvas.current.dataset.error = String(error);
                onError();
            }
        }).catch((error) => {
            if (canvas.current) canvas.current.dataset.error = String(error);
            onError();
        });
        return () => { disposed = true; destroy?.(); };
    }, [onReady, onError]);

    return <canvas ref={canvas} className="gym-canvas" tabIndex={0} role="img" aria-label={label} />;
}
