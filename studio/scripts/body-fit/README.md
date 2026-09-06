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

**Verdict at 175 cm male:** the waist tracks the weight all the way to 180 kg.
The hips and the thighs are what run out now — see the re-authoring table below.

## The abdomen system

`Waist_Large` is a waist thickener, not a belly. At full influence it moves the
trunk about a centimetre sideways and, from the side, leaves the torso as flat
as it started; its mean `dz` over the abdomen is slightly *negative*. Driven to
its fold point it reached a 134 cm waist on a body with no belly at all, and
that was the shape a 150 kg athlete was being shown.

Seven targets were authored into both meshes to replace it, by
`scripts/body-fit/abdomen-morphs.mjs`:

| Target | What it does |
|---|---|
| `AbdomenWidth_Large` | sideways, across the whole abdomen |
| `AbdomenDepth_Large` | front and back — torso depth, front-weighted about 4:1 |
| `UpperAbdomen_Large` | the epigastrium, under the ribs |
| `LowerAbdomen_Large` | the hypogastrium, below the navel |
| `Flanks_Large` | posterolateral — the love handles |
| `BellyProjection_Large` | forward only, apex below the navel where it really sits |
| `LowerBellyDrop_Large` | the apron: the lower front sheet falls and overhangs |

Each is a displacement field over the trunk, built against **that mesh's own
measured profile** — the natural waist is found as the trunk's own minimum, the
costal margin and the iliac crest as the levels where it has recovered 70% of
the width it lost, so one set of numbers fits two bodies with differently placed
landmarks.

They are stored as **sparse accessors**. Each moves 200–1,000 of the mesh's
13,380 vertices, so the dense form would add 2.2 MB to a 6.9 MB file the scanner
downloads on open; sparse adds about 175 KB.

### Why it cannot fold

Six of the seven displace the surface *radially outward from the trunk axis*.
No vertex changes height and every horizontal section stays star-shaped about
the axis, so the surface remains a graph over (angle, height) however far it is
driven — driven alone they are sound past influence 6. Three corrections keep
that true where the mesh is not convex:

- **Facing.** Displacement is weighted by how far the base surface already
  faces outward, which removes it from the perineum and the gluteal cleft.
- **The midline below the pubis.** Down there the body is two legs, not one
  trunk, and a radial push near the centreline drives the perineum into a spike.
- **The pubis floor.** All six inflating targets stop at the pubis. They used to
  run into the top of the thigh to round off the underside, and on the female
  mesh that put the belly through the hip plane — a 100 cm hip came out as 140
  with the waist at 200, and `Hips_Small` cannot take 40 cm back. The underside
  is the apron's job, and the apron is anterior.

The apron is the exception: it is the only target that moves a vertex downward,
so it is the only one that can fold its own surface. It does so past about 1.4,
and the program stops it at 0.9.

The check that matters is a face pointing against **its own neighbourhood**, not
against the neutral pose — an overhang is *supposed* to end up facing a
different way than it started. On both meshes across the whole program that
count is zero. (The female GLB ships with two such faces in the elbow crease at
rest; they are in the delivered asset, not in this.)

### The arm

In the A-pose the forearm passes 42 cm from the centreline at the navel but only
25 cm at the ribs, and nothing in a morph target knows that. The arm's inner
edge is measured level by level from the mesh, and the sideways component of
each field is scaled per level so that at the top of the program the widest part
of the abdomen still clears the arm by 3.5 cm. The correction is eroded before
it is smoothed: averaging alone let a level that needed a 0.6 correction sit
between two that needed none and come out at 0.84.

### The staged program

One number in — how much abdomen the athlete has — and seven influences out,
via `src/lib/body-fit/abdomen.ts`. It is staged rather than proportional because
an abdomen does not grow uniformly: a full belly is a fairly even swelling, but
past roughly a 130 cm waist the growth is overwhelmingly forward and downward.
Width and flanks flatten off, projection and the lower abdomen keep going, and
the apron appears only at the top of the range.

`node scripts/body-fit/belly-sweep.mjs` fits 80/100/120/140/160/180/200 cm at
two statures on both meshes, applies the influences to the shipping mesh, and
measures the abdomen off it. Worst error 0.6 cm; nothing folds; the arm is never
breached.

