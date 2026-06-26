'use client';

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { buildHumanGeometry, type BodyMorph } from './human-geometry';
import { BodyModel } from './body-model';
import { MeasureRings, type RingDatum } from './measure-rings';
import { VIEW_ROTATION, BODY_BOTTOM_Y } from './human-landmarks';

export type ScanView3D = 'front' | 'side' | 'back';

interface SceneProps {
  view: ScanView3D;
  color: string;
  rings: RingDatum[];
  morph?: BodyMorph;
  animate?: boolean;
}

/** Holds the body + rings and eases them to the selected front/side/back angle. */
function Rig({ view, children, animate }: { view: ScanView3D; children: React.ReactNode; animate: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const target = VIEW_ROTATION[view];
    const current = groupRef.current.rotation.y;
    let delta = target - current;
    delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
    groupRef.current.rotation.y = current + delta * (animate ? 0.12 : 1);
  });
  return <group ref={groupRef}>{children}</group>;
}

/** Pulsing holographic platform the avatar stands on. */
function EnergyRing({ color, animate }: { color: string; animate: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const discMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    const pulse = (Math.sin(t * 1.6) + 1) / 2;
    if (ringMat.current) ringMat.current.opacity = 0.28 + pulse * 0.4;
    if (ring.current) {
      const sc = 1 + pulse * 0.07;
      ring.current.scale.set(sc, sc, 1);
    }
    if (discMat.current) discMat.current.opacity = 0.1 + (1 - pulse) * 0.16;
  });

  return (
    <group position={[0, BODY_BOTTOM_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[1.5, 56]} />
        <meshBasicMaterial
          ref={discMat}
          color={color}
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh ref={ring}>
        <ringGeometry args={[0.92, 1.04, 72]} />
        <meshBasicMaterial
          ref={ringMat}
          color={color}
          transparent
          opacity={0.5}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <ringGeometry args={[1.32, 1.35, 72]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export default function Scene({ view, color, rings, morph, animate = true }: SceneProps) {
  const geometry = useMemo(() => buildHumanGeometry(morph), [morph]);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.1, 6.4], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: '100%', height: '100%', background: '#05090e' }}
    >
      <color attach="background" args={['#05090e']} />
      <Rig view={view} animate={animate}>
        <BodyModel geometry={geometry} color={color} animate={animate} />
        <MeasureRings rings={rings} color={color} animate={animate} />
      </Rig>

      <EnergyRing color={color} animate={animate} />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.7}
        minDistance={4.6}
        maxDistance={9}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.82}
        target={[0, 0.05, 0]}
      />
    </Canvas>
  );
}
