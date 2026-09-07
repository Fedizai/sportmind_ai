"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GymScene } from "./GymScene";
import "./sportmind-hero.css";

/**
 * The landing hero: a real 3D barbell you can orbit, with the copy over it.
 *
 * Two departures from the delivered component.
 *
 * The buttons route. As shipped they opened local dialogs — a set logger that
 * kept its sets in component state and lost them on reload, and a feature list
 * that repeats what the page already says further down. A fake tracker on a
 * logged-out marketing page is worse than a link to the thing itself, so both
 * buttons now go where they say they go.
 *
 * The copy is passed in. The rest of the page switches language from the header
 * and a hero that only speaks French would be the one section that ignores it.
 */

export interface SportMindHeroCopy {
    eyebrow: string;
    titleA: string;
    titleB: string;
    description: string;
    primary: string;
    secondary: string;
    featureOneTitle: string;
    featureOneBody: string;
    featureTwoTitle: string;
    featureTwoBody: string;
    liveTitle: string;
    liveBody: string;
    loading: string;
    sceneFailed: string;
    sceneRetry: string;
    sceneHint: string;
    dragHint: string;
    resetView: string;
    canvasLabel: string;
}

export type SportMindHeroProps = {
    className?: string;
    copy: SportMindHeroCopy;
    onStartTraining: () => void;
    onDiscover: () => void;
};

export function SportMindHero({ className = "", copy, onStartTraining, onDiscover }: SportMindHeroProps) {
    const hero = useRef<HTMLElement>(null);
    const light = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState(false);
    const [sceneKey, setSceneKey] = useState(0);
    const onReady = useCallback(() => { setReady(true); setError(false); }, []);
    const onError = useCallback(() => { setError(true); setReady(false); }, []);

    /**
     * A light that follows the cursor, on a spring rather than a transition, so
     * it lags the pointer the way a real highlight would. Mouse only: on touch
     * there is no cursor to follow, and it is switched off entirely for anyone
     * who has asked for reduced motion.
     */
    useEffect(() => {
        const element = hero.current, glow = light.current;
        if (!element || !glow) return;
        const reduced = matchMedia("(prefers-reduced-motion: reduce)"), fine = matchMedia("(pointer: fine)");
        let frame = 0, previous = 0, x = -1000, y = -1000, vx = 0, vy = 0, targetX = -1000, targetY = -1000, initialized = false;
        const update = (time: number) => {
            const dt = Math.min((time - previous) / 1000 || 1 / 60, 1 / 60); previous = time;
            vx += ((130 * (targetX - x) - 25 * vx) / .25) * dt;
            vy += ((130 * (targetY - y) - 25 * vy) / .25) * dt;
            x += vx * dt; y += vy * dt;
            glow.style.transform = `translate3d(${x - 250}px,${y - 250}px,0)`;
            if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(vx) + Math.abs(vy) > .08) frame = requestAnimationFrame(update); else frame = 0;
        };
        const move = (event: PointerEvent) => {
            if (reduced.matches || !fine.matches || event.pointerType === "touch") return;
            const rect = element.getBoundingClientRect(); targetX = event.clientX - rect.left; targetY = event.clientY - rect.top;
            if (!initialized) { x = targetX; y = targetY; initialized = true; }
            glow.style.opacity = ".65";
            if (!frame) { previous = 0; frame = requestAnimationFrame(update); }
        };
        const leave = () => { glow.style.opacity = "0"; };
        const change = () => { if (reduced.matches) { cancelAnimationFrame(frame); frame = 0; leave(); } };
        element.addEventListener("pointermove", move); element.addEventListener("pointerleave", leave); reduced.addEventListener("change", change);
        return () => { cancelAnimationFrame(frame); element.removeEventListener("pointermove", move); element.removeEventListener("pointerleave", leave); reduced.removeEventListener("change", change); };
    }, []);

    // Remounting the canvas is the retry: the renderer allocates its GL context
    // on mount, so there is nothing to reset in place.
    const retry = () => { setError(false); setReady(false); setSceneKey((value) => value + 1); };

    return (
        <section ref={hero} className={`sportmind-hero ${className}`} aria-labelledby="sportmind-title">
            <div className="hero-content">
                <div className="hero-eyebrow"><span aria-hidden="true" />{copy.eyebrow}</div>
                <h1 id="sportmind-title"><span>{copy.titleA}</span><span className="hero-evolve">{copy.titleB}</span></h1>
                <p className="hero-description">{copy.description}</p>
                <div className="hero-actions">
                    <Button className="hero-button hero-primary" onClick={onStartTraining}>
                        {copy.primary}<ArrowRight aria-hidden="true" />
                    </Button>
                    <Button variant="outline" className="hero-button hero-secondary" onClick={onDiscover}>
                        {copy.secondary}
                    </Button>
                </div>
                <div className="hero-features">
                    <div><strong>{copy.featureOneTitle}</strong><span>{copy.featureOneBody}</span></div>
                    <i aria-hidden="true" />
                    <div><strong>{copy.featureTwoTitle}</strong><span>{copy.featureTwoBody}</span></div>
                </div>
            </div>

            <div className={`hero-scene-section ${ready ? "scene-ready" : ""}`}>
                <div className="hero-scene-entrance">
                    <GymScene key={sceneKey} onReady={onReady} onError={onError} label={copy.canvasLabel} />
                </div>

                {!ready && (
                    <div className="hero-loader" role="status" aria-live="polite">
                        {error ? (
                            <>
                                <p>{copy.sceneFailed}</p>
                                <Button variant="outline" onClick={retry}>{copy.sceneRetry}</Button>
                                <span>{copy.sceneHint}</span>
                            </>
                        ) : (
                            <><div className="loader-ring" aria-hidden="true" /><p>{copy.loading}</p></>
                        )}
                    </div>
                )}

                {ready && (
                    <div className="scene-tools">
                        <span aria-hidden="true" className="scene-drag-hint">{copy.dragHint}</span>
                        <button
                            aria-label={copy.resetView}
                            title={copy.resetView}
                            onClick={() => hero.current?.dispatchEvent(new CustomEvent("sportmind-reset-view", { bubbles: true }))}
                        >
                            <RotateCcw size={14} aria-hidden="true" />
                        </button>
                    </div>
                )}

                <div className="sportmind-live">
                    <div className="live-icon" aria-hidden="true"><span /></div>
                    <div><strong>{copy.liveTitle}</strong><span>{copy.liveBody}</span></div>
                </div>
            </div>

            <div className="hero-cursor-light" ref={light} aria-hidden="true" />
        </section>
    );
}
