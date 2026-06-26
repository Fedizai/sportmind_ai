import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface RingDatum {
  id: string;
  label: string;
  valueText: string;
  y: number;
  radiusX: number;
  radiusZ: number;
  side: 'left' | 'right';
}

function ellipsePositions(radiusX: number, radiusZ: number): Float32Array {
  const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusZ, 0, Math.PI * 2, false, 0);
  const pts = curve.getPoints(72);
  const out = new Float32Array(pts.length * 3);
  pts.forEach((p, i) => {
    out[i * 3] = p.x;
    out[i * 3 + 1] = 0;
    out[i * 3 + 2] = p.y;
  });
  return out;
}

function Ring({
  datum,
  index,
  animate,
  color,
  threeColor,
}: {
  datum: RingDatum;
  index: number;
  animate: boolean;
  color: string;
  threeColor: THREE.Color;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringMatRef = useRef<THREE.LineBasicMaterial>(null);
  const leaderMatRef = useRef<THREE.LineBasicMaterial>(null);
  const startRef = useRef<number | null>(null);
  const [shown, setShown] = useState(!animate);

  const ringPositions = useMemo(
    () => ellipsePositions(datum.radiusX, datum.radiusZ),
    [datum.radiusX, datum.radiusZ]
  );

  const dir = datum.side === 'right' ? 1 : -1;
  const innerX = dir * datum.radiusX;
  const outerX = dir * (datum.radiusX + 0.55);
  const leaderPositions = useMemo(() => new Float32Array([innerX, 0, 0, outerX, 0, 0]), [innerX, outerX]);

  const accentSoft = color.replace('rgb(', 'rgba(').replace(')', ', 0.33)');
  const accentText = color.replace('rgb(', 'rgba(').replace(')', ', 0.85)');

  useFrame((state) => {
    if (!animate) return;
    if (startRef.current === null) startRef.current = state.clock.elapsedTime + index * 0.22;
    const local = state.clock.elapsedTime - startRef.current;
    const p = Math.max(0, Math.min(1, local / 0.7));
    const eased = 1 - Math.pow(1 - p, 3);
    if (groupRef.current) {
      const s = 0.55 + eased * 0.45;
      groupRef.current.scale.set(s, 1, s);
    }
    if (ringMatRef.current) ringMatRef.current.opacity = eased * 0.85;
    if (leaderMatRef.current) leaderMatRef.current.opacity = eased * 0.7;
    if (p > 0.4 && !shown) setShown(true);
  });

  return (
    <group ref={groupRef} position={[0, datum.y, 0]}>
      <lineLoop>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[ringPositions, 3]} count={ringPositions.length / 3} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={ringMatRef}
          color={threeColor}
          transparent
          opacity={animate ? 0 : 0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineLoop>

      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[leaderPositions, 3]} count={2} />
        </bufferGeometry>
        <lineBasicMaterial
          ref={leaderMatRef}
          color={threeColor}
          transparent
          opacity={animate ? 0 : 0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </line>

      {shown && (
        <Html position={[outerX, 0, 0]} center distanceFactor={6} zIndexRange={[20, 0]} prepend>
          <div
            style={{
              transform: `translateX(${dir > 0 ? '50%' : '-50%'})`,
              whiteSpace: 'nowrap',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: dir > 0 ? 'flex-start' : 'flex-end',
                gap: 2,
                padding: '5px 9px',
                borderRadius: 8,
                background: 'rgba(8, 18, 30, 0.8)',
                border: `1px solid ${color}`,
                boxShadow: `0 0 14px ${accentSoft}`,
                backdropFilter: 'blur(2px)',
              }}
            >
              <span style={{ fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: accentText }}>
                {datum.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#eaf2ff', lineHeight: 1 }}>{datum.valueText}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

export function MeasureRings({ rings, color, animate = true }: { rings: RingDatum[]; color: string; animate?: boolean }) {
  const threeColor = useMemo(() => new THREE.Color(color), [color]);
  return (
    <group>
      {rings.map((datum, i) => (
        <Ring key={datum.id} datum={datum} index={i} animate={animate} color={color} threeColor={threeColor} />
      ))}
    </group>
  );
}
