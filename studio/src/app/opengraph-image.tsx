import { ImageResponse } from 'next/og';

/**
 * The social preview, drawn rather than uploaded.
 *
 * A generated image cannot drift out of date the way a hand-exported PNG does,
 * weighs a few kilobytes instead of a few hundred, and needs no designer in the
 * loop to change a word. It is rendered once at build time because the route is
 * static.
 */
export const runtime = 'edge';
export const alt = 'SportMind AI — Train. Evolve.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    background: 'linear-gradient(135deg, #050506 0%, #0A1428 55%, #10285A 100%)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', fontSize: 30, letterSpacing: 6, color: '#60a5fa', fontWeight: 700 }}>
                    SPORTMIND AI
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>
                    <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -4 }}>Train.</div>
                    <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color: '#3b82f6' }}>
                        Evolve.
                    </div>
                </div>
                <div style={{ display: 'flex', marginTop: 36, fontSize: 34, color: 'rgba(255,255,255,0.72)', maxWidth: 900 }}>
                    Training, nutrition and body data in one plan that rewrites itself.
                </div>
            </div>
        ),
        size,
    );
}
