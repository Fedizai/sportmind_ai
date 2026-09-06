'use client';

/**
 * The glass layers that sit inside a `.liquid-glass-pill`.
 *
 * The pill itself frosts what is behind it. Frost alone reads as plastic,
 * though — glass also bends light, and it bends it most at the rim where the
 * slab is thickest. That rim is `.liquid-glass-rim` below: a second, much
 * sharper backdrop pass, masked to a ring so the edge of the bar resolves and
 * saturates the pixels the middle is busy blurring. Over it go the three things
 * that make the slab look lit — a sheet of light across the surface, a bevel,
 * and the specular hairline along the top edge.
 *
 * The reference this was built from drives the effect through an SVG
 * `feDisplacementMap` over a `backdrop-filter`. That does nothing. The filter's
 * `SourceGraphic` is the layer's own painted content, which is transparent, so
 * it displaces nothing — measured here by rendering the same bar at scale 0 and
 * scale 44 and getting identical pixels. `backdrop-filter: blur(2px) url(#id)`
 * parses and then renders without the `url()` too. What is actually visible in
 * that reference is the gradient stack, which is what this keeps.
 *
 * Two backdrop passes total, which is one more than the bar had. Every pass is
 * a full-viewport GPU readback on a phone, and this is a bar that sits over a
 * scrolling list.
 */
export function LiquidGlassEdge() {
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
            <div className="liquid-glass-rim absolute inset-0 rounded-[inherit]" />
            <div className="liquid-glass-surface absolute inset-0 rounded-[inherit]" />
            <div className="liquid-glass-bevel absolute inset-0 rounded-[inherit]" />
            <div className="liquid-glass-shine absolute inset-x-6 top-0 h-px" />
        </div>
    );
}
