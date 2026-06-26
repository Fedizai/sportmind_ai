'use client';

import { useEffect, useState } from 'react';

/**
 * Resolves the app's `--primary` token to a concrete `rgb(...)` string so the
 * WebGL hologram matches the brand colour and follows the light/dark theme.
 * THREE.Color and CSS both accept the returned `rgb(...)` string directly.
 */
export function usePrimaryColor(): string {
  const [color, setColor] = useState('rgb(59, 130, 246)');
  useEffect(() => {
    const probe = document.createElement('span');
    probe.style.color = 'hsl(var(--primary))';
    probe.style.display = 'none';
    document.body.appendChild(probe);
    const resolved = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    if (resolved && resolved.startsWith('rgb')) setColor(resolved);
  }, []);
  return color;
}
