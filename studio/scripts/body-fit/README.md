# Body-fit calibration

`src/lib/body-fit/calibration.json` is **measured off the shipped GLBs**, not
hand-tuned. The report that came with the meshes is explicit that they carry no
kg-to-morph conversion and no anatomical landmarks — `Chest_Large = 0.5` does
not mean 108 cm — so the numbers had to come from the geometry itself.

## How a circumference is measured

A tape measure cannot enter a concavity, so a circumference is the **convex-hull
perimeter of a horizontal cross-section**. The mesh is deformed, sliced at a
plane, and the slice is split along X to separate body parts — the A-pose puts
the fingertips at hip height, so a naive hull at chest level spans 270 cm.

The gap that separates one part from another is per-measurement, not global: at
2 cm a full chest beside a full upper arm merges into one cluster, but at 1.5 cm
the waist fragments on its own soft-tissue concavity and reads 38 cm instead of
77.

## How a landmark is chosen

Once per height frame, and only where it survives that region's own morph at
both extremes plus both body-composition extremes. Searching for the extremum
on every deformed body was unstable — a degenerate slice won, and an athlete
asking for a 78 cm waist was fitted to a 47 cm one with `Waist_Large` at full.

## Evidence the rig is right

It reproduces the report's documented heights to 0.05 cm: male
159.1 / 178 / 207.8 against a documented 159.12 / 178 / 207.76.

## Extrapolation past influence 1.0

The delivered report says to avoid going past 1. Staying inside it capped the
waist at 83 cm and the thigh at 60 cm, so a 120 cm waist produced a body that
still looked average — the number was clamped and nothing said so.

Each target was walked up until the surface actually failed: a face normal
flipping, a triangle collapsing, or an edge stretching past 2.5x. Most controls
stay sound far beyond 1 (male waist to 8.0, hips 6.0, thigh 6.25, arm 4.5).
A safety factor of 0.85 is applied because the caps were measured one target at
a time and a fitted body drives several at once.

A second limit applies: the influence past which the measurement rig can no
longer *read* the result. Whichever limit is lower wins, because a body nobody
can measure cannot be shown to match what the athlete typed.

**The chest is the exception.** It folds at 1.5 (male) and 1.25 (female),
which puts the ceiling at roughly 111 cm and 100 cm at neutral height. That is
a limit of the authored morph, not of this code: reaching a larger chest needs
the GLB chest target rebuilt with more amplitude and cleaner behaviour where
the arm meets the ribs.

## Weight, and what it cannot reach

Weight used to drive `BodyWeight_High` and nothing else. That control saturates
at a 93 cm waist, so every heavy body came out looking merely stocky. Mass is
now distributed across `BodyWeight`, `Waist`, `Hips`, `Chest`, `UpperArm` and
`Thigh` together, in the proportions a body actually gains it — abdomen first
for men, seat and thighs for women — scaled by height and by BMI. Any
circumference the athlete enters still overrides its region completely.

`node scripts/body-fit/weight-sweep.mjs` fits 75/100/120/150/180 kg at one
height and measures each result on the mesh. Every step is larger than the one
before it. Where the mesh runs out, the row says so.

**Verdict at 178 cm male:** 100 kg is fully representable. 120 kg is
representable except the chest. 150 kg and 180 kg are not — see the targets
below.

## Morph targets that must be re-authored

These are limits of the authored GLB, not of this code. Raising the value in
`GEOMETRY_CAP` and re-running `calibrate.mjs` is all that is needed once they
are rebuilt.

| Target | Folds at | Ceiling | Needed for |
|---|---|---|---|
| `Chest_Large` (male) | 1.50 | ~116 cm | 120 kg wants 122 cm; 150 kg wants 138 cm |
| `Chest_Large` (female) | 1.25 | ~100 cm | 120 kg wants ~118 cm |
| `Waist_Large` (male) | 8.0 (rig limit ~6.8) | ~134 cm | 150 kg wants 153 cm; 180 kg wants 183 cm |
| `Waist_Large` (female) | 7.25 (rig limit ~6.2) | ~109 cm | 150 kg wants 150 cm |
| `Hips_Large` (female) | 5.25 | ~155 cm | 150 kg wants 174 cm |

`Chest_Large` is the urgent one: it fails by *folding the surface* near the
armpit at only 1.5, so it cannot even use the extrapolation the other targets
can. It needs more amplitude and cleaner behaviour where the arm meets the ribs.

`Waist_Large` widens the abdomen but adds little sagittal depth, so a saturated
waist reads as a broad torso rather than a protruding belly. Re-authoring it
should add forward projection, not only width.

Two further targets cannot be *verified* past a point, even though the geometry
stays sound: on a heavy build the arm touches the ribs and the chest and
upper-arm loops can no longer be isolated. Those rows are reported as
unverifiable rather than given a number.

## Running it

    node scripts/body-fit/calibrate.mjs     # regenerates calibration.json
    node scripts/body-fit/final-test.mjs    # fits profiles, measures the result
    node scripts/body-fit/sweep.mjs         # sweeps each field, mesh-verified

`final-test.mjs` needs the engine compiled to CommonJS first:

    node node_modules/typescript/lib/tsc.js src/lib/body-fit/index.ts \
      --outDir <dir>/fit --module commonjs --target es2020 \
      --moduleResolution node --resolveJsonModule --skipLibCheck --esModuleInterop

Both read the GLBs from `datasets/glb-body/`.
