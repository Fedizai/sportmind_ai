'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import type { ModelSex, MorphWeights } from '@/lib/body-fit';

export const MODEL_URL: Record<ModelSex, string> = {
    male: '/models/sportmind-male.glb',
    female: '/models/sportmind-female.glb',
};

export const MESH_NAME: Record<ModelSex, string> = {
    male: 'SportMind_Male_Body',
    female: 'SportMind_Female_Body',
};

/**
 * The scanner skin: a translucent holographic body with the mesh drawn over it.
 *
 * Three's own morph chunks do the deformation — the GLB stores relative
 * POSITION and NORMAL deltas and the renderer packs them into a morph texture,
 * so re-deriving that by hand would only be a way to get it wrong. Everything
 * above `#include <morphtarget_vertex>` is the hologram.
 *
 * The old procedural body faked a sternum groove and armpit occlusion in the
 * fragment shader because its lofted surface had neither. This mesh has real
 * anatomy, so the fakes are gone and the lighting is left to show what is
 * actually there.
 */
const VERTEX = /* glsl */ `
  #include <common>
  #include <morphtarget_pars_vertex>

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec3 objectNormal = vec3(normal);
    #include <morphnormal_vertex>

    vec3 transformed = vec3(position);
    #include <morphtarget_vertex>

    vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
    vPos = transformed;
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uDeep;

  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying vec3 vPos;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);

    // Three-point rig: the key sculpts the form, the fill opens the shadow
    // side, the back rim separates the silhouette from the void behind it.
    vec3 keyDir  = normalize(vec3( 0.45,  0.72,  0.88));
    vec3 fillDir = normalize(vec3(-0.82,  0.12,  0.38));
    vec3 rimDir  = normalize(vec3( 0.05, -0.30, -1.00));

    float kd = max(dot(N, keyDir), 0.0);
    float fd = max(dot(N, fillDir), 0.0);
    float bd = max(dot(N, rimDir), 0.0);

    // Wrapped diffuse keeps muscle volume readable instead of crushing to black.
    float form = clamp((kd * 0.52 + pow(kd, 3.0) * 0.28) + fd * 0.20 + bd * 0.13, 0.0, 1.0);

    // The hologram's glowing edge.
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.0);

    vec3 col = mix(uDeep, uColor * 0.66, form);
    col += uColor * fres * 0.95;

    // Tight specular sheen — a scanned, faintly wet surface.
    vec3 H = normalize(keyDir + V);
    col += mix(uColor, vec3(1.0), 0.35) * pow(max(dot(N, H), 0.0), 52.0) * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/**
 * A sanity bound, well above anything the calibration emits — the largest cap
 * in the table is 6.8. It exists so a bad number cannot turn the avatar inside
 * out, not to limit the fit.
 */
const MAX_INFLUENCE = 8;

interface GlbBodyProps {
    modelSex: ModelSex;
    weights: MorphWeights;
    color: string;
    animate?: boolean;
    /** Draw the wireframe overlay on top of the shaded body. */
    wireframe?: boolean;
}

export function GlbBody({ modelSex, weights, color, animate = true, wireframe = true }: GlbBodyProps) {
    const { scene } = useGLTF(MODEL_URL[modelSex]);

    /**
     * A clone per sex, because `useGLTF` caches by URL and the influences live
     * on the mesh. Two viewers on one page — comparing two scans — would
     * otherwise fight over the same array.
     */
    const { mesh, wireMesh } = useMemo(() => {
        const found = scene.getObjectByName(MESH_NAME[modelSex]);
        if (!(found instanceof THREE.Mesh)) return { mesh: null, wireMesh: null };

        const copy = found.clone() as THREE.Mesh;
        copy.morphTargetInfluences = found.morphTargetInfluences?.slice() ?? [];
        copy.morphTargetDictionary = found.morphTargetDictionary;
        // The report asks for this: culling bounds come from the neutral
        // geometry, so a tall or heavy body can be culled while still on screen.
        copy.frustumCulled = false;
        copy.renderOrder = 0;

        /**
         * The overlay shares the influence array rather than copying it.
         *
         * A clone gets its own `morphTargetInfluences`, and only the shaded
         * body was being updated — so the wireframe stayed at the neutral
         * shape and hung around a morphed body as a ghost of someone else.
         */
        const wire = found.clone() as THREE.Mesh;
        wire.morphTargetInfluences = copy.morphTargetInfluences;
        wire.morphTargetDictionary = copy.morphTargetDictionary;
        wire.frustumCulled = false;
        wire.renderOrder = 1;

        return { mesh: copy, wireMesh: wire };
    }, [scene, modelSex]);

    const material = useMemo(
        () => new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            uniforms: {
                uColor: { value: new THREE.Color(color) },
                uDeep: { value: new THREE.Color('#04101f') },
            },
        }),
        // colour is pushed through a uniform, so the program compiles once
        // rather than on every prop change
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    const wireMaterial = useMemo(
        () => new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: /* glsl */ `
                uniform vec3 uColor;
                varying vec3 vNormalW;
                varying vec3 vViewDir;
                varying vec3 vPos;
                void main() {
                  // Fades on surfaces facing the camera so the overlay reads as
                  // a mesh over a solid body rather than burying it in lines.
                  float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
                  gl_FragColor = vec4(uColor, 0.055 + (1.0 - facing) * 0.10);
                }
            `,
            uniforms: { uColor: { value: new THREE.Color(color) } },
            transparent: true,
            depthWrite: false,
            wireframe: true,
            blending: THREE.AdditiveBlending,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );

    useEffect(() => () => { material.dispose(); wireMaterial.dispose(); }, [material, wireMaterial]);

    /** Where each influence is heading. Eased toward, never snapped. */
    const target = useRef<Float32Array | null>(null);
    useEffect(() => {
        if (!mesh?.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const next = new Float32Array(mesh.morphTargetInfluences.length);
        for (const [name, value] of Object.entries(weights)) {
            const index = mesh.morphTargetDictionary[name];
            if (index === undefined || !value) continue;
            /**
             * Not clamped to 1.
             *
             * It used to be, and that one line threw away everything the
             * fitter had worked out: the calibration drives `Waist_Large` to
             * 6.8 and `Hips_Large` to 5.1 because the meshes stay sound that
             * far, the offline rig measured the bodies that produces, and the
             * viewer then rendered every one of them at influence 1. A 150 kg
             * athlete was being fitted correctly and drawn as an average one.
             * Morph influences are a linear combination; three has never
             * required them to be a fraction.
             */
            next[index] = Math.max(0, Math.min(MAX_INFLUENCE, value));
        }
        target.current = next;
    }, [mesh, weights]);

    useFrame((_state, delta) => {
        (material.uniforms.uColor.value as THREE.Color).set(color);
        (wireMaterial.uniforms.uColor.value as THREE.Color).set(color);

        if (!mesh?.morphTargetInfluences) return;

        // Editing a waist from 90 to 82 should ease across, not jump — and the
        // GLB is never reloaded to do it.
        const goal = target.current;
        if (goal) {
            const k = animate ? 1 - Math.exp(-delta * 7) : 1;
            const influences = mesh.morphTargetInfluences;
            for (let i = 0; i < influences.length; i++) {
                influences[i] += (goal[i] - influences[i]) * k;
                if (Math.abs(goal[i] - influences[i]) < 0.0005) influences[i] = goal[i];
            }
        }
    });

    if (!mesh) return null;

    return (
        <group>
            <primitive object={mesh} material={material} />
            {wireframe && wireMesh && <primitive object={wireMesh} material={wireMaterial} />}
        </group>
    );
}

/** Warm the loader before the panel is opened. */
export const preloadBody = (sex: ModelSex) => useGLTF.preload(MODEL_URL[sex]);
