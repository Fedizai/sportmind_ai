'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { landmarksFor, type FitRegion, type ModelSex, type MorphWeights } from '@/lib/body-fit';
import { GlbBody } from './glb-body';

export type ScanView3D = 'front' | 'side' | 'back';

/** Azimuth the camera sits at for each preset, in radians. */
const VIEW_AZIMUTH: Record<ScanView3D, number> = {
    front: 0,
    side: Math.PI / 2,
    back: Math.PI,
};

const DEFAULT_POLAR = Math.PI / 2;

interface SceneProps {
    modelSex: ModelSex;
    weights: MorphWeights;
    view: ScanView3D;
    color: string;
    animate?: boolean;
    /** Rings are drawn at the levels the calibration actually measured. */
    rings?: FitRegion[];
    /** The fitted height, so the rings and framing follow the body's size. */
    bodyHeightCm?: number;
    /** Fitted circumferences in cm, used to size each ring to the body. */
    circumferences?: Partial<Record<FitRegion, number>>;
    resetToken?: number;
}

/**
 * Camera presets on top of free orbit.
 *
 * The two used to fight: a group eased to a preset rotation while OrbitControls
 * turned the camera, so dragging drifted against the buttons. Orbit is the only
 * thing that moves the camera now, and Front/Side/Back ease its azimuth.
 */
function ViewRig({ view, resetToken }: { view: ScanView3D; resetToken?: number }) {
    const controls = useRef<any>(null);
    const goal = useRef<{ azimuth: number; polar?: number; distance?: number } | null>(null);
    const { camera } = useThree();

    useEffect(() => { goal.current = { azimuth: VIEW_AZIMUTH[view] }; }, [view]);
    useEffect(() => {
        if (resetToken === undefined) return;
        goal.current = { azimuth: VIEW_AZIMUTH.front, polar: DEFAULT_POLAR, distance: 3.45 };
    }, [resetToken]);

    useFrame(() => {
        const c = controls.current;
        if (!c || !goal.current) return;

        const step = (current: number, target: number) => {
            let delta = target - current;
            delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
            return current + delta * 0.14;
        };

        const azimuth = step(c.getAzimuthalAngle(), goal.current.azimuth);
        c.setAzimuthalAngle(azimuth);

        if (goal.current.polar !== undefined) {
            c.setPolarAngle(c.getPolarAngle() + (goal.current.polar - c.getPolarAngle()) * 0.14);
        }
        if (goal.current.distance !== undefined) {
            const dir = camera.position.clone().sub(c.target);
            const next = dir.length() + (goal.current.distance - dir.length()) * 0.14;
            camera.position.copy(c.target).add(dir.setLength(next));
        }

        c.update();
        if (Math.abs(azimuth - goal.current.azimuth) < 0.002) goal.current = null;
    });

    return (
        <OrbitControls
            ref={controls}
            makeDefault
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.9}
            maxDistance={5.2}
            // Kept off the poles: looking straight down at an unrigged body in
            // an A-pose reads as a diagram, not a scan.
            minPolarAngle={Math.PI * 0.22}
            maxPolarAngle={Math.PI * 0.78}
            target={[0, 0, 0]}
        />
    );
}

/** Faint horizontal loops at the levels the tape was read. */
function MeasureRings({ modelSex, regions, color, bodyHeightCm, circumferences }: {
    modelSex: ModelSex; regions: FitRegion[]; color: string; bodyHeightCm: number;
    circumferences?: Partial<Record<FitRegion, number>>;
}) {
    const marks = landmarksFor(modelSex);
    // Landmarks are fractions of stature, so the rings ride up and down with
    // the height morph instead of sitting at a fixed metre mark.
    const bodyTop = bodyHeightCm / 100;
    return (
        <group>
            {regions.map((region) => {
                const f = marks[region];
                if (f === undefined) return null;
                // Sized from the fitted circumference so the loop sits around
                // the body at that level — a fixed radius cut straight through
                // it. The 1.45 is because a torso section is an ellipse, not a
                // circle: a circle of the same perimeter is narrower than the
                // body it is supposed to be measuring, so the ring disappeared
                // inside it.
                const cm = circumferences?.[region];
                const radius = cm ? ((cm / 100) / (2 * Math.PI)) * 1.45 : 0.24;
                return (
                    <mesh key={region} position={[0, f * bodyTop, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[radius, radius + 0.008, 72]} />
                        <meshBasicMaterial
                            color={color}
                            transparent
                            opacity={0.22}
                            side={THREE.DoubleSide}
                            depthWrite={false}
                            blending={THREE.AdditiveBlending}
                        />
                    </mesh>
                );
            })}
        </group>
    );
}

/** Pulsing platform the avatar stands on. */
function Platform({ color, animate }: { color: string; animate: boolean }) {
    const ringMat = useRef<THREE.MeshBasicMaterial>(null);
    useFrame((state) => {
        if (!animate || !ringMat.current) return;
        const pulse = (Math.sin(state.clock.elapsedTime * 1.6) + 1) / 2;
        ringMat.current.opacity = 0.26 + pulse * 0.34;
    });
    return (
        <group position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
                <circleGeometry args={[0.62, 56]} />
                <meshBasicMaterial color={color} transparent opacity={0.10} depthWrite={false}
                    blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
            <mesh>
                <ringGeometry args={[0.44, 0.52, 72]} />
                <meshBasicMaterial ref={ringMat} color={color} transparent opacity={0.45} depthWrite={false}
                    blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
}

export default function GlbScene({
    modelSex, weights, view, color, animate = true, rings = ['chest', 'waist', 'hips'],
    bodyHeightCm = 178, circumferences, resetToken,
}: SceneProps) {
    // Feet on the platform, mid-body on the origin, so orbit turns around the
    // athlete rather than swinging them around a point under their feet.
    const groundOffset = -(bodyHeightCm / 100) / 2;
    const dpr = useMemo<[number, number]>(() => [1, 1.75], []);
    return (
        <Canvas
            // 26.7k triangles with 20 morph targets: capping the pixel ratio
            // keeps a high-density phone from rendering four times the pixels
            // it needs to.
            dpr={dpr}
            camera={{ position: [0, 0.12, 3.45], fov: 34, near: 0.1, far: 40 }}
            gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        >
            <ambientLight intensity={0.4} />
            <group position={[0, groundOffset, 0]}>
                <GlbBody modelSex={modelSex} weights={weights} color={color} animate={animate} />
                <MeasureRings modelSex={modelSex} regions={rings} color={color}
                    bodyHeightCm={bodyHeightCm} circumferences={circumferences} />
                <Platform color={color} animate={animate} />
            </group>
            <ViewRig view={view} resetToken={resetToken} />
        </Canvas>
    );
}
