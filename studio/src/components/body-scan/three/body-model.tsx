import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { type BodyZoneId } from '@/lib/body-zones';
import { BODY_BOTTOM_Y, BODY_TOP_Y } from './human-landmarks';
import { sampleSurfacePoints } from './human-geometry';

const FILL_COLOR = new THREE.Color('#06121b');

export interface ZoneScore {
  zone: BodyZoneId;
  score: number;
}

interface BodyModelProps {
  geometry: THREE.BufferGeometry;
  /** rgb(...) / hex hologram colour */
  color: string;
  animate?: boolean;
}

export function BodyModel({ geometry, color, animate = true }: BodyModelProps) {
  const breatheRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const scanRef = useRef<THREE.Group>(null);
  const scanMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);

  const lineColor = useMemo(() => new THREE.Color(color), [color]);
  const glowColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), [color]);

  const wireGeometry = useMemo(() => new THREE.WireframeGeometry(geometry), [geometry]);

  const particleGeometry = useMemo(() => {
    const positions = sampleSurfacePoints(geometry, 900);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (breatheRef.current) {
      const s = animate ? 1 + Math.sin(t * 1.1) * 0.006 : 1;
      breatheRef.current.scale.set(1, s, 1);
      breatheRef.current.position.y = animate ? Math.sin(t * 0.9) * 0.012 : 0;
    }
    if (particlesRef.current) particlesRef.current.rotation.y = animate ? t * 0.1 : 0;
    if (particleMatRef.current && animate) particleMatRef.current.opacity = 0.3 + Math.sin(t * 2) * 0.12;

    if (scanRef.current && scanMatRef.current) {
      if (animate) {
        const period = 3.8;
        const phase = (t % period) / period;
        scanRef.current.position.y = BODY_BOTTOM_Y + phase * (BODY_TOP_Y - BODY_BOTTOM_Y);
        scanMatRef.current.opacity = Math.sin(phase * Math.PI) * 0.7;
        scanRef.current.visible = true;
      } else {
        scanRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={breatheRef}>
      {/* opaque dark fill; polygonOffset pushes it just behind the surface so the
          front wireframe wins the depth test instead of z-fighting away */}
      <mesh geometry={geometry}>
        <meshBasicMaterial color={FILL_COLOR} polygonOffset polygonOffsetFactor={3} polygonOffsetUnits={3} />
      </mesh>

      {/* dense neon wireframe (bloom turns this into a glowing hologram) */}
      <lineSegments geometry={wireGeometry}>
        <lineBasicMaterial
          color={lineColor}
          transparent
          opacity={0.62}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>

      {/* layered additive halos fake a soft bloom glow */}
      <lineSegments geometry={wireGeometry} scale={1.012}>
        <lineBasicMaterial
          color={lineColor}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>
      <lineSegments geometry={wireGeometry} scale={1.03}>
        <lineBasicMaterial
          color={glowColor}
          transparent
          opacity={0.07}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      {/* floating surface particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          ref={particleMatRef}
          color={glowColor}
          size={0.02}
          sizeAttenuation
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* vertical scan slice */}
      <group ref={scanRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.9, 1.2]} />
          <meshBasicMaterial
            ref={scanMatRef}
            color={glowColor}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}
