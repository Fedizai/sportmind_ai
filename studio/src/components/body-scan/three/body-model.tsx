import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { type BodyZoneId } from '@/lib/body-zones';
import { BODY_BOTTOM_Y, BODY_TOP_Y } from './human-landmarks';
import { sampleSurfacePoints } from './human-geometry';

export interface ZoneScore {
  zone: BodyZoneId;
  score: number;
}

interface BodyModelProps {
  geometry: THREE.BufferGeometry;
  /** horizontal cross-section isolines for the topographic overlay */
  contours?: THREE.BufferGeometry;
  /** rgb(...) / hex hologram colour */
  color: string;
  animate?: boolean;
}

/**
 * Shaded holographic skin.
 *
 * A two-light lambert term gives the body real volume (so it reads as a scanned
 * solid, not a wire cage), a fresnel term lights the silhouette edge, and a
 * travelling gaussian band sweeps the surface like an active scanner pass.
 */
const VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vPos = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uDeep;
  uniform float uScanY;
  uniform float uAnimate;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);

    // three-point rig: key sculpts the form, fill opens the shadow side,
    // back-rim separates the silhouette from the void behind it
    vec3 keyDir  = normalize(vec3( 0.45,  0.72,  0.88));
    vec3 fillDir = normalize(vec3(-0.82,  0.12,  0.38));
    vec3 rimDir  = normalize(vec3( 0.05, -0.30, -1.00));

    float kd = max(dot(N, keyDir), 0.0);
    float fd = max(dot(N, fillDir), 0.0);
    float bd = max(dot(N, rimDir), 0.0);

    // wrapped diffuse — keeps muscle volume readable instead of crushing to black
    float form = (kd * 0.52 + pow(kd, 3.0) * 0.28) + fd * 0.20 + bd * 0.13;
    form = clamp(form, 0.0, 1.0);

    // silhouette rim — the hologram's glowing edge
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    vec3 col = mix(uDeep, uColor * 0.66, form);
    col += uColor * fres * 0.92;

    // tight specular sheen reads as a scanned, slightly wet surface
    vec3 H = normalize(keyDir + V);
    col += mix(uColor, vec3(1.0), 0.35) * pow(max(dot(N, H), 0.0), 52.0) * 0.4;

    // ── anatomical definition ──────────────────────────────────────
    // A centreline groove: sternum + linea alba on the front, the spinal
    // furrow on the back. Confined to the trunk so the head and pelvis
    // stay smooth.
    float trunk = smoothstep(0.02, 0.22, vPos.y) * (1.0 - smoothstep(1.34, 1.56, vPos.y));
    float centre = exp(-(vPos.x * vPos.x) / (2.0 * 0.042 * 0.042));
    float groove = centre * trunk;
    // the back furrow is deeper than the front
    groove *= vPos.z < 0.0 ? 0.85 : 0.55;
    col *= 1.0 - groove * 0.42;

    // Contact shading where limbs tuck against the trunk — cheap ambient
    // occlusion that stops the arms reading as pasted-on tubes.
    float armpit = exp(-(vPos.y - 1.30) * (vPos.y - 1.30) * 26.0)
                 * smoothstep(0.20, 0.34, abs(vPos.x));
    col *= 1.0 - armpit * 0.28;

    // travelling scanner pass
    float d = vPos.y - uScanY;
    col += uColor * exp(-d * d * 240.0) * uAnimate * 0.8;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function BodyModel({ geometry, contours, color, animate = true }: BodyModelProps) {
  const breatheRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const particleMatRef = useRef<THREE.PointsMaterial>(null);

  const lineColor = useMemo(() => new THREE.Color(color), [color]);
  const glowColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), [color]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uDeep: { value: new THREE.Color('#040a12') },
          uScanY: { value: BODY_BOTTOM_Y },
          uAnimate: { value: animate ? 1 : 0 },
        },
      }),
    // colour/animate are pushed through uniforms below, so the program is built once
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const particleGeometry = useMemo(() => {
    const positions = sampleSurfacePoints(geometry, 620);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    material.uniforms.uColor.value.set(color);
    material.uniforms.uAnimate.value = animate ? 1 : 0;

    if (breatheRef.current) {
      const s = animate ? 1 + Math.sin(t * 1.1) * 0.005 : 1;
      breatheRef.current.scale.set(1, s, 1);
      breatheRef.current.position.y = animate ? Math.sin(t * 0.9) * 0.01 : 0;
    }
    if (particlesRef.current) particlesRef.current.rotation.y = animate ? t * 0.08 : 0;
    if (particleMatRef.current && animate) particleMatRef.current.opacity = 0.22 + Math.sin(t * 2) * 0.1;

    if (animate) {
      const period = 4.2;
      const phase = (t % period) / period;
      material.uniforms.uScanY.value = BODY_BOTTOM_Y + phase * (BODY_TOP_Y - BODY_BOTTOM_Y);
    }
  });

  return (
    <group ref={breatheRef}>
      {/* shaded holographic skin */}
      <mesh geometry={geometry}>
        <primitive object={material} attach="material" />
      </mesh>

      {/* topographic cross-section isolines, occluded by the body itself */}
      {contours && (
        <lineSegments geometry={contours}>
          <lineBasicMaterial
            color={lineColor}
            transparent
            opacity={0.17}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </lineSegments>
      )}

      {/* outer halo shell — soft bloom around the silhouette */}
      {contours && (
        <lineSegments geometry={contours} scale={1.016}>
          <lineBasicMaterial
            color={glowColor}
            transparent
            opacity={0.07}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            depthTest={false}
          />
        </lineSegments>
      )}

      {/* floating surface particles */}
      <points ref={particlesRef} geometry={particleGeometry}>
        <pointsMaterial
          ref={particleMatRef}
          color={glowColor}
          size={0.017}
          sizeAttenuation
          transparent
          opacity={0.26}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