|  | 80 cm | 120 cm | 160 cm | 200 cm |
|---|---|---|---|---|
| belly width, male 178 cm | 29.0 | 43.0 | 54.8 | 65.0 |
| torso depth | 20.1 | 32.6 | 46.2 | 61.3 |
| in front of the spine | 14.3 | 24.6 | 36.0 | 49.0 |

### Independence

With chest 100, hips 100, upper arm 32 and thigh 56 held fixed and the waist
swept 80 → 200 cm, the male comes out 100.2→100.7 / 100.2→102.1 / 31.9→31.7 /
56.1→56.8, and the female 100.5→100.9 / 99.8→100.1 / 32.1→32.8 / 56.2→57.9. A
very large belly does not bring extremely large limbs with it.

One caveat, reported rather than hidden: with all five circumferences pinned at
once the male waist runs about 5 cm long at 200 cm (204.8). The couplings are a
linear model and the abdomen now moves far enough for that to show. On its own —
waist only, or waist plus weight — it is inside 0.6 cm.

## Measuring a waist this large

The waist is read off the **trunk**, by vertex membership decided once on the
neutral mesh, not off a cluster. Cluster separation asks the mesh to leave a
2 cm gap between the belly and the forearm, and a 190 cm waist does not.

Two planes matter and they must be the same one. On an abdomen this size the
circumference falls about 11 cm for every centimetre the tape rides up, and the
calibration's five stature frames have waist planes 1.6 cm apart — a harness
that snapped to the nearest frame instead of interpolating read a correct 200 cm
fit as 208.6. `calibratedFrame` in `engine.mjs` is the shared answer.

## Morph targets that must be re-authored

These are limits of the authored GLB, not of this code. Raising the value in
`GEOMETRY_CAP` and re-running `calibrate.mjs` is all that is needed once they
are rebuilt.

| Target | Folds at | Ceiling | Needed for |
|---|---|---|---|
| `Chest_Large` (male) | 1.50 | ~111 cm | 120 kg wants 118 cm; 150 kg wants 135 cm |
| `Chest_Large` (female) | 1.25 | ~100 cm | 120 kg wants ~118 cm |
| `Hips_Large` (male) | 6.0 | ~126 cm | 150 kg wants 174 cm |
| `Hips_Large` (female) | 5.25 | ~143 cm | 150 kg wants ~170 cm |
| `Thigh_Large` (male) | 6.25 | ~79 cm | 150 kg wants 96 cm; 180 kg wants 110 cm |

`Chest_Large` is the urgent one: it fails by *folding the surface* near the
armpit at only 1.5, so it cannot even use the extrapolation the other targets
can. It needs more amplitude and cleaner behaviour where the arm meets the ribs.

The hips and thighs are next, and they fail differently — they do not fold, they
simply run out of authored travel. The abdomen shows what the alternative looks
like: a procedurally built field can be given as much travel as the geometry
allows, and `abdomen-morphs.mjs` is the pattern to follow for them.

Two targets cannot be *verified* past a point, even though the geometry stays
sound: on a heavy build the arm touches the ribs and the chest and upper-arm
loops can no longer be isolated. Those rows are reported as unverifiable rather
than given a number.

## Running it

    node scripts/body-fit/build-glb.mjs      # writes the abdomen into public/models
    node scripts/body-fit/calibrate.mjs      # regenerates calibration.json
    node scripts/body-fit/build-engine.mjs   # compiles the engine for the harnesses
    node scripts/body-fit/final-test.mjs     # fits profiles, measures the result
    node scripts/body-fit/belly-sweep.mjs    # 80..200 cm waist, mesh-verified
    node scripts/body-fit/sweep.mjs          # sweeps each field, mesh-verified
    node scripts/body-fit/weight-sweep.mjs   # 75..180 kg, mesh-verified

In that order: everything downstream of `build-glb.mjs` reads the built meshes
in `public/models/`, which are what the scanner downloads. `datasets/glb-body/`
holds the pristine 20-target source and is only ever an input to the build.
